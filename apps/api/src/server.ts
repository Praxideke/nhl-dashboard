import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fetchStandingsRaw, fetchScheduleRaw, fetchTeamSchedule, fetchStandingsSeasons,
  fetchPlayoffBracket, fetchTeamRoster, fetchEspnRoster, fetchPlayer, fetchGame,
  fetchClubStats, fetchSkaterLeaders, fetchGoalieLeaders,
} from './nhl';
import { normalizeStandings, normalizeSchedule } from './normalize';
import { cached } from './cache';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const SEASON_END_DATES: Record<string, string> = {
  '20252026': '2026-04-16',
  '20242025': '2025-04-17',
  '20232024': '2024-04-18',
  '20222023': '2023-04-14',
  '20212022': '2022-04-29',
  '20202021': '2021-05-19',
  '20192020': '2020-03-11',
  '20182019': '2019-04-06',
  '20172018': '2018-04-08',
  '20162017': '2017-04-09',
  '20152016': '2016-04-10',
  '20142015': '2015-04-11',
};

function seasonFromDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  if (m >= 9) return `${y}${y + 1}`;
  return `${y - 1}${y}`;
}

async function getSeasonEndDate(season: string): Promise<string | null> {
  try {
    const data: any = await cached('standings-seasons', 3_600_000, fetchStandingsSeasons);
    const arr = Array.isArray(data) ? data : (data.seasons ?? data.standingsSeasons ?? []);
    for (const s of arr) {
      const id = String(s.id ?? s.seasonId ?? s.season ?? '');
      if (id === season && s.endDate) return s.endDate;
    }
  } catch (e) {}
  return SEASON_END_DATES[season] ?? null;
}

function gameSortKey(g: any): string {
  if (g.gameDate) return g.gameDate;
  if (g.startTimeUTC) return g.startTimeUTC;
  return '';
}

async function getLast5ForTeams(season: string, teams: string[], asOfDate: string) {
  const results = await Promise.allSettled(
    teams.map((abbrev) => fetchTeamSchedule(abbrev, season))
  );
  const last5Map: Record<string, any[]> = {};

  for (let i = 0; i < teams.length; i++) {
    const r = results[i];
    if (r.status !== 'fulfilled') continue;
    const raw = r.value;
    if (!raw?.games) continue;

    const finished = raw.games
      .filter((g: any) => {
        if (g.gameState !== 'FINAL' && g.gameState !== 'OFF') return false;
        if (g.gameType !== 2 && g.gameType !== 3) return false;
        const key = gameSortKey(g);
        if (!key) return false;
        return key.slice(0, 10) <= asOfDate;
      })
      .sort((a: any, b: any) => gameSortKey(a).localeCompare(gameSortKey(b)));
    last5Map[teams[i]] = finished.slice(-5);
  }
  return last5Map;
}

async function getNextGamesForTeams(asOfDate: string, teams: string[]) {
  // Запрашиваем 3 раза последовательно (каждый даёт окно ~7 дней):
  // - schedule/now (текущая неделя)
  // - schedule/{asOf + 7} (следующая неделя)
  // - schedule/{asOf + 14} (через 2 недели)
  const base = new Date(asOfDate + 'T00:00:00Z');
  const offsets = [7, 14];

  const responses: any[] = [];

  try {
    const now = await fetchScheduleRaw();
    responses.push(now);
  } catch (e) {
    console.warn('schedule/now failed:', (e as Error).message);
  }

  for (const offset of offsets) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + offset);
    const dateStr = d.toISOString().split('T')[0];
    try {
      const resp = await fetchScheduleRaw(dateStr);
      responses.push(resp);
    } catch (e) {
      console.warn(`schedule/${dateStr} failed:`, (e as Error).message);
    }
  }

  const nextMap: Record<string, any | null> = {};
  const teamSet = new Set(teams);

  // Собираем все будущие игры, сортируем по дате
  const candidateGames: any[] = [];
  for (const resp of responses) {
    if (!resp?.gameWeek) continue;
    for (const day of resp.gameWeek) {
      if (!day.games) continue;
      for (const g of day.games) {
        if (g.gameType !== 2 && g.gameType !== 3) continue;
        if (g.gameState === 'FINAL' || g.gameState === 'OFF') continue;
        if (!g.homeTeam?.abbrev || !g.awayTeam?.abbrev) continue;
        const gameDate = g.gameDate || day.date || (g.startTimeUTC ? g.startTimeUTC.slice(0, 10) : '');
        if (!gameDate) continue;
        if (gameDate < asOfDate) continue;
        candidateGames.push({ ...g, _gameDate: gameDate });
      }
    }
  }

  // Дедупликация по id
  const seen = new Set<number>();
  const uniqueGames: any[] = [];
  for (const g of candidateGames) {
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    uniqueGames.push(g);
  }

  // Сортируем по дате
  uniqueGames.sort((a, b) => a._gameDate.localeCompare(b._gameDate));

  // Для каждой команды — первая будущая игра
  for (const g of uniqueGames) {
    for (const teamAbbrev of [g.homeTeam.abbrev, g.awayTeam.abbrev]) {
      if (teamSet.has(teamAbbrev) && !nextMap[teamAbbrev]) {
        nextMap[teamAbbrev] = g;
      }
    }
  }

  for (const team of teams) {
    if (!(team in nextMap)) nextMap[team] = null;
  }

  console.log(`[next-games] fetched ${uniqueGames.length} upcoming games, assigned ${Object.values(nextMap).filter(Boolean).length}/${teams.length} teams`);

  return nextMap;
}

