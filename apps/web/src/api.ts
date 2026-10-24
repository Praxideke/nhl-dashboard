import type { StandingRow, GameRow } from '@nhl/shared'

export async function getStandings(date?: string, season?: string): Promise<StandingRow[]> {
  const params = new URLSearchParams()
  if (date) params.append('date', date)
  if (season) params.append('season', season)
  const url = `/api/standings${params.toString() ? '?' + params.toString() : ''}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`standings ${r.status}`)
  return r.json()
}

export async function getScores(date?: string): Promise<GameRow[]> {
  const url = date ? `/api/scores?date=${date}` : '/api/scores'
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`scores ${r.status}`)
  return r.json()
}

export async function getPlayoffs(season: string): Promise<any> {
  const url = `/api/playoffs?season=${season}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`playoffs ${r.status}`)
  return r.json()
}

export async function getTeam(abbrev: string, season: string): Promise<any> {
  const url = `/api/team/${abbrev}?season=${season}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`team ${r.status}`)
  return r.json()
}

export async function getPlayer(playerId: number | string): Promise<any> {
  const url = `/api/player/${playerId}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`player ${r.status}`)
  return r.json()
}

export async function getGame(gameId: number | string): Promise<any> {
  const url = `/api/game/${gameId}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`game ${r.status}`)
  return r.json()
}

export async function getLeaders(season: string): Promise<any> {
  const url = `/api/leaders?season=${season}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`leaders ${r.status}`)
  return r.json()
}

export async function getCalendar(month: string): Promise<any[]> {
  const url = `/api/calendar?month=${month}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`calendar ${r.status}`)
  return r.json()
}

export async function searchPlayer(q: string, team?: string): Promise<any[]> {
  const params = new URLSearchParams({ q })
  if (team) params.append('team', team)
  const r = await fetch(`/api/search-player?${params.toString()}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`search ${r.status}`)
  return r.json()
}

export async function getInjuries(lang?: string): Promise<any[]> {
  const url = `/api/injuries${lang ? `?lang=${lang}` : ''}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`injuries ${r.status}`)
  return r.json()
}

export async function getNews(lang?: string): Promise<any[]> {
  const url = `/api/news${lang ? `?lang=${lang}` : ''}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`news ${r.status}`)
  return r.json()
}
