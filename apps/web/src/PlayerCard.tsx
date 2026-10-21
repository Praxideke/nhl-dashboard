import { useEffect, useState } from 'react'
import type { Translation } from './i18n'
import { getPlayer } from './api'

interface Props {
  playerId: number | string
  t: Translation
  onClose: () => void
}

interface StatLine {
  gp: number
  goals?: number
  assists?: number
  points?: number
  plusMinus?: number
  pim?: number
  wins?: number
  losses?: number
  otLosses?: number
  gaa?: number
  savePctg?: number
  shutouts?: number
}

interface SeasonRow {
  season: number
  team: string
  league: string
  stats: StatLine
}

function isGoalie(position?: string): boolean {
  return position === 'G'
}

function extractStats(sub: any, position?: string): StatLine | null {
  if (!sub) return null
  const base: StatLine = { gp: sub.gamesPlayed ?? 0 }
  if (isGoalie(position)) {
    return {
      ...base,
      wins: sub.wins ?? 0,
      losses: sub.losses ?? 0,
      otLosses: sub.otLosses ?? 0,
      gaa: sub.goalsAgainstAvg ?? sub.gaa,
      savePctg: sub.savePctg,
      shutouts: sub.shutouts ?? 0,
    }
  }
  return {
    ...base,
    goals: sub.goals ?? 0,
    assists: sub.assists ?? 0,
    points: sub.points ?? 0,
    plusMinus: sub.plusMinus ?? 0,
    pim: sub.pim ?? 0,
  }
}

function extractSeasonHistory(seasonTotals: any[] | undefined, position?: string): SeasonRow[] {
  if (!seasonTotals) return []
  const filtered = seasonTotals.filter(s => s.gameTypeId === 2)
  const rows: SeasonRow[] = filtered.map(s => ({
    season: s.season,
    team: s.teamName?.default ?? s.teamCommonName?.default ?? '—',
    league: s.leagueAbbrev ?? 'NHL',
    stats: extractStats(s, position) as StatLine,
  }))
  return rows.sort((a, b) => b.season - a.season)
}

function formatSeason(season: number): string {
  const s = String(season)
  if (s.length !== 8) return s
  return `${s.slice(0, 4)}-${s.slice(6)}`
}

function calcAge(birthDate?: string): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

function fmt(n: number | undefined, digits = 0): string {
  if (n === undefined || n === null) return '—'
  if (digits === 0) return String(Math.round(n))
  return n.toFixed(digits)
}

function fmtGaa(n?: number): string {
  if (n === undefined) return '—'
  return n.toFixed(2)
}

function fmtPct(n?: number): string {
  if (n === undefined) return '—'
  return n.toFixed(3).replace(/^0/, '')
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '8px 10px', backgroundColor: 'rgba(15, 20, 30, 0.5)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 6, minWidth: 64,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--accent)' }}>
        {value}
      </div>
    </div>
  )
}

function StatRow({
  title, stats, isG, t,
}: { title: string; stats: StatLine | null; isG: boolean; t: Translation }) {
  if (!stats) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase',
        marginBottom: 6, fontWeight: 700, letterSpacing: '0.5px',
      }}>
        {title}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <StatBlock label={t.gp} value={fmt(stats.gp)} />
        {isG ? (
          <>
            <StatBlock label={t.winsStat} value={fmt(stats.wins)} />
            <StatBlock label={t.lossesStat} value={fmt(stats.losses)} />
            <StatBlock label={t.otLossesStat} value={fmt(stats.otLosses)} />
            <StatBlock label={t.gaaStat} value={fmtGaa(stats.gaa)} />
            <StatBlock label={t.savePctgStat} value={fmtPct(stats.savePctg)} />
            <StatBlock label={t.shutoutsStat} value={fmt(stats.shutouts)} />
          </>
        ) : (
          <>
            <StatBlock label={t.goalsCol} value={fmt(stats.goals)} />
            <StatBlock label={t.assistsCol} value={fmt(stats.assists)} />
            <StatBlock label={t.pointsCol} value={fmt(stats.points)} />
            <StatBlock label={t.plusMinusCol} value={(stats.plusMinus ?? 0) > 0 ? '+' + stats.plusMinus : fmt(stats.plusMinus)} />
            <StatBlock label={t.pimCol} value={fmt(stats.pim)} />
          </>
        )}
      </div>
    </div>
  )
}

