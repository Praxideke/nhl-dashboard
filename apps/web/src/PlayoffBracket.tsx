import type { Translation } from './i18n'

interface PlayoffTeam {
  id: number
  abbrev: string
  name: { default: string }
  logo: string
}

interface PlayoffSeries {
  seriesTitle: string
  seriesLetter?: string
  playoffRound: number
  topSeedRankAbbrev: string
  topSeedWins: number
  bottomSeedRankAbbrev: string
  bottomSeedWins: number
  winningTeamId?: number
  topSeedTeam: PlayoffTeam
  bottomSeedTeam: PlayoffTeam
}

interface Props {
  data: { series?: PlayoffSeries[]; notStarted?: boolean; season?: string } | null
  t: Translation
}

const STANLEY_CUP_URL = 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Stanley_Cup_no_background.png'

const EAST_TEAMS = new Set([
  'BOS','BUF','DET','FLA','MTL','OTT','TBL','TOR',
  'CAR','CBJ','NJD','NYI','NYR','PHI','PIT','WSH'
])

function isEast(s: PlayoffSeries) {
  const t1 = s.topSeedTeam?.abbrev || ''
  const t2 = s.bottomSeedTeam?.abbrev || ''
  return EAST_TEAMS.has(t1) || EAST_TEAMS.has(t2)
}

