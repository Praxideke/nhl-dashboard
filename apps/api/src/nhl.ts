const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl';
const ESPN_V2 = 'https://site.api.espn.com/apis/v2/sports/hockey/nhl';
const ESPN_WEB = 'https://site.web.api.espn.com/apis/common/v3/sports/hockey/nhl';
const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl';

const ESPN_TEAM_MAP: Record<string, string> = {
  TBL: 'tb', SJS: 'sj', LAK: 'la', NJD: 'nj', CBJ: 'cbj', WSH: 'wsh', VGK: 'vgk', UTA: 'utah',
};

const ALL_TEAMS = [
  { abbrev: 'BOS', name: 'Boston Bruins', conf: 'Eastern', div: 'Atlantic' },
  { abbrev: 'BUF', name: 'Buffalo Sabres', conf: 'Eastern', div: 'Atlantic' },
  { abbrev: 'DET', name: 'Detroit Red Wings', conf: 'Eastern', div: 'Atlantic' },
  { abbrev: 'FLA', name: 'Florida Panthers', conf: 'Eastern', div: 'Atlantic' },
  { abbrev: 'MTL', name: 'Montreal Canadiens', conf: 'Eastern', div: 'Atlantic' },
  { abbrev: 'OTT', name: 'Ottawa Senators', conf: 'Eastern', div: 'Atlantic' },
  { abbrev: 'TBL', name: 'Tampa Bay Lightning', conf: 'Eastern', div: 'Atlantic' },
  { abbrev: 'TOR', name: 'Toronto Maple Leafs', conf: 'Eastern', div: 'Atlantic' },
  { abbrev: 'CAR', name: 'Carolina Hurricanes', conf: 'Eastern', div: 'Metropolitan' },
  { abbrev: 'CBJ', name: 'Columbus Blue Jackets', conf: 'Eastern', div: 'Metropolitan' },
  { abbrev: 'NJD', name: 'New Jersey Devils', conf: 'Eastern', div: 'Metropolitan' },
  { abbrev: 'NYI', name: 'New York Islanders', conf: 'Eastern', div: 'Metropolitan' },
  { abbrev: 'NYR', name: 'New York Rangers', conf: 'Eastern', div: 'Metropolitan' },
  { abbrev: 'PHI', name: 'Philadelphia Flyers', conf: 'Eastern', div: 'Metropolitan' },
  { abbrev: 'PIT', name: 'Pittsburgh Penguins', conf: 'Eastern', div: 'Metropolitan' },
  { abbrev: 'WSH', name: 'Washington Capitals', conf: 'Eastern', div: 'Metropolitan' },
  { abbrev: 'CHI', name: 'Chicago Blackhawks', conf: 'Western', div: 'Central' },
  { abbrev: 'COL', name: 'Colorado Avalanche', conf: 'Western', div: 'Central' },
  { abbrev: 'DAL', name: 'Dallas Stars', conf: 'Western', div: 'Central' },
  { abbrev: 'MIN', name: 'Minnesota Wild', conf: 'Western', div: 'Central' },
  { abbrev: 'NSH', name: 'Nashville Predators', conf: 'Western', div: 'Central' },
  { abbrev: 'STL', name: 'St. Louis Blues', conf: 'Western', div: 'Central' },
  { abbrev: 'WPG', name: 'Winnipeg Jets', conf: 'Western', div: 'Central' },
  { abbrev: 'UTA', name: 'Utah Hockey Club', conf: 'Western', div: 'Central' },
  { abbrev: 'ANA', name: 'Anaheim Ducks', conf: 'Western', div: 'Pacific' },
  { abbrev: 'CGY', name: 'Calgary Flames', conf: 'Western', div: 'Pacific' },
  { abbrev: 'EDM', name: 'Edmonton Oilers', conf: 'Western', div: 'Pacific' },
  { abbrev: 'LAK', name: 'Los Angeles Kings', conf: 'Western', div: 'Pacific' },
  { abbrev: 'SJS', name: 'San Jose Sharks', conf: 'Western', div: 'Pacific' },
  { abbrev: 'SEA', name: 'Seattle Kraken', conf: 'Western', div: 'Pacific' },
  { abbrev: 'VAN', name: 'Vancouver Canucks', conf: 'Western', div: 'Pacific' },
  { abbrev: 'VGK', name: 'Vegas Golden Knights', conf: 'Western', div: 'Pacific' },
];

const EAST_TEAMS = new Set(['BOS','BUF','DET','FLA','MTL','OTT','TBL','TOR','CAR','CBJ','NJD','NYI','NYR','PHI','PIT','WSH']);

const COUNTRY_MAP: Record<string, string> = {
  CAN: 'Canada', USA: 'USA', RUS: 'Russia', URS: 'Russia', USSR: 'Russia', SOV: 'Russia',
  SWE: 'Sweden', FIN: 'Finland', CZE: 'Czechia', CSK: 'Czechia', SVK: 'Slovakia',
  GER: 'Germany', FRG: 'Germany', GDR: 'Germany', SUI: 'Switzerland',
  LAT: 'Latvia', BLR: 'Belarus', UKR: 'Ukraine', KAZ: 'Kazakhstan',
  DEN: 'Denmark', NOR: 'Norway', AUT: 'Austria', FRA: 'France',
};

const seasonGamesCache = new Map<string, any[]>();

function fixAbbrev(abbrev: string) {
  const map: Record<string, string> = { TB: 'TBL', SJ: 'SJS', LA: 'LAK', NJ: 'NJD' };
  return map[abbrev] || abbrev;
}

function getLogo(abbrev: string) {
  return `https://assets.nhle.com/logos/nhl/svg/${fixAbbrev(abbrev)}_dark.svg`;
}