async function getAllScores(centerDate: string) {
  const base = new Date(centerDate + 'T00:00:00Z');
  const dates: string[] = [];
  for (let offset = -2; offset <= 2; offset++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + offset);
    dates.push(d.toISOString().split('T')[0]);
  }
  const allowed = new Set(dates);
  const results = await Promise.allSettled(dates.map((d) => fetchScheduleRaw(d)));
  const seen = new Set<number>();
  const games: any[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const raw = r.value;
    if (!raw?.gameWeek) continue;
    for (const day of raw.gameWeek) {
      if (!allowed.has(day.date)) continue;
      for (const g of day.games) {
        if (g.gameType !== 2 && g.gameType !== 3) continue;
        if (!seen.has(g.id)) {
          seen.add(g.id);
          games.push({ ...g, _date: day.date });
        }
      }
    }
  }
  return games;
}

app.get('/api/standings', async (req) => {
  const { date, season } = req.query as { date?: string, season?: string };
  const cacheKey = `standings:${date ?? 'auto'}:${season ?? 'current'}`;
  const today = new Date().toISOString().split('T')[0];

  return cached(cacheKey, 60_000, async () => {
    let asOf = date;
    let seasonStr = season;
    if (!asOf && season) {
      const endDate = await getSeasonEndDate(season);
      if (endDate) asOf = endDate;
    }
    if (!asOf) asOf = today;
    if (asOf > today) asOf = today;
    if (!seasonStr) seasonStr = seasonFromDate(asOf);

    let raw: any = null;
    let lastError: any = null;
    const baseDate = new Date(asOf + 'T00:00:00Z');
    const tryDates = [asOf];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(baseDate);
      d.setUTCDate(d.getUTCDate() - i);
      tryDates.push(d.toISOString().split('T')[0]);
    }
    for (const tryDate of tryDates) {
      try {
        const candidate = await fetchStandingsRaw(tryDate);
        if (candidate?.standings?.length) {
          raw = candidate;
          asOf = tryDate;
          break;
        }
      } catch (e) { lastError = e; }
    }
    if (!raw?.standings?.length) {
      throw lastError ?? new Error(`No standings for ${asOf}`);
    }
    const teams = raw.standings.map((s: any) => s.teamAbbrev.default);

    const last5Map = await cached(`last5:${asOf}:${seasonStr}`, 600_000, () =>
      getLast5ForTeams(seasonStr!, teams, asOf!)
    );
    const nextGamesMap = await cached(`next-games:${asOf}`, 600_000, () =>
      getNextGamesForTeams(asOf!, teams)
    );

    return normalizeStandings(raw, last5Map, nextGamesMap);
  });
});

app.get('/api/scores', async (req) => {
  const { date } = req.query as { date?: string };
  const centerDate = date ?? new Date().toISOString().split('T')[0];
  const cacheKey = `scores:${centerDate}`;
  return cached(cacheKey, 60_000, async () => {
    const games = await getAllScores(centerDate);
    const byDate = new Map<string, any[]>();
    for (const g of games) {
      const d = g._date;
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(g);
    }
    const gameWeek = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, gs]) => ({
        date,
        dayAbbrev: '',
        numberOfGames: gs.length,
        games: gs.map(({ _date, ...rest }) => rest),
      }));
    return normalizeSchedule({ gameWeek });
  });
});

app.get('/api/playoffs', async (req) => {
  const { season } = req.query as { season?: string };
  const targetSeason = season ?? '20262027';
  const endYearStr = targetSeason.slice(4, 8);
  const yearNum = parseInt(endYearStr, 10);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const playoffsStarted =
    yearNum < currentYear ||
    (yearNum === currentYear && currentMonth >= 4);

  if (!playoffsStarted) {
    return { series: [], notStarted: true, season: targetSeason };
  }

  const cacheKey = `playoffs:${endYearStr}`;
  return cached(cacheKey, 300_000, async () => {
    const raw: any = await fetchPlayoffBracket(endYearStr);
    return raw;
  });
});

