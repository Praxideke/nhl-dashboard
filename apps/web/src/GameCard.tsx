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

function teamLogoUrl(abbrev: string): string {
  return `https://assets.nhle.com/logos/nhl/svg/${abbrev}_dark.svg`
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
      flex: 1, padding: '10px 8px',
      backgroundColor: 'var(--card-bg-alt)', borderRadius: 10, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6, letterSpacing: '0.4px' }}>
        {label}
      </div>
      <div style={{ marginBottom: 6 }}>
        <PlayerHeadshot playerId={star.playerId} teamAbbrev={star.teamAbbrev} name={star.name?.default} season={season} size={72} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'center', lineHeight: 1.2, marginBottom: 3, minHeight: 30 }}>
        {star.name?.default ?? '—'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
        {abbrevOf(star.teamAbbrev)}
      </div>
      {(star.goals !== undefined || star.assists !== undefined) && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
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
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'inline-block',
        fontSize: 10, padding: '1px 5px',
        backgroundColor: 'var(--strength-bg)', borderRadius: 3,
        color: 'var(--strength-text)', fontWeight: 600,
        textTransform: 'uppercase', cursor: 'help', userSelect: 'none',
      }}
    >
      {display}
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
    </span>
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

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

  const regularPeriods = goalsByPeriod.filter((p: any) => {
    const num = p.periodDescriptor?.number
    const type = p.periodDescriptor?.periodType
    return num >= 1 && num <= 3 && (!type || type === 'REG')
  })
  const extraPeriods = goalsByPeriod.filter((p: any) => {
    const num = p.periodDescriptor?.number
    const type = p.periodDescriptor?.periodType
    return type === 'OT' || type === 'SO' || num > 3
  })

  const sectionTitle: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700, letterSpacing: '0.4px',
  }

  // Доли бросков для бара
  const awaySog = away.sog ?? 0
  const homeSog = home.sog ?? 0
  const totalSog = awaySog + homeSog
  const awayPct = totalSog > 0 ? (awaySog / totalSog) * 100 : 50
  const homePct = totalSog > 0 ? (homeSog / totalSog) * 100 : 50

  const renderGoal = (goal: any, gi: number, total: number) => {
    const g = goal.goal ?? goal
    const teamAbbrevStr = abbrevOf(g.teamAbbrev)
    const playerName = g.name?.default ?? g.firstName?.default
    const playerId = g.playerId ?? g.scorer?.playerId

    return (
      <div key={gi} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 0', fontSize: 14,
        borderBottom: gi < total - 1 ? '1px solid var(--border-light)' : 'none',
        color: 'var(--text)',
      }}>
        <PlayerHeadshot
          playerId={playerId}
          teamAbbrev={teamAbbrevStr}
          name={playerName}
          season={season}
          size={64}
        />
        <div style={{ flexShrink: 0, maxWidth: 140, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            lineHeight: 1.25,
          }}>
            {playerName}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--text-muted)', marginTop: 3,
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtTime(g.timeInPeriod)}</span>
            <span>·</span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{teamAbbrevStr}</span>
            {g.strength && (
              <>
                <span>·</span>
                <StrengthBadge code={g.strength} t={t} />
              </>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 8 }} />

        {teamAbbrevStr && (
          <img
            src={teamLogoUrl(teamAbbrevStr)}
            alt=""
            title={teamAbbrevStr}
            style={{
              width: 80,
              height: 80,
              objectFit: 'contain',
              opacity: 0.15,
              flexShrink: 0,
              filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.25))',
            }}
          />
        )}

        <div style={{ flex: 1, minWidth: 8 }} />

        <span style={{
          fontSize: 18, fontWeight: 'bold', color: 'var(--accent)',
          fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 48, textAlign: 'right',
        }}>
          {g.awayScore}–{g.homeScore}
        </span>
      </div>
    )
  }

  const renderPeriodCard = (period: any, keyPrefix: string) => (
    <div
      key={`${keyPrefix}-${period.periodDescriptor?.number ?? 'x'}-${period.periodDescriptor?.periodType ?? 'REG'}`}
      style={{
        backgroundColor: 'rgba(15, 20, 30, 0.45)', borderRadius: 10, padding: '10px 14px',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {periodLabel(period.periodDescriptor?.number, period.periodDescriptor?.periodType, t)}
      </div>
      {period.goals?.length > 0
        ? period.goals.map((goal: any, gi: number) => renderGoal(goal, gi, period.goals.length))
        : <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '2px 0' }}>{t.gameNoGoals}</div>
      }
    </div>
  )

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--overlay)', zIndex: 1200,
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(1600px, calc(100vw - 16px))',
        maxHeight: 'calc(100vh - 16px)',
        backgroundColor: '#0f1115',
        backgroundImage: 'linear-gradient(180deg, rgba(15,17,21,0.45) 0%, rgba(15,17,21,0.8) 50%, rgba(15,17,21,0.92) 100%), url("/bg/main-bg.jpg")',
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat, no-repeat',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        zIndex: 1201,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 18px',
          backgroundColor: 'rgba(10, 30, 55, 0.7)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 800 }}>{t.gameDetails}</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'rgba(255,255,255,0.1)', fontSize: 22,
              cursor: 'pointer', color: '#fff',
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', overscrollBehavior: 'contain',
          padding: '12px 20px',
        }}>
          {loading && <div style={{ color: '#fff', textAlign: 'center', padding: 40 }}>...</div>}
          {error && <div style={{ color: 'var(--loss)', padding: 20 }}>{error}</div>}

          {data && (
            <>
              <div style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginBottom: 10,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
              }}>
                {gameDate && (
                  <span>
                    {new Date(gameDate + 'T12:00:00Z').toLocaleDateString(t.locale, {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </span>
                )}
                {startTime && !started && (
                  <>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{new Date(startTime).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                )}
                {venue && (
                  <>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{venue}</span>
                  </>
                )}
                {attendance !== undefined && (
                  <>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{attendance.toLocaleString(t.locale)}</span>
                  </>
                )}
                <span style={{ opacity: 0.5 }}>·</span>
                <span style={{
                  fontWeight: 600,
                  color: finished ? 'var(--text-secondary)' : (data.gameState === 'LIVE' || data.gameState === 'CRIT') ? 'var(--loss)' : 'var(--accent)',
                }}>
                  {statusText(data, t)}
                </span>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
                padding: '12px 16px', marginBottom: 12,
                backgroundColor: 'rgba(15, 20, 30, 0.45)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <img src={away.logo} alt="" width={64} height={64} style={{ objectFit: 'contain' }} />
                  <div style={{ fontSize: 17, fontWeight: 'bold', color: 'var(--text)' }}>{away.abbrev}</div>
                  {away.record && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{away.record}</div>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px', minWidth: 150 }}>
                  <div style={{ fontSize: 42, fontWeight: 'bold', color: 'var(--accent)', letterSpacing: '1px', lineHeight: 1 }}>
                    {started ? `${away.score ?? 0} – ${home.score ?? 0}` : '— : —'}
                  </div>
                  {!started && startTime && (
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>
                      {new Date(startTime).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <img src={home.logo} alt="" width={64} height={64} style={{ objectFit: 'contain' }} />
                  <div style={{ fontSize: 17, fontWeight: 'bold', color: 'var(--text)' }}>{home.abbrev}</div>
                  {home.record && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{home.record}</div>}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: threeStars.length > 0 ? 'minmax(0, 1fr) minmax(0, 2fr)' : '1fr',
                gap: 12,
                marginBottom: 12,
              }}>
                {(away.sog !== undefined || home.sog !== undefined) && (
                  <div>
                    <div style={sectionTitle}>{t.shotsLabel}</div>
                    <div style={{
                      padding: '12px 14px',
                      backgroundColor: 'rgba(15, 20, 30, 0.45)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{
                          fontWeight: 'bold', color: 'var(--text)', fontSize: 16,
                          minWidth: 28, textAlign: 'left', fontVariantNumeric: 'tabular-nums',
                        }}>
                          {awaySog}
                        </span>
                        <div style={{
                          flex: 1,
                          height: 10,
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          borderRadius: 5,
                          display: 'flex',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${awayPct}%`,
                            backgroundColor: 'var(--accent)',
                            transition: 'width 0.3s',
                          }} />
                          <div style={{
                            width: `${homePct}%`,
                            backgroundColor: '#e25c5c',
                            transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{
                          fontWeight: 'bold', color: 'var(--text)', fontSize: 16,
                          minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                        }}>
                          {homeSog}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: 10, color: 'var(--text-muted)',
                        marginTop: 6, textTransform: 'uppercase',
                        letterSpacing: '0.4px', fontWeight: 600,
                      }}>
                        <span>{away.abbrev}</span>
                        <span>{home.abbrev}</span>
                      </div>
                    </div>
                  </div>
                )}

                {threeStars.length > 0 && (
                  <div>
                    <div style={sectionTitle}>{t.threeStars}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {threeStars.map((s: any) => (
                        <StarCard key={s.star} star={s} rank={s.star} t={t} season={season} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {goalsByPeriod.length > 0 && (
                <div>
                  <div style={sectionTitle}>{t.goalScorers}</div>

                  {regularPeriods.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${regularPeriods.length}, minmax(0, 1fr))`,
                      gap: 10,
                      marginBottom: extraPeriods.length > 0 ? 10 : 0,
                    }}>
                      {regularPeriods.map((p: any) => renderPeriodCard(p, 'reg'))}
                    </div>
                  )}

                  {extraPeriods.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                      {extraPeriods.map((p: any) => (
                        <div key={`${p.periodDescriptor?.periodType ?? 'X'}`} style={{ flex: '0 1 420px', minWidth: 0 }}>
                          {renderPeriodCard(p, 'extra')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!started && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '12px 0' }}>
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