function SeasonHistoryRow({ row, isG }: { row: SeasonRow; isG: boolean }) {
  const s = row.stats
  const cell: React.CSSProperties = { padding: '6px 4px', fontSize: 12, color: 'var(--text)' }
  const cellNum: React.CSSProperties = { ...cell, textAlign: 'right' }
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <td style={{ ...cell, color: 'var(--text-muted)' }}>{formatSeason(row.season)}</td>
      <td style={{ ...cell, fontWeight: 500 }}>{row.team}</td>
      <td style={cellNum}>{fmt(s.gp)}</td>
      {isG ? (
        <>
          <td style={cellNum}>{fmt(s.wins)}</td>
          <td style={cellNum}>{fmt(s.losses)}</td>
          <td style={cellNum}>{fmt(s.otLosses)}</td>
          <td style={cellNum}>{fmtGaa(s.gaa)}</td>
          <td style={cellNum}>{fmtPct(s.savePctg)}</td>
        </>
      ) : (
        <>
          <td style={cellNum}>{fmt(s.goals)}</td>
          <td style={cellNum}>{fmt(s.assists)}</td>
          <td style={{ ...cellNum, fontWeight: 'bold' }}>{fmt(s.points)}</td>
          <td style={cellNum}>
            {(s.plusMinus ?? 0) > 0 ? '+' + s.plusMinus : fmt(s.plusMinus)}
          </td>
        </>
      )}
    </tr>
  )
}

