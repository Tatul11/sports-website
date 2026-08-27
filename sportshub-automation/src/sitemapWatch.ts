import * as fs from 'fs';
import { config } from './config.js';
import { postArticleToTelegram } from './telegram.js';

// Tracked in git (not gitignored) — GitHub Actions is the sole runner of this
// command on a schedule, and commits this file back after each run so the
// "already posted" list persists between runs without needing any local machine.
const STATE_PATH = './telegram-posted.json';

interface SitemapEntry {
  loc: string;
  title: string;
  alternates: Record<string, string>; // hreflang -> href
}

interface State {
  seededUzLatn: boolean;
  postedUzLatn: string[];
  seededRu: boolean;
  postedRu: string[];
}

/** Google News sitemaps only ever contain articles from roughly the last 48 hours
 *  (that's the spec), so every entry here is by definition "fresh". Each article
 *  appears as 3 <url> blocks (one per locale), all sharing the same hreflang
 *  alternates — the uz-Latn href is used as the stable per-article key. */
async function fetchSitemapEntries(): Promise<SitemapEntry[]> {
  const url = `${config.site.baseUrl}/google-news-sitemap.xml`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch sitemap: ${res.status} ${res.statusText} (${url})`);
  }
  const xml = await res.text();

  const entries: SitemapEntry[] = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const body = block[1];
    const loc = body.match(/<loc>([^<]*)<\/loc>/)?.[1];
    const title = body.match(/<news:title>([^<]*)<\/news:title>/)?.[1];
    if (!loc || !title) continue;

    const alternates: Record<string, string> = {};
    for (const link of body.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]*)" href="([^"]*)"/g)) {
      alternates[link[1]] = link[2];
    }

    entries.push({ loc, title: unescapeXml(title), alternates });
  }
  return entries;
}

const CATEGORY_EMOJI: Record<string, string> = {
  futbol: '⚽',
  avtosport: '🏎️',
  kurash: '🤼',
  tennis: '🎾',
  mma: '🥊',
  boks: '🥊',
  'boshqa-sportlar': '🏆',
  exclusive: '🎙️',
};

// Checked before CATEGORY_EMOJI — "boshqa-sportlar" (Other Sports) is a catch-all
// bucket, so basketball/cybersport/chess/etc. need their own icon or they'd all just
// get the generic 🏆. judo gets its own too (more fitting than kurash's 🤼).
const SUBCATEGORY_EMOJI: Record<string, string> = {
  basketbol: '🏀',
  kibersport: '🎮',
  shaxmat: '♟️',
  voleybol: '🏐',
  'yengil-atletika': '🏃',
  judo: '🥋',
  // avtosport
  'formula-1': '🏎️',
  motogp: '🏍️',
  nascar: '🏁',
  superkarlar: '🚗',
  // futbol — domestic tiers and continental competitions
  superliga: '👑',
  'pro-liga': '🥈',
  ozbekiston: '🇺🇿',
  cl: '⭐',
  kubok: '🏆',
  'la-liga': '🇪🇸',
  yevropa: '🇪🇺',
};

/** uz-Latn URLs have no locale prefix (e.g. /futbol/...); ru URLs are prefixed
 *  (e.g. /ru/futbol/...) — skip that segment so category/subcategory line up. */
function categorySegments(url: string): { category?: string; subcategory?: string } {
  const raw = new URL(url).pathname.split('/').filter(Boolean);
  const segments = raw[0] === 'ru' || raw[0] === 'uzc' ? raw.slice(1) : raw;
  // [category, slug] → no subcategory. [category, subcategory, slug, ...] → both.
  return { category: segments[0], subcategory: segments.length >= 3 ? segments[1] : undefined };
}

function categoryEmoji(url: string): string {
  const { category, subcategory } = categorySegments(url);
  if (subcategory && SUBCATEGORY_EMOJI[subcategory]) return SUBCATEGORY_EMOJI[subcategory];
  return (category && CATEGORY_EMOJI[category]) ?? '🏆';
}

function unescapeXml(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function loadState(): State {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    // Migrate the old single-channel {seeded, posted} shape if that's what's on disk.
    if ('seeded' in raw) {
      return { seededUzLatn: raw.seeded, postedUzLatn: raw.posted, seededRu: false, postedRu: [] };
    }
    return raw;
  } catch {
    return { seededUzLatn: false, postedUzLatn: [], seededRu: false, postedRu: [] };
  }
}

function saveState(state: State): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

/** Handles one locale's channel: seeds on its own first run (so turning on the RU
 *  channel later doesn't flood it with everything already live), then posts anything
 *  new since — saving state to disk after every single post, not just at the end, so
 *  a mid-run failure (rate limit, network blip) can't cause a repost on the next run.
 *  Returns how many were posted. */
async function processLocale(
  entries: SitemapEntry[],
  hreflang: string,
  channelId: string,
  buttonText: string,
  key: 'UzLatn' | 'Ru',
  state: State,
): Promise<number> {
  const localeEntries = entries.filter((e) => e.loc === e.alternates[hreflang]);
  const seededKey = `seeded${key}` as const;
  const postedKey = `posted${key}` as const;

  if (!state[seededKey]) {
    state[postedKey] = localeEntries.map((e) => e.loc);
    state[seededKey] = true;
    saveState(state);
    return 0;
  }

  const posted = new Set(state[postedKey]);
  let postedCount = 0;
  for (const entry of localeEntries) {
    if (posted.has(entry.loc)) continue;
    await postArticleToTelegram({
      title: entry.title,
      url: entry.loc,
      emoji: categoryEmoji(entry.loc),
      channelId,
      buttonText,
    });
    console.log(`    → posted to Telegram (${hreflang}): "${entry.title}"`);
    posted.add(entry.loc);
    state[postedKey] = [...posted];
    saveState(state);
    postedCount++;
  }
  return postedCount;
}

/** Check the site's Google News sitemap for articles not yet posted, and post the
 *  uz-Latn version to the main channel and (if TELEGRAM_CHANNEL_ID_RU is set) the ru
 *  version to the Russian channel. Safe to run on a schedule — each channel tracks
 *  its own seeded/posted state independently. */
export async function checkAndPostNewArticles(): Promise<void> {
  console.log('  · checking the Google News sitemap for newly-published articles...');
  const entries = await fetchSitemapEntries();
  const state = loadState();

  const uzLatnPosted = await processLocale(
    entries,
    'uz-Latn-UZ',
    config.telegram.channelId,
    "Batafsil o'qish →",
    'UzLatn',
    state,
  );

  let ruPosted = 0;
  if (config.telegram.channelIdRu) {
    ruPosted = await processLocale(entries, 'ru-UZ', config.telegram.channelIdRu, 'Читать полностью →', 'Ru', state);
  }

  const totalPosted = uzLatnPosted + ruPosted;
  console.log(
    totalPosted > 0
      ? `  · done — ${totalPosted} new article(s) posted.`
      : '  · done — nothing new to post.',
  );
}
