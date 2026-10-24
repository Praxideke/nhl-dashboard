import { useEffect, useState } from 'react'
import type { StandingRow, GameRow } from '@nhl/shared'
import { getStandings, getScores, getPlayoffs } from './api'
import { StandingsTable } from './StandingsTable'
import { ScoresFeed } from './ScoresFeed'
import { PlayoffBracket } from './PlayoffBracket'
import { TeamCard } from './TeamCard'
import { GameCard } from './GameCard'
import { LeagueLeaders } from './LeagueLeaders'
import { PlayerCard } from './PlayerCard'
import { InjuriesView } from './InjuriesView'
import { CalendarView } from './CalendarView'
import { NewsView } from './NewsView'
import { T, type Lang } from './i18n'

const APP_VERSION = '1.3.6'

const SEASONS = [
  { label: '2026-27', value: '20262027' },
  { label: '2025-26', value: '20252026' },
  { label: '2024-25', value: '20242025' },
  { label: '2023-24', value: '20232024' },
  { label: '2022-23', value: '20222023' },
  { label: '2021-22', value: '20212022' },
  { label: '2020-21', value: '20202021' },
  { label: '2019-20', value: '20192020' },
  { label: '2018-19', value: '20182019' },
  { label: '2017-18', value: '20172018' },
  { label: '2016-17', value: '20162017' },
  { label: '2015-16', value: '20152016' },
  { label: '2014-15', value: '20142015' },
]

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
}

const STORAGE_KEY = 'nhl-dashboard-settings'
type ViewMode = 'standings' | 'playoffs' | 'leaders' | 'injuries' | 'calendar' | 'news'

interface Settings {
  lang: Lang
  season: string
  view: ViewMode
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const view: ViewMode =
        parsed.view === 'playoffs' ? 'playoffs'
        : parsed.view === 'leaders' ? 'leaders'
        : parsed.view === 'injuries' ? 'injuries'
        : parsed.view === 'calendar' ? 'calendar'
        : parsed.view === 'news' ? 'news'
        : 'standings'
      return {
        lang: parsed.lang === 'en' ? 'en' : 'ru',
        season: typeof parsed.season === 'string' ? parsed.season : '20262027',
        view,
      }
    }
  } catch (e) {}
  return { lang: 'ru', season: '20262027', view: 'standings' }
}

