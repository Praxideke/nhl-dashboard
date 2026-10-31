import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Translation } from './i18n'
import { getGame } from './api'
import { PlayerCard } from './PlayerCard'

interface Props {
  gameId: number | string
  t: Translation
  onClose: () => void
}

interface TeamGame {
  abbrev: string
  name: string
  logo: string
  score: number
  record?: string
  sog?: number
}

interface GoalEvent {
  time: string
  teamAbbrev: string
  scorerName: string
  scorerId?: string
  scorerHeadshot?: string
  strength?: string
  awayScore: number
  homeScore: number
}

interface Period {
  period: number
  type: 'REG' | 'OT' | 'SO'
  goals: GoalEvent[]
}

interface GameData {
  id: string
  date: string
  startTime: string
  venue?: string
  attendance?: number
  status: {
    state: 'pre' | 'in' | 'post'
    description: string
    period?: number
    clock?: string
  }
  home: TeamGame
  away: TeamGame
  periods: Period[]
  shots?: { home: number; away: number }
  threeStars?: any[]
}

function abbrevOf(x: any): string {
  if (!x) return ''
  if (typeof x === 'string') return x
  if (x.default) return x.default
  return ''
}

function periodLabel(period?: number, type?: string, t?: Translation): string {
  if (!t) return ''
  if (type === 'OT') return t.periodOT
  if (type === 'SO') return t.periodSO
  if (period === 1) return t.period1
  if (period === 2) return t.period2
  if (period === 3) return t.period3
  return period ? `${period}` : ''
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
  playerId, teamAbbrev, name, season, size = 64, isHero = false, overrideUrl
}: {
  playerId?: number | string
  teamAbbrev?: any
  name?: string
  season: number | string
  size?: number
  isHero?: boolean
  overrideUrl?: string
}) {
  const [imgError, setImgError] = useState(false)
  const abbrev = abbrevOf(teamAbbrev)
  const headshotUrl = overrideUrl || (playerId && abbrev ? buildHeadshotUrl(playerId, abbrev, season) : null)
  const showPhoto = headshotUrl && !imgError

  const borderStyle = isHero ? '3px solid #FFD700' : '2px solid var(--accent)'
  const shadowStyle = isHero ? '0 0 15px rgba(255, 215, 0, 0.6)' : 'none'

  if (showPhoto) {
    return (
      <img
        src={headshotUrl!}
        alt=""
        width={size}
        height={size}
        style={{
          objectFit: 'cover', borderRadius: '50%',
          backgroundColor: 'var(--card-bg-alt)', border: borderStyle, flexShrink: 0,
          boxShadow: shadowStyle,
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
      border: borderStyle, flexShrink: 0,
      boxShadow: shadowStyle,
    }}>
      {initials(name)}
    </div>
  )
}

function StrengthBadge({ code, t }: { code: string; t: Translation }) {
  const [hover, setHover] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  const label = strengthLabel(code, t)
  const display = String(code).trim().toUpperCase()

  const handleEnter = () => {
    if (ref.current) {
      setRect(ref.current.getBoundingClientRect())
    }
    setHover(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, padding: '1px 6px',
          backgroundColor: 'var(--strength-bg)', borderRadius: 3,
          color: 'var(--strength-text)', fontWeight: 600,
          textTransform: 'uppercase', cursor: 'help', userSelect: 'none',
        }}
      >
        {display}
      </span>
      {hover && rect && createPortal(
        <div style={{
          position: 'fixed',
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
          transform: 'translate(-50%, -100%)',
          backgroundColor: '#1e2230',
          color: '#ffffff',
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          {label}
        </div>,
        document.body
      )}
    </>
  )
}

export function GameCard({ gameId, t, onClose }: Props) {
  const [data, setData] = useState<GameData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getGame(gameId)
      .then(d => { if (!cancelled) { setData(d as GameData); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [gameId])

  useEffect(() => {
    const prevBody = document.body.style.overflow
    const prevHtml = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBody
      document.documentElement.style.overflow = prevHtml
    }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !selectedPlayerId) onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, selectedPlayerId])

  const finished = data?.status.state === 'post'
  const started = finished || data?.status.state === 'in'
  const season = '20262027'

  const sectionTitle: React.CSSProperties = {
    fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase',
    marginBottom: 6, fontWeight: 700, letterSpacing: '0.4px',
  }

  const getStatusText = (): string => {
    if (!data) return ''
    const isRu = t.locale === 'ru-RU'
    const desc = data.status.description?.toLowerCase() || ''
    const state = data.status.state
    const period = data.status.period

    if (state === 'in') {
      if (period === 1) return isRu ? 'Идёт 1-й период' : 'In Progress (1st Period)'
      if (period === 2) return isRu ? 'Идёт 2-й период' : 'In Progress (2nd Period)'
      if (period === 3) return isRu ? 'Идёт 3-й период' : 'In Progress (3rd Period)'
      if (period === 4 || desc.includes('ot')) return isRu ? 'Идёт овертайм' : 'In Progress (OT)'
      if (period === 5 || desc.includes('so')) return isRu ? 'Идёт серия буллитов' : 'In Progress (SO)'
      return isRu ? 'Идёт матч' : 'In Progress'
    }
    if (desc.includes('final')) {
      if (desc.includes('ot')) return t.finalOT || 'Final/OT'
      if (desc.includes('so')) return t.finalSO || 'Final/SO'
      return t.final || 'Final'
    }
    if (desc.includes('scheduled') || desc.includes('pre-game') || state === 'pre') {
      return isRu ? 'Запланирован' : 'Scheduled'
    }
    return data.status.description
  }

  const renderGoal = (goal: GoalEvent, gi: number, total: number) => {
    const playerGoalCount = data?.periods
      .flatMap(p => p.goals)
      .filter(g => g.scorerId && g.scorerId === goal.scorerId).length ?? 0
    const isHero = playerGoalCount >= 3

    return (
      <div key={gi} style={{
        display: 'flex', alignItems: 'center', padding: '10px 0', fontSize: 14,
        borderBottom: gi < total - 1 ? '1px solid var(--border-light)' : 'none',
        color: 'var(--text)', width: '100%',
      }}>
        <div style={{ width: 250, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, paddingRight: 10, zIndex: 1 }}>
          <div
            onClick={() => goal.scorerId && setSelectedPlayerId(goal.scorerId)}
            style={{ cursor: goal.scorerId ? 'pointer' : 'default', flexShrink: 0 }}
          >
            <PlayerHeadshot
              playerId={goal.scorerId}
              teamAbbrev={goal.teamAbbrev}
              name={goal.scorerName}
              season={season}
              size={64}
              isHero={isHero}
              overrideUrl={goal.scorerHeadshot}
            />
          </div>
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div
              onClick={() => goal.scorerId && setSelectedPlayerId(goal.scorerId)}
              style={{
                fontSize: 15, fontWeight: 700, color: isHero ? '#FFD700' : 'var(--text)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                lineHeight: 1.25, cursor: goal.scorerId ? 'pointer' : 'default',
              }}
            >
              {goal.scorerName}
              {isHero && <span style={{ marginLeft: 6, fontSize: 12, color: '#FFD700' }}>{'\u2B50'} {playerGoalCount}</span>}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: 'var(--text-muted)', marginTop: 3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{goal.time}</span>
              <span>{'\u00B7'}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{goal.teamAbbrev}</span>
              {goal.strength && (
                <>
                  <span>{'\u00B7'}</span>
                  <StrengthBadge code={goal.strength} t={t} />
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 0, minWidth: 0 }}>
          {goal.teamAbbrev && (
            <img
              src={teamLogoUrl(goal.teamAbbrev)}
              alt=""
              title={goal.teamAbbrev}
              style={{
                width: 80, height: 80, objectFit: 'contain', opacity: 0.3,
                filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.25))',
                pointerEvents: 'none', transform: 'translateX(-30px)',
              }}
            />
          )}
        </div>

        <div style={{ width: 60, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', zIndex: 1 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
            {goal.awayScore}{'\u2013'}{goal.homeScore}
          </span>
        </div>
      </div>
    )
  }

  const renderPeriodCard = (period: Period, keyPrefix: string, isCurrent: boolean) => (
    <div
      key={`${keyPrefix}-${period.period}-${period.type}`}
      style={{ 
        backgroundColor: 'rgba(15, 20, 30, 0.55)', 
        borderRadius: 10, 
        padding: '10px 14px', 
        border: isCurrent ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)', 
        height: '100%', 
        minHeight: 60,
        boxShadow: isCurrent ? '0 0 10px rgba(74, 158, 255, 0.2)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {isCurrent && (
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--loss)', boxShadow: '0 0 6px var(--loss)' }} />
        )}
        <div style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? 'var(--text)' : 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {periodLabel(period.period, period.type, t)}
        </div>
      </div>
      {period.goals.length > 0 && (
        period.goals.map((g, i) => renderGoal(g, i, period.goals.length))
      )}
    </div>
  )

  // Всегда показываем 3 периода для регулярного времени
  const regularPeriodNumbers = [1, 2, 3]
  const currentPeriod = data?.status.period || 0
  const regularPeriodsData = regularPeriodNumbers.map(num => {
    const existing = data?.periods.find(p => p.period === num && p.type === 'REG')
    const isCurrent = data?.status.state === 'in' && currentPeriod === num
    return {
      period: existing || { period: num, type: 'REG' as const, goals: [] },
      isCurrent
    }
  })

  const extraPeriods = data?.periods.filter(p => p.type === 'OT' || p.type === 'SO') ?? []

  const awaySog = data?.shots?.away ?? 0
  const homeSog = data?.shots?.home ?? 0
  const totalSog = awaySog + homeSog
  const awayPct = totalSog > 0 ? (awaySog / totalSog) * 100 : 50
  const homePct = totalSog > 0 ? (homeSog / totalSog) * 100 : 50

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
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(1600px, calc(100vw - 16px))', maxHeight: 'calc(100vh - 16px)',
        backgroundColor: '#0f1115',
        backgroundImage: 'linear-gradient(180deg, rgba(15,17,21,0.9) 0%, #0f1115 30%), url("/bg/main-bg.jpg")',
        backgroundSize: 'cover, cover', backgroundPosition: 'center top, center top', backgroundRepeat: 'no-repeat, no-repeat',
        border: '1px solid var(--border)', borderRadius: 12, zIndex: 1201,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 18px', backgroundColor: 'rgba(10, 30, 55, 0.9)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 800 }}>{t.gameDetails}</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'rgba(255,255,255,0.1)', fontSize: 22,
              cursor: 'pointer', color: '#fff', width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}
          >
            {'\u00D7'}
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '12px 20px' }}>
          {loading && <div style={{ color: '#fff', textAlign: 'center', padding: 40 }}>...</div>}
          {error && <div style={{ color: 'var(--loss)', padding: 20 }}>{error}</div>}
          {data && (
            <>
              <div style={{
                fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 10,
                display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 6,
              }}>
                {data.date && <span>{new Date(data.date + 'T12:00:00Z').toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                {data.startTime && !started && (
                  <>
                    <span style={{ opacity: 0.5 }}>{'\u00B7'}</span>
                    <span>{new Date(data.startTime).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                )}
                {data.venue && <><span style={{ opacity: 0.5 }}>{'\u00B7'}</span><span>{data.venue}</span></>}
                {data.attendance !== undefined && <><span style={{ opacity: 0.5 }}>{'\u00B7'}</span><span>{data.attendance.toLocaleString(t.locale)}</span></>}
                <span style={{ opacity: 0.5 }}>{'\u00B7'}</span>
                <span style={{
                  fontWeight: 600,
                  color: finished ? 'var(--text-secondary)' : data.status.state === 'in' ? 'var(--loss)' : 'var(--accent)',
                }}>
                  {getStatusText()}
                </span>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
                padding: '12px 16px', marginBottom: 12,
                backgroundColor: 'rgba(15, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                  <img src={data.away.logo} alt="" width={100} height={100} style={{ objectFit: 'contain' }} />
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--text)', textAlign: 'center', lineHeight: 1.2 }}>{data.away.name}</div>
                  {data.away.record && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.away.record}</div>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px', minWidth: 150 }}>
                  <div style={{ fontSize: 48, fontWeight: 'bold', color: 'var(--accent)', letterSpacing: '1px', lineHeight: 1 }}>
                    {started ? `${data.away.score} \u2013 ${data.home.score}` : '\u2014 : \u2014'}
                  </div>
                  {!started && data.startTime && (
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>
                      {new Date(data.startTime).toLocaleTimeString(t.locale, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                  <img src={data.home.logo} alt="" width={100} height={100} style={{ objectFit: 'contain' }} />
                  <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--text)', textAlign: 'center', lineHeight: 1.2 }}>{data.home.name}</div>
                  {data.home.record && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{data.home.record}</div>}
                </div>
              </div>

              {data.shots && (
                <div style={{ marginBottom: 12 }}>
                  <div style={sectionTitle}>{t.shotsLabel}</div>
                  <div style={{ padding: '12px 14px', backgroundColor: 'rgba(15, 20, 30, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: 16, minWidth: 28, textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{awaySog}</span>
                      <div style={{ flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 5, display: 'flex', overflow: 'hidden' }}>
                        <div style={{ width: `${awayPct}%`, backgroundColor: 'var(--accent)' }} />
                        <div style={{ width: `${homePct}%`, backgroundColor: '#e25c5c' }} />
                      </div>
                      <span style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: 16, minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{homeSog}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
                      <span>{data.away.abbrev}</span>
                      <span>{data.home.abbrev}</span>
                    </div>
                  </div>
                </div>
              )}

              {data.periods.length > 0 && (
                <div>
                  <div style={sectionTitle}>{t.goalScorers}</div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 10, 
                    marginBottom: extraPeriods.length > 0 ? 10 : 0,
                  }}>
                    {regularPeriodsData.map(({ period, isCurrent }) => renderPeriodCard(period, 'reg', isCurrent))}
                  </div>
                  {extraPeriods.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                      {extraPeriods.map(p => (
                        <div key={`${p.type}-${p.period}`} style={{ flex: '0 1 600px', minWidth: 0 }}>
                          {renderPeriodCard(p, 'extra', data.status.state === 'in' && data.status.period === p.period)}
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
      {selectedPlayerId && (
        <PlayerCard playerId={selectedPlayerId} t={t} onClose={() => setSelectedPlayerId(null)} />
      )}
    </>
  )
}