function TeamRow({ team, seed, wins, isWinner }: { team: PlayoffTeam, seed: string, wins: number, isWinner: boolean }) {
  if (!team) return null;
  const safeWins = Number.isFinite(wins) ? wins : 0;
  const fullName = team.name?.default || team.abbrev;
  return (
    <div
      title={`${fullName}${seed ? ` (#${seed})` : ''} — ${safeWins} ${safeWins === 1 ? 'win' : 'wins'}`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', backgroundColor: isWinner ? 'var(--wildcard-bg)' : 'var(--card-bg-alt)',
        borderBottom: '1px solid var(--border-light)', minHeight: 48,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        <img src={team.logo} alt="" width={28} height={28} style={{ objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: isWinner ? 'bold' : 'normal', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {team.abbrev}
          </span>
          {seed && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>#{seed}</span>}
        </div>
      </div>
      <span style={{ fontWeight: 'bold', fontSize: 16, color: isWinner ? 'var(--accent)' : 'var(--text-muted)', marginLeft: 8 }}>
        {safeWins}
      </span>
    </div>
  )
}

function SeriesCard({ s }: { s: PlayoffSeries }) {
  if (!s || !s.topSeedTeam || !s.bottomSeedTeam) return null;
  const hasWinner = typeof s.winningTeamId === 'number' && s.winningTeamId !== 0;
  const topWon = hasWinner && s.winningTeamId === s.topSeedTeam.id;
  const bottomWon = hasWinner && s.winningTeamId === s.bottomSeedTeam.id;
  return (
    <div
      title={s.seriesTitle || undefined}
      style={{ 
        border: '1px solid var(--border)', 
        borderRadius: 8, 
        overflow: 'hidden', 
        backgroundColor: 'var(--card-bg)', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)', 
        width: '100%', 
        maxWidth: 220, 
        margin: '0 auto' 
      }}>
      <TeamRow team={s.topSeedTeam} seed={s.topSeedRankAbbrev} wins={s.topSeedWins} isWinner={topWon} />
      <TeamRow team={s.bottomSeedTeam} seed={s.bottomSeedRankAbbrev} wins={s.bottomSeedWins} isWinner={bottomWon} />
    </div>
  )
}

export function PlayoffBracket({ data, t }: Props) {
  const isRu = t.locale === 'ru-RU'

  if (data?.notStarted) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏒</div>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 18, color: 'var(--text)' }}>
          {isRu ? 'Плей-офф ещё не начался' : 'Playoffs have not started yet'}
        </div>
        <div style={{ fontSize: 13 }}>
          {isRu ? 'Сетка появится после окончания регулярного чемпионата.' : 'The bracket will appear after the regular season ends.'}
        </div>
      </div>
    )
  }

  if (!data?.series?.length) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 16 }}>
        {isRu ? 'Данные о плей-офф за этот сезон отсутствуют.' : 'No playoff data for this season.'}
      </div>
    )
  }

  const series = data.series
  const r1 = series.filter(s => s.playoffRound === 1)
  const r2 = series.filter(s => s.playoffRound === 2)
  const r3 = series.filter(s => s.playoffRound === 3)
  const r4 = series.filter(s => s.playoffRound === 4)

  const bySeed = (a: PlayoffSeries, b: PlayoffSeries) =>
    (Number(a.topSeedRankAbbrev) || 9) - (Number(b.topSeedRankAbbrev) || 9)

  const r1W = r1.filter(s => !isEast(s)).sort(bySeed)
  const r1E = r1.filter(s => isEast(s)).sort(bySeed)
  const r2W = r2.filter(s => !isEast(s))
  const r2E = r2.filter(s => isEast(s))
  const r3W = r3.filter(s => !isEast(s))
  const r3E = r3.filter(s => isEast(s))
  const finalSeries = r4[0]

  const roundLabel: React.CSSProperties = {
    textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '12px 0 8px 0', fontWeight: 700,
  }

  // Общий стиль для трех плашек
  const headerBox: React.CSSProperties = {
    textAlign: 'center', 
    fontWeight: 'bold', 
    padding: '12px 6px', 
    color: 'var(--text)', 
    fontSize: 14, 
    textTransform: 'uppercase', 
    letterSpacing: '1px',
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Единый полупрозрачный фон
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.05)'
  }

  return (
    <div style={{ paddingBottom: 10, overflowX: 'auto', overflowY: 'hidden' }}>
      <div style={{ minWidth: 1100 }}>

        {/* Три отдельные плашки с одинаковым фоном */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr 1fr 1fr 1fr', columnGap: 16, marginBottom: 10 }}>
          <div style={{ ...headerBox, gridColumn: '1 / 4' }}>
            {isRu ? 'Западная конференция' : 'Western Conference'}
          </div>
          <div style={{ ...headerBox, gridColumn: '4' }}>
            {isRu ? 'Финал' : 'Final'}
          </div>
          <div style={{ ...headerBox, gridColumn: '5 / 8' }}>
            {isRu ? 'Восточная конференция' : 'Eastern Conference'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr 1fr 1fr 1fr', columnGap: 16 }}>
          <div style={roundLabel}>{isRu ? '1-й раунд' : 'Round 1'}</div>
          <div style={roundLabel}>{isRu ? '2-й раунд' : 'Round 2'}</div>
          <div style={roundLabel}>{isRu ? 'Финал конф.' : 'Conf. Finals'}</div>
          <div style={roundLabel}>{isRu ? 'Финал' : 'Final'}</div>
          <div style={roundLabel}>{isRu ? 'Финал конф.' : 'Conf. Finals'}</div>
          <div style={roundLabel}>{isRu ? '2-й раунд' : 'Round 2'}</div>
          <div style={roundLabel}>{isRu ? '1-й раунд' : 'Round 1'}</div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1.2fr 1fr 1fr 1fr',
          columnGap: 16,
          gridTemplateRows: 'repeat(4, 105px)',
          alignItems: 'center',
        }}>
          {r1W.slice(0, 4).map((s, i) => (
            <div key={`r1w-${i}`} style={{ gridColumn: 1, gridRow: i + 1, display: 'flex', alignItems: 'center' }}>
              <SeriesCard s={s} />
            </div>
          ))}
          {r2W.slice(0, 2).map((s, i) => (
            <div key={`r2w-${i}`} style={{ gridColumn: 2, gridRow: `${i * 2 + 1} / span 2`, display: 'flex', alignItems: 'center' }}>
              <SeriesCard s={s} />
            </div>
          ))}
          {r3W.slice(0, 1).map((s, i) => (
            <div key={`r3w-${i}`} style={{ gridColumn: 3, gridRow: '1 / span 4', display: 'flex', alignItems: 'center' }}>
              <SeriesCard s={s} />
            </div>
          ))}

          <div style={{ gridColumn: 4, gridRow: '1 / span 4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <img src={STANLEY_CUP_URL} alt="Stanley Cup" style={{ width: '100%', maxWidth: 110, height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.6))' }} />
            {finalSeries ? (
              <div style={{ width: '100%' }}><SeriesCard s={finalSeries} /></div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{isRu ? 'Ожидание финалистов...' : 'Waiting for finalists...'}</div>
            )}
          </div>

          {r3E.slice(0, 1).map((s, i) => (
            <div key={`r3e-${i}`} style={{ gridColumn: 5, gridRow: '1 / span 4', display: 'flex', alignItems: 'center' }}>
              <SeriesCard s={s} />
            </div>
          ))}
          {r2E.slice(0, 2).map((s, i) => (
            <div key={`r2e-${i}`} style={{ gridColumn: 6, gridRow: `${i * 2 + 1} / span 2`, display: 'flex', alignItems: 'center' }}>
              <SeriesCard s={s} />
            </div>
          ))}
          {r1E.slice(0, 4).map((s, i) => (
            <div key={`r1e-${i}`} style={{ gridColumn: 7, gridRow: i + 1, display: 'flex', alignItems: 'center' }}>
              <SeriesCard s={s} />
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
