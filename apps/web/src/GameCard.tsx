import { useEffect, useState } from 'react'
import type { Translation } from './i18n'
import { getGame } from './api'

interface Props {
  gameId: number | string
  t: Translation
  onClose: () => void
}

interface TeamSide {
  abbrev: string
  name?: string
  logo?: string
  score?: number
  sog?: number
  record?: string
}

function abbrevOf(x: any): string {
  if (!x) return ''
  if (typeof x === 'string') return x
  if (x.default) return x.default
  return ''
}

function fmtTime(timeInPeriod?: string): string {
  if (!timeInPeriod) return ''
  return timeInPeriod
}

function periodLabel(period?: number, periodType?: string, t?: Translation): string {
  if (!t) return ''
  if (periodType === 'OT') return t.periodOT
  if (periodType === 'SO') return t.periodSO
  if (period === 1) return t.period1
  if (period === 2) return t.period2
  if (period === 3) return t.period3
  return period ? `${period}` : ''
}

function statusText(game: any, t: Translation): string {
  const state = game.gameState
  const last = game.gameOutcome?.lastPeriodType
  if (state === 'FINAL' || state === 'OFF') {
    if (last === 'OT') return t.gameStatusFinalOT
    if (last === 'SO') return t.gameStatusFinalSO
    return t.gameStatusFinal
  }
  if (state === 'LIVE' || state === 'CRIT') return t.gameStatusLive
  if (state === 'PRE') return t.gameStatusPre
  return t.gameStatusScheduled
}

function strengthLabel(code: string | undefined, t: Translation): string {
  if (!code) return ''
  const c = String(code).trim().toUpperCase()
  const isRu = t.locale === 'ru-RU'
  switch (c) {
    case 'EV': return t.strengthEV ?? (isRu ? 'Равные составы' : 'Even Strength')
    case 'PP': return t.strengthPP ?? (isRu ? 'Большинство' : 'Power Play')
    case 'SH': return t.strengthSH ?? (isRu ? 'Меньшинство' : 'Short-handed')
    case 'EN': return t.strengthEN ?? (isRu ? 'Пустые ворота' : 'Empty Net')
    case 'PS': return t.strengthPS ?? (isRu ? 'Буллит' : 'Penalty Shot')
    case 'EA': return t.strengthEA ?? (isRu ? 'Доп. атакующий' : 'Extra Attacker')
    default: return String(code)
  }
}

function initials(name?: string): string {
  if (!name) return '?'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function buildHeadshotUrl(playerId: number | string, teamAbbrev: string, season: number | string): string {
  const seasonStr = String(season ?? '').length === 8 ? String(season) : '20262027'
  return `https://assets.nhle.com/mugs/nhl/${seasonStr}/${teamAbbrev}/${playerId}.png`
}

function PlayerHeadshot({
  playerId, teamAbbrev, name, season, size = 64,
}: {
  playerId?: number | string
  teamAbbrev?: any
  name?: string
  season: number | string
  size?: number
}) {
  const [imgError, setImgError] = useState(false)
  const abbrev = abbrevOf(teamAbbrev)
  const headshotUrl = playerId && abbrev ? buildHeadshotUrl(playerId, abbrev, season) : null
  const showPhoto = headshotUrl && !imgError

  if (showPhoto) {
    return (
      <img
        src={headshotUrl!}
        alt=""
        width={size}
        height={size}
        style={{
          objectFit: 'cover', borderRadius: '50%',
          backgroundColor: 'var(--card-bg-alt)', border: '2px solid var(--accent)', flexShrink: 0,
        }}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: 'var(--accent)', color: 'var(--accent-text)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.35), fontWeight: 'bold',
      border: '2px solid var(--accent)', flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

function StarCard({
  star, rank, t, season,
}: { star: any; rank: number; t: Translation; season: number | string }) {
  const label = rank === 1 ? t.star1 : rank === 2 ? t.star2 : t.star3
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: 1, padding: '8px 6px',
      backgroundColor: 'var(--card-bg-alt)', borderRadius: 8, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6, letterSpacing: '0.4px' }}>
        {label}
      </div>
      <div style={{ marginBottom: 6 }}>
        <PlayerHeadshot playerId={star.playerId} teamAbbrev={star.teamAbbrev} name={star.name?.default} season={season} size={64} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'center', lineHeight: 1.2, marginBottom: 4, minHeight: 30 }}>
        {star.name?.default ?? '—'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
        {abbrevOf(star.teamAbbrev)}
      </div>
      {(star.goals !== undefined || star.assists !== undefined) && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {star.goals ?? 0}G {star.assists ?? 0}A
        </div>
      )}
    </div>
  )
}