function getDateOffset(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function currentSeasonFromToday(): string {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1
  if (m >= 9) return `${y}${y + 1}`
  return `${y - 1}${y}`
}

export default function App() {
  const initial = loadSettings()
  const [standings, setStandings] = useState<StandingRow[]>([])
  const [games, setGames] = useState<GameRow[]>([])
  const [playoffs, setPlayoffs] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    return SEASON_END_DATES[initial.season] ?? null
  })
  const [selectedSeason, setSelectedSeason] = useState<string>(initial.season)
  const [lang, setLang] = useState<Lang>(initial.lang)
  const [view, setView] = useState<ViewMode>(initial.view)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null)
  const [selectedLeaderPlayerId, setSelectedLeaderPlayerId] = useState<number | null>(null)

  const t = T[lang]

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lang, season: selectedSeason, view }))
    } catch (e) {}
  }, [lang, selectedSeason, view])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (view === 'leaders' || view === 'injuries' || view === 'calendar' || view === 'news') {
          setError(null)
          return
        }
        
        if (!cancelled) setLoading(true)
        
        const promises: Promise<any>[] = [
          getStandings(selectedDate ?? undefined, selectedSeason),
          getScores(selectedDate ?? undefined)
        ]
        if (view === 'playoffs') {
          promises.push(getPlayoffs(selectedSeason))
        }
        const results = await Promise.all(promises)
        if (cancelled) return
        setStandings(results[0])
        setGames(results[1])
        if (view === 'playoffs') {
          setPlayoffs(results[2])
        }
        setError(null)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const t2 = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(t2) }
  }, [selectedDate, selectedSeason, view])

  const today = getDateOffset(0)
  const yesterday = getDateOffset(-1)
  const tomorrow = getDateOffset(1)
  const isCurrentSeason = selectedSeason === currentSeasonFromToday()

  const smallBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    fontSize: 13,
    border: `1px solid var(--accent)`,
    borderRadius: 4,
    background: active ? 'var(--accent)' : 'var(--card-bg)',
    color: active ? 'var(--accent-text)' : 'var(--accent)',
    cursor: 'pointer',
    fontWeight: 600,
  })

  const viewBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    fontSize: 14,
    fontWeight: 'bold',
    border: 'none',
    borderBottom: active ? '3px solid var(--accent)' : '3px solid transparent',
    background: 'transparent',
    color: active ? 'var(--accent)' : 'var(--tab-inactive)',
    cursor: 'pointer',
    marginRight: 12,
  })

  const dayBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px',
    fontSize: 13,
    border: `1px solid var(--accent)`,
    borderRadius: 4,
    background: active ? 'var(--accent)' : 'var(--card-bg)',
    color: active ? 'var(--accent-text)' : 'var(--accent)',
    cursor: 'pointer',
    fontWeight: 600,
  })

  const goToDay = (day: string | null) => {
    setSelectedDate(day)
    if (!isCurrentSeason) {
      setSelectedSeason(currentSeasonFromToday())
    }
  }

  const isYesterday = selectedDate === yesterday
  const isToday = selectedDate === null || selectedDate === today
  const isTomorrow = selectedDate === tomorrow

  const displayDate = selectedDate 
    ? new Date(selectedDate + 'T12:00:00Z').toLocaleDateString(t.locale, { day: 'numeric', month: 'long' })
    : t.todayBtn

  return (
    <div style={{
      padding: '10px 16px',
      maxWidth: 1400,
      margin: '0 auto',
      color: 'var(--text)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 24, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{t.dashboard}</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => setLang('ru')} style={smallBtnStyle(lang === 'ru')}>RU</button>
            <button onClick={() => setLang('en')} style={smallBtnStyle(lang === 'en')}>EN</button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ 
              fontSize: 11, 
              color: '#fff', 
              backgroundColor: 'rgba(0,0,0,0.4)', 
              padding: '2px 8px', 
              borderRadius: 12,
              userSelect: 'none', 
              letterSpacing: '0.5px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              v{APP_VERSION}
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid var(--border)', marginTop: 8, marginBottom: 10 }}>
        <button onClick={() => setView('standings')} style={viewBtnStyle(view === 'standings')}>
          {t.standings}
        </button>
        <button onClick={() => setView('playoffs')} style={viewBtnStyle(view === 'playoffs')}>
          {t.playoffs}
        </button>
        <button onClick={() => setView('leaders')} style={viewBtnStyle(view === 'leaders')}>
          {t.leaders}
        </button>
        <button onClick={() => setView('injuries')} style={viewBtnStyle(view === 'injuries')}>
          {t.injuries}
        </button>
        <button onClick={() => setView('calendar')} style={viewBtnStyle(view === 'calendar')}>
          {t.calendar}
        </button>
        <button onClick={() => setView('news')} style={viewBtnStyle(view === 'news')}>
          {t.news}
        </button>
      </div>

      {view !== 'injuries' && view !== 'calendar' && view !== 'news' && (
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor="season-picker" style={{ fontWeight: 600, fontSize: 13 }}>{t.seasonLabel}:</label>
            <select
              id="season-picker"
              value={selectedSeason}
              onChange={(e) => {
                const newSeason = e.target.value
                setSelectedSeason(newSeason)
                setSelectedDate(SEASON_END_DATES[newSeason] ?? null)
              }}
              style={{ padding: '5px 8px', fontSize: 13, borderRadius: 4 }}
            >
              {SEASONS.map(s => (
                <option key={s.value} value={s.value}>{t.seasonWord} {s.label}</option>
              ))}
            </select>
          </div>
          {view === 'standings' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <label htmlFor="date-picker" style={{ fontWeight: 600, fontSize: 13 }}>{t.dateLabel}:</label>
              <input
                id="date-picker"
                type="date"
                value={selectedDate ?? today}
                max={today}
                onChange={(e) => {
                  const val = e.target.value
                  setSelectedDate(val === today ? null : val)
                }}
                style={{ padding: '5px 8px', fontSize: 13, borderRadius: 4 }}
              />
              {isCurrentSeason && (
                <>
                  <button onClick={() => goToDay(yesterday)} style={dayBtnStyle(isYesterday)}>
                    {t.yesterdayBtn}
                  </button>
                  <button onClick={() => goToDay(null)} style={dayBtnStyle(isToday)}>
                    {t.todayBtn}
                  </button>
                  <button onClick={() => goToDay(tomorrow)} style={dayBtnStyle(isTomorrow)}>
                    {t.tomorrowBtn}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && <div style={{ color: 'var(--loss)', marginBottom: 12 }}>Error: {error}</div>}

      <div style={{ flex: 1 }}>
        {view === 'standings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <section style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <h2 style={{ marginTop: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {t.standings} <span style={{ fontSize: 16, fontWeight: 'normal', color: 'var(--text-muted)' }}>— на утро {displayDate}</span>
              </h2>
              <StandingsTable 
                key={`standings-${selectedDate || 'today'}`} 
                rows={standings} 
                t={t} 
                onTeamClick={(abbrev) => setSelectedTeam(abbrev)} 
              />
            </section>
            <section style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
              <h2 style={{ marginTop: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{t.scores}</h2>
              <ScoresFeed
                key={`scores-${selectedDate || 'today'}`}
                games={games}
                centerDate={selectedDate ?? today}
                t={t}
                onGameClick={(id) => setSelectedGameId(id)}
              />
            </section>
          </div>
        )}

        {view === 'playoffs' && (
          <section>
            <PlayoffBracket data={playoffs} t={t} />
          </section>
        )}

        {view === 'leaders' && (
          <section>
            <LeagueLeaders
              season={selectedSeason}
              t={t}
              onPlayerClick={(id) => setSelectedLeaderPlayerId(id)}
            />
          </section>
        )}

        {view === 'injuries' && (
          <section>
            <h2 style={{ marginTop: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{t.injuries}</h2>
            <InjuriesView t={t} lang={lang} onPlayerClick={(id) => setSelectedLeaderPlayerId(Number(id))} />
          </section>
        )}

        {view === 'calendar' && (
          <section>
            <CalendarView 
              t={t} 
              onGameClick={(id) => setSelectedGameId(id)} 
            />
          </section>
        )}

        {view === 'news' && (
          <section>
            <h2 style={{ marginTop: 0, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{t.news}</h2>
            <NewsView t={t} lang={lang} />
          </section>
        )}
      </div>

      {selectedTeam && (
        <TeamCard
          abbrev={selectedTeam}
          season={selectedSeason}
          t={t}
          onClose={() => setSelectedTeam(null)}
        />
      )}

      {selectedGameId !== null && (
        <GameCard
          gameId={selectedGameId}
          t={t}
          onClose={() => setSelectedGameId(null)}
        />
      )}

      {selectedLeaderPlayerId !== null && (
        <PlayerCard
          playerId={selectedLeaderPlayerId}
          t={t}
          onClose={() => setSelectedLeaderPlayerId(null)}
        />
      )}
    </div>
  )
}
