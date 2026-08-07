import { config } from './config.js';
import { buildPreviewFacts, buildReportFacts, getUpcomingFixtures, getRecentFixtures } from './footballApi.js';
import { generateArticle } from './claude.js';
import { pushDraft } from './cms.js';
import type { ArticleType, DraftPayload, MatchFacts } from './types.js';

function categoryFor(facts: MatchFacts): string {
  // Simple mapping — refine to your architecture (e.g. UZ league -> futbol/superliga).
  const country = (facts.league.country ?? '').toLowerCase();
  if (country.includes('uzbek')) return 'futbol/superliga';
  return 'futbol';
}

/** Generate one draft (preview or report) for a single fixture and push it to the CMS. */
export async function runOne(fixtureId: number, type: ArticleType): Promise<void> {
  assertFootballConfig();
  assertCmsConfig();
  const facts = type === 'preview' ? await buildPreviewFacts(fixtureId) : await buildReportFacts(fixtureId);

  console.log(`  · ${type} for ${facts.home.name} vs ${facts.away.name} (fixture ${fixtureId})`);
  const generated = await generateArticle(facts, type);

  const payload: DraftPayload = {
    externalId: `fixture-${fixtureId}-${type}`,
    type,
    status: config.cms.draftStatus,
    authorSlug: config.cms.authorSlug,
    categorySlug: categoryFor(facts),
    primarySlug: generated.slug,
    leadImageHint: generated.leadImageHint,
    locales: generated.locales,
    sourceData: facts,
    generatedBy: { model: config.claude.model, at: new Date().toISOString() },
  };

  const result = await pushDraft(payload);
  if (!result.ok) {
    throw new Error(`CMS rejected draft (${result.status}): ${JSON.stringify(result.raw)}`);
  }
  const verb = result.created ? 'CREATED' : 'exists (skipped)';
  console.log(`    → draft ${verb}${result.editUrl ? ` — review: ${result.editUrl}` : ''}`);
}

/** Scan monitored leagues for upcoming fixtures and draft previews. */
export async function scanPreviews(): Promise<void> {
  assertLeagues();
  for (const leagueId of config.football.leagueIds) {
    const fixtures = await getUpcomingFixtures(leagueId, 5);
    const cutoff = Date.now() + config.behaviour.previewLookaheadHours * 3600_000;
    const due = fixtures.filter((f) => new Date(f.fixture.date).getTime() <= cutoff);
    console.log(`League ${leagueId}: ${due.length} upcoming fixture(s) within window`);
    for (const f of due) {
      try {
        await runOne(f.fixture.id, 'preview');
      } catch (err) {
        console.error(`    ! ${(err as Error).message}`);
      }
    }
  }
}

/** Scan monitored leagues for finished fixtures and draft reports. */
export async function scanReports(): Promise<void> {
  assertLeagues();
  for (const leagueId of config.football.leagueIds) {
    const fixtures = await getRecentFixtures(leagueId, 5);
    const since = Date.now() - config.behaviour.reportLookbackHours * 3600_000;
    const done = fixtures.filter(
      (f) => ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short) && new Date(f.fixture.date).getTime() >= since,
    );
    console.log(`League ${leagueId}: ${done.length} finished fixture(s) within window`);
    for (const f of done) {
      try {
        await runOne(f.fixture.id, 'report');
      } catch (err) {
        console.error(`    ! ${(err as Error).message}`);
      }
    }
  }
}

function assertLeagues(): void {
  if (config.football.leagueIds.length === 0) {
    throw new Error('MONITOR_LEAGUE_IDS is empty. Add league IDs in .env before scanning.');
  }
}

function assertFootballConfig(): void {
  if (!config.football.apiKey) {
    throw new Error('Missing FOOTBALL_API_KEY in .env — required for preview/report/scan commands.');
  }
}

function assertCmsConfig(): void {
  if (!config.cms.url || !config.cms.token) {
    throw new Error('Missing CMS_API_URL / CMS_API_TOKEN in .env — required for preview/report/scan commands.');
  }
}