function prettifySlug(slug: string): string {
  if (!slug) return '';
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function extractTeamName(s: any): string {
  if (!s) return '—';
  const stringCandidates = [s.teamName, s.teamDisplayName, s.teamAbbreviation, s.teamAbbrev];
  for (const c of stringCandidates) {
    if (typeof c === 'string' && c.trim()) return c;
    if (c && typeof c === 'object' && typeof c.default === 'string' && c.default.trim()) return c.default;
  }
  if (s.team) {
    const t = s.team;
    if (typeof t.displayName === 'string' && t.displayName) return t.displayName;
    if (typeof t.name === 'string' && t.name) return t.name;
    if (typeof t.abbreviation === 'string' && t.abbreviation) return t.abbreviation;
    if (typeof t.shortDisplayName === 'string' && t.shortDisplayName) return t.shortDisplayName;
  }
  if (typeof s.teamSlug === 'string' && s.teamSlug) return prettifySlug(s.teamSlug);
  return '—';
}

function extractBirthPlace(athlete: any): { city: string, country: string } {
  let city = '';
  let country = '';
  const place = athlete.birthPlace || athlete.birthLocation || athlete.hometown;

  if (place) {
    if (typeof place === 'string') {
      const parts = place.split(',').map((s: string) => s.trim());
      if (parts.length > 1) {
        country = parts.pop() || '';
        city = parts.join(', ');
      } else {
        city = place;
      }
    } else if (typeof place === 'object') {
      city = place.city || place.name || '';
      if (place.country) {
        if (typeof place.country === 'string') {
          country = place.country;
        } else if (typeof place.country === 'object') {
          country = place.country.name || place.country.abbreviation || '';
        }
      }
    }
  }

  if (!city && athlete.birthCity) city = athlete.birthCity;
  if (!country && athlete.birthCountry) {
    if (typeof athlete.birthCountry === 'string') {
      country = athlete.birthCountry;
    } else if (typeof athlete.birthCountry === 'object') {
      country = athlete.birthCountry.name || athlete.birthCountry.abbreviation || '';
    }
  }

  if (country && COUNTRY_MAP[country.toUpperCase()]) {
    country = COUNTRY_MAP[country.toUpperCase()];
  }

  return { city: city || '', country: country || '' };
}

async function fetchCoreAthlete(playerId: string | number): Promise<any> {
  try {
    const url = `${ESPN_CORE}/athletes/${playerId}?lang=en&region=us`;
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function resolveCoreRef(refUrl: string): Promise<any> {
  try {
    const fixedUrl = refUrl.replace('sports.core.api.espn.pvt', 'sports.core.api.espn.com');
    const r = await fetch(fixedUrl);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function fetchSeasonGames(season: string): Promise<any[]> {
  if (seasonGamesCache.has(season)) return seasonGamesCache.get(season)!;

  const startYear = Number(season.substring(0, 4));
  const endYear = Number(season.substring(4, 8));

  const months: string[] = [];
  for (const m of ['10', '11', '12']) months.push(`${startYear}${m}`);
  for (const m of ['01', '02', '03', '04', '05', '06']) months.push(`${endYear}${m}`);

  const allEvents: any[] = [];
  for (const m of months) {
    try {
      const url = `${ESPN_BASE}/scoreboard?dates=${m}&seasontype=2&limit=1000`;
      const r = await fetch(url);
      if (!r.ok) continue;
      const data: any = await r.json();
      if (Array.isArray(data.events)) allEvents.push(...data.events);
    } catch {}
  }

  const seen = new Set<string>();
  const unique = allEvents.filter((e: any) => {
    const id = String(e.id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  seasonGamesCache.set(season, unique);
  return unique;
}

export async function fetchStandingsForDate(season: string, asOfDate: string) {
  const events = await fetchSeasonGames(season);

  type RowStats = {
    w: number; l: number; otl: number; pts: number; gp: number;
    gf: number; ga: number;
    homeW: number; homeL: number; homeO: number;
    roadW: number; roadL: number; roadO: number;
    streak: string;
    last5: string[];
  };

  const stats: Record<string, RowStats> = {};
  for (const t of ALL_TEAMS) {
    stats[t.abbrev] = {
      w: 0, l: 0, otl: 0, pts: 0, gp: 0, gf: 0, ga: 0,
      homeW: 0, homeL: 0, homeO: 0,
      roadW: 0, roadL: 0, roadO: 0,
      streak: '-',
      last5: [],
    };
  }

  type GameResult = { date: string; result: 'W' | 'L' | 'OTL' };
  const resultsByTeam: Record<string, GameResult[]> = {};
  for (const t of ALL_TEAMS) resultsByTeam[t.abbrev] = [];

  const sortedEvents = [...events].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const event of sortedEvents) {
    const comp = event.competitions?.[0];
    if (!comp) continue;
    if (comp.status?.type?.state !== 'post') continue;

    const gameDate = event.date.split('T')[0];
    if (gameDate >= asOfDate) continue;

    const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
    const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
    if (!home || !away) continue;

    const homeAbbr = fixAbbrev(home.team?.abbreviation || '');
    const awayAbbr = fixAbbrev(away.team?.abbreviation || '');
    if (!stats[homeAbbr] || !stats[awayAbbr]) continue;

    const homeScore = Number(home.score?.value ?? home.score ?? 0);
    const awayScore = Number(away.score?.value ?? away.score ?? 0);

    const pType = String(comp.status?.period?.type || '').toUpperCase();
    const desc = String(comp.status?.type?.description || '');
    const isOvertime = pType === 'OT' || pType === 'SO' || desc.includes('OT') || desc.includes('SO');

    stats[homeAbbr].gp++;
    stats[awayAbbr].gp++;
    stats[homeAbbr].gf += homeScore;
    stats[homeAbbr].ga += awayScore;
    stats[awayAbbr].gf += awayScore;
    stats[awayAbbr].ga += homeScore;

    if (homeScore > awayScore) {
      stats[homeAbbr].w++;
      stats[homeAbbr].homeW++;
      stats[homeAbbr].pts += 2;
      if (isOvertime) {
        stats[awayAbbr].otl++;
        stats[awayAbbr].roadO++;
        stats[awayAbbr].pts += 1;
      } else {
        stats[awayAbbr].l++;
        stats[awayAbbr].roadL++;
      }
      resultsByTeam[homeAbbr].push({ date: gameDate, result: 'W' });
      resultsByTeam[awayAbbr].push({ date: gameDate, result: isOvertime ? 'OTL' : 'L' });
    } else {
      stats[awayAbbr].w++;
      stats[awayAbbr].roadW++;
      stats[awayAbbr].pts += 2;
      if (isOvertime) {
        stats[homeAbbr].otl++;
        stats[homeAbbr].homeO++;
        stats[homeAbbr].pts += 1;
      } else {
        stats[homeAbbr].l++;
        stats[homeAbbr].homeL++;
      }
      resultsByTeam[awayAbbr].push({ date: gameDate, result: 'W' });
      resultsByTeam[homeAbbr].push({ date: gameDate, result: isOvertime ? 'OTL' : 'L' });
    }
  }

  for (const t of ALL_TEAMS) {
    const teamResults = resultsByTeam[t.abbrev];
    teamResults.sort((a, b) => a.date.localeCompare(b.date));
    const last5 = teamResults.slice(-5).reverse().map(r => r.result);
    stats[t.abbrev].last5 = last5;

    let streak = '-';
    if (teamResults.length > 0) {
      const lastResult = teamResults[teamResults.length - 1].result;
      let count = 0;
      for (let i = teamResults.length - 1; i >= 0; i--) {
        if (teamResults[i].result === lastResult) count++;
        else break;
      }
      if (lastResult === 'W') streak = `W${count}`;
      else if (lastResult === 'OTL') streak = `OTL${count}`;
      else streak = `L${count}`;
    }
    stats[t.abbrev].streak = streak;
  }

  const rows = ALL_TEAMS.map(t => {
    const s = stats[t.abbrev];
    return {
      team: { abbrev: t.abbrev, name: t.name, logo: getLogo(t.abbrev) },
      conference: t.conf,
      division: t.div,
      rank: 0,
      gamesPlayed: s.gp,
      wins: s.w,
      losses: s.l,
      otLosses: s.otl,
      points: s.pts,
      pointPctg: s.gp > 0 ? s.pts / (s.gp * 2) : 0,
      regulationWins: s.w,
      regulationPlusOtWins: s.w,
      goalDiff: s.gf - s.ga,
      goalFor: s.gf,
      goalAgainst: s.ga,
      homeRecord: s.gp > 0 ? `${s.homeW}-${s.homeL}-${s.homeO}` : '-',
      roadRecord: s.gp > 0 ? `${s.roadW}-${s.roadL}-${s.roadO}` : '-',
      streak: s.streak,
      last5: s.last5,
      last5Games: [],
      clinchIndicator: '',
    };
  });

  rows.sort((a, b) => b.points - a.points || b.pointPctg - a.pointPctg || b.goalDiff - a.goalDiff);
  rows.forEach((r, i) => { r.rank = i + 1; });

  return rows;
}

export async function fetchStandingsRaw(season?: string) {
  let url = `${ESPN_V2}/standings`;
  if (season && season.length === 8) {
    url += `?season=${season.substring(4)}`;
  }

  const r = await fetch(url);
  if (!r.ok) throw new Error(`ESPN standings ${r.status}`);
  const data: any = await r.json();

  const espnStats: Record<string, any> = {};

  if (data.children) {
    for (const conf of data.children) {
      if (conf.standings && conf.standings.entries) {
        for (const entry of conf.standings.entries) {
          const team = entry.team;
          const stats: any[] = entry.stats || [];

          const getStat = (name: string) => {
            const s = stats.find((x: any) =>
              (x.name && x.name.toLowerCase() === name.toLowerCase()) ||
              (x.abbreviation && x.abbreviation.toLowerCase() === name.toLowerCase())
            );
            return s ? Number(s.value) : 0;
          };

          const getStrStat = (name: string) => {
            const s = stats.find((x: any) =>
              (x.name && x.name.toLowerCase() === name.toLowerCase()) ||
              (x.abbreviation && x.abbreviation.toLowerCase() === name.toLowerCase())
            );
            return s ? s.displayValue : '';
          };

          const homeRecordStr = getStrStat('home') || getStrStat('homeRecord');
          const homeW = getStat('homeWins');
          const homeL = getStat('homeLosses');
          const homeO = getStat('homeOtl') || getStat('homeTies') || getStat('homeOTLosses');
          const homeRecord = homeRecordStr || (homeW > 0 || homeL > 0 ? `${homeW}-${homeL}-${homeO}` : '-');

          const roadRecordStr = getStrStat('road') || getStrStat('away') || getStrStat('roadRecord') || getStrStat('awayRecord');
          const roadW = getStat('roadWins') || getStat('awayWins');
          const roadL = getStat('roadLosses') || getStat('awayLosses');
          const roadO = getStat('roadOtl') || getStat('awayOtl') || getStat('roadTies') || getStat('awayTies') || getStat('roadOTLosses');
          const roadRecord = roadRecordStr || (roadW > 0 || roadL > 0 ? `${roadW}-${roadL}-${roadO}` : '-');

          espnStats[fixAbbrev(team.abbreviation)] = {
            gamesPlayed: getStat('gamesPlayed'),
            wins: getStat('wins'),
            losses: getStat('losses'),
            otLosses: getStat('otLosses'),
            points: getStat('points'),
            regulationWins: getStat('regulationWins') || getStat('wins'),
            goalDiff: getStat('pointDifferential') || (getStat('pointsFor') - getStat('pointsAgainst')),
            goalFor: getStat('pointsFor') || getStat('goalsFor'),
            goalAgainst: getStat('pointsAgainst') || getStat('goalsAgainst'),
            homeRecord: homeRecord,
            roadRecord: roadRecord,
            streak: getStrStat('streak') || 'W0',
          };
        }
      }
    }
  }

  const rows = ALL_TEAMS.map(t => {
    const s = espnStats[t.abbrev] || {};
    return {
      team: { abbrev: t.abbrev, name: t.name, logo: getLogo(t.abbrev) },
      conference: t.conf,
      division: t.div,
      rank: 0,
      gamesPlayed: s.gamesPlayed || 0,
      wins: s.wins || 0,
      losses: s.losses || 0,
      otLosses: s.otLosses || 0,
      points: s.points || 0,
      pointPctg: (s.points || 0) / ((s.gamesPlayed || 0) * 2 || 1),
      regulationWins: s.regulationWins || 0,
      regulationPlusOtWins: s.regulationWins || 0,
      goalDiff: s.goalDiff || 0,
      goalFor: s.goalFor || 0,
      goalAgainst: s.goalAgainst || 0,
      homeRecord: s.homeRecord || '-',
      roadRecord: s.roadRecord || '-',
      streak: s.streak || 'W0',
      last5: [],
      last5Games: [],
      clinchIndicator: ''
    };
  });

  rows.sort((a, b) => b.points - a.points || b.pointPctg - a.pointPctg || b.goalDiff - a.goalDiff);
  rows.forEach((r, i) => { r.rank = i + 1; });

  return rows;
}

export async function fetchTeamLast5(abbrev: string, season?: string, asOfDate?: string): Promise<{ last5: string[], last5Games: any[] }> {
  const espnCode = ESPN_TEAM_MAP[abbrev] ?? abbrev.toLowerCase();
  let url = `${ESPN_BASE}/teams/${espnCode}/schedule`;
  if (season && season.length === 8) {
    url += `?season=${season.substring(4)}`;
  }

  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`ESPN schedule ${abbrev} ${r.status}`);
    const data: any = await r.json();
    const events = data.events || [];

    const completed = events.filter((e: any) => {
      const isPost = e.competitions?.[0]?.status?.type?.state === 'post';
      const gameDate = e.date.split('T')[0];
      return isPost && (!asOfDate || gameDate < asOfDate);
    });
    
    completed.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const last5 = completed.slice(0, 5).reverse();
    const last5Str: string[] = [];
    const last5Games: any[] = [];

    for (const game of last5) {
      const comp = game.competitions[0];
      const home = comp.competitors.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;

      const isHome = fixAbbrev(home.team.abbreviation) === fixAbbrev(abbrev);
      const ourTeam = isHome ? home : away;
      const oppTeam = isHome ? away : home;

      const ourScore = Number(ourTeam.score?.value ?? ourTeam.score ?? 0);
      const oppScore = Number(oppTeam.score?.value ?? oppTeam.score ?? 0);

      const isWin = ourScore > oppScore;
      const desc = comp.status?.type?.description || '';
      const isOvertime = desc.includes('OT') || desc.includes('SO');

      let result = 'L';
      if (isWin) result = 'W';
      else if (isOvertime) result = 'OTL';

      last5Str.push(result);

      last5Games.push({
        gameDate: game.date.split('T')[0],
        startTimeUTC: game.date,
        homeTeam: {
          abbrev: fixAbbrev(home.team.abbreviation),
          score: Number(home.score?.value ?? home.score ?? 0)
        },
        awayTeam: {
          abbrev: fixAbbrev(away.team.abbreviation),
          score: Number(away.score?.value ?? away.score ?? 0)
        }
      });
    }

    return { last5: last5Str, last5Games };
  } catch (e) {
    return { last5: [], last5Games: [] };
  }
}

export async function fetchScheduleRaw(date?: string) {
  const dateStr = date ? date.replace(/-/g, '') : '';
  const url = dateStr ? `${ESPN_BASE}/scoreboard?dates=${dateStr}` : `${ESPN_BASE}/scoreboard`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`ESPN scoreboard ${r.status}`);
  const data: any = await r.json();

  const games: any[] = [];
  if (data.events) {
    for (const event of data.events) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const home = comp.competitors.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;

      let status = 'FUT';
      if (event.status.type.state === 'post') status = 'FINAL';
      else if (event.status.type.state === 'in') status = 'LIVE';

      games.push({
        id: Number(event.id),
        date: event.date.split('T')[0],
        startTimeUTC: event.date,
        status: status,
        period: event.status.displayClock || '',
        gameType: 2,
        homeTeam: {
          abbrev: fixAbbrev(home.team.abbreviation),
          name: home.team.displayName,
          logo: getLogo(home.team.abbreviation),
          score: home.score ? Number(home.score) : 0
        },
        awayTeam: {
          abbrev: fixAbbrev(away.team.abbreviation),
          name: away.team.displayName,
          logo: getLogo(away.team.abbreviation),
          score: away.score ? Number(away.score) : 0
        },
      });
    }
  }
  return games;
}

export async function fetchCalendarRaw(month: string) {
  const cleanMonth = month.replace('-', '');
  const url = `${ESPN_BASE}/scoreboard?dates=${cleanMonth}&limit=1000`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`ESPN calendar ${r.status}`);
  const data: any = await r.json();

  const games: any[] = [];
  if (data.events) {
    for (const event of data.events) {
      const comp = event.competitions?.[0];
      if (!comp) continue;

      const home = comp.competitors.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;

      let gameState = 'FUT';
      if (event.status.type.state === 'post') gameState = 'FINAL';
      else if (event.status.type.state === 'in') gameState = 'LIVE';

      games.push({
        id: Number(event.id),
        date: event.date.split('T')[0],
        startTimeUTC: event.date,
        gameState,
        awayAbbrev: fixAbbrev(away.team.abbreviation),
        homeAbbrev: fixAbbrev(home.team.abbreviation),
        awayScore: away.score ? Number(away.score) : 0,
        homeScore: home.score ? Number(home.score) : 0,
      });
    }
  }
  return games;
}

export async function fetchTeamDetails(abbrev: string, season: string) {
  const espnCode = ESPN_TEAM_MAP[abbrev] ?? abbrev.toLowerCase();

  // 1) Roster
  let roster = { forwards: [] as any[], defensemen: [] as any[], goalies: [] as any[] };
  const rosterIds = new Set<string>();

  try {
    const r = await fetch(`${ESPN_BASE}/teams/${espnCode}/roster`);
    if (r.ok) {
      const data: any = await r.json();
      const rawAthletes: any[] = [];
      if (Array.isArray(data.athletes)) {
        for (const group of data.athletes) {
          if (Array.isArray(group.items)) {
            rawAthletes.push(...group.items);
          } else {
            rawAthletes.push(group);
          }
        }
      }

      for (const a of rawAthletes) {
        const posRaw = a.position?.abbreviation || a.position?.name || '';
        const pos = String(posRaw).toUpperCase();

        rosterIds.add(String(a.id));

        const mappedPlayer = {
          id: a.id,
          sweaterNumber: a.jersey || a.sweaterNumber,
          headshot: a.headshot?.href || a.headshot?.url,
          firstName: { default: a.firstName },
          lastName: { default: a.lastName },
          positionCode: a.position?.abbreviation,
          shootsCatches: a.hand?.abbreviation || '',
          injury: a.injuries?.[0]?.status || null
        };

        if (pos === 'G' || pos.includes('GOAL')) roster.goalies.push(mappedPlayer);
        else if (pos === 'D' || pos.includes('DEFEN')) roster.defensemen.push(mappedPlayer);
        else roster.forwards.push(mappedPlayer);
      }
    }
  } catch (e) { console.error('Roster fetch failed', e); }

  // 2) Schedule
  let past: any[] = [];
  let future: any[] = [];
  try {
    let scheduleUrl = `${ESPN_BASE}/teams/${espnCode}/schedule`;
    if (season && season.length === 8) {
      scheduleUrl += `?season=${season.substring(4)}`;
    }
    const r = await fetch(scheduleUrl);
    if (r.ok) {
      const data: any = await r.json();
      const events = data.events || [];
      for (const e of events) {
        const comp = e.competitions?.[0];
        if (!comp) continue;
        const home = comp.competitors.find((c: any) => c.homeAway === 'home');
        const away = comp.competitors.find((c: any) => c.homeAway === 'away');
        if (!home || !away) continue;

        const gameStateRaw = comp.status?.type?.state;
        const gameState = gameStateRaw === 'post' ? 'FINAL' : (gameStateRaw === 'in' ? 'LIVE' : 'FUT');

        const homeScoreVal = home.score?.value ?? home.score;
        const awayScoreVal = away.score?.value ?? away.score;
        const homeScore = homeScoreVal !== undefined ? Number(homeScoreVal) : 0;
        const awayScore = awayScoreVal !== undefined ? Number(awayScoreVal) : 0;

        const gameObj = {
          id: Number(e.id),
          gameDate: e.date.split('T')[0],
          startTimeUTC: e.date,
          gameState,
          homeTeam: {
            abbrev: fixAbbrev(home.team.abbreviation),
            score: homeScore,
            logo: getLogo(home.team.abbreviation)
          },
          awayTeam: {
            abbrev: fixAbbrev(away.team.abbreviation),
            score: awayScore,
            logo: getLogo(away.team.abbreviation)
          }
        };

        if (gameState === 'FINAL' || gameState === 'LIVE') {
          past.push(gameObj);
        } else {
          future.push(gameObj);
        }
      }
    }
  } catch (e) { console.error('Schedule fetch failed', e); }

  past.sort((a, b) => new Date(b.startTimeUTC).getTime() - new Date(a.startTimeUTC).getTime());
  future.sort((a, b) => new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime());

  // 3) Leaders
  const getTeamLeaders = async (kind: 'skaters' | 'goalies', statCategory: string, sortKey: string, limit: number = 3) => {
    try {
      const url = `${ESPN_WEB}/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=false&limit=1000&sort=${sortKey}:desc&category=${kind}&seasontype=2`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data: any = await res.json();

      const filtered = (data.athletes || []).filter((item: any) => rosterIds.has(String(item.athlete.id)));

      return filtered.slice(0, limit).map((item: any) => {
        const targetCat = item.categories?.find((c: any) => c.name === statCategory);
        return {
          playerId: String(item.athlete.id),
          name: item.athlete.displayName || item.athlete.shortName || '',
          headshot: item.athlete.headshot?.href || '',
          totals: targetCat?.totals || [],
        };
      });
    } catch (e) { return []; }
  };

  const pointsList = await getTeamLeaders('skaters', 'offensive', 'offensive.points', 3);
  const goalsList = await getTeamLeaders('skaters', 'offensive', 'offensive.goals', 3);

  // 4) Вратарь
  let goalie: any = null;
  const goalieCandidates = await getTeamLeaders('goalies', 'general', 'general.wins', 10);

  if (goalieCandidates.length > 0) {
    const g = goalieCandidates[0];
    let wins = 0, losses = 0, otLosses = 0, shutouts = 0;

    try {
      const r = await fetch(`${ESPN_WEB}/athletes/${g.playerId}/stats`);
      if (r.ok) {
        const data: any = await r.json();
        const categories = data.categories || [];
        const regSeason = categories.find((c: any) => c.displayName?.includes('Regular Season'));

        if (regSeason?.statistics && regSeason.names) {
          const names = regSeason.names as string[];
          const statsList = [...regSeason.statistics];
          statsList.sort((a: any, b: any) => (b.season?.year || 0) - (a.season?.year || 0));
          const current = statsList[0];

          if (current) {
            const statMap: Record<string, number> = {};
            const statsArr = current.stats || [];
            for (let i = 0; i < names.length; i++) {
              statMap[names[i]] = Number(statsArr[i]) || 0;
            }
            wins = statMap.wins || 0;
            losses = statMap.losses || 0;
            otLosses = statMap.overtimeLosses || statMap.otLosses || 0;
            shutouts = statMap.shutouts || 0;
          }
        }
      }
    } catch (e) { console.error('Goalie stats fetch failed', e); }

    goalie = { playerId: g.playerId, name: g.name, headshot: g.headshot, wins, losses, otLosses, shutouts };
  }

  return {
    roster,
    past: past.slice(0, 5),
    future: future.slice(0, 5),
    leaders: {
      points: pointsList.map(p => ({ ...p, points: Number(p.totals[2]) || 0 })),
      goals: goalsList.map(p => ({ ...p, goals: Number(p.totals[0]) || 0 })),
      goalie
    }
  };
}

export async function fetchPlayoffBracket(year: string) {
  try {
    const endYear = Number(year.substring(4, 8));
    const months = [
      `${endYear}04`, `${endYear}05`, `${endYear}06`,
      `${endYear}07`, `${endYear}08`, `${endYear}09`,
    ];

    const allEvents: any[] = [];
    for (const m of months) {
      const url = `${ESPN_BASE}/scoreboard?dates=${m}&seasontype=3&limit=1000`;
      try {
        const r = await fetch(url);
        if (!r.ok) continue;
        const data: any = await r.json();
        if (Array.isArray(data.events)) allEvents.push(...data.events);
      } catch {}
    }

    const seen = new Set<string>();
    const uniqueEvents = allEvents.filter((e: any) => {
      const id = String(e.id ?? '');
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const playoffEvents = uniqueEvents.filter((e: any) => e.season?.type === 3);
    if (playoffEvents.length === 0) return { series: [], notStarted: true };

    const matchups: Record<string, any[]> = {};
    for (const event of playoffEvents) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const home = comp.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp.competitors?.find((c: any) => c.homeAway === 'away');
      if (!home || !away) continue;
      const t1 = fixAbbrev(home.team.abbreviation);
      const t2 = fixAbbrev(away.team.abbreviation);
      const key = [t1, t2].sort().join('-');
      if (!matchups[key]) matchups[key] = [];
      matchups[key].push(event);
    }

    type PairInfo = {
      key: string;
      teamA: { id: string; abbrev: string; name: string };
      teamB: { id: string; abbrev: string; name: string };
      winsA: number;
      winsB: number;
      firstPlayoff: string;
      lastPlayoff: string;
      playoffRound: number;
    };

    const pairs: PairInfo[] = [];

    for (const key in matchups) {
      const games = matchups[key];
      games.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const teamById: Record<string, { id: string; abbrev: string; name: string }> = {};
      const winsByTeamId: Record<string, number> = {};
      const firstPlayoff = games[0]?.date || '';
      const lastPlayoff = games[games.length - 1]?.date || '';

      for (const g of games) {
        const c = g.competitions?.[0];
        if (!c) continue;
        for (const compTeam of c.competitors || []) {
          const id = String(compTeam.id);
          if (!teamById[id]) {
            teamById[id] = {
              id,
              abbrev: fixAbbrev(compTeam.team?.abbreviation || ''),
              name: compTeam.team?.displayName || compTeam.team?.name || compTeam.team?.abbreviation || '',
            };
          }
        }
        const sc = c.series?.competitors;
        if (Array.isArray(sc) && sc.length === 2) {
          for (const s of sc) {
            const id = String(s.id);
            const w = Number(s.wins) || 0;
            if (!winsByTeamId[id] || winsByTeamId[id] < w) winsByTeamId[id] = w;
          }
        }
      }

      const teamIds = Object.keys(teamById);
      if (teamIds.length !== 2) continue;

      const a = teamById[teamIds[0]];
      const b = teamById[teamIds[1]];
      if (!a.abbrev || !b.abbrev) continue;

      let winsA = winsByTeamId[a.id] || 0;
      let winsB = winsByTeamId[b.id] || 0;

      if (winsA === 0 && winsB === 0) {
        for (const g of games) {
          const c = g.competitions?.[0];
          if (c?.status?.type?.state !== 'post') continue;
          const gh = c.competitors?.find((x: any) => x.homeAway === 'home');
          const ga = c.competitors?.find((x: any) => x.homeAway === 'away');
          if (!gh || !ga) continue;
          const hs = Number(gh.score?.value ?? gh.score ?? 0);
          const as = Number(ga.score?.value ?? ga.score ?? 0);
          if (!isFinite(hs) || !isFinite(as) || hs === as) continue;
          const winnerAbbr = hs > as ? fixAbbrev(gh.team.abbreviation) : fixAbbrev(ga.team.abbreviation);
          if (winnerAbbr === a.abbrev) winsA++;
          else if (winnerAbbr === b.abbrev) winsB++;
        }
      }

      pairs.push({
        key,
        teamA: a,
        teamB: b,
        winsA,
        winsB,
        firstPlayoff,
        lastPlayoff,
        playoffRound: 0,
      });
    }

    if (pairs.length === 0) return { series: [], notStarted: true };

    pairs.sort((a, b) => new Date(a.firstPlayoff).getTime() - new Date(b.firstPlayoff).getTime());
    const roundSizes = [8, 4, 2, 1];
    let idx = 0;
    for (let r = 0; r < 4; r++) {
      const cnt = Math.min(roundSizes[r], pairs.length - idx);
      for (let k = 0; k < cnt; k++) pairs[idx + k].playoffRound = r + 1;
      idx += cnt;
      if (idx >= pairs.length) break;
    }

    const seriesList = pairs.map((p) => {
      const isEast = EAST_TEAMS.has(p.teamA.abbrev) || EAST_TEAMS.has(p.teamB.abbrev);
      let winningTeamId: number | undefined = undefined;
      if (p.winsA >= 4) {
        const n = Number(p.teamA.id);
        if (isFinite(n) && n > 0) winningTeamId = n;
      } else if (p.winsB >= 4) {
        const n = Number(p.teamB.id);
        if (isFinite(n) && n > 0) winningTeamId = n;
      }

      return {
        seriesTitle: 'Playoff Series',
        playoffRound: p.playoffRound,
        topSeedRankAbbrev: '',
        topSeedWins: p.winsA,
        bottomSeedRankAbbrev: '',
        bottomSeedWins: p.winsB,
        winningTeamId,
        topSeedTeam: {
          id: Number(p.teamA.id) || 0,
          abbrev: p.teamA.abbrev,
          name: { default: p.teamA.name || p.teamA.abbrev },
          logo: getLogo(p.teamA.abbrev),
        },
        bottomSeedTeam: {
          id: Number(p.teamB.id) || 0,
          abbrev: p.teamB.abbrev,
          name: { default: p.teamB.name || p.teamB.abbrev },
          logo: getLogo(p.teamB.abbrev),
        },
        _conf: isEast ? 'E' : 'W',
      };
    });

    seriesList.sort((a: any, b: any) => {
      if (a.playoffRound !== b.playoffRound) return a.playoffRound - b.playoffRound;
      if (a._conf !== b._conf) return a._conf === 'W' ? -1 : 1;
      return 0;
    });

    const finalSeries = seriesList.map((s: any) => {
      const { _conf, ...rest } = s;
      return rest;
    });

    return { series: finalSeries, notStarted: finalSeries.length === 0 };
  } catch (e) {
    console.error('Playoff fetch error', e);
    return { series: [], notStarted: true };
  }
}

export async function fetchStandingsSeasons() { return { seasons: [] }; }
export async function fetchTeamSchedule(teamAbbrev: string, season: string) { return { games: [] }; }
export async function fetchTeamRoster(teamAbbrev: string, season?: string) { return { forwards: [], defensemen: [], goalies: [] }; }

export async function fetchEspnRoster(nhlAbbrev: string) {
  const espnCode = ESPN_TEAM_MAP[nhlAbbrev] ?? nhlAbbrev.toLowerCase();
  const r = await fetch(`${ESPN_BASE}/teams/${espnCode}/roster`);
  if (!r.ok) throw new Error(`ESPN roster ${nhlAbbrev} ${r.status}`);
  return r.json();
}

export async function fetchEspnInjuries() {
  const r = await fetch(`${ESPN_BASE}/injuries`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  if (!r.ok) throw new Error(`ESPN injuries ${r.status}`);
  return r.json();
}

export async function fetchEspnNews() {
  const r = await fetch(`${ESPN_BASE}/news`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  if (!r.ok) throw new Error(`ESPN news ${r.status}`);
  return r.json();
}

export async function fetchPlayerSearch(query: string) {
  try {
    const url = `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(query)}&limit=10`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const data: any = await r.json();

    const playerGroup = data.results?.find((res: any) => res.type === 'player');
    if (!playerGroup || !Array.isArray(playerGroup.contents)) return [];

    return playerGroup.contents.map((c: any) => {
      let playerId: number | null = null;
      if (c.uid) {
        const match = c.uid.match(/:a:(\d+)/);
        if (match) playerId = parseInt(match[1], 10);
      }
      if (!playerId && c.link?.web) {
        const match = c.link.web.match(/\/id\/(\d+)/);
        if (match) playerId = parseInt(match[1], 10);
      }
      if (!playerId) return null;

      const teamName = c.subtitle || '';
      const team = ALL_TEAMS.find(t => t.name === teamName || t.name.includes(teamName) || teamName.includes(t.name));

      return {
        playerId,
        name: c.displayName,
        headshot: c.image?.default || '',
        teamAbbrev: team ? team.abbrev : '',
        position: '',
      };
    }).filter(Boolean);
  } catch (e) {
    console.error('Player search error', e);
    return [];
  }
}

export async function fetchClubStats(teamAbbrev: string, season: string) { return {}; }

export async function fetchPlayer(playerId: number | string) {
  try {
    let statsData: any = {};
    try {
      const r = await fetch(`${ESPN_WEB}/athletes/${playerId}/stats`);
      if (r.ok) statsData = await r.json();
    } catch (e) { console.error('Stats fetch failed', e); }

    let athlete: any = {};
    try {
      const r = await fetch(`${ESPN_WEB}/athletes/${playerId}`);
      if (r.ok) {
        const d = await r.json();
        athlete = d.athlete || {};
      }
    } catch (e) { console.error('Bio fetch failed', e); }

    let injuryStatus: string | null = null;
    try {
      const teamAbbrev = athlete.team?.abbreviation || athlete.teamShortName;
      if (teamAbbrev) {
        const espnCode = ESPN_TEAM_MAP[teamAbbrev] ?? teamAbbrev.toLowerCase();
        const r = await fetch(`${ESPN_BASE}/teams/${espnCode}/roster`);
        if (r.ok) {
          const data: any = await r.json();
          const rawAthletes: any[] = [];
          if (Array.isArray(data.athletes)) {
            for (const group of data.athletes) {
              if (Array.isArray(group.items)) {
                rawAthletes.push(...group.items);
              } else {
                rawAthletes.push(group);
              }
            }
          }
          const found = rawAthletes.find((a: any) => String(a.id) === String(playerId));
          if (found && found.injuries && found.injuries.length > 0) {
            injuryStatus = found.injuries[0].status || 'Out';
          }
        }
      }
    } catch (e) { console.error('Injury fetch from roster failed', e); }

    let heightCm;
    if (athlete.displayHeight) {
      const match = athlete.displayHeight.match(/(\d+)'\s*(\d+)/);
      if (match) heightCm = Math.round(parseInt(match[1]) * 30.48 + parseInt(match[2]) * 2.54);
    } else if (athlete.height) {
      heightCm = Math.round(Number(athlete.height) * 2.54);
    }

    let weightKg;
    if (athlete.displayWeight) {
      weightKg = Math.round(parseFloat(athlete.displayWeight) * 0.4536);
    } else if (athlete.weight) {
      weightKg = Math.round(Number(athlete.weight) * 0.4536);
    }

    let birthDate = athlete.dateOfBirth || athlete.displayDOB;
    if (birthDate) {
      if (birthDate.includes('/')) {
        const parts = birthDate.split('/');
        if (parts.length === 3) {
          birthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else {
        birthDate = birthDate.split('T')[0];
      }
    }

    const { city: webCity, country: webCountry } = extractBirthPlace(athlete);
    let birthCity = webCity;
    let birthCountry = webCountry;

    let draftDetails: any = undefined;
    if (athlete.draft && athlete.draft.year) {
      draftDetails = {
        year: athlete.draft.year,
        round: athlete.draft.round,
        overallPick: athlete.draft.selection,
        teamAbbrev: athlete.draft.team?.abbreviation || '',
      };
    } else if (athlete.displayDraft) {
      const draftMatch = athlete.displayDraft.match(/(\d{4}): Rd (\d+), Pk (\d+) \((\w+)\)/);
      if (draftMatch) {
        draftDetails = {
          year: Number(draftMatch[1]),
          round: Number(draftMatch[2]),
          overallPick: Number(draftMatch[3]),
          teamAbbrev: draftMatch[4],
        };
      }
    }

    if (!birthCountry || !draftDetails || !birthCity) {
      try {
        const core = await fetchCoreAthlete(playerId);
        if (core) {
          if (!birthCity && core.birthPlace?.city) {
            birthCity = core.birthPlace.city;
          }
          if (!birthCountry && core.birthPlace?.country) {
            if (typeof core.birthPlace.country === 'string') {
              birthCountry = COUNTRY_MAP[core.birthPlace.country.toUpperCase()] || core.birthPlace.country;
            } else if (core.birthPlace.country.$ref) {
              const countryData = await resolveCoreRef(core.birthPlace.country.$ref);
              if (countryData) birthCountry = countryData.name || countryData.abbreviation || '';
            } else if (core.birthPlace.country.name) {
              birthCountry = core.birthPlace.country.name;
            }
          }
          if (!draftDetails && core.draft?.year) {
            let teamAbbrev = '';
            if (core.draft.team?.$ref) {
              const teamData = await resolveCoreRef(core.draft.team.$ref);
              if (teamData) teamAbbrev = teamData.abbreviation || '';
            }
            draftDetails = {
              year: core.draft.year,
              round: core.draft.round,
              overallPick: core.draft.selection,
              teamAbbrev,
            };
          }
        }
      } catch (e) { console.error('Core athlete enrichment failed', e); }
    }

    let careerTotals: any = null;
    let seasonTotals: any[] = [];
    let featuredStats: any = null;

    const categories = statsData.categories || [];
    const regSeasonCats = categories.filter((c: any) => c.displayName?.includes('Regular Season') || c.name === 'regular-season');

    if (regSeasonCats.length > 0) {
      const allStats: Record<string, any> = {};

      for (const cat of regSeasonCats) {
        if (!cat.statistics) continue;
        const names = cat.names || [];
        for (const s of cat.statistics) {
          const year = s.season?.year;
          if (!year) continue;
          if (!allStats[year]) {
            allStats[year] = {
              season: Number(`${year - 1}${year}`),
              teamName: { default: extractTeamName(s) },
              leagueAbbrev: 'NHL',
              gameTypeId: 2,
              gamesPlayed: 0, goals: 0, assists: 0, points: 0, plusMinus: 0, pim: 0,
              wins: 0, losses: 0, otLosses: 0, goalsAgainstAvg: 0, savePctg: 0, shutouts: 0,
            };
          }
          const statsArr = s.stats || [];
          for (let i = 0; i < names.length; i++) {
            const val = Number(statsArr[i]) || 0;
            const name = names[i];
            if (['gamesPlayed', 'games', 'gp'].includes(name)) allStats[year].gamesPlayed = val;
            else if (['goals', 'g'].includes(name)) allStats[year].goals = val;
            else if (['assists', 'a'].includes(name)) allStats[year].assists = val;
            else if (['points', 'pts'].includes(name)) allStats[year].points = val;
            else if (['plusMinus', 'plus_minus', '+/-'].includes(name)) allStats[year].plusMinus = val;
            else if (['penaltyMinutes', 'pim'].includes(name)) allStats[year].pim = val;
            else if (['wins', 'w'].includes(name)) allStats[year].wins = val;
            else if (['losses', 'l'].includes(name)) allStats[year].losses = val;
            else if (['overtimeLosses', 'otLosses', 'otl', 'ot'].includes(name)) allStats[year].otLosses = val;
            else if (['goalsAgainstAverage', 'avgGoalsAgainst', 'gaa'].includes(name)) allStats[year].goalsAgainstAvg = val;
            else if (['savePercentage', 'savePct', 'savePctg', 'svPct'].includes(name)) allStats[year].savePctg = val;
            else if (['shutouts', 'so'].includes(name)) allStats[year].shutouts = val;
          }
        }
      }

      const sortedYears = Object.keys(allStats).map(Number).sort((a, b) => b - a);
      for (const year of sortedYears) seasonTotals.push(allStats[year]);

      if (seasonTotals.length > 0) {
        featuredStats = { regularSeason: { subSeason: seasonTotals[0] } };

        const career = {
          gp: 0, goals: 0, assists: 0, points: 0, plusMinus: 0, pim: 0,
          wins: 0, losses: 0, otLosses: 0, goalsAgainstAvg: 0, savePctg: 0, shutouts: 0,
        };

        for (const row of seasonTotals) {
          career.gp += row.gamesPlayed;
          career.goals += row.goals;
          career.assists += row.assists;
          career.points += row.points;
          career.plusMinus += row.plusMinus;
          career.pim += row.pim;
          career.wins += row.wins;
          career.losses += row.losses;
          career.otLosses += row.otLosses;
          career.shutouts += row.shutouts;
        }

        career.goalsAgainstAvg = seasonTotals[0].goalsAgainstAvg;
        career.savePctg = seasonTotals[0].savePctg;
        careerTotals = { regularSeason: career };
      }
    }

    return {
      id: String(athlete.id || playerId),
      firstName: { default: athlete.firstName || '' },
      lastName: { default: athlete.lastName || '' },
      position: athlete.position?.abbreviation || '',
      headshot: athlete.headshot?.href || '',
      currentTeamAbbrev: fixAbbrev(athlete.team?.abbreviation || ''),
      sweaterNumber: athlete.jersey || '',
      shootsCatches: athlete.hand?.abbreviation || '',
      heightInCentimeters: heightCm,
      weightInKilograms: weightKg,
      birthDate,
      birthCity: birthCity ? { default: String(birthCity) } : undefined,
      birthCountry: birthCountry ? String(birthCountry) : undefined,
      injury: injuryStatus,
      draftDetails,
      featuredStats,
      careerTotals,
      seasonTotals,
    };
  } catch (e) {
    console.error('Player fetch error', e);
    return {};
  }
}

interface LeaderField {
  category: string;
  index: number;
  sortKey: string;
}

const SKATER_FIELDS: Record<'points' | 'goals' | 'assists', LeaderField> = {
  goals:   { category: 'offensive', index: 0, sortKey: 'offensive.goals' },
  assists: { category: 'offensive', index: 1, sortKey: 'offensive.assists' },
  points:  { category: 'offensive', index: 2, sortKey: 'offensive.points' },
};

const GOALIE_FIELDS: Record<'wins' | 'savePctg' | 'goalsAgainstAvg' | 'shutouts', LeaderField> = {
  wins:            { category: 'general',   index: 0, sortKey: 'general.wins' },
  shutouts:        { category: 'defensive', index: 9, sortKey: 'defensive.shutouts' },
  goalsAgainstAvg: { category: 'defensive', index: 1, sortKey: 'defensive.avgGoalsAgainst' },
  savePctg:        { category: 'defensive', index: 5, sortKey: 'defensive.savePct' },
};

interface RawLeader {
  id: string;
  name: string;
  headshot?: string;
  teamAbbrev: string;
  position: string;
  value: number;
}

async function fetchLeadersRaw(
  kind: 'skaters' | 'goalies',
  field: LeaderField,
  season: string,
  limit: number = 5,
  order: 'asc' | 'desc' = 'desc'
): Promise<RawLeader[]> {
  const sort = encodeURIComponent(`${field.sortKey}:${order}`);
  const fetchLimit = limit * 3;
  const year = season && season.length === 8 ? season.substring(4, 8) : '';
  const seasonParam = year ? `&season=${year}` : '';
  
  // ИСПРАВЛЕНИЕ: Добавляем &seasontype=2 для регулярного чемпионата
  const url = `${ESPN_WEB}/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=false&limit=${fetchLimit}&sort=${sort}&category=${kind}${seasonParam}&seasontype=2`;
  
  const r = await fetch(url);
  if (!r.ok) throw new Error(`ESPN leaders ${kind} ${r.status}`);
  const data: any = await r.json();

  const athletes = data.athletes || [];
  const result: RawLeader[] = [];
  const seenIds = new Set<string>();

  for (const item of athletes) {
    const athlete = item.athlete || {};
    const athleteId = String(athlete.id);
    if (!athleteId || seenIds.has(athleteId)) continue;

    const cats: any[] = item.categories || [];
    const targetCat = cats.find((c: any) => c.name === field.category);
    if (!targetCat) continue;

    const totals: any[] = targetCat.totals || [];
    if (field.index >= totals.length) continue;

    const rawVal = totals[field.index];
    if (rawVal === '-' || rawVal === '' || rawVal == null) continue;

    const numVal = parseFloat(String(rawVal));
    if (!isFinite(numVal)) continue;

    const rawAbbrev = athlete.teamShortName || athlete.teamName || '';
    const teamAbbrev = fixAbbrev(rawAbbrev);
    const headshot = athlete.headshot?.href || '';

    result.push({
      id: athleteId,
      name: athlete.displayName || athlete.shortName || '',
      headshot,
      teamAbbrev,
      position: athlete.position?.abbreviation || '',
      value: numVal,
    });
    seenIds.add(athleteId);
  }

  result.sort((a, b) => {
    if (order === 'asc') return a.value - b.value;
    return b.value - a.value;
  });

  return result.slice(0, limit);
}

export async function fetchSkaterLeaders(season: string) {
  const [points, goals, assists] = await Promise.all([
    fetchLeadersRaw('skaters', SKATER_FIELDS.points, season, 5, 'desc'),
    fetchLeadersRaw('skaters', SKATER_FIELDS.goals, season, 5, 'desc'),
    fetchLeadersRaw('skaters', SKATER_FIELDS.assists, season, 5, 'desc'),
  ]);
  return { points, goals, assists };
}

export async function fetchGoalieLeaders(season: string) {
  const [wins, savePctg, goalsAgainstAvg, shutouts] = await Promise.all([
    fetchLeadersRaw('goalies', GOALIE_FIELDS.wins, season, 5, 'desc'),
    fetchLeadersRaw('goalies', GOALIE_FIELDS.savePctg, season, 5, 'desc'),
    fetchLeadersRaw('goalies', GOALIE_FIELDS.goalsAgainstAvg, season, 5, 'asc'),
    fetchLeadersRaw('goalies', GOALIE_FIELDS.shutouts, season, 5, 'desc'),
  ]);
  return { wins, savePctg, goalsAgainstAvg, shutouts };
}

export interface NormalizedGame {
  id: string; date: string; startTime: string; venue?: string; attendance?: number;
  status: { state: 'pre' | 'in' | 'post'; description: string; period?: number; clock?: string; };
  home: NormalizedTeamGame; away: NormalizedTeamGame; periods: NormalizedPeriod[];
  shots?: { home: number; away: number }; threeStars?: any[];
}
export interface NormalizedTeamGame {
  abbrev: string; name: string; logo: string; score: number; record?: string; sog?: number;
}
export interface NormalizedPeriod {
  period: number; type: 'REG' | 'OT' | 'SO'; goals: NormalizedGoal[];
}
export interface NormalizedGoal {
  time: string; teamAbbrev: string; scorerName: string; scorerId?: string;
  scorerHeadshot?: string; strength?: string; awayScore: number; homeScore: number;
}

export async function fetchGameSummary(eventId: string | number): Promise<NormalizedGame> {
  const url = `${ESPN_BASE}/summary?event=${eventId}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`ESPN summary ${eventId} ${r.status}`);
  const raw: any = await r.json();

  const competition = raw.header?.competitions?.[0] ?? {};
  const competitors: any[] = competition.competitors ?? [];

  const homeComp = competitors.find((c: any) => c.homeAway === 'home') ?? {};
  const awayComp = competitors.find((c: any) => c.homeAway === 'away') ?? {};

  const buildTeam = (comp: any): NormalizedTeamGame => {
    const team = comp.team ?? {};
    const abbr = fixAbbrev(team.abbreviation ?? '');
    const record = comp.records?.[0]?.summary;
    return {
      abbrev: abbr, name: team.displayName ?? team.name ?? abbr, logo: getLogo(abbr),
      score: comp.score !== undefined ? Number(comp.score) : 0, record, sog: undefined,
    };
  };

  const home = buildTeam(homeComp);
  const away = buildTeam(awayComp);

  const statusType = competition.status?.type ?? {};
  let state: 'pre' | 'in' | 'post' = 'pre';
  if (statusType.state === 'in') state = 'in';
  else if (statusType.state === 'post') state = 'post';

  let description = statusType.description ?? 'Scheduled';
  const periodTypeRaw = competition.status?.period?.type ?? '';
  if (state === 'post' && (periodTypeRaw === 'OT' || periodTypeRaw === 'SO')) description = `Final ${periodTypeRaw}`;

  let periodNum: number | undefined = undefined;
  const periodVal = competition.status?.period;
  if (typeof periodVal === 'number') periodNum = periodVal;
  else if (periodVal && typeof periodVal === 'object' && periodVal.number) periodNum = Number(periodVal.number);

  const detailStr = String(statusType.detail || '');
  if (!periodNum && detailStr) {
    if (detailStr.includes('1st')) periodNum = 1;
    else if (detailStr.includes('2nd')) periodNum = 2;
    else if (detailStr.includes('3rd')) periodNum = 3;
    else if (detailStr.includes('OT')) periodNum = 4;
    else if (detailStr.includes('SO')) periodNum = 5;
  }

  const status = { state, description, period: periodNum, clock: competition.status?.displayClock };

  const boxTeams: any[] = raw.boxscore?.teams ?? [];
  for (const bt of boxTeams) {
    const abbr = fixAbbrev(bt.team?.abbreviation ?? '');
    const stats: any[] = bt.statistics ?? [];
    const sogStat = stats.find((s: any) => s.name === 'shotsTotal' || s.abbreviation === 'SOG' || s.name === 'shots');
    if (sogStat) {
      const val = Number(sogStat.displayValue ?? sogStat.value ?? 0);
      if (abbr === home.abbrev) home.sog = val;
      else if (abbr === away.abbrev) away.sog = val;
    }
  }

  let scoringPlays: any[] = [];
  if (Array.isArray(raw.scoringPlays) && raw.scoringPlays.length > 0) scoringPlays = raw.scoringPlays;
  else if (Array.isArray(raw.plays) && raw.plays.length > 0) scoringPlays = raw.plays.filter((p: any) => p.scoringPlay === true);

  const periodMap = new Map<number, NormalizedGoal[]>();
  const periodsSet = new Map<number, NormalizedPeriod>();

  let awayRunning = 0;
  let homeRunning = 0;

  const homeTeamId = homeComp.team?.id;
  const awayTeamId = awayComp.team?.id;

  for (const play of scoringPlays) {
    const periodNumPlay = Number(play.period?.number ?? 1);
    const pTypeRaw = play.period?.type;
    let periodType: 'REG' | 'OT' | 'SO' = 'REG';
    if (pTypeRaw === 'SO') periodType = 'SO';
    else if (pTypeRaw === 'OT' || periodNumPlay > 3) periodType = 'OT';

    const playTeamAbbr = fixAbbrev(play.team?.abbreviation ?? '');
    const playTeamId = play.team?.id;

    let teamAbbrev = playTeamAbbr;
    if (!teamAbbrev && playTeamId) {
      if (playTeamId === homeTeamId) teamAbbrev = home.abbrev;
      else if (playTeamId === awayTeamId) teamAbbrev = away.abbrev;
    }

    const isHome = teamAbbrev === home.abbrev;

    if (play.awayScore !== undefined && play.homeScore !== undefined) {
      awayRunning = Number(play.awayScore);
      homeRunning = Number(play.homeScore);
    } else {
      if (isHome) homeRunning++;
      else awayRunning++;
    }

    let scorerName = '';
    let scorerId: string | undefined;
    let scorerHeadshot: string | undefined;

    const athletes: any[] = play.athletesInvolved ?? play.participants ?? [];
    if (Array.isArray(athletes) && athletes.length > 0) {
      for (const a of athletes) {
        const athlete = a?.athlete ?? a;
        if (athlete) {
          const nm = athlete.displayName ?? athlete.shortName ?? athlete.fullName;
          if (nm) {
            scorerName = nm;
            scorerId = athlete.id ? String(athlete.id) : undefined;
            scorerHeadshot = athlete.headshot?.href ?? athlete.headshot ?? undefined;
            break;
          }
        }
      }
    }

    if (!scorerName && typeof play.text === 'string') scorerName = play.text.split('(')[0].split(' - ')[0].trim();

    let strength = play.strength?.abbreviation ?? play.strength?.name ?? play.strengthType?.abbreviation ?? undefined;
    if (strength) {
      const s = String(strength).toUpperCase();
      if (s.includes('EVEN') || s === 'EV') strength = 'EV';
      else if (s.includes('POWER') || s === 'PP') strength = 'PP';
      else if (s.includes('SHORT') || s === 'SH') strength = 'SH';
      else if (s.includes('EMPTY') || s === 'EN') strength = 'EN';
      else if (s.includes('PENALTY') || s === 'PS') strength = 'PS';
    }

    const goal: NormalizedGoal = {
      time: play.clock?.displayValue ?? '', teamAbbrev, scorerName, scorerId, scorerHeadshot, strength,
      awayScore: awayRunning, homeScore: homeRunning,
    };

    if (!periodMap.has(periodNumPlay)) periodMap.set(periodNumPlay, []);
    periodMap.get(periodNumPlay)!.push(goal);
    if (!periodsSet.has(periodNumPlay)) periodsSet.set(periodNumPlay, { period: periodNumPlay, type: periodType, goals: [] });
  }

  const periods: NormalizedPeriod[] = Array.from(periodsSet.values());
  for (const p of periods) p.goals = periodMap.get(p.period) ?? [];
  periods.sort((a, b) => a.period - b.period);

  const threeStars = raw.threeStars ?? raw.leaders?.threeStars ?? [];

  return {
    id: String(eventId), date: competition.date?.split('T')[0] ?? '', startTime: competition.date ?? '',
    venue: competition.venue?.fullName, attendance: competition.attendance ? Number(competition.attendance) : undefined,
    status, home, away, periods,
    shots: home.sog !== undefined || away.sog !== undefined ? { home: home.sog ?? 0, away: away.sog ?? 0 } : undefined,
    threeStars,
  };
}
