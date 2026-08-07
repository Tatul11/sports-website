import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { SourceArticle } from './types.js';
import * as fs from 'fs';

/** Fetch a URL and extract the main article text (readability-style),
 *  stripping nav/ads/boilerplate. Throws if the page has no extractable article. */
export async function fetchArticle(url: string): Promise<SourceArticle> {
  let html = '';
  if (url.startsWith('file://')) {
    html = fs.readFileSync(url.replace('file://', ''), 'utf-8');
  } else {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SportsHubBot/1.0; +https://sportshub.uz)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch article: ${res.status} ${res.statusText} (${url})`);
    }
    html = await res.text();
  }

  const dom = new JSDOM(html, { url });
  const parsed = new Readability(dom.window.document).parse();

  if (!parsed?.textContent || parsed.textContent.trim().length < 200) {
    throw new Error(
      `Could not extract article content from ${url} — the page may require JavaScript or block scraping.`,
    );
  }

  return {
    url,
    title: parsed.title?.trim() || dom.window.document.title.trim() || 'Untitled',
    textContent: parsed.textContent.trim(),
    siteName: parsed.siteName ?? undefined,
  };
}
