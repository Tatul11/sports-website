# SportsHub.uz — Football Content Automation

A small Node.js/TypeScript service that turns football-API match data into **trilingual draft articles** (uz-Latn · uz-Cyrl · ru) using the **Claude API**, then POSTs them to your admin panel as **drafts for a human to review and publish**.

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│ Football API │ ──▶ │  This app   │ ──▶ │  Claude API  │ ──▶ │  Your CMS     │
│ (fixtures,   │     │ (normalise  │     │ (writes 3-   │     │  as a DRAFT   │
│  results,    │     │  the facts) │     │  locale draft)│    │  → editor     │
│  stats)      │     │             │     │              │     │  reviews +    │
└──────────────┘     └─────────────┘     └──────────────┘     │  publishes    │
                                                               └───────────────┘
```

**The one rule that matters:** the app only ever creates **drafts**. A human verifies the facts against the stored source data and publishes. That protects your E-E-A-T and keeps you clear of Google's scaled-content-abuse policy.

---

## What it produces

Two article types, from structured match data only (no invented facts):

- **Preview** (pre-match) — teams, competition/round, kickoff in UZ time, venue, probable lineups + standings context *if the API returns them*.
- **Report** (post-match) — final score, scorers/minutes, cards/subs, headline stats, standings context.

Each draft comes back as three locales sharing one Latin slug, plus SEO fields (title, meta title/description, answer-first lead paragraph, clean `bodyHtml`), and the raw fact sheet for the editor to check.

---

## Setup

Requires **Node.js 18.17+**.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#   then fill in:
#   - ANTHROPIC_API_KEY      (console.anthropic.com)
#   - FOOTBALL_API_KEY       (api-football.com — verify Uzbekistan coverage first)
#   - MONITOR_LEAGUE_IDS     (league IDs from the provider's coverage page)
#   - CMS_API_URL / CMS_API_TOKEN  (the endpoint your developer builds — see docs/)

# 3. Sanity-check the code compiles
npm run typecheck
```

### Finding your league IDs

On API-Football, open the coverage/dashboard, search "Uzbekistan", and copy the numeric IDs for the UZ Super League (and any European leagues you'll cover). Put them comma-separated in `MONITOR_LEAGUE_IDS`.

---

## Run it

```bash
# One-off: draft a single preview or report for a known fixture id
npm run preview -- --fixture 1234567
npm run report  -- --fixture 1234567

# Scan monitored leagues (use these on a schedule)
npm run scan:previews   # upcoming fixtures within PREVIEW_LOOKAHEAD_HOURS
npm run scan:reports    # finished fixtures within REPORT_LOOKBACK_HOURS

# Rewrite an existing article from a URL into a trilingual .docx
npm run rewrite -- --url "https://example.com/some-article"
```

### URL → trilingual .docx (`rewrite`)

Give it a link to a published article and it will:

1. Fetch the page and extract the article text (readability-style — strips nav/ads/boilerplate).
2. Send that text to Claude, which **rewrites** (not translates verbatim) the story as an original piece in `uz-Cyrl`, `uz-Latn`, and `ru` — same facts, fresh wording, no invented details.
3. Save a `.docx` file into `OUTPUT_DIR` (default `./output`), with the three locale versions as clearly labeled sections (title, meta title/description, lead paragraph, body), plus the source URL for the editor to fact-check against.

This is a separate workflow from the football-API pipeline above — it doesn't touch the CMS at all; the `.docx` file is the deliverable for editorial review. No Google API/OAuth setup needed — it's just a file on disk. Open it directly in Word, or drag it into Google Drive (which converts it to a Google Doc automatically), or point `OUTPUT_DIR` at a Google Drive desktop-sync folder to have it upload itself.

### Automate it (cron)

Run the scans on a schedule from any server, or a host like Railway/Render/a VPS:

```cron
# previews twice a day
0 9,18 * * *  cd /path/to/sportshub-automation && npm run scan:previews >> logs/previews.log 2>&1
# reports every 30 min (catches matches as they finish)
*/30 * * * *  cd /path/to/sportshub-automation && npm run scan:reports  >> logs/reports.log 2>&1
```

Re-running is safe: each draft has an `externalId` (`fixture-<id>-<type>`) and the CMS de-duplicates on it, so a fixture is never drafted twice.

---

## Project structure

```
src/
  config.ts          env loading + locale list
  types.ts            shared types (MatchFacts, DraftPayload, SourceArticle, RewrittenArticle, …)
  footballApi.ts       API-Football client → normalised MatchFacts
  prompts.ts           football preview/report prompts (E-E-A-T rules, JSON output contract)
  claude.ts            calls Claude for both workflows, parses + validates the JSON
  cms.ts               POSTs a football draft to your admin panel
  pipeline.ts          football orchestration: runOne / scanPreviews / scanReports
  articleFetch.ts      URL → extracted article text (readability-style)
  rewritePrompts.ts    URL-rewrite prompt (rewrite, don't translate verbatim)
  docWriter.ts          builds the formatted trilingual .docx file
  rewritePipeline.ts   URL-rewrite orchestration: runRewrite
  index.ts             CLI entry
docs/
  cms-endpoint-contract.md   what your developer must build to receive football drafts
```

---

## Adapting it

- **Different football API** (Sportmonks, etc.): rewrite `src/footballApi.ts` to return the same `MatchFacts` shape — nothing else changes.
- **Different content types** (transfer news, roundups): add a new prompt in `prompts.ts` and a builder in `footballApi.ts`; reuse `generateArticle` + `pushDraft`.
- **Model/cost tuning**: set `CLAUDE_MODEL` — `claude-haiku-4-5-20251001` is cheapest for high volume, `claude-sonnet-5` is the quality/cost default, `claude-opus-4-8` for the highest quality.

---

## Cost & rate limits

Each article is one Claude call (~a few thousand output tokens across 3 locales) plus a handful of football-API calls. Watch your football-API plan's daily request cap when scanning many leagues, and add delays if you hit Claude rate limits at volume.

---

## Guardrails (don't remove these)

1. **Drafts only.** No code path publishes. Publishing is a manual editor action.
2. **Facts only.** The prompt forbids inventing scores, quotes, stats, or history. The raw fact sheet is stored with every draft for verification.
3. **Human byline + review.** An editor checks each draft before it goes live — required for Google News trust and accurate reporting.
