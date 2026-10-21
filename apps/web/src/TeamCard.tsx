import { useEffect, useState } from 'react'
import type { Translation } from './i18n'
import { getTeam } from './api'
import { PlayerCard } from './PlayerCard'

interface Props {
  abbrev: string
  season: string
  t: Translation
  onClose: () => void
}

const TEAM_NAME_MAP: Record<string, string> = {
  ANA: 'Anaheim Ducks',
  BOS: 'Boston Bruins',
  BUF: 'Buffalo Sabres',
  CGY: 'Calgary Flames',
  CAR: 'Carolina Hurricanes',
  CHI: 'Chicago Blackhawks',
  COL: 'Colorado Avalanche',
  CBJ: 'Columbus Blue Jackets',
  DAL: 'Dallas Stars',
  DET: 'Detroit Red Wings',
  EDM: 'Edmonton Oilers',
  FLA: 'Florida Panthers',
  LAK: 'Los Angeles Kings',
  MIN: 'Minnesota Wild',
  MTL: 'Montréal Canadiens',
  NSH: 'Nashville Predators',
  NJD: 'New Jersey Devils',
  NYI: 'New York Islanders',
  NYR: 'New York Rangers',
  OTT: 'Ottawa Senators',
  PHI: 'Philadelphia Flyers',
  PIT: 'Pittsburgh Penguins',
  SJS: 'San Jose Sharks',
  SEA: 'Seattle Kraken',
  STL: 'St. Louis Blues',
  TBL: 'Tampa Bay Lightning',
  TOR: 'Toronto Maple Leafs',
  VAN: 'Vancouver Canucks',
  VGK: 'Vegas Golden Knights',
  WSH: 'Washington Capitals',
  WPG: 'Winnipeg Jets',
  UTA: 'Utah Mammoth',
}

function formatDate(iso?: string, locale: string = 'ru-RU') {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
}

function injuryShort(status: string): string {
  if (status === 'Injured Reserve') return 'IR'
  if (status === 'Out') return 'OUT'
  if (status === 'Day-To-Day') return 'DTD'
  return status
}

function injuryLong(status: string, t: Translation): string {
  if (status === 'Injured Reserve') return t.injuredReserve
  if (status === 'Out') return t.out
  if (status === 'Day-To-Day') return t.dayToDay
  return status
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      marginBottom: 10,
      fontWeight: 700,
      letterSpacing: '0.8px',
    }}>
      {children}
    </div>
  )
}

function SubSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      marginBottom: 6,
      fontWeight: 700,
      letterSpacing: '0.4px',
      paddingBottom: 4,
      borderBottom: '1px solid rgba(255,255,255,0.12)',
    }}>
      {children}
    </div>
  )
}

