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
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 0',
        cursor: 'pointer',
        borderRadius: 4,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--card-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {player.headshot && !imgError ? (
        <img
          src={player.headshot}
          alt=""
          width={28}
          height={28}
          style={{ objectFit: 'cover', borderRadius: '50%', backgroundColor: 'var(--card-bg-alt)', flexShrink: 0 }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          backgroundColor: 'var(--accent)', color: 'var(--accent-text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 'bold', flexShrink: 0,
        }}>
          {initials}
        </div>
      )}
      <div style={{
        flex: 1, minWidth: 0,
        fontSize: 12, color: 'var(--text)', fontWeight: 500,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {player.name}
      </div>
      <div style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--accent)' }}>
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
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 0',
        borderBottom: '1px solid var(--border-light)',
        opacity: injured ? 0.75 : 1,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.backgroundColor = 'var(--card-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <span style={{
        fontSize: 13, fontWeight: 'bold',
        color: injured ? 'var(--text-muted)' : 'var(--accent)',
        minWidth: 24, textAlign: 'right',
      }}>
        {player.sweaterNumber ?? ''}
      </span>
      <img
        src={player.headshot}
        alt=""
        width={36}
        height={36}
        style={{ objectFit: 'cover', borderRadius: '50%', backgroundColor: 'var(--card-bg-alt)', flexShrink: 0 }}
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
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
              }}
            >
              {injuryShort(player.injury)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
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
      padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-muted)', minWidth: 48 }}>
        {formatDate(game.gameDate || game.startTimeUTC, locale)}
      </span>
      <span style={{ color: 'var(--text-secondary)', minWidth: 18 }}>
        {isHome ? 'vs' : '@'}
      </span>
      <img src={opp?.logo} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
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

  const leaders = data?.leaders

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--overlay)', zIndex: 999,
        }}
      />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 100vw)',
        backgroundColor: 'var(--card-bg)',
        zIndex: 1000,
        boxShadow: '-4px 0 20px var(--shadow)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: 'var(--header-bg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={`https://assets.nhle.com/logos/nhl/svg/${abbrev}_light.svg`}
              alt="" width={36} height={36} style={{ objectFit: 'contain' }}
            />
            <h2 style={{ margin: 0, fontSize: 20, color: 'var(--header-text)' }}>{abbrev}</h2>
          </div>
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

        <div style={{
          flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: '16px 20px',
        }}>
          {loading && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>...</div>}
          {error && <div style={{ color: 'var(--loss)', padding: 20 }}>{error}</div>}

          {data && (
            <>
              {leaders && (
                <section style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                    {t.teamLeaders}
                  </h3>
                  <div style={{
                    display: 'flex', gap: 12, padding: 10,
                    backgroundColor: 'var(--card-bg-alt)', borderRadius: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4, letterSpacing: '0.4px' }}>
                        {t.topPoints}
                      </div>
                      {(leaders.points ?? []).map((p: any) => (
                        <LeaderRow
                          key={p.playerId}
                          player={p}
                          stat={String(p.points ?? 0)}
                          label={t.topPoints}
                          onClick={() => setSelectedPlayerId(p.playerId)}
                        />
                      ))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4, letterSpacing: '0.4px' }}>
                        {t.topGoals}
                      </div>
                      {(leaders.goals ?? []).map((p: any) => (
                        <LeaderRow
                          key={p.playerId}
                          player={p}
                          stat={String(p.goals ?? 0)}
                          label={t.topGoals}
                          onClick={() => setSelectedPlayerId(p.playerId)}
                        />
                      ))}
                    </div>
                    {leaders.goalie && (
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4, letterSpacing: '0.4px' }}>
                          {t.topGoalie}
                        </div>
                        <LeaderRow
                          player={leaders.goalie}
                          stat={`${leaders.goalie.wins ?? 0}-${leaders.goalie.losses ?? 0}-${leaders.goalie.otLosses ?? 0}`}
                          label={t.topGoalie}
                          onClick={() => setSelectedPlayerId(leaders.goalie.playerId)}
                        />
                        {leaders.goalie.shutouts !== undefined && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 34 }}>
                            {t.shutoutsStat}: <strong style={{ color: 'var(--text)' }}>{leaders.goalie.shutouts}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {data.roster && (
                <section style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                    {t.teamRoster}
                  </h3>

                  {data.roster.forwards?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>
                        {t.forwards}
                      </div>
                      {data.roster.forwards.map((p: any) => (
                        <PlayerRow key={p.id} player={p} t={t} onClick={() => setSelectedPlayerId(p.id)} />
                      ))}
                    </div>
                  )}

                  {data.roster.defensemen?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>
                        {t.defensemen}
                      </div>
                      {data.roster.defensemen.map((p: any) => (
                        <PlayerRow key={p.id} player={p} t={t} onClick={() => setSelectedPlayerId(p.id)} />
                      ))}
                    </div>
                  )}

                  {data.roster.goalies?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>
                        {t.goalies}
                      </div>
                      {data.roster.goalies.map((p: any) => (
                        <PlayerRow key={p.id} player={p} t={t} onClick={() => setSelectedPlayerId(p.id)} />
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                  {t.recentGames}
                </h3>
                {data.past?.length > 0
                  ? data.past.map((g: any) => <GameRow key={g.id} game={g} abbrev={abbrev} locale={t.locale} />)
                  : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.noGames}</div>}
              </section>

              <section>
                <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
                  {t.upcomingGames}
                </h3>
                {data.future?.length > 0
                  ? data.future.map((g: any) => <GameRow key={g.id} game={g} abbrev={abbrev} locale={t.locale} />)
                  : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.noGames}</div>}
              </section>
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
