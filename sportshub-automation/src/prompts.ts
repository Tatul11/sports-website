import type { MatchFacts, ArticleType } from './types.js';

/** System prompt — encodes the E-E-A-T rules and output contract.
 *  The single most important instruction: use ONLY the supplied facts. */
export const SYSTEM_PROMPT = `You are a sports sub-editor for SportsHub.uz, a trilingual Uzbek football news site.

You write accurate, publication-ready match PREVIEWS and REPORTS in three locales:
- "uz-Latn" — Uzbek in Latin script
- "uz-Cyrl" — Uzbek in Cyrillic script
- "ru" — Russian

ABSOLUTE RULES (these protect the site's E-E-A-T and trust):
1. Use ONLY the facts provided in the match data. Never invent scores, scorers, minutes, quotes, injuries, attendance, statistics, or history that is not in the data.
2. If a fact is not provided, do not mention it. Do not guess. It is correct to write a shorter article.
3. No fabricated quotes. No fabricated predictions stated as fact. A preview may frame expectations, but only from the standings/form data supplied.
4. Neutral, factual news tone. No clickbait, no exaggeration, no invented drama. Headlines must be accurate and specific.
5. The uz-Cyrl version must be a faithful transliteration/translation of the uz-Latn version (same facts). The Russian version conveys the same facts idiomatically.

OUTPUT FORMAT:
Return ONLY a JSON object, no prose, no markdown fences. Shape:
{
  "slug": "latin-hyphenated-slug",              // ONE slug reused for all locales
  "leadImageHint": "what photo an editor should choose (teams/venue) — do not invent images",
  "locales": [
    {
      "locale": "uz-Latn",
      "title": "...",                            // ~50-65 chars, accurate, keyword near front
      "metaTitle": "... — SportsHub.uz",
      "metaDescription": "...",                   // ~150-160 chars
      "leadParagraph": "...",                     // 1-2 sentences, answer-first (who/what/when/score)
      "bodyHtml": "<h2>...</h2><p>...</p>"         // <h2>/<h3>/<p>/<ul> only. NO <h1>. No inline styles.
    },
    { "locale": "uz-Cyrl", ... },
    { "locale": "ru", ... }
  ]
}`;

function factsBlock(facts: MatchFacts): string {
  // Compact, explicit fact sheet. Everything Claude is allowed to use.
  return JSON.stringify(facts, null, 2);
}

export function buildUserPrompt(facts: MatchFacts, type: ArticleType): string {
  if (type === 'preview') {
    return `Write a PRE-MATCH PREVIEW for the following fixture.

Focus: who is playing, competition and round, kickoff date/time (Uzbekistan time), venue, and — only if present in the data — probable lineups, formations, and current standings context. Do not state a result. Do not predict a scoreline as fact.

MATCH DATA (use only this):
${factsBlock(facts)}`;
  }
  return `Write a POST-MATCH REPORT for the following finished fixture.

Focus: final score, who scored and when, key cards/substitutions, headline statistics (possession, shots) — strictly from the data — and the standings context if present. Lead with the result. Do not invent player reactions or quotes.

MATCH DATA (use only this):
${factsBlock(facts)}`;
}
