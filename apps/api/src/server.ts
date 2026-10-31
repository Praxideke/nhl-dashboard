import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  fetchStandingsRaw, fetchScheduleRaw, fetchTeamSchedule, fetchStandingsSeasons,
  fetchPlayoffBracket, fetchTeamRoster, fetchEspnRoster, fetchPlayer, fetchGameSummary,
  fetchClubStats, fetchSkaterLeaders, fetchGoalieLeaders, fetchEspnInjuries, fetchPlayerSearch,
  fetchEspnNews, fetchTeamLast5, fetchCalendarRaw, fetchTeamDetails,
} from './nhl';
import { cached } from './cache';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const ESPN_TO_NHL_MAP: Record<string, string> = {
  TB: 'TBL', SJ: 'SJS', LA: 'LAK', NJ: 'NJD',
};

async function getNextGamesData(asOfDate: string, teams: string[]) {
  const base = new Date(asOfDate + 'T00:00:00Z');
  const datesToFetch: string[] = [];
  for (let i = 0; i <= 14; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    datesToFetch.push(d.toISOString().split('T')[0]);
  }
  
  const responses = await Promise.allSettled(datesToFetch.map(d => fetchScheduleRaw(d)));
  const allGames: any[] = [];
  for (const r of responses) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      allGames.push(...r.value);
    }
  }
  
  allGames.sort((a, b) => a.date.localeCompare(b.date));

  const nextGamesMap: Record<string, any> = {};
  for (const g of allGames) {
    const isFuture = g.status === 'FUT';
    for (const teamAbbrev of [g.homeTeam?.abbrev, g.awayTeam?.abbrev]) {
      if (!teamAbbrev) continue;
      if (isFuture && !nextGamesMap[teamAbbrev]) {
        nextGamesMap[teamAbbrev] = {
          opponentAbbrev: teamAbbrev === g.homeTeam.abbrev ? g.awayTeam.abbrev : g.homeTeam.abbrev,
          isHome: teamAbbrev === g.homeTeam.abbrev,
          date: g.date,
        };
      }
    }
  }
  return nextGamesMap;
}

async function getLast5GamesData(teams: string[]) {
  const result: Record<string, { last5: string[], last5Games: any[] }> = {};
  await Promise.all(teams.map(async (abbrev) => {
    result[abbrev] = await fetchTeamLast5(abbrev);
  }));
  return result;
}

async function getAllScores(centerDate: string) {
  const base = new Date(centerDate + 'T00:00:00Z');
  const dates: string[] = [];
  for (let offset = -2; offset <= 2; offset++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + offset);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  const results = await Promise.allSettled(dates.map((d) => fetchScheduleRaw(d)));
  const games: any[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      games.push(...r.value);
    }
  }
  return games;
}

app.get('/api/standings', async (req) => {
  const { date, season } = req.query as { date?: string, season?: string };
  const today = new Date().toISOString().split('T')[0];
  let asOf = date || today;
  if (asOf > today) asOf = today;

  const cacheKey = `standings:${asOf}:v19`;

  return cached(cacheKey, 60_000, async () => {
    const rows = await fetchStandingsRaw(asOf);
    const teams = rows.map((s: any) => s.team.abbrev);
    
    const [nextGamesMap, last5Map] = await Promise.all([
      cached(`next-games:${asOf}:v8`, 600_000, () => getNextGamesData(asOf, teams)),
      cached(`last5-games:${asOf}:v5`, 60_000, () => getLast5GamesData(teams))
    ]);

    rows.forEach((r: any) => {
      r.nextGame = nextGamesMap[r.team.abbrev] || null;
      const l5 = last5Map[r.team.abbrev];
      if (l5 && l5.last5.length > 0) {
        r.last5 = l5.last5;
        r.last5Games = l5.last5Games;
      } else {
        r.last5 = [];
        r.last5Games = [];
      }
    });

    return rows;
  });
});

app.get('/api/scores', async (req) => {
  const { date } = req.query as { date?: string };
  const centerDate = date ?? new Date().toISOString().split('T')[0];
  const cacheKey = `scores:${centerDate}`;
  return cached(cacheKey, 60_000, async () => {
    return await getAllScores(centerDate);
  });
});

app.get('/api/news', async (req) => {
  return cached(`news:v16`, 600_000, async () => {
    try {
      const raw: any = await fetchEspnNews();
      const articles = raw?.articles || [];
      return articles.slice(0, 15).map((a: any) => ({
        id: a.id, title: a.headline || '', description: a.description || '', 
        image: a.images?.[0]?.url, link: a.links?.web?.href || a.links?.api?.news?.href, published: a.published,
        translatedBy: 'none'
      }));
    } catch (e) {
      return [];
    }
  });
});

