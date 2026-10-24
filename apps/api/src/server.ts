import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fetchStandingsRaw, fetchScheduleRaw, fetchTeamSchedule, fetchStandingsSeasons,
  fetchPlayoffBracket, fetchTeamRoster, fetchEspnRoster, fetchPlayer, fetchGame,
  fetchClubStats, fetchSkaterLeaders, fetchGoalieLeaders, fetchEspnInjuries, fetchPlayerSearch,
  fetchEspnNews,
} from './nhl';
import { normalizeStandings, normalizeSchedule } from './normalize';
import { cached } from './cache';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const SEASON_END_DATES: Record<string, string> = {
  '20252026': '2026-04-16', '20242025': '2025-04-17', '20232024': '2024-04-18',
  '20222023': '2023-04-14', '20212022': '2022-04-29', '20202021': '2021-05-19',
  '20192020': '2020-03-11', '20182019': '2019-04-06', '20172018': '2018-04-08',
  '20162017': '2017-04-09', '20152016': '2016-04-10', '20142015': '2015-04-11',
};

const ESPN_TO_NHL_MAP: Record<string, string> = {
  TB: 'TBL', SJ: 'SJS', LA: 'LAK', NJ: 'NJD',
};

// КЭШ ПЕРЕВОДОВ (чтобы не переводить одно и то же дважды)
const translationCache = new Map<string, string>();

const TEAM_NAMES: [string, string][] = [
  ['Maple Leafs', 'Торонто Мейпл Лифс'], ['Golden Knights', 'Вегас Голден Найтс'],
  ['Blue Jackets', 'Коламбус Блю Джекетс'], ['Red Wings', 'Детройт Ред Уингз'],
  ['Blackhawks', 'Чикаго Блэкхокс'], ['Hurricanes', 'Каролина Харрикейнз'],
  ['Avalanche', 'Колорадо Эвеланш'], ['Predators', 'Нэшвилл Предаторз'],
  ['Islanders', 'Нью-Йорк Айлендерс'], ['Canadiens', 'Монреаль Канадиенс'],
  ['Penguins', 'Питтсбург Пингвинз'], ['Lightning', 'Тампа-Бэй Лайтнинг'],
  ['Panthers', 'Флорида Пантерз'], ['Capitals', 'Вашингтон Кэпиталз'],
  ['Senators', 'Оттава Сенаторз'], ['Rangers', 'Нью-Йорк Рейнджерс'],
  ['Flyers', 'Филадельфия Флайерз'], ['Sabres', 'Баффало Сейбрз'],
  ['Bruins', 'Бостон Брюинз'], ['Devils', 'Нью-Джерси Девилз'],
  ['Kraken', 'Сиэтл Кракен'], ['Mammoth', 'Юта Маммот'],
  ['Oilers', 'Эдмонтон Ойлерз'], ['Flames', 'Калгари Флэймз'],
  ['Canucks', 'Ванкувер Кэнакс'], ['Sharks', 'Сан-Хосе Шаркс'],
  ['Ducks', 'Анахайм Дакс'], ['Kings', 'Лос-Анджелес Кингз'],
  ['Stars', 'Даллас Старз'], ['Jets', 'Виннипег Джетс'],
  ['Wild', 'Миннесота Уайлд'], ['Blues', 'Сент-Луис Блюз'],
];

// Простой запрос к Google с задержкой
async function translateGoogleRaw(text: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ru&dt=t&q=${encodeURIComponent(text)}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!r.ok) {
      console.error(`[Google Translate] Failed with status ${r.status}`);
      return null;
    }
    const data: any = await r.json();
    return data[0].map((item: any) => item[0]).join('');
  } catch (e) {
    console.error(`[Google Translate] Error:`, (e as Error).message);
    return null;
  }
}