function StrengthBadge({ code, t }: { code: string; t: Translation }) {
  const [hover, setHover] = useState(false)
  const label = strengthLabel(code, t)
  const display = String(code).trim().toUpperCase()

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <span
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          fontSize: 9, padding: '1px 4px',
          backgroundColor: 'var(--strength-bg)', borderRadius: 3,
          color: 'var(--strength-text)', fontWeight: 600,
          textTransform: 'uppercase', cursor: 'help', userSelect: 'none',
        }}
      >
        {display}
      </span>
      {hover && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
          backgroundColor: 'var(--header-bg)', color: 'var(--header-text)',
          padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
          whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 2px 8px var(--shadow)', pointerEvents: 'none',
        }}>
          {label}
        </div>
      )}
    </div>
  )
}

export function GameCard({ gameId, t, onClose }: Props) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getGame(gameId)
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [gameId])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const away: TeamSide = {
    abbrev: abbrevOf(data?.awayTeam?.abbrev),
    name: data?.awayTeam?.commonName?.default ?? data?.awayTeam?.name?.default,
    logo: data?.awayTeam?.logo,
    score: data?.awayTeam?.score,
    sog: data?.awayTeam?.sog,
    record: data?.awayTeam?.record,
  }
  const home: TeamSide = {
    abbrev: abbrevOf(data?.homeTeam?.abbrev),
    name: data?.homeTeam?.commonName?.default ?? data?.homeTeam?.name?.default,
    logo: data?.homeTeam?.logo,
    score: data?.homeTeam?.score,
    sog: data?.homeTeam?.sog,
    record: data?.homeTeam?.record,
  }

  const finished = data?.gameState === 'FINAL' || data?.gameState === 'OFF'
  const started = finished || data?.gameState === 'LIVE' || data?.gameState === 'CRIT'

  const goalsByPeriod: any[] = data?.summary?.scoring ?? []
  const threeStars: any[] = data?.threeStars ?? []
  const gameDate = data?.gameDate
  const startTime = data?.startTimeUTC
  const venue = data?.venue?.default
  const attendance = data?.attendance
  const season = data?.season ?? '20262027'

  const sectionTitle: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700,
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--overlay)', zIndex: 1200,
        }}
      />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(520px, 100vw)',
        backgroundColor: 'var(--card-bg)', zIndex: 1201,
        boxShadow: '-4px 0 20px var(--shadow)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px', backgroundColor: 'var(--header-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--header-text)' }}>{t.gameDetails}</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'transparent', fontSize: 24,
              cursor: 'pointer', color: 'var(--header-text)', padding: '0 8px', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 20px' }}>
          {loading && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>...</div>}
          {error && <div style={{ color: 'var(--loss)', padding: 20 }}>{error}</div>}

          {data && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 12 }}>
                {gameDate && new Date(gameDate + 'T12:00:00Z').toLocaleDateString(t.locale, {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
                {startTime && !started && (
                  <> · {new Date(startTime).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}</>
                )}
                {' · '}
                <span style={{
                  fontWeight: 600,
                  color: finished ? 'var(--text-secondary)' : (data.gameState === 'LIVE' || data.gameState === 'CRIT') ? 'var(--loss)' : 'var(--accent)',
                }}>
                  {statusText(data, t)}
                </span>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 8px', marginBottom: 20,
                backgroundColor: 'var(--card-bg-alt)', borderRadius: 10,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <img src={away.logo} alt="" width={64} height={64} style={{ objectFit: 'contain' }} />
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text)', marginTop: 6 }}>{away.abbrev}</div>
                  {away.record && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{away.record}</div>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px' }}>
                  <div style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--accent)', letterSpacing: '0.5px' }}>
                    {started ? `${away.score ?? 0} – ${home.score ?? 0}` : '— : —'}
                  </div>
                  {!started && startTime && (
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {new Date(startTime).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <img src={home.logo} alt="" width={64} height={64} style={{ objectFit: 'contain' }} />
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text)', marginTop: 6 }}>{home.abbrev}</div>
                  {home.record && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{home.record}</div>}
                </div>
              </div>

              {(away.sog !== undefined || home.sog !== undefined) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionTitle}>{t.shotsLabel}</div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 12px', backgroundColor: 'var(--card-bg-alt)',
                    borderRadius: 6, fontSize: 14, color: 'var(--text)',
                  }}>
                    <span style={{ fontWeight: 600 }}>{away.sog ?? 0}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.shotsLabel}</span>
                    <span style={{ fontWeight: 600 }}>{home.sog ?? 0}</span>
                  </div>
                </div>
              )}

              {threeStars.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionTitle}>{t.threeStars}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {threeStars.map((s: any) => (
                      <StarCard key={s.star} star={s} rank={s.star} t={t} season={season} />
                    ))}
                  </div>
                </div>
              )}

              {goalsByPeriod.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={sectionTitle}>{t.goalScorers}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {goalsByPeriod.map((period: any, pi: number) => (
                      <div key={pi}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4, textTransform: 'uppercase' }}>
                          {periodLabel(period.periodDescriptor?.number, period.periodDescriptor?.periodType, t)}
                        </div>
                        {period.goals?.length > 0 ? period.goals.map((goal: any, gi: number) => {
                          const g = goal.goal ?? goal
                          const teamAbbrevStr = abbrevOf(g.teamAbbrev)
                          const playerName = g.name?.default ?? g.firstName?.default
                          const playerId = g.playerId ?? g.scorer?.playerId

                          return (
                            <div key={gi} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '4px 0', fontSize: 12,
                              borderBottom: '1px solid var(--border-light)',
                              color: 'var(--text)',
                            }}>
                              <span style={{ color: 'var(--text-muted)', minWidth: 40 }}>{fmtTime(g.timeInPeriod)}</span>
                              <PlayerHeadshot playerId={playerId} teamAbbrev={teamAbbrevStr} name={playerName} season={season} size={24} />
                              <span style={{ flex: 1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {playerName}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, minWidth: 32 }}>
                                {teamAbbrevStr}
                              </span>
                              {g.strength && <StrengthBadge code={g.strength} t={t} />}
                              <span style={{ fontWeight: 'bold', color: 'var(--accent)', minWidth: 40, textAlign: 'right' }}>
                                {g.awayScore}–{g.homeScore}
                              </span>
                            </div>
                          )
                        }) : (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>{t.gameNoGoals}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                fontSize: 12, color: 'var(--text-muted)',
                display: 'flex', flexDirection: 'column', gap: 6,
                marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)',
              }}>
                {venue && (
                  <div><strong style={{ color: 'var(--text)' }}>{t.venueLabel}:</strong> {venue}</div>
                )}
                {attendance !== undefined && (
                  <div><strong style={{ color: 'var(--text)' }}>{t.attendance}:</strong> {attendance.toLocaleString(t.locale)}</div>
                )}
              </div>

              {!started && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                  {t.gameNotStarted}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