app.get('/api/injuries', async (req) => {
  return cached(`injuries:v24`, 300_000, async () => {
    try {
      const raw: any = await fetchEspnInjuries();
      const result: any[] = [];
      if (raw?.injuries) {
        for (const teamGroup of raw.injuries) {
          if (!teamGroup.injuries) continue;
          for (const inj of teamGroup.injuries) {
            const athlete = inj.athlete;
            if (!athlete) continue;
            const espnAbbrev = athlete.team?.abbreviation ?? teamGroup.abbreviation ?? '';
            const teamAbbrev = ESPN_TO_NHL_MAP[espnAbbrev] || espnAbbrev;
            result.push({
              playerId: athlete.id, playerName: athlete.displayName || '', headshot: athlete.headshot?.href,
              position: athlete.position?.abbreviation ?? '', teamAbbrev, teamLogo: athlete.team?.logos?.find((l: any) => l.rel.includes('dark'))?.href || `https://assets.nhle.com/logos/nhl/svg/${teamAbbrev}_dark.svg`,
              status: inj.status ?? 'Out', date: inj.date, comment: inj.shortComment || inj.longComment || '',
              translatedBy: 'none'
            });
          }
        }
      }
      return result;
    } catch (e) { return []; }
  });
});

app.get('/api/game/:id', async (req) => {
  const { id } = req.params as { id: string };
  const cacheKey = `game-summary:${id}:v2`; // Сброс кэша
  return cached(cacheKey, 30_000, async () => {
    return await fetchGameSummary(id);
  });
});

app.get('/api/playoffs', async (req) => {
  const { season } = req.query as { season?: string };
  const year = season || '20232024';
  return cached(`playoffs:${year}:v13`, 3600_000, async () => {
    return await fetchPlayoffBracket(year);
  });
});

app.get('/api/leaders', async (req) => {
  const { season } = req.query as { season?: string };
  const seasonKey = season || 'current';
  return cached(`leaders:${seasonKey}:v7`, 300_000, async () => {
    const [skaters, goalies] = await Promise.all([
      fetchSkaterLeaders(seasonKey),
      fetchGoalieLeaders(seasonKey),
    ]);
    return { skaters, goalies };
  });
});

app.get('/api/player/:id', async (req) => {
  const { id } = req.params as { id: string };
  return cached(`player:${id}:v20`, 300_000, async () => {
    return await fetchPlayer(id);
  });
});

app.get('/api/calendar', async (req) => {
  const { month } = req.query as { month?: string };
  if (!month) return [];
  return cached(`calendar:${month}:v1`, 600_000, async () => {
    return await fetchCalendarRaw(month);
  });
});

app.get('/api/team/:abbrev', async (req) => {
  const { abbrev } = req.params as { abbrev: string };
  const { season } = req.query as { season?: string };
  const seasonKey = season || '20232024';
  return cached(`team:${abbrev}:${seasonKey}:v8`, 300_000, async () => {
    return await fetchTeamDetails(abbrev, seasonKey);
  });
});

app.get('/api/search-player', async (req) => {
  const { q } = req.query as { q?: string };
  if (!q || q.length < 2) return [];
  return cached(`search:${q}:v3`, 300_000, async () => {
    return await fetchPlayerSearch(q);
  });
});

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  let distPath = process.env.WEB_DIST_PATH;
  if (!distPath) {
    const pathsToTry = [
      path.resolve(__dirname, '../../web/dist'),
      path.resolve(__dirname, '../apps/web/dist'),
      path.resolve(__dirname, 'apps/web/dist'),
      path.resolve(process.cwd(), 'apps/web/dist'),
      path.resolve(process.cwd(), 'dist')
    ];
    for (const p of pathsToTry) {
      if (fs.existsSync(path.join(p, 'index.html'))) {
        distPath = p;
        break;
      }
    }
  }
  if (distPath) {
    await app.register(fastifyStatic, { root: distPath, prefix: '/', wildcard: false });
    console.log('Serving static files from:', distPath);
  } else {
    console.warn('Static files not found in any of the standard paths.');
  }
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) {
      reply.code(404).send({ error: 'Not found' });
      return;
    }
    reply.sendFile('index.html');
  });
} catch (e) {
  console.warn('Error setting up static files:', (e as Error).message);
}

await app.listen({ port: 3001, host: '0.0.0.0' });
console.log('API is running on http://localhost:3001');