app.get('/api/team/:abbrev', async (req) => {
  const { abbrev } = req.params as { abbrev: string };
  const { season } = req.query as { season?: string };
  const seasonStr = season ?? '20262027';
  const cacheKey = `team:${abbrev}:${seasonStr}`;
  const currentSeason = new Date().getFullYear() >= 2026 ? '20262027' : '20252026';

  return cached(cacheKey, 300_000, async () => {
    const isCurrent = seasonStr === currentSeason;

    const [roster, schedule, espn, clubStats] = await Promise.all([
      fetchTeamRoster(abbrev, seasonStr),
      fetchTeamSchedule(abbrev, seasonStr),
      isCurrent ? fetchEspnRoster(abbrev).catch(() => null) : Promise.resolve(null),
      fetchClubStats(abbrev, seasonStr).catch(() => null),
    ]);

    const injuryMap: Record<string, string> = {};
    if (espn?.athletes) {
      for (const group of espn.athletes) {
        for (const p of group.items ?? []) {
          if (p.injuries && p.injuries.length > 0) {
            const full = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim().toLowerCase();
            if (full) injuryMap[full] = p.injuries[0].status;
          }
        }
      }
    }

    if (roster) {
      for (const group of ['forwards', 'defensemen', 'goalies']) {
        for (const p of roster[group] ?? []) {
          const key = `${p.firstName?.default ?? ''} ${p.lastName?.default ?? ''}`.trim().toLowerCase();
          if (injuryMap[key]) p.injury = injuryMap[key];
        }
      }
    }

    let leaders: any = null;
    if (clubStats?.skaters && clubStats?.goalies) {
      const skaters = [...clubStats.skaters].filter((s: any) => (s.gamesPlayed ?? 0) > 0);
      const goalies = [...clubStats.goalies].filter((g: any) => (g.gamesPlayed ?? 0) > 0);

      const mapToLeader = (p: any) => ({
        playerId: p.playerId,
        name: p.firstName?.default && p.lastName?.default
          ? `${p.firstName.default} ${p.lastName.default}`
          : (p.name?.default ?? '—'),
        headshot: p.headshot,
        position: p.positionCode,
        sweaterNumber: p.sweaterNumber,
        teamAbbrev: abbrev,
      });

      const byPoints = [...skaters]
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
        .slice(0, 3)
        .map((p: any) => ({
          ...mapToLeader(p),
          goals: p.goals ?? 0,
          assists: p.assists ?? 0,
          points: p.points ?? 0,
        }));

      const byGoals = [...skaters]
        .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))
        .slice(0, 3)
        .map((p: any) => ({
          ...mapToLeader(p),
          goals: p.goals ?? 0,
        }));

      const bestGoalie = goalies.length > 0
        ? (() => {
            const sorted = [...goalies].sort((a, b) => {
              const wa = a.wins ?? 0;
              const wb = b.wins ?? 0;
              if (wb !== wa) return wb - wa;
              return (b.savePctg ?? 0) - (a.savePctg ?? 0);
            });
            const g = sorted[0];
            return {
              ...mapToLeader(g),
              wins: g.wins ?? 0,
              losses: g.losses ?? 0,
              otLosses: g.otLosses ?? 0,
              gaa: g.goalsAgainstAvg ?? g.gaa,
              savePctg: g.savePctg,
              shutouts: g.shutouts ?? 0,
            };
          })()
        : null;

      leaders = { points: byPoints, goals: byGoals, goalie: bestGoalie };
    }

    const games = (schedule?.games ?? []).filter(
      (g: any) => g.gameType === 2 || g.gameType === 3
    );

    const today = new Date().toISOString().split('T')[0];
    const past = games
      .filter((g: any) => {
        const key = gameSortKey(g);
        return key && key.slice(0, 10) <= today && (g.gameState === 'FINAL' || g.gameState === 'OFF');
      })
      .sort((a: any, b: any) => gameSortKey(b).localeCompare(gameSortKey(a)))
      .slice(0, 10);

    const future = games
      .filter((g: any) => {
        const key = gameSortKey(g);
        return key && key.slice(0, 10) > today;
      })
      .sort((a: any, b: any) => gameSortKey(a).localeCompare(gameSortKey(b)))
      .slice(0, 5);

    return { roster, past, future, leaders };
  });
});

app.get('/api/player/:id', async (req) => {
  const { id } = req.params as { id: string };
  const cacheKey = `player:${id}`;
  return cached(cacheKey, 300_000, async () => {
    const raw: any = await fetchPlayer(id);
    return raw;
  });
});

app.get('/api/game/:id', async (req) => {
  const { id } = req.params as { id: string };
  const cacheKey = `game:${id}`;
  return cached(cacheKey, 60_000, async () => {
    const raw: any = await fetchGame(id);
    return raw;
  });
});

app.get('/api/leaders', async (req) => {
  const { season } = req.query as { season?: string };
  const seasonStr = season ?? '20262027';
  const cacheKey = `leaders:${seasonStr}`;

  return cached(cacheKey, 300_000, async () => {
    const [skaters, goalies] = await Promise.all([
      fetchSkaterLeaders(seasonStr).catch(() => null),
      fetchGoalieLeaders(seasonStr).catch(() => null),
    ]);
    return { skaters, goalies };
  });
});

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = process.env.WEB_DIST_PATH
    || path.resolve(__dirname, '../../web/dist');

  await app.register(fastifyStatic, {
    root: distPath,
    prefix: '/',
    wildcard: false,
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) {
      reply.code(404).send({ error: 'Not found' });
      return;
    }
    reply.sendFile('index.html');
  });

  console.log('Serving static files from:', distPath);
} catch (e) {
  console.warn('Static files not found (development mode):', (e as Error).message);
}

await app.listen({ port: 3001, host: '0.0.0.0' });
console.log('API is running on http://localhost:3001');