async function translateToRu(text: string, lastName?: string): Promise<string> {
  if (!text) return '';
  
  const trimmed = text.trim().toLowerCase();
  if (trimmed === 'ir') return 'Резерв травмированных';
  if (trimmed === 'ir-nr') return 'Резерв травмированных (вне состава)';
  if (trimmed === 'ir-lt') return 'Резерв травмированных (долгосрочно)';
  if (trimmed === 'day-to-day' || trimmed === 'day to day') return 'Под вопросом';
  if (trimmed === 'out') return 'Вне игры';

  // Кэш
  const cacheKey = `${text}|${lastName || ''}`;
  const cachedResult = translationCache.get(cacheKey);
  if (cachedResult) return cachedResult;

  let textToTranslate = text;
  let hasName = false;

  if (lastName && lastName.length > 2) {
    const safeLastName = lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${safeLastName}\\b`, 'gi');
    if (regex.test(textToTranslate)) {
      textToTranslate = textToTranslate.replace(regex, 'XPLAYERX');
      hasName = true;
    }
  }

  const teamReplacements: { placeholder: string; ru: string }[] = [];
  TEAM_NAMES.forEach(([en, ru], idx) => {
    const safeEn = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${safeEn}\\b`, 'gi');
    if (regex.test(textToTranslate)) {
      const placeholder = `XTEAM${idx}X`;
      textToTranslate = textToTranslate.replace(regex, placeholder);
      teamReplacements.push({ placeholder, ru });
    }
  });

  const terms: [RegExp, string][] = [
    [/\binjured reserve\b/gi, 'XINJRESX'],
    [/\blower body\b/gi, 'XLOWERX'],
    [/\bupper body\b/gi, 'XUPPERX'],
    [/\billness\b/gi, 'XILLX'],
  ];

  for (const [regex, placeholder] of terms) {
    textToTranslate = textToTranslate.replace(regex, placeholder);
  }

  // Пытаемся перевести: до 3 попыток
  let translated: string | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    translated = await translateGoogleRaw(textToTranslate);
    if (translated) break;
    if (attempt < 3) {
      // Задержка перед повтором: 500ms, 1500ms
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }

  if (!translated) {
    console.error(`[Translate] All attempts failed for: ${text.substring(0, 50)}...`);
    return text; // Возвращаем оригинал
  }

  const replacements: [RegExp, string][] = [
    [/XINJRESX/gi, 'резерв травмированных'],
    [/XLOWERX/gi, 'нижняя часть тела'],
    [/XUPPERX/gi, 'верхняя часть тела'],
    [/XILLX/gi, 'болезнь'],
  ];
  for (const [regex, replacement] of replacements) {
    translated = translated.replace(regex, replacement);
  }

  teamReplacements.forEach(({ placeholder, ru }) => {
    const regex = new RegExp(placeholder, 'gi');
    translated = translated!.replace(regex, ru);
  });

  if (hasName && lastName) {
    translated = translated.replace(/XPLAYERX/gi, lastName);
  }

  translationCache.set(cacheKey, translated);
  return translated;
}

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

async function getBulkScheduleData(asOfDate: string, teams: string[]) {
  const base = new Date(asOfDate + 'T00:00:00Z');
  const datesToFetch: string[] = [];
  for (const offset of [-14, -7, 0, 7, 14]) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + offset);
    datesToFetch.push(d.toISOString().split('T')[0]);
  }
  const responses = await Promise.allSettled(datesToFetch.map(d => fetchScheduleRaw(d)));
  const allGames: any[] = [];
  const seen = new Set<number>();

  for (const r of responses) {
    if (r.status !== 'fulfilled') continue;
    const raw = r.value;
    if (!raw?.gameWeek) continue;
    for (const day of raw.gameWeek) {
      if (!day.games) continue;
      for (const g of day.games) {
        if (g.gameType !== 2 && g.gameType !== 3) continue;
        if (seen.has(g.id)) continue;
        seen.add(g.id);
        const gameDate = g.gameDate || day.date || (g.startTimeUTC ? g.startTimeUTC.slice(0, 10) : '');
        if (gameDate) allGames.push({ ...g, _gameDate: gameDate });
      }
    }
  }
  allGames.sort((a, b) => a._gameDate.localeCompare(b._gameDate));

  const last5Map: Record<string, any[]> = {};
  const nextGamesMap: Record<string, any> = {};
  for (const team of teams) last5Map[team] = [];

  for (const g of allGames) {
    const isFinal = g.gameState === 'FINAL' || g.gameState === 'OFF';
    for (const teamAbbrev of [g.homeTeam?.abbrev, g.awayTeam?.abbrev]) {
      if (!teamAbbrev) continue;
      if (g._gameDate <= asOfDate) {
        if (isFinal) last5Map[teamAbbrev].push(g);
      } else {
        if (!nextGamesMap[teamAbbrev]) nextGamesMap[teamAbbrev] = g;
      }
    }
  }

  for (const team of teams) {
    last5Map[team] = last5Map[team].slice(-5);
    if (!nextGamesMap[team]) nextGamesMap[team] = null;
  }
  return { last5Map, nextGamesMap };
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
  const today = new Date().toISOString().split('T')[0];
  let targetDate = date || today;
  let seasonStr = season;
  if (!targetDate && season) {
    const endDate = await getSeasonEndDate(season);
    if (endDate) targetDate = endDate;
  }
  if (targetDate > today) targetDate = today;

  let asOf = targetDate;
  const d = new Date(asOf + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  asOf = d.toISOString().split('T')[0];

  if (!seasonStr) seasonStr = seasonFromDate(asOf);
  const cacheKey = `standings:${asOf}:${seasonStr}:v2`;

  return cached(cacheKey, 60_000, async () => {
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
    if (!raw?.standings?.length) throw lastError ?? new Error(`No standings for ${asOf}`);
    const teams = raw.standings.map((s: any) => s.teamAbbrev.default);
    const { last5Map, nextGamesMap } = await cached(`bulk-schedule:${asOf}:v7`, 600_000, () =>
      getBulkScheduleData(asOf!, teams)
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
    const gameWeek = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b))
      .map(([date, gs]) => ({ date, dayAbbrev: '', numberOfGames: gs.length, games: gs.map(({ _date, ...rest }) => rest) }));
    return normalizeSchedule({ gameWeek });
  });
});

