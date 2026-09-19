import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts.js';
import { REWRITE_SYSTEM_PROMPT, buildRewriteUserPrompt } from './rewritePrompts.js';
import type { MatchFacts, ArticleType, LocalisedArticle, SourceArticle, RewrittenArticle } from './types.js';

// maxRetries covers retryable errors (connection resets, 429s, 5xxs) at the SDK level,
// on top of our own outer retry loop in generateRewrite — the API has intermittent
// "socket hang up" blips that a bare client.messages.create() call doesn't survive.
const client = new Anthropic({ apiKey: config.claude.apiKey, maxRetries: 5 });

/** Pull the first balanced JSON object out of a model response,
 *  tolerating stray prose or ```json fences. */
function extractJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model output.');
  }
  const slice = text.slice(start, end + 1);
  return JSON.parse(slice);
}

export interface Generated {
  slug: string;
  leadImageHint: string;
  locales: LocalisedArticle[];
}

export async function generateArticle(facts: MatchFacts, type: ArticleType): Promise<Generated> {
  const msg = await client.messages.create({
    model: config.claude.model,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(facts, type) }],
  });

  const textPart = msg.content.find((b) => b.type === 'text');
  if (!textPart || textPart.type !== 'text') {
    throw new Error('Claude returned no text content.');
  }

  const parsed = extractJson(textPart.text);
  validate(parsed);
  return parsed as Generated;
}

function validate(obj: any): void {
  if (!obj?.slug || typeof obj.slug !== 'string') throw new Error('Draft missing slug.');
  if (!Array.isArray(obj.locales) || obj.locales.length !== 3) {
    throw new Error('Draft must contain exactly 3 locales.');
  }
  const wanted = new Set(['uz-Latn', 'uz-Cyrl', 'ru']);
  for (const l of obj.locales) {
    if (!wanted.has(l.locale)) throw new Error(`Unexpected locale: ${l.locale}`);
    for (const f of ['title', 'metaDescription', 'leadParagraph', 'bodyHtml']) {
      if (!l[f] || typeof l[f] !== 'string') throw new Error(`Locale ${l.locale} missing ${f}.`);
    }
    if (/<h1[\s>]/i.test(l.bodyHtml)) throw new Error(`Locale ${l.locale} bodyHtml must not contain <h1>.`);
  }
}

/** URL-rewrite workflow: take extracted source article text and produce a trilingual rewrite.
 *  Retries on both malformed JSON (the model occasionally leaves a stray unescaped quote
 *  in a long response) and on the API call itself failing (intermittent connection resets/
 *  socket hang-ups) — both used to be handled inconsistently: only JSON errors were retried,
 *  since the client.messages.create() call sat outside the try/catch and any network error
 *  from it propagated straight out, killing the whole run on what's usually a transient blip. */
export async function generateRewrite(article: SourceArticle): Promise<RewrittenArticle> {
  const maxAttempts = 4;
  let lastErr: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const msg = await client.messages.create({
        model: config.claude.model,
        max_tokens: 64000,
        system: REWRITE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildRewriteUserPrompt(article) }],
      });

      const textPart = msg.content.find((b) => b.type === 'text');
      if (!textPart || textPart.type !== 'text') {
        throw new Error('Claude returned no text content.');
      }

      const parsed = extractJson(textPart.text);
      validateRewrite(parsed);
      return parsed as RewrittenArticle;
    } catch (err) {
      lastErr = err as Error;
      if (attempt < maxAttempts) {
        const delayMs = 2000 * attempt;
        console.log(`    (attempt ${attempt} failed — retrying in ${delayMs}ms: ${lastErr.message})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastErr ?? new Error('Rewrite failed for an unknown reason.');
}

function validateRewrite(obj: any): void {
  if (!obj?.category || typeof obj.category !== 'string') throw new Error('Rewrite missing category.');
  if (!obj?.slug || typeof obj.slug !== 'string') throw new Error('Rewrite missing slug.');
  if (!Array.isArray(obj.locales) || obj.locales.length !== 3) {
    throw new Error('Rewrite must contain exactly 3 locales.');
  }
  const wanted = new Set(['uz-Latn', 'uz-Cyrl', 'ru']);
  for (const l of obj.locales) {
    if (!wanted.has(l.locale)) throw new Error(`Unexpected locale: ${l.locale}`);
    for (const f of ['title', 'subtitle', 'shortDescription', 'metaTitle', 'metaDescription', 'leadParagraph']) {
      if (!l[f] || typeof l[f] !== 'string') throw new Error(`Locale ${l.locale} missing ${f}.`);
    }
    if (!Array.isArray(l.bodyParagraphs) || l.bodyParagraphs.length === 0) {
      throw new Error(`Locale ${l.locale} missing bodyParagraphs.`);
    }
    for (const p of l.bodyParagraphs) {
      if (typeof p !== 'string' || !p.trim()) throw new Error(`Locale ${l.locale} has an empty body paragraph.`);
    }
  }
}
