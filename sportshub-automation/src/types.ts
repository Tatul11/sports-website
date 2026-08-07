import type { Locale } from './config.js';

/** Normalised match facts we extract from the football API and feed to Claude.
 *  Claude is instructed to use ONLY these facts — nothing invented. */
export interface MatchFacts {
  fixtureId: number;
  league: { id: number; name: string; round?: string; country?: string };
  season: number;
  kickoff: string; // ISO 8601
  venue?: { name?: string; city?: string };
  status: string; // e.g. "NS" (not started), "FT" (finished)
  home: TeamFacts;
  away: TeamFacts;
  score?: { home: number | null; away: number | null };
  events?: MatchEvent[]; // goals, cards, subs (reports only)
  statistics?: TeamStatistic[]; // possession, shots, etc. (reports only)
  standingsContext?: StandingRow[]; // small table snippet for context
}

export interface TeamFacts {
  id: number;
  name: string;
  lineup?: string[]; // starting XI names, if available
  formation?: string;
}

export interface MatchEvent {
  minute: number | null;
  team: string;
  player?: string;
  type: string; // "Goal" | "Card" | "subst" ...
  detail?: string; // "Normal Goal" | "Yellow Card" ...
}

export interface TeamStatistic {
  team: string;
  stats: Record<string, string | number | null>;
}

export interface StandingRow {
  rank: number;
  team: string;
  points: number;
  played: number;
}

/** One localised article body produced by Claude. */
export interface LocalisedArticle {
  locale: Locale;
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string; // Latin, hyphenated — same slug reused across locales (per your architecture)
  leadParagraph: string; // answer-first summary, doubles as AI-extractable answer
  bodyHtml: string; // <h2>/<p> only, no <h1>
}

export type ArticleType = 'preview' | 'report';

/** The full payload POSTed to the CMS as a draft. */
export interface DraftPayload {
  externalId: string; // idempotency key, e.g. "fixture-12345-report"
  type: ArticleType;
  status: string; // always "draft"
  authorSlug: string;
  categorySlug: string; // e.g. "futbol" or "futbol/superliga"
  primarySlug: string; // shared Latin slug across locales
  leadImageHint: string; // guidance for the editor's image pick (we don't fabricate images)
  locales: LocalisedArticle[];
  sourceData: unknown; // the raw MatchFacts, stored for editor verification (E-E-A-T)
  generatedBy: { model: string; at: string };
}

/** Article text extracted from a source URL (readability-parsed, no markup). */
export interface SourceArticle {
  url: string;
  title: string;
  textContent: string;
  siteName?: string;
}

/** One localised rewrite produced by Claude from a SourceArticle.
 *  Body is plain paragraphs (not HTML) — this is written straight into a Google Doc. */
export interface RewrittenLocale {
  locale: Locale;
  title: string;
  subtitle: string;
  shortDescription: string;
  metaTitle: string;
  metaDescription: string;
  leadParagraph: string;
  bodyParagraphs: string[];
}

export interface RewrittenArticle {
  category: string;
  slug: string;
  locales: RewrittenLocale[];
}
