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
      padding: '8px 6px', backgroundColor: 'var(--card-bg-alt)',
      borderRadius: 6, minWidth: 56,
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
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>
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
    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
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
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--overlay)', zIndex: 1100,
        }}
      />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(440px, 100vw)',
        backgroundColor: 'var(--card-bg)', zIndex: 1101,
        boxShadow: '-4px 0 20px var(--shadow)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px', backgroundColor: 'var(--header-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--header-text)' }}>{t.playerStats}</h2>
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
              <div style={{ display: 'flex', gap: 18, marginBottom: 20, alignItems: 'center' }}>
                {data.headshot && (
                  <img
                    src={data.headshot}
                    alt=""
                    width={120}
                    height={120}
                    style={{
                      objectFit: 'cover', borderRadius: '50%',
                      backgroundColor: 'var(--card-bg-alt)',
                      border: '3px solid var(--accent)', flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text)', lineHeight: 1.2 }}>
                    {data.firstName?.default} {data.lastName?.default}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {data.sweaterNumber ? `#${data.sweaterNumber} · ` : ''}
                    {pos} · {data.shootsCatches === 'L' ? 'L' : 'R'}
                  </div>
                  {data.currentTeamAbbrev && (
                    <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>
                      {data.currentTeamAbbrev}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20, fontSize: 12, color: 'var(--text)' }}>
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

              <StatRow title={t.currentSeason} stats={current} isG={isG} t={t} />
              <StatRow title={t.careerTotals} stats={careerLine} isG={isG} t={t} />

              {seasonHistory.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>
                    {t.teamHistory}
                  </div>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 4 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--card-bg-alt)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '6px 4px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.seasonWord}</th>
                          <th style={{ padding: '6px 4px', textAlign: 'left', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.teamCol}</th>
                          <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.gp}</th>
                          {isG ? (
                            <>
                              <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.winsStat}</th>
                              <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.lossesStat}</th>
                              <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.otLossesStat}</th>
                              <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.gaaStat}</th>
                              <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.savePctgStat}</th>
                            </>
                          ) : (
                            <>
                              <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.goalsCol}</th>
                              <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.assistsCol}</th>
                              <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.pointsCol}</th>
                              <th style={{ padding: '6px 4px', textAlign: 'right', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.plusMinusCol}</th>
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

