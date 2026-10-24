const BASE = 'https://api-web.nhle.com/v1';
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl';

const ESPN_TEAM_MAP: Record<string, string> = {
  TBL: 'tb', SJS: 'sj', LAK: 'la', NJD: 'nj', CBJ: 'cbj', WSH: 'wsh', VGK: 'vgk', UTA: 'utah',
};

export async function fetchStandingsRaw(date?: string) {
  const path = date ? `standings/${date}` : 'standings/now';
  const r = await fetch(`${BASE}/${path}`);
  if (!r.ok) throw new Error(`NHL standings ${r.status}`);
  return r.json();
}

export async function fetchStandingsSeasons() {
  const r = await fetch(`${BASE}/standings-season`);
  if (!r.ok) throw new Error(`NHL standings-season ${r.status}`);
  return r.json();
}

export async function fetchScheduleRaw(date?: string) {
  const path = date ? `schedule/${date}` : 'schedule/now';
  const r = await fetch(`${BASE}/${path}`);
  if (!r.ok) throw new Error(`NHL schedule ${r.status}`);
  return r.json();
}

export async function fetchTeamSchedule(teamAbbrev: string, season: string) {
  const url = `https://api-web.nhle.com/v1/club-schedule-season/${teamAbbrev}/${season}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NHL team schedule ${teamAbbrev} ${r.status}`);
  return r.json();
}

export async function fetchPlayoffBracket(year: string) {
  const r = await fetch(`${BASE}/playoff-bracket/${year}`);
  if (!r.ok) throw new Error(`NHL playoff bracket ${r.status}`);
  return r.json();
}

export async function fetchTeamRoster(teamAbbrev: string, season?: string) {
  const path = season ? `roster/${teamAbbrev}/${season}` : `roster/${teamAbbrev}/current`;
  const r = await fetch(`${BASE}/${path}`);
  if (!r.ok) throw new Error(`NHL roster ${teamAbbrev} ${r.status}`);
  return r.json();
}

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
  const r = await fetch(`https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=10&q=${encodeURIComponent(query)}`);
  if (!r.ok) throw new Error(`NHL search ${r.status}`);
  return r.json();
}

export async function fetchPlayer(playerId: number | string) {
  const r = await fetch(`${BASE}/player/${playerId}/landing`);
  if (!r.ok) throw new Error(`NHL player ${playerId} ${r.status}`);
  return r.json();
}

export async function fetchGame(gameId: number | string) {
  const r = await fetch(`${BASE}/gamecenter/${gameId}/landing`);
  if (!r.ok) throw new Error(`NHL game ${gameId} ${r.status}`);
  return r.json();
}

export async function fetchClubStats(teamAbbrev: string, season: string) {
  const url = `${BASE}/club-stats/${teamAbbrev}/${season}/2`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NHL club stats ${teamAbbrev} ${r.status}`);
  return r.json();
}

export async function fetchSkaterLeaders(season: string) {
  const url = `${BASE}/skater-stats-leaders/${season}/2`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NHL skater leaders ${r.status}`);
  return r.json();
}

export async function fetchGoalieLeaders(season: string) {
  const url = `${BASE}/goalie-stats-leaders/${season}/2`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`NHL goalie leaders ${r.status}`);
  return r.json();
}
