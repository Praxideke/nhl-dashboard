import { useMemo, useState } from 'react'
import type { StandingRow } from '@nhl/shared'
import { translateConf, translateDiv, type Translation } from './i18n'

type ViewMode = 'Division' | 'Conference' | 'Wild Card' | 'Overall'

const CONFERENCES = ['Eastern', 'Western'] as const
const DIVISIONS = {
  Eastern: ['Atlantic', 'Metropolitan'],
  Western: ['Central', 'Pacific'],
} as const

const COL_WIDTHS_PCT = [
  '4%',
  '23%',
  '3.5%',
  '3.5%',
  '3.5%',
  '4%',
  '5.5%',
  '3.5%',
  '4%',
  '4%',
  '5%',
  '6.5%',
  '6.5%',
  '8%',
  '5%',
  '6.5%',
]

interface Props {
  rows: StandingRow[]
  t: Translation
  onTeamClick?: (abbrev: string) => void
}

function teamLogoUrl(logo?: string, abbrev?: string): string {
  if (logo) {
    return logo.replace('_light', '_dark')
  }
  if (abbrev) {
    return `https://assets.nhle.com/logos/nhl/svg/${abbrev}_dark.svg`
  }
  return ''
}

const sortByPoints = (a: StandingRow, b: StandingRow) =>
  b.points - a.points ||
  b.pointPctg - a.pointPctg ||
  b.regulationWins - a.regulationWins ||
  b.regulationPlusOtWins - a.regulationPlusOtWins ||
  b.wins - a.wins ||
  b.goalDiff - a.goalDiff