app.get('/api/calendar', async (req) => {
  const { month } = req.query as { month?: string };
  if (!month) throw new Error('Month parameter is required');
  const cacheKey = `calendar:${month}:v2`;
  return cached(cacheKey, 3_600_000, async () => {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const firstDay = new Date(Date.UTC(year, monthNum - 1, 1));
    const lastDay = new Date(Date.UTC(year, monthNum, 0));
    const datesToFetch: string[] = [];
    let curr = new Date(firstDay);
    curr.setUTCDate(curr.getUTCDate() - 7);
    const endBoundary = new Date(lastDay);
    endBoundary.setUTCDate(endBoundary.getUTCDate() + 7);
    while (curr <= endBoundary) {
      datesToFetch.push(curr.toISOString().split('T')[0]);
      curr.setUTCDate(curr.getUTCDate() + 7);
    }
    const lastDayStr = endBoundary.toISOString().split('T')[0];
    if (!datesToFetch.includes(lastDayStr)) datesToFetch.push(lastDayStr);

    const responses = await Promise.allSettled(datesToFetch.map(d => fetchScheduleRaw(d)));
    const allGames: any[] = [];
    const seen = new Set<number>();
    for (const r of responses) {
      if (r.status !== 'fulfilled') continue;
      const raw = r.value;
      if (!raw?.gameWeek) continue;
      for (const day of raw.gameWeek) {
        for (const g of day.games) {
          if (g.gameType !== 2 && g.gameType !== 3) continue;
          if (!seen.has(g.id)) {
            seen.add(g.id);
            allGames.push({ id: g.id, date: day.date, startTimeUTC: g.startTimeUTC, gameState: g.gameState, awayAbbrev: g.awayTeam?.abbrev, homeAbbrev: g.homeTeam?.abbrev, awayScore: g.awayTeam?.score, homeScore: g.homeTeam?.score });
          }
        }
      }
    }
    return allGames;
  });
});

app.get('/api/news', async (req) => {
  const { lang } = req.query as { lang?: string };
  const isRu = lang === 'ru';
  
  return cached(`news:${lang || 'en'}:v10`, 600_000, async () => {
    try {
      const raw: any = await fetchEspnNews();
      const articles = raw?.articles || [];
      const result: any[] = [];

      if (isRu) {
        // Последовательно, с задержкой 100мс
        for (const a of articles) {
          let title = a.headline || '';
          let desc = a.description || '';
          title = await translateToRu(title);
          if (desc) desc = await translateToRu(desc);
          
          result.push({
            id: a.id, title, description: desc, image: a.images?.[0]?.url,
            link: a.links?.web?.href || a.links?.api?.news?.href, published: a.published,
            translatedBy: 'google'
          });
          await new Promise(r => setTimeout(r, 100));
        }
      } else {
        for (const a of articles) {
          result.push({
            id: a.id, title: a.headline || '', description: a.description || '', 
            image: a.images?.[0]?.url, link: a.links?.web?.href || a.links?.api?.news?.href, published: a.published,
            translatedBy: 'none'
          });
        }
      }
      return result.slice(0, 15);
    } catch (e) {
      return [];
    }
  });
});

