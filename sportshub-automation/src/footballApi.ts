import { config } from './config.js';
import type { MatchFacts, MatchEvent, TeamStatistic, StandingRow } from './types.js';

/** Thin client for API-Football (api-sports.io v3).
 *  Response shape: { response: [...], errors: [...] }. */
async function apiGet(path: string, params: Record<string, string | number> = {}): Promise<any> {
  const url = new URL(config.football.base + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url, {
    headers: { 'x-apisports-key': config.football.apiKey },
  });
  if (!res.ok) {
    throw new Error(`Football API ${path} failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { response?: unknown[]; errors?: unknown };
  if (json.errors && Array.isArray(json.errors) === false && Object.keys(json.errors).length) {
    throw new Error(`Football API ${path} returned errors: ${JSON.stringify(json.errors)}`);
  }
  return json.response ?? [];
}

/** Upcoming fixtures for a league within the next N fixtures. */
export async function getUpcomingFixtures(leagueId: number, next = 5): Promise<any[]> {
  return apiGet('/fixtures', { league: leagueId, season: config.football.season, next });
}

/** Recently finished fixtures for a league (last N). */
export async function getRecentFixtures(leagueId: number, last = 5): Promise<any[]> {
  return apiGet('/fixtures', { league: leagueId, season: config.football.season, last });
}

/** A single fixture by id. */
export async function getFixture(fixtureId: number): Promise<any | null> {
  const rows = await apiGet('/fixtures', { id: fixtureId });
  return rows[0] ?? null;
}

async function getLineups(fixtureId: number): Promise<any[]> {
  try {
    return await apiGet('/fixtures/lineups', { fixture: fixtureId });
  } catch {
    return [];
  }
}

async function getEvents(fixtureId: number): Promise<MatchEvent[]> {
  try {
    const rows = await apiGet('/fixtures/events', { fixture: fixtureId });
    return rows.map((e: any) => ({
      minute: e?.time?.elapsed ?? null,
      team: e?.team?.name ?? '',
      player: e?.player?.name ?? undefined,
      type: e?.type ?? '',
      detail: e?.detail ?? undefined,
    }));
  } catch {
    return [];
  }
}

async function getStatistics(fixtureId: number): Promise<TeamStatistic[]> {
  try {
    const rows = await apiGet('/fixtures/statistics', { fixture: fixtureId });
    return rows.map((r: any) => {
      const stats: Record<string, string | number | null> = {};
      for (const s of r?.statistics ?? []) stats[s.type] = s.value;
      return { team: r?.team?.name ?? '', stats };
    });
  } catch {
    return [];
  }
}

export async function getStandings(leagueId: number, top = 6): Promise<StandingRow[]> {
  try {
    const rows = await apiGet('/standings', { league: leagueId, season: config.football.season });
    const table = rows?.[0]?.league?.standings?.[0] ?? [];
    return table.slice(0, top).map((r: any) => ({
      rank: r.rank,
      team: r?.team?.name ?? '',
      points: r.points,
      played: r?.all?.played ?? 0,
    }));
  } catch {
    return [];
  }
}

function lineupNames(lineups: any[], teamId: number): { xi?: string[]; formation?: string } {
  const entry = lineups.find((l) => l?.team?.id === teamId);
  if (!entry) return {};
  return {
    xi: (entry.startXI ?? []).map((p: any) => p?.player?.name).filter(Boolean),
    formation: entry.formation ?? undefined,
  };
}

/** Build normalised MatchFacts for a PREVIEW (pre-match). */
export async function buildPreviewFacts(fixtureId: number): Promise<MatchFacts> {
  const fx = await getFixture(fixtureId);
  if (!fx) throw new Error(`Fixture ${fixtureId} not found`);
  const [lineups, standings] = await Promise.all([
    getLineups(fixtureId),
    getStandings(fx.league.id),
  ]);
  const homeLu = lineupNames(lineups, fx.teams.home.id);
  const awayLu = lineupNames(lineups, fx.teams.away.id);

  return {
    fixtureId,
    league: { id: fx.league.id, name: fx.league.name, round: fx.league.round, country: fx.league.country },
    season: config.football.season,
    kickoff: fx.fixture.date,
    venue: { name: fx.fixture?.venue?.name, city: fx.fixture?.venue?.city },
    status: fx.fixture?.status?.short ?? 'NS',
    home: { id: fx.teams.home.id, name: fx.teams.home.name, lineup: homeLu.xi, formation: homeLu.formation },
    away: { id: fx.teams.away.id, name: fx.teams.away.name, lineup: awayLu.xi, formation: awayLu.formation },
    standingsContext: standings,
  };
}

/** Build normalised MatchFacts for a REPORT (post-match). */
export async function buildReportFacts(fixtureId: number): Promise<MatchFacts> {
  const fx = await getFixture(fixtureId);
  if (!fx) throw new Error(`Fixture ${fixtureId} not found`);
  const status = fx.fixture?.status?.short ?? '';
  if (!['FT', 'AET', 'PEN'].includes(status)) {
    throw new Error(`Fixture ${fixtureId} is not finished (status: ${status}). Skipping report.`);
  }
  const [events, statistics, lineups, standings] = await Promise.all([
    getEvents(fixtureId),
    getStatistics(fixtureId),
    getLineups(fixtureId),
    getStandings(fx.league.id),
  ]);
  const homeLu = lineupNames(lineups, fx.teams.home.id);
  const awayLu = lineupNames(lineups, fx.teams.away.id);

  return {
    fixtureId,
    league: { id: fx.league.id, name: fx.league.name, round: fx.league.round, country: fx.league.country },
    season: config.football.season,
    kickoff: fx.fixture.date,
    venue: { name: fx.fixture?.venue?.name, city: fx.fixture?.venue?.city },
    status,
    home: { id: fx.teams.home.id, name: fx.teams.home.name, lineup: homeLu.xi, formation: homeLu.formation },
    away: { id: fx.teams.away.id, name: fx.teams.away.name, lineup: awayLu.xi, formation: awayLu.formation },
    score: { home: fx.goals.home, away: fx.goals.away },
    events,
    statistics,
    standingsContext: standings,
  };
}
