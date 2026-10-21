import { useMemo, useState } from 'react'
import type { StandingRow } from '@nhl/shared'
import { translateConf, translateDiv, type Translation } from './i18n'

type ViewMode = 'Division' | 'Conference' | 'Wild Card' | 'Overall'

const CONFERENCES = ['Eastern', 'Western'] as const
const DIVISIONS = {
  Eastern: ['Atlantic', 'Metropolitan'],
  Western: ['Central', 'Pacific'],
} as const

interface TooltipState {
  x: number
  y: number
  game: any
  result: 'W' | 'L' | 'OTL'
}

interface Props {
  rows: StandingRow[]
  t: Translation
  onTeamClick?: (abbrev: string) => void
}

// Используем _dark.svg (яркая версия для тёмных фонов) вместо _light.svg
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
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

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
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: 'var(--header-text)',
    backgroundColor: 'var(--header-bg)',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    cursor: 'help',
  }
  const thLeftStyle = { ...thStyle, textAlign: 'left' as const }
  const tdCenter: React.CSSProperties = { padding: '8px 6px', textAlign: 'center', color: 'var(--text)' }

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
                margin: '0 0 8px 0',
                fontSize: 13,
                color: 'var(--text)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {group.title}
              </h3>
              <div style={{
                overflowX: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 4,
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle} title={t.tipPos}>{t.pos}</th>
                      <th style={thLeftStyle} title={t.tipTeam}>{t.teamCol}</th>
                      <th style={thStyle} title={t.tipGP}>{t.gp}</th>
                      <th style={thStyle} title={t.tipW}>{t.wCol}</th>
                      <th style={thStyle} title={t.tipL}>{t.lCol}</th>
                      <th style={thStyle} title={t.tipOTL}>{t.otlCol}</th>
                      <th style={thStyle} title={t.tipPTS}>{t.ptsCol}</th>
                      <th style={thStyle} title={t.tipRW}>{t.rwCol}</th>
                      <th style={thStyle} title={t.tipROW}>{t.rowCol}</th>
                      <th style={thStyle} title={t.tipGF}>{t.gfCol}</th>
                      <th style={thStyle} title={t.tipGA}>{t.gaCol}</th>
                      <th style={thStyle} title={t.tipHome}>{t.homeCol}</th>
                      <th style={thStyle} title={t.tipRoad}>{t.roadCol}</th>
                      <th style={thStyle} title={t.tipLast5}>{t.last5Col}</th>
                      <th style={thStyle} title={t.tipStreak}>{t.streakCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.data.map((r, i) => {
                      const isPlayoffSpot = isWildCard && i < 2
                      const bg = isPlayoffSpot
                        ? 'var(--wildcard-bg)'
                        : (i % 2 === 0 ? 'var(--card-bg)' : 'var(--card-bg-alt)')

                      return (
                        <tr
                          key={r.team.abbrev}
                          onClick={() => onTeamClick?.(r.team.abbrev)}
                          style={{
                            backgroundColor: bg,
                            borderBottom: '1px solid var(--border-light)',
                            borderLeft: isPlayoffSpot ? '3px solid var(--accent)' : '3px solid transparent',
                            cursor: onTeamClick ? 'pointer' : 'default',
                          }}
                          onMouseEnter={(e) => {
                            if (onTeamClick) e.currentTarget.style.backgroundColor = 'var(--card-bg-hover)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = bg
                          }}
                        >
                          <td style={{ padding: '8px 6px', textAlign: 'center', color: 'var(--text-muted)' }}>{i + 1}</td>
                          <td style={{ padding: '0 6px', height: 48 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                                  }}
                                >
                                  {r.clinchIndicator}
                                </span>
                              )}
                              <img
                                src={teamLogoUrl(r.team.logo, r.team.abbrev)}
                                alt=""
                                width={44}
                                height={44}
                                style={{
                                  objectFit: 'contain',
                                  flexShrink: 0,
                                  filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.35)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                                }}
                              />
                              <span style={{ fontWeight: 500, color: 'var(--text)' }}>{r.team.name}</span>
                            </div>
                          </td>
                          <td style={tdCenter}>{r.gamesPlayed}</td>
                          <td style={tdCenter}>{r.wins}</td>
                          <td style={tdCenter}>{r.losses}</td>
                          <td style={tdCenter}>{r.otLosses}</td>
                          <td style={{ ...tdCenter, fontWeight: 'bold' }}>{r.points}</td>
                          <td style={tdCenter}>{r.regulationWins}</td>
                          <td style={tdCenter}>{r.regulationPlusOtWins}</td>
                          <td style={tdCenter}>{r.goalFor}</td>
                          <td style={tdCenter}>{r.goalAgainst}</td>
                          <td style={tdCenter}>{r.homeRecord}</td>
                          <td style={tdCenter}>{r.roadRecord}</td>
                          <td style={tdCenter}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              {(r.last5 || []).map((res, j) => {
                                let bgDot = 'transparent'
                                let border = '2px solid #d0021b'
                                if (res === 'W') { bgDot = '#4a90e2'; border = 'none' }
                                else if (res === 'L') { bgDot = '#d0021b'; border = 'none' }

                                const game = r.last5Games?.[j]

                                return (
                                  <div
                                    key={j}
                                    style={{
                                      width: 12, height: 12, borderRadius: '50%',
                                      backgroundColor: bgDot, border: border,
                                      cursor: game ? 'pointer' : 'default'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.stopPropagation()
                                      if (game) {
                                        setTooltip({ x: e.clientX, y: e.clientY, game, result: res })
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      e.stopPropagation()
                                      setTooltip(null)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                )
                              })}
                            </div>
                          </td>
                          <td style={tdCenter}>{r.streak}</td>
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
          <div><strong style={{ color: 'var(--text)' }}>{t.rowCol}</strong> — {t.tipROW}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.gfCol}</strong> — {t.tipGF}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.gaCol}</strong> — {t.tipGA}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.homeCol}</strong> — {t.tipHome}</div>
          <div><strong style={{ color: 'var(--text)' }}>{t.roadCol}</strong> — {t.tipRoad}</div>
          <div><strong style={{ color: 'var(--text)' }}>x</strong> — {t.clinchX}</div>
          <div><strong style={{ color: 'var(--text)' }}>y</strong> — {t.clinchY}</div>
          <div><strong style={{ color: 'var(--text)' }}>z</strong> — {t.clinchZ}</div>
        </div>
      </div>

      {tooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.y + 15,
            left: tooltip.x - 90,
            background: 'var(--tooltip-bg)',
            border: '1px solid var(--tooltip-border)',
            borderRadius: 8,
            padding: '12px 16px',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 180,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', gap: 6 }}>
            <span style={{ color: tooltip.result === 'W' ? 'var(--link)' : tooltip.result === 'L' ? 'var(--loss)' : 'var(--text-secondary)' }}>
              {tooltip.result === 'W' ? t.win : tooltip.result === 'L' ? t.loss : t.otLoss}
            </span>
            <span>-</span>
            <span>
              {new Date((tooltip.game.gameDate || tooltip.game.startTimeUTC) + (tooltip.game.gameDate ? 'T12:00:00Z' : '')).toLocaleDateString(t.locale, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={tooltip.game.awayTeam.logo} alt="" width={40} height={40} style={{ objectFit: 'contain' }} />
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', fontFamily: 'sans-serif' }}>
              {tooltip.game.awayTeam.score}
            </span>
            <div style={{ width: 1, height: 24, backgroundColor: 'var(--border-medium)' }} />
            <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', fontFamily: 'sans-serif' }}>
              {tooltip.game.homeTeam.score}
            </span>
            <img src={tooltip.game.homeTeam.logo} alt="" width={40} height={40} style={{ objectFit: 'contain' }} />
          </div>
        </div>
      )}
    </div>
  )
}