export function PlayerCard({ playerId, t, onClose }: Props) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getPlayer(playerId)
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
  }, [playerId])

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

  const pos = data?.position
  const isG = isGoalie(pos)
  const featured = data?.featuredStats?.regularSeason?.subSeason
  const career = data?.careerTotals?.regularSeason

  const current = extractStats(featured, pos)
  const careerLine = extractStats(career, pos)
  const seasonHistory = extractSeasonHistory(data?.seasonTotals, pos)

  const heightCm = data?.heightInCentimeters ?? (data?.heightInInches ? Math.round(data.heightInInches * 2.54) : undefined)
  const weightKg = data?.weightInKilograms ?? (data?.weightInPounds ? Math.round(data.weightInPounds * 0.4536) : undefined)
  const age = calcAge(data?.birthDate)
  const birthDate = data?.birthDate
  const birthCity = data?.birthCity?.default
  const birthCountry = data?.birthCountry

  const draft = data?.draftDetails
  const draftText = draft
    ? `${draft.year}, ${draft.teamAbbrev}, R${draft.round} #${draft.overallPick}`
    : t.undrafted

  const metaLabelStyle: React.CSSProperties = {
    color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 700,
    letterSpacing: '0.4px', marginBottom: 2,
  }

  const panelStyle: React.CSSProperties = {
    backgroundColor: 'rgba(15, 20, 30, 0.45)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
  }

  const thStyle: React.CSSProperties = {
    padding: '6px 4px',
    textAlign: 'left',
    fontSize: 10,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: 700,
    letterSpacing: '0.4px',
  }
  const thRightStyle: React.CSSProperties = { ...thStyle, textAlign: 'right' }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--overlay)', zIndex: 1300,
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(1000px, calc(100vw - 16px))',
        maxHeight: 'calc(100vh - 16px)',
        backgroundColor: '#0f1115',
        backgroundImage: 'linear-gradient(180deg, rgba(15,17,21,0.45) 0%, rgba(15,17,21,0.8) 50%, rgba(15,17,21,0.92) 100%), url("/bg/main-bg.jpg")',
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat, no-repeat',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        zIndex: 1301,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 20px',
          backgroundColor: 'rgba(10, 30, 55, 0.7)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 800 }}>{t.playerStats}</h2>
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
          padding: '16px 20px',
        }}>
          {loading && <div style={{ color: '#fff', textAlign: 'center', padding: 40 }}>...</div>}
          {error && <div style={{ color: 'var(--loss)', padding: 20 }}>{error}</div>}

          {data && (
            <>
              {/* Профиль */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 18, alignItems: 'center' }}>
                {data.headshot && (
                  <img
                    src={data.headshot}
                    alt=""
                    width={120}
                    height={120}
                    style={{
                      objectFit: 'cover', borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      border: '3px solid var(--accent)', flexShrink: 0,
                      boxShadow: '0 0 20px rgba(74, 158, 255, 0.4)',
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                    {data.firstName?.default} {data.lastName?.default}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {data.sweaterNumber ? `#${data.sweaterNumber} · ` : ''}
                    {pos} · {data.shootsCatches === 'L' ? 'L' : 'R'}
                  </div>
                  {data.currentTeamAbbrev && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '2px 8px', backgroundColor: 'rgba(74, 158, 255, 0.15)', borderRadius: 4 }}>
                      <img
                        src={`https://assets.nhle.com/logos/nhl/svg/${data.currentTeamAbbrev}_dark.svg`}
                        alt="" width={20} height={20} style={{ objectFit: 'contain' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                        {data.currentTeamAbbrev}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Био-метаданные */}
              <div style={{ ...panelStyle, marginBottom: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, fontSize: 13, color: 'var(--text)' }}>
                  <div>
                    <div style={metaLabelStyle}>{t.heightLabel}</div>
                    <div>{heightCm ? `${heightCm} см` : '—'}</div>
                  </div>
                  <div>
                    <div style={metaLabelStyle}>{t.weightLabel}</div>
                    <div>{weightKg ? `${weightKg} кг` : '—'}</div>
                  </div>
                  <div>
                    <div style={metaLabelStyle}>{t.ageLabel}</div>
                    <div>{age ?? '—'}</div>
                  </div>
                  <div>
                    <div style={metaLabelStyle}>{t.bornLabel}</div>
                    <div>{birthDate ?? '—'}{birthCity ? `, ${birthCity}` : ''}</div>
                  </div>
                  <div>
                    <div style={metaLabelStyle}>{t.countryLabel}</div>
                    <div>{birthCountry ?? '—'}</div>
                  </div>
                  <div>
                    <div style={metaLabelStyle}>{t.draftedLabel}</div>
                    <div>{draftText}</div>
                  </div>
                </div>
              </div>

              {/* Статистика */}
              <div style={{ ...panelStyle, marginBottom: 14 }}>
                <StatRow title={t.currentSeason} stats={current} isG={isG} t={t} />
                <StatRow title={t.careerTotals} stats={careerLine} isG={isG} t={t} />
              </div>

              {/* История клубов */}
              {seasonHistory.length > 0 && (
                <div style={panelStyle}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700, letterSpacing: '0.5px' }}>
                    {t.teamHistory}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <th style={thStyle}>{t.seasonWord}</th>
                          <th style={thStyle}>{t.teamCol}</th>
                          <th style={thRightStyle}>{t.gp}</th>
                          {isG ? (
                            <>
                              <th style={thRightStyle}>{t.winsStat}</th>
                              <th style={thRightStyle}>{t.lossesStat}</th>
                              <th style={thRightStyle}>{t.otLossesStat}</th>
                              <th style={thRightStyle}>{t.gaaStat}</th>
                              <th style={thRightStyle}>{t.savePctgStat}</th>
                            </>
                          ) : (
                            <>
                              <th style={thRightStyle}>{t.goalsCol}</th>
                              <th style={thRightStyle}>{t.assistsCol}</th>
                              <th style={thRightStyle}>{t.pointsCol}</th>
                              <th style={thRightStyle}>{t.plusMinusCol}</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {seasonHistory.map((row, idx) => (
                          <SeasonHistoryRow key={`${row.season}-${row.team}-${idx}`} row={row} isG={isG} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!current && !careerLine && seasonHistory.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>{t.noStats}</div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
