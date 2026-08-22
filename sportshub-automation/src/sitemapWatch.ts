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
  seeded: boolean;
  posted: string[];
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

/** uz-Latn URLs have no locale prefix (e.g. /futbol/superliga/...), so the first
 *  path segment is the category. */
function categoryEmoji(url: string): string {
  const category = new URL(url).pathname.split('/').filter(Boolean)[0];
  return CATEGORY_EMOJI[category] ?? '🏆';
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
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return { seeded: false, posted: [] };
  }
}

function saveState(state: State): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

/** Check the site's Google News sitemap for articles not yet posted to Telegram,
 *  and post the uz-Latn version of each one (title + link — Telegram builds the
 *  preview card itself from the page's OG tags). Safe to run on a schedule.
 *
 *  On the very first run there's no way to tell "just published" apart from
 *  "already been live for a day", so it seeds the posted-list from whatever's
 *  currently in the sitemap without posting anything — avoiding a flood of
 *  historical articles — and only reports genuinely new ones from then on. */
export async function checkAndPostNewArticles(): Promise<void> {
  console.log('  · checking the Google News sitemap for newly-published articles...');
  const entries = await fetchSitemapEntries();
  const state = loadState();

  // Only the block whose own <loc> matches its own uz-Latn alternate IS the uz-Latn entry.
  const uzLatnEntries = entries.filter((e) => e.loc === e.alternates['uz-Latn-UZ']);

  if (!state.seeded) {
    state.posted = uzLatnEntries.map((e) => e.loc);
    state.seeded = true;
    saveState(state);
    console.log(`  · first run — seeded ${state.posted.length} existing article(s), nothing posted.`);
    return;
  }

  const posted = new Set(state.posted);
  let postedCount = 0;
  for (const entry of uzLatnEntries) {
    if (posted.has(entry.loc)) continue;

    await postArticleToTelegram({ title: entry.title, url: entry.loc, emoji: categoryEmoji(entry.loc) });
    console.log(`    → posted to Telegram: "${entry.title}"`);
    posted.add(entry.loc);
    postedCount++;
  }

  state.posted = [...posted];
  saveState(state);
  console.log(
    postedCount > 0
      ? `  · done — ${postedCount} new article(s) posted.`
      : '  · done — nothing new to post.',
  );
}
