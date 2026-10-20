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
  data: { series?: PlayoffSeries[] } | null
  t: Translation
}

const STANLEY_CUP_URL = 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Stanley_Cup_no_background.png'

function TeamRow({
  team, seed, wins, isWinner,
}: {
  team: PlayoffTeam
  seed: string
  wins: number
  isWinner: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 8px',
      backgroundColor: isWinner ? 'var(--wildcard-bg)' : 'var(--card-bg)',
      borderBottom: '1px solid var(--border-light)',
      minHeight: 72,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        <img src={team.logo} alt="" width={56} height={56} style={{ objectFit: 'contain', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{
            fontSize: 16,
            fontWeight: isWinner ? 'bold' : 'normal',
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.1,
          }}>
            {team.abbrev}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600 }}>
            {seed}
          </span>
        </div>
      </div>
      <span style={{
        fontWeight: 'bold',
        fontSize: 26,
        color: isWinner ? 'var(--accent)' : 'var(--text-muted)',
        marginLeft: 4,
      }}>
        {wins}
      </span>
    </div>
  )
}

function SeriesCard({ s }: { s: PlayoffSeries }) {
  const topWon = s.winningTeamId === s.topSeedTeam.id
  const bottomWon = s.winningTeamId === s.bottomSeedTeam.id

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: 'var(--card-bg)',
      boxShadow: '0 2px 8px var(--shadow)',
    }}>
      <TeamRow team={s.topSeedTeam} seed={s.topSeedRankAbbrev} wins={s.topSeedWins} isWinner={topWon} />
      <TeamRow team={s.bottomSeedTeam} seed={s.bottomSeedRankAbbrev} wins={s.bottomSeedWins} isWinner={bottomWon} />
    </div>
  )
}

export function PlayoffBracket({ data, t }: Props) {
  const isRu = t.locale === 'ru-RU'

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

  const r1E = r1.slice(0, 4)
  const r1W = r1.slice(4, 8)
  const r2E = r2.slice(0, 2)
  const r2W = r2.slice(2, 4)
  const r3E = r3.slice(0, 1)
  const r3W = r3.slice(1, 2)
  const finalSeries = r4[0]

  const headerCell: React.CSSProperties = {
    textAlign: 'center',
    fontWeight: 'bold',
    padding: '14px 6px',
    backgroundColor: 'var(--header-bg)',
    color: 'var(--header-text)',
    fontSize: 15,
    borderRadius: 6,
  }

  const roundLabel: React.CSSProperties = {
    textAlign: 'center',
    fontSize: 12,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    padding: '12px 0',
    letterSpacing: '0.5px',
    fontWeight: 700,
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        columnGap: 8,
      }}>
        <div style={{ ...headerCell, gridColumn: '1 / 4' }}>
          {isRu ? 'Западная конференция' : 'Western Conference'}
        </div>
        <div style={{ ...headerCell, gridColumn: '4' }}>
          {isRu ? 'Финал' : 'Final'}
        </div>
        <div style={{ ...headerCell, gridColumn: '5 / 8' }}>
          {isRu ? 'Восточная конференция' : 'Eastern Conference'}
        </div>

        <div style={roundLabel}>{isRu ? '1-й раунд' : 'Round 1'}</div>
        <div style={roundLabel}>{isRu ? '2-й раунд' : 'Round 2'}</div>
        <div style={roundLabel}>{isRu ? 'Финал конф.' : 'Conf. Finals'}</div>
        <div style={roundLabel}>{isRu ? 'Финал' : 'Final'}</div>
        <div style={roundLabel}>{isRu ? 'Финал конф.' : 'Conf. Finals'}</div>
        <div style={roundLabel}>{isRu ? '2-й раунд' : 'Round 2'}</div>
        <div style={roundLabel}>{isRu ? '1-й раунд' : 'Round 1'}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {r1W.map((s, i) => <SeriesCard key={s.seriesLetter || i} s={s} />)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {r2W.map((s, i) => <SeriesCard key={s.seriesLetter || i} s={s} />)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {r3W.map((s, i) => <SeriesCard key={s.seriesLetter || i} s={s} />)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <img
            src={STANLEY_CUP_URL}
            alt="Stanley Cup"
            style={{ width: '100%', maxWidth: 170, height: 'auto', objectFit: 'contain' }}
          />
          {finalSeries && (
            <div style={{ width: '100%' }}>
              <SeriesCard s={finalSeries} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {r3E.map((s, i) => <SeriesCard key={s.seriesLetter || i} s={s} />)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
          {r2E.map((s, i) => <SeriesCard key={s.seriesLetter || i} s={s} />)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {r1E.map((s, i) => <SeriesCard key={s.seriesLetter || i} s={s} />)}
        </div>
      </div>
    </div>
  )
}