app.get('/api/playoffs', async (req) => {
  const { season } = req.query as { season?: string };
  const targetSeason = season ?? '20262027';
  const endYearStr = targetSeason.slice(4, 8);
  const yearNum = parseInt(endYearStr, 10);
  const now = new Date();
  if (yearNum < now.getFullYear() || (yearNum === now.getFullYear() && now.getMonth() + 1 >= 4)) {
    return cached(`playoffs:${endYearStr}`, 300_000, async () => await fetchPlayoffBracket(endYearStr));
  }
  return { series: [], notStarted: true, season: targetSeason };
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
      fetchTeamRoster(abbrev, seasonStr), fetchTeamSchedule(abbrev, seasonStr),
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
      const mapToLeader = (p: any) => ({ playerId: p.playerId, name: p.firstName?.default && p.lastName?.default ? `${p.firstName.default} ${p.lastName.default}` : (p.name?.default ?? '—'), headshot: p.headshot, position: p.positionCode, sweaterNumber: p.sweaterNumber, teamAbbrev: abbrev });
      const byPoints = [...skaters].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, 3).map((p: any) => ({ ...mapToLeader(p), goals: p.goals ?? 0, assists: p.assists ?? 0, points: p.points ?? 0 }));
      const byGoals = [...skaters].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0)).slice(0, 3).map((p: any) => ({ ...mapToLeader(p), goals: p.goals ?? 0 }));
      const bestGoalie = goalies.length > 0 ? (() => { const sorted = [...goalies].sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0) || (b.savePctg ?? 0) - (a.savePctg ?? 0)); const g = sorted[0]; return { ...mapToLeader(g), wins: g.wins ?? 0, losses: g.losses ?? 0, otLosses: g.otLosses ?? 0, gaa: g.goalsAgainstAvg ?? g.gaa, savePctg: g.savePctg, shutouts: g.shutouts ?? 0 }; })() : null;
      leaders = { points: byPoints, goals: byGoals, goalie: bestGoalie };
    }
    const games = (schedule?.games ?? []).filter((g: any) => g.gameType === 2 || g.gameType === 3);
    const today = new Date().toISOString().split('T')[0];
    const past = games.filter((g: any) => { const key = gameSortKey(g); return key && key.slice(0, 10) <= today && (g.gameState === 'FINAL' || g.gameState === 'OFF'); }).sort((a: any, b: any) => gameSortKey(b).localeCompare(gameSortKey(a))).slice(0, 10);
    const future = games.filter((g: any) => { const key = gameSortKey(g); return key && key.slice(0, 10) > today; }).sort((a: any, b: any) => gameSortKey(a).localeCompare(gameSortKey(b))).slice(0, 5);
    return { roster, past, future, leaders };
  });
});

app.get('/api/player/:id', async (req) => {
  const { id } = req.params as { id: string };
  return cached(`player:${id}`, 300_000, async () => await fetchPlayer(id));
});

app.get('/api/game/:id', async (req) => {
  const { id } = req.params as { id: string };
  return cached(`game:${id}`, 60_000, async () => await fetchGame(id));
});

app.get('/api/leaders', async (req) => {
  const { season } = req.query as { season?: string };
  const seasonStr = season ?? '20262027';
  return cached(`leaders:${seasonStr}`, 300_000, async () => {
    const [skaters, goalies] = await Promise.all([fetchSkaterLeaders(seasonStr).catch(() => null), fetchGoalieLeaders(seasonStr).catch(() => null)]);
    return { skaters, goalies };
  });
});

app.get('/api/search-player', async (req) => {
  const { q, team } = req.query as { q: string, team?: string };
  if (!q) return [];
  return cached(`search:${q}:${team ?? ''}`, 86400000, async () => {
    try {
      const data: any = await fetchPlayerSearch(q);
      if (Array.isArray(data) && data.length > 0) {
        let matches = data;
        if (team) {
          const teamMatches = matches.filter((p: any) => p.teamAbbrev === team || p.lastTeamAbbrev === team);
          if (teamMatches.length > 0) matches = teamMatches;
        }
        return matches;
      }
      return [];
    } catch (e) { return []; }
  });
});

app.get('/api/injuries', async (req) => {
  const { lang } = req.query as { lang?: string };
  const isRu = lang === 'ru';
  
  return cached(`injuries:all:${lang || 'en'}:v17`, 300_000, async () => {
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
      
      if (isRu && result.length > 0) {
        // Последовательно, с задержкой 100мс и кэшем
        let failedCount = 0;
        for (let i = 0; i < result.length; i++) {
          if (result[i].comment) {
            const parts = (result[i].playerName || '').split(' ');
            const lastName = parts.length > 0 ? parts[parts.length - 1] : '';
            const before = result[i].comment;
            const after = await translateToRu(before, lastName);
            if (after === before && before !== 'ir') {
              failedCount++;
            }
            result[i].comment = after;
            result[i].translatedBy = after !== before ? 'google' : 'none';
            await new Promise(r => setTimeout(r, 100));
          }
        }
        if (failedCount > 0) {
          console.error(`[Injuries] Failed to translate ${failedCount}/${result.length} comments`);
        }
      }
      return result;
    } catch (e) { return []; }
  });
});

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = process.env.WEB_DIST_PATH || path.resolve(__dirname, '../../web/dist');
  await app.register(fastifyStatic, { root: distPath, prefix: '/', wildcard: false });
  app.setNotFoundHandler((req, reply) => { if (req.url.startsWith('/api/')) reply.code(404).send({ error: 'Not found' }); else reply.sendFile('index.html'); });
} catch (e) {}

await app.listen({ port: 3001, host: '0.0.0.0' });
console.log('API is running on http://localhost:3001');