export function StandingsTable({ rows, t, onTeamClick }: Props) {
  const [mode, setMode] = useState<ViewMode>('Division')

  const modeLabels: Record<ViewMode, string> = {
    'Division': t.modeDivision,
    'Conference': t.modeConference,
    'Wild Card': t.modeWildCard,
    'Overall': t.modeOverall,
  }

  const groupedData = useMemo(() => {
    if (!rows.length) return []

    if (mode === 'Overall') {
      return [{ title: t.overallStandings, data: [...rows].sort(sortByPoints) }]
    }

    if (mode === 'Conference') {
      return CONFERENCES.map(conf => ({
        title: translateConf(conf, t),
        data: rows.filter(r => r.conference === conf).sort(sortByPoints)
      }))
    }

    if (mode === 'Wild Card') {
      const result: { title: string; data: StandingRow[] }[] = []

      for (const conf of CONFERENCES) {
        const confTeams = rows.filter(r => r.conference === conf)

        for (const div of DIVISIONS[conf]) {
          const divTeams = confTeams.filter(r => r.division === div)
          const top3 = [...divTeams]
            .sort((a, b) => (a.rank - b.rank) || sortByPoints(a, b))
            .slice(0, 3)
          result.push({
            title: `${translateConf(conf, t)} — ${translateDiv(div, t)} (${t.top3})`,
            data: top3
          })
        }

        const top3Atlantic = confTeams.filter(r => r.division === 'Atlantic').sort((a, b) => (a.rank - b.rank) || sortByPoints(a, b)).slice(0, 3)
        const top3Metro = confTeams.filter(r => r.division === 'Metropolitan').sort((a, b) => (a.rank - b.rank) || sortByPoints(a, b)).slice(0, 3)
        const top3Central = confTeams.filter(r => r.division === 'Central').sort((a, b) => (a.rank - b.rank) || sortByPoints(a, b)).slice(0, 3)
        const top3Pacific = confTeams.filter(r => r.division === 'Pacific').sort((a, b) => (a.rank - b.rank) || sortByPoints(a, b)).slice(0, 3)

        const top3Ids = new Set([
          ...top3Atlantic.map(x => x.team.abbrev),
          ...top3Metro.map(x => x.team.abbrev),
          ...top3Central.map(x => x.team.abbrev),
          ...top3Pacific.map(x => x.team.abbrev),
        ])

        const wildCardTeams = confTeams
          .filter(r => !top3Ids.has(r.team.abbrev))
          .sort(sortByPoints)

        result.push({
          title: `${translateConf(conf, t)} — ${t.modeWildCard}`,
          data: wildCardTeams
        })
      }

      return result
    }

    const result: { title: string; data: StandingRow[] }[] = []
    for (const conf of CONFERENCES) {
      for (const div of DIVISIONS[conf]) {
        result.push({
          title: `${translateConf(conf, t)} — ${translateDiv(div, t)}`,
          data: rows
            .filter(r => r.conference === conf && r.division === div)
            .sort(sortByPoints)
        })
      }
    }
    return result
  }, [rows, mode, t])

  const thStyle: React.CSSProperties = {
    padding: '10px 6px',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: 'var(--header-text)',
    backgroundColor: 'var(--header-bg)',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    cursor: 'help',
    letterSpacing: '0.3px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
  const thLeftStyle = { ...thStyle, textAlign: 'left' as const }
  const thPtsStyle: React.CSSProperties = {
    ...thStyle,
    backgroundColor: 'rgba(255,255,255,0.18)',
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['Division', 'Conference', 'Wild Card', 'Overall'] as ViewMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '6px 12px',
              backgroundColor: mode === m ? 'var(--accent)' : 'var(--card-bg)',
              color: mode === m ? 'var(--accent-text)' : 'var(--text)',
              border: '1px solid var(--accent)',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: mode === m ? 'bold' : 'normal'
            }}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {groupedData.map((group, idx) => {
          const isWildCard = group.title.includes(t.modeWildCard)

          return (
            <div key={idx}>
              <h3 style={{
                margin: '0 0 10px 0',
                fontSize: 13,
                color: 'var(--text)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {group.title}
              </h3>

              <div style={{ overflow: 'visible' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 15,
                  tableLayout: 'fixed',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}>
                  <colgroup>
                    {COL_WIDTHS_PCT.map((w, i) => <col key={i} style={{ width: w }} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={thStyle} title={t.tipPos}>{t.pos}</th>
                      <th style={thLeftStyle} title={t.tipTeam}>{t.teamCol}</th>
                      <th style={thStyle} title={t.tipGP}>{t.gp}</th>
                      <th style={thStyle} title={t.tipW}>{t.wCol}</th>
                      <th style={thStyle} title={t.tipL}>{t.lCol}</th>
                      <th style={thStyle} title={t.tipOTL}>{t.otlCol}</th>
                      <th style={thPtsStyle} title={t.tipPTS}>{t.ptsCol}</th>
                      <th style={thStyle} title={t.tipRW}>{t.rwCol}</th>
                      <th style={thStyle} title={t.tipGF}>{t.gfCol}</th>
                      <th style={thStyle} title={t.tipGA}>{t.gaCol}</th>
                      <th style={thStyle} title={t.tipDIFF}>{t.diffCol}</th>
                      <th style={thStyle} title={t.tipHome}>{t.homeCol}</th>
                      <th style={thStyle} title={t.tipRoad}>{t.roadCol}</th>
                      <th style={thStyle} title={t.tipLast5}>{t.last5Col}</th>
                      <th style={thStyle} title={t.tipStreak}>{t.streakCol}</th>
                      <th style={thStyle} title={t.tipNext}>{t.nextCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.data.map((r, i) => {
                      const isPlayoffSpot = isWildCard && i < 2
                      const baseBg = isPlayoffSpot
                        ? 'rgba(21, 42, 61, 0.75)'
                        : (i % 2 === 0 ? 'rgba(20, 25, 35, 0.55)' : 'rgba(25, 30, 42, 0.55)')

                      const diffColor = r.goalDiff > 0
                        ? 'var(--win)'
                        : r.goalDiff < 0
                          ? 'var(--loss)'
                          : 'var(--text-muted)'

                      const streakColor = r.streak.startsWith('W')
                        ? 'var(--win)'
                        : r.streak.startsWith('L')
                          ? 'var(--loss)'
                          : '#f0a500'

                      return (
                        <tr
                          key={r.team.abbrev}
                          className="standings-row"
                          onClick={() => onTeamClick?.(r.team.abbrev)}
                          style={{
                            backgroundColor: baseBg,
                            cursor: onTeamClick ? 'pointer' : 'default',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <td style={{
                            padding: '0 4px',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            borderLeft: isPlayoffSpot ? '3px solid var(--accent)' : '3px solid transparent',
                            whiteSpace: 'nowrap',
                          }}>
                            {i + 1}
                          </td>

                          <td style={{ padding: '0 6px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              {r.clinchIndicator && (
                                <span
                                  title={
                                    r.clinchIndicator === 'x' ? t.clinchX
                                    : r.clinchIndicator === 'y' ? t.clinchY
                                    : r.clinchIndicator === 'z' ? t.clinchZ
                                    : t.clinchP
                                  }
                                  style={{
                                    color: 'var(--accent)',
                                    fontWeight: 700,
                                    fontSize: 12,
                                    textTransform: 'lowercase',
                                    cursor: 'help',
                                    minWidth: 12,
                                    flexShrink: 0,
                                  }}
                                >
                                  {r.clinchIndicator}
                                </span>
                              )}
                              <img
                                src={teamLogoUrl(r.team.logo, r.team.abbrev)}
                                alt=""
                                width={56}
                                height={56}
                                style={{
                                  objectFit: 'contain',
                                  flexShrink: 0,
                                  filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                                }}
                              />
                              <span style={{
                                fontWeight: 500,
                                color: 'var(--text)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>
                                {r.team.name}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '0 4px', textAlign: 'center', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.gamesPlayed}</td>
                          <td style={{ padding: '0 4px', textAlign: 'center', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.wins}</td>
                          <td style={{ padding: '0 4px', textAlign: 'center', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.losses}</td>
                          <td style={{ padding: '0 4px', textAlign: 'center', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.otLosses}</td>

                          <td style={{
                            padding: '0 4px',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: 16,
                            color: 'var(--text)',
                            backgroundColor: 'rgba(255,255,255,0.12)',
                            whiteSpace: 'nowrap',
                          }}>
                            {r.points}
                          </td>

                          <td style={{ padding: '0 4px', textAlign: 'center', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.regulationWins}</td>
                          <td style={{ padding: '0 4px', textAlign: 'center', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.goalFor}</td>
                          <td style={{ padding: '0 4px', textAlign: 'center', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.goalAgainst}</td>

                          <td style={{ padding: '0 4px', textAlign: 'center', color: diffColor, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                            {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                          </td>

                          <td style={{ padding: '0 4px', textAlign: 'center', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.homeRecord}</td>
                          <td style={{ padding: '0 4px', textAlign: 'center', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.roadRecord}</td>

                          <td style={{ padding: '0 4px' }}>
                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                              {(r.last5 || []).map((res, j) => {
                                let bgDot = 'transparent'
                                let border: string = '2px solid #d0021b'
                                if (res === 'W') { bgDot = '#4a90e2'; border = 'none' }
                                else if (res === 'L') { bgDot = '#d0021b'; border = 'none' }

                                const game = r.last5Games?.[j]

                                return (
                                  <div
                                    key={j}
                                    className="last5-dot"
                                    style={{
                                      width: 10, height: 10, borderRadius: '50%',
                                      backgroundColor: bgDot, border,
                                      flexShrink: 0,
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {game && (() => {
                                      const awayAbbrev = game.awayTeam?.abbrev ?? ''
                                      const homeAbbrev = game.homeTeam?.abbrev ?? ''
                                      const awayScore = game.awayTeam?.score ?? 0
                                      const homeScore = game.homeTeam?.score ?? 0
                                      const dateStr = new Date(
                                        (game.gameDate || game.startTimeUTC) + (game.gameDate ? 'T12:00:00Z' : '')
                                      ).toLocaleDateString(t.locale, { weekday: 'short', month: 'short', day: 'numeric' })
                                      const resultLabel = res === 'W' ? t.win : res === 'L' ? t.loss : t.otLoss
                                      const resultColor = res === 'W' ? 'var(--win)' : res === 'L' ? 'var(--loss)' : '#f0a500'

                                      return (
                                        <div
                                          className="tooltip-content"
                                          style={{
                                            padding: '14px 20px',
                                            minWidth: 230,
                                            textAlign: 'center',
                                          }}
                                        >
                                          <div style={{
                                            fontSize: 14,
                                            fontWeight: 700,
                                            marginBottom: 10,
                                            paddingBottom: 8,
                                            borderBottom: '1px solid var(--border-medium)',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            gap: 8,
                                          }}>
                                            <span style={{ color: resultColor }}>
                                              {resultLabel}
                                            </span>
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                              {dateStr}
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                            <img
                                              src={`https://assets.nhle.com/logos/nhl/svg/${awayAbbrev}_dark.svg`}
                                              alt={awayAbbrev}
                                              width={44}
                                              height={44}
                                              style={{ objectFit: 'contain' }}
                                            />
                                            <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', fontFamily: 'sans-serif' }}>
                                              {awayScore}
                                            </span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>:</span>
                                            <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', fontFamily: 'sans-serif' }}>
                                              {homeScore}
                                            </span>
                                            <img
                                              src={`https://assets.nhle.com/logos/nhl/svg/${homeAbbrev}_dark.svg`}
                                              alt={homeAbbrev}
                                              width={44}
                                              height={44}
                                              style={{ objectFit: 'contain' }}
                                            />
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )
                              })}
                            </div>
                          </td>

                          <td style={{ padding: '0 4px', textAlign: 'center', color: streakColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {r.streak}
                          </td>

                          <td style={{ padding: '0 4px' }}>
                            <div
                              className="cell-tooltip"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.nextGame ? (
                                <img
                                  src={`https://assets.nhle.com/logos/nhl/svg/${r.nextGame.opponentAbbrev}_dark.svg`}
                                  alt={r.nextGame.opponentAbbrev}
                                  width={56}
                                  height={56}
                                  style={{
                                    objectFit: 'contain',
                                    opacity: 0.95,
                                    filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                                  }}
                                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2' }}
                                />
                              ) : (
                                <span style={{
                                  color: 'var(--text-muted)',
                                  fontSize: 18,
                                  fontWeight: 300,
                                  lineHeight: 1,
                                }}>
                                  —
                                </span>
                              )}

                              {r.nextGame && (() => {
                                const ng = r.nextGame
                                const ourAbbrev = r.team.abbrev
                                const oppAbbrev = ng.opponentAbbrev
                                const awayAbbrev = ng.isHome ? oppAbbrev : ourAbbrev
                                const homeAbbrev = ng.isHome ? ourAbbrev : oppAbbrev
                                const dateStr = ng.date
                                  ? new Date(ng.date + 'T12:00:00Z').toLocaleDateString(t.locale, {
                                      weekday: 'short', month: 'short', day: 'numeric'
                                    })
                                  : ''

                                return (
                                  <div
                                    className="tooltip-content"
                                    style={{
                                      padding: '14px 20px',
                                      minWidth: 220,
                                      textAlign: 'center',
                                    }}
                                  >
                                    <div style={{
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: 'var(--text-secondary)',
                                      marginBottom: 10,
                                      paddingBottom: 8,
                                      borderBottom: '1px solid var(--border-medium)',
                                    }}>
                                      {dateStr}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                      <img
                                        src={`https://assets.nhle.com/logos/nhl/svg/${awayAbbrev}_dark.svg`}
                                        alt={awayAbbrev}
                                        width={64}
                                        height={64}
                                        style={{ objectFit: 'contain' }}
                                      />
                                      <span style={{ fontSize: 22, color: 'var(--text-muted)', fontWeight: 600 }}>@</span>
                                      <img
                                        src={`https://assets.nhle.com/logos/nhl/svg/${homeAbbrev}_dark.svg`}
                                        alt={homeAbbrev}
                                        width={64}
                                        height={64}
                                        style={{ objectFit: 'contain' }}
                                      />
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>

      {/* Легенда */}
      <div style={{
        marginTop: 40,
        paddingTop: 20,
        borderTop: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text-muted)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '6px 32px',
        }}>
          <div><strong style={{ color: 'var(--text)' }}>{t.gp}</strong> — {t.tipGP}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.wCol}</strong> — {t.tipW}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.lCol}</strong> — {t.tipL}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.otlCol}</strong> — {t.tipOTL}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.ptsCol}</strong> — {t.tipPTS}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.rwCol}</strong> — {t.tipRW}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.gfCol}</strong> — {t.tipGF}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.gaCol}</strong> — {t.tipGA}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.diffCol}</strong> — {t.tipDIFF}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.homeCol}</strong> — {t.tipHome}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.roadCol}</strong> — {t.tipRoad}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.nextCol}</strong> — {t.tipNext}</div>
          <div><strong style={{ color: 'var(--text)' }}>x</strong> — {t.clinchX}</div>
          <div><strong style={{ color: 'var(--text)' }}>y</strong> — {t.clinchY}</div>
          <div><strong style={{ color: 'var(--text)' }}>z</strong> — {t.clinchZ}</div>
        </div>
      </div>
    </div>
  )
}