function LeaderRow({
  player, stat, label, onClick,
}: {
  player: any
  stat: string
  label: string
  onClick: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const initials = (() => {
    const n = player.name ?? ''
    const parts = n.split(' ').filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  })()

  return (
    <div
      onClick={onClick}
      title={`${player.name} — ${label}: ${stat}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 0', cursor: 'pointer', borderRadius: 4,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {player.headshot && !imgError ? (
        <img
          src={player.headshot}
          alt=""
          width={48}
          height={48}
          style={{ objectFit: 'cover', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          backgroundColor: 'var(--accent)', color: 'var(--accent-text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 'bold', flexShrink: 0,
        }}>
          {initials}
        </div>
      )}
      <div style={{
        flexShrink: 0,
        fontSize: 13, color: 'var(--text)', fontWeight: 500,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {player.name}
      </div>
      <div style={{
        fontSize: 14, fontWeight: 'bold', color: 'var(--accent)',
        marginLeft: 4,
      }}>
        {stat}
      </div>
    </div>
  )
}

function PlayerRow({ player, t, onClick }: { player: any; t: Translation; onClick?: () => void }) {
  const injured = !!player.injury
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)',
        opacity: injured ? 0.75 : 1, cursor: onClick ? 'pointer' : 'default',
        minHeight: 72,
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <span style={{
        fontSize: 13, fontWeight: 'bold',
        color: injured ? 'var(--text-muted)' : 'var(--accent)',
        minWidth: 24, textAlign: 'right', flexShrink: 0,
      }}>
        {player.sweaterNumber ?? ''}
      </span>
      <img
        src={player.headshot}
        alt=""
        width={60}
        height={60}
        style={{ objectFit: 'cover', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text)',
            lineHeight: 1.2,
            overflowWrap: 'anywhere',
          }}>
            {player.firstName?.default} {player.lastName?.default}
          </span>
          {injured && (
            <span
              title={injuryLong(player.injury, t)}
              style={{
                fontSize: 9, padding: '2px 5px', borderRadius: 3,
                backgroundColor: 'var(--injury-bg)', color: 'var(--injury-text)',
                fontWeight: 700, letterSpacing: '0.3px', flexShrink: 0, cursor: 'help',
                alignSelf: 'center',
              }}
            >
              {injuryShort(player.injury)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {player.positionCode} · {player.shootsCatches === 'L' ? 'L' : 'R'}
        </div>
      </div>
    </div>
  )
}

function GameRow({
  game, abbrev, locale,
}: { game: any; abbrev: string; locale: string }) {
  const isHome = game.homeTeam?.abbrev === abbrev
  const opp = isHome ? game.awayTeam : game.homeTeam
  const ourScore = isHome ? game.homeTeam?.score : game.awayTeam?.score
  const oppScore = isHome ? game.awayTeam?.score : game.homeTeam?.score
  const finished = game.gameState === 'FINAL' || game.gameState === 'OFF'
  const won = finished && ourScore !== undefined && oppScore !== undefined && ourScore > oppScore

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 44 }}>
        {formatDate(game.gameDate || game.startTimeUTC, locale)}
      </span>
      <span style={{ color: 'var(--text-secondary)', minWidth: 16 }}>
        {isHome ? 'vs' : '@'}
      </span>
      <img src={opp?.logo} alt="" width={18} height={18} style={{ objectFit: 'contain' }} />
      <span style={{
        flex: 1, fontWeight: 500, color: 'var(--text)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {opp?.abbrev}
      </span>
      {finished ? (
        <span style={{ fontWeight: 'bold', color: won ? 'var(--win)' : 'var(--loss)' }}>
          {ourScore}–{oppScore}
        </span>
      ) : (
        <span style={{ color: 'var(--text-muted)' }}>
          {new Date(game.startTimeUTC).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}

export function TeamCard({ abbrev, season, t, onClose }: Props) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getTeam(abbrev, season)
      .then(d => {
        if (cancelled) return
        setData(d)
        setLoading(false)
      })
      .catch(e => {
        if (cancelled) return
        setError(e.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [abbrev, season])

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

  const leaders = data?.leaders
  const fullName = TEAM_NAME_MAP[abbrev] ?? abbrev

  const panelStyle: React.CSSProperties = {
    backgroundColor: 'rgba(15, 20, 30, 0.3)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
  }

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
        width: 'min(1400px, calc(100vw - 16px))',
        maxHeight: 'calc(100vh - 16px)',
        backgroundColor: '#0f1115',
        backgroundImage: 'linear-gradient(180deg, rgba(15,17,21,0.35) 0%, rgba(15,17,21,0.7) 50%, rgba(15,17,21,0.85) 100%), url("/bg/main-bg.jpg")',
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
          padding: '16px 24px',
          backgroundColor: 'rgba(10, 30, 55, 0.6)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src={`https://assets.nhle.com/logos/nhl/svg/${abbrev}_dark.svg`}
              alt="" width={56} height={56}
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.25))' }}
            />
            <h2 style={{
              margin: 0, fontSize: 24, color: '#fff', fontWeight: 800,
              letterSpacing: '0.5px',
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            }}>
              {fullName}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'rgba(255,255,255,0.1)',
              fontSize: 22, cursor: 'pointer', color: '#fff',
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', overscrollBehavior: 'contain',
          padding: '16px 20px 20px',
        }}>
          {loading && <div style={{ color: '#fff', textAlign: 'center', padding: 40 }}>...</div>}
          {error && <div style={{ color: 'var(--loss)', padding: 20 }}>{error}</div>}

          {data && (
            <>
              {leaders && (
                <section style={{ marginBottom: 18 }}>
                  <SectionTitle>{t.teamLeaders}</SectionTitle>
                  <div style={{
                    ...panelStyle,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 280px))',
                    justifyContent: 'start',
                    gap: 24,
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                        {t.topPoints}
                      </div>
                      {(leaders.points ?? []).map((p: any) => (
                        <LeaderRow key={p.playerId} player={p} stat={String(p.points ?? 0)} label={t.topPoints} onClick={() => setSelectedPlayerId(p.playerId)} />
                      ))}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                        {t.topGoals}
                      </div>
                      {(leaders.goals ?? []).map((p: any) => (
                        <LeaderRow key={p.playerId} player={p} stat={String(p.goals ?? 0)} label={t.topGoals} onClick={() => setSelectedPlayerId(p.playerId)} />
                      ))}
                    </div>
                    {leaders.goalie && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                          {t.topGoalie}
                        </div>
                        <LeaderRow
                          player={leaders.goalie}
                          stat={`${leaders.goalie.wins ?? 0}-${leaders.goalie.losses ?? 0}-${leaders.goalie.otLosses ?? 0}`}
                          label={t.topGoalie}
                          onClick={() => setSelectedPlayerId(leaders.goalie.playerId)}
                        />
                        {leaders.goalie.shutouts !== undefined && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 58 }}>
                            {t.shutoutsStat}: <strong style={{ color: 'var(--text)' }}>{leaders.goalie.shutouts}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: 16,
              }}>
                {data.roster && (
                  <section style={panelStyle}>
                    <SectionTitle>{t.teamRoster}</SectionTitle>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 16,
                    }}>
                      <div>
                        <SubSectionTitle>{t.forwards}</SubSectionTitle>
                        {(data.roster.forwards ?? []).map((p: any) => (
                          <PlayerRow key={p.id} player={p} t={t} onClick={() => setSelectedPlayerId(p.id)} />
                        ))}
                      </div>
                      <div>
                        <SubSectionTitle>{t.defensemen}</SubSectionTitle>
                        {(data.roster.defensemen ?? []).map((p: any) => (
                          <PlayerRow key={p.id} player={p} t={t} onClick={() => setSelectedPlayerId(p.id)} />
                        ))}
                      </div>
                      <div>
                        <SubSectionTitle>{t.goalies}</SubSectionTitle>
                        {(data.roster.goalies ?? []).map((p: any) => (
                          <PlayerRow key={p.id} player={p} t={t} onClick={() => setSelectedPlayerId(p.id)} />
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <section style={panelStyle}>
                    <SectionTitle>{t.recentGames}</SectionTitle>
                    {data.past?.length > 0
                      ? data.past.map((g: any) => <GameRow key={g.id} game={g} abbrev={abbrev} locale={t.locale} />)
                      : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.noGames}</div>}
                  </section>

                  <section style={panelStyle}>
                    <SectionTitle>{t.upcomingGames}</SectionTitle>
                    {data.future?.length > 0
                      ? data.future.map((g: any) => <GameRow key={g.id} game={g} abbrev={abbrev} locale={t.locale} />)
                      : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.noGames}</div>}
                  </section>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedPlayerId && (
        <PlayerCard
          playerId={selectedPlayerId}
          t={t}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}
    </>
  )
}
