import { useMemo, useEffect, useState } from 'react'
import type { GameRow } from '@nhl/shared'
import type { Translation } from './i18n'

interface Props {
  games: GameRow[]
  centerDate: string
  t: Translation
  onGameClick?: (gameId: number) => void
}

function getLocalDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ФУНКЦИЯ ДЛЯ ПРАВИЛЬНОГО (СВЕТЛОГО) ЛОГОТИПА
function teamLogoUrl(logo?: string, abbrev?: string): string {
  if (logo) {
    return logo.replace('_light', '_dark')
  }
  if (abbrev) {
    return `https://assets.nhle.com/logos/nhl/svg/${abbrev}_dark.svg`
  }
  return ''
}

function useGroupedGames(games: GameRow[], centerDate: string) {
  return useMemo(() => {
    const grouped = new Map<string, GameRow[]>()
    for (const g of games) {
      const src = g.startTimeUTC || g.date
      const localDate = getLocalDate(src)
      if (!localDate) continue
      if (!grouped.has(localDate)) grouped.set(localDate, [])
      grouped.get(localDate)!.push(g)
    }

    const todayList: { date: string; games: GameRow[] }[] = []
    const future: { date: string; games: GameRow[] }[] = []

    for (const [date, dayGames] of grouped.entries()) {
      dayGames.sort((a, b) => (a.startTimeUTC || '').localeCompare(b.startTimeUTC || ''))
      if (date === centerDate) todayList.push({ date, games: dayGames })
      else if (date > centerDate) future.push({ date, games: dayGames })
    }

    todayList.sort((a, b) => a.date.localeCompare(b.date))
    future.sort((a, b) => a.date.localeCompare(b.date))

    return { todayList, future }
  }, [games, centerDate])
}

function formatTime(iso?: string, locale: string = 'ru-RU') {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string, locale: string = 'ru-RU') {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function MatchRow({
  game, forceFuture, t, onClick, prediction, onPredict,
}: {
  game: GameRow
  forceFuture?: boolean
  t: Translation
  onClick?: () => void
  prediction?: 'HOME' | 'AWAY'
  onPredict?: (choice: 'HOME' | 'AWAY') => void
}) {
  const isFut = game.status === 'FUT'
  const isFinal = game.status === 'FINAL'
  const isLive = game.status === 'LIVE'

  const showTime = isFut || forceFuture

  const homeWon = !forceFuture && isFinal && (game.homeTeam.score ?? 0) > (game.awayTeam.score ?? 0)
  const awayWon = !forceFuture && isFinal && (game.awayTeam.score ?? 0) > (game.homeTeam.score ?? 0)

  const periodLabel = isFinal
    ? (game.period === 'OT' ? t.finalOT : game.period === 'SO' ? t.finalSO : t.final)
    : isLive
      ? game.period
      : ''

  const isCorrect = isFinal && prediction && (
    (prediction === 'HOME' && homeWon) || (prediction === 'AWAY' && awayWon)
  )

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '14px 12px',
        borderBottom: '1px solid var(--border-light)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.backgroundColor = 'var(--card-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {/* Гости */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, minWidth: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0 }}>
          <span style={{
            fontWeight: awayWon ? 'bold' : 'normal',
            color: 'var(--text)',
            fontSize: 14,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}>
            {game.awayTeam.name}
          </span>
          <span style={{
            fontSize: 9,
            color: 'var(--text-weak)',
            textTransform: 'uppercase',
            fontWeight: 600,
            letterSpacing: '0.4px',
            marginTop: 2,
          }}>
            {t.awayLabel}
          </span>
        </div>
        <img 
          src={teamLogoUrl(game.awayTeam.logo, game.awayTeam.abbrev)} 
          alt="" 
          width={56} 
          height={56} 
          style={{ 
            objectFit: 'contain', 
            flexShrink: 0,
            filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))' 
          }} 
        />
      </div>

      {/* Счёт / время + прогнозы */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 110, flexShrink: 0, margin: '0 4px' }}>
        <div style={{
          width: 90,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'var(--score-bg)',
          borderRadius: 6,
          padding: '6px 8px',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', minHeight: 12 }}>
            {!showTime ? periodLabel : ''}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: showTime ? 'var(--text-secondary)' : 'var(--score-text)' }}>
            {showTime
              ? formatTime(game.startTimeUTC, t.locale)
              : `${game.awayTeam.score ?? 0} - ${game.homeTeam.score ?? 0}`}
          </div>
        </div>

        {/* Кнопки прогнозов (показываем только для будущих матчей) */}
        {showTime && onPredict && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onPredict('AWAY') }}
              style={{
                padding: '2px 8px', fontSize: 10, borderRadius: 4, border: '1px solid var(--border)',
                backgroundColor: prediction === 'AWAY' ? 'var(--accent)' : 'transparent',
                color: prediction === 'AWAY' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
              }}
            >
              {t.predictAway}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onPredict('HOME') }}
              style={{
                padding: '2px 8px', fontSize: 10, borderRadius: 4, border: '1px solid var(--border)',
                backgroundColor: prediction === 'HOME' ? 'var(--accent)' : 'transparent',
                color: prediction === 'HOME' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
              }}
            >
              {t.predictHome}
            </button>
          </div>
        )}

        {/* Результат прогноза (для завершенных матчей) */}
        {!showTime && prediction && (
          <div style={{ fontSize: 11, marginTop: 6, fontWeight: 'bold', color: isCorrect ? 'var(--win)' : 'var(--loss)' }}>
            {isCorrect ? '✅ ' + t.predictionCorrect : '❌ ' + t.predictionWrong}
          </div>
        )}
      </div>

      {/* Хозяева */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, minWidth: 0 }}>
        <img 
          src={teamLogoUrl(game.homeTeam.logo, game.homeTeam.abbrev)} 
          alt="" 
          width={56} 
          height={56} 
          style={{ 
            objectFit: 'contain', 
            flexShrink: 0,
            filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.3)) drop-shadow(0 1px 2px rgba(0,0,0,0.5))' 
          }} 
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
          <span style={{
            fontWeight: homeWon ? 'bold' : 'normal',
            color: 'var(--text)',
            fontSize: 14,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}>
            {game.homeTeam.name}
          </span>
          <span style={{
            fontSize: 9,
            color: 'var(--accent)',
            textTransform: 'uppercase',
            fontWeight: 700,
            letterSpacing: '0.4px',
            marginTop: 2,
          }}>
            {t.homeLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

function Section({
  title, data, forceFuture, t, onGameClick, predictions, onPredict,
}: {
  title: string
  data: { date: string; games: GameRow[] }[]
  forceFuture?: boolean
  t: Translation
  onGameClick?: (gameId: number) => void
  predictions: Record<number, 'HOME' | 'AWAY'>
  onPredict: (gameId: number, choice: 'HOME' | 'AWAY') => void
}) {
  if (data.length === 0) return null
  return (
    <div style={{
      marginBottom: 24,
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--card-bg-alt)',
        borderBottom: '1px solid var(--border)',
        fontWeight: 'bold',
        fontSize: 14,
        color: 'var(--text)',
      }}>
        {title}
      </div>
      <div>
        {data.map(day => (
          <div key={day.date}>
            <div style={{
              padding: '10px 16px',
              textAlign: 'right',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text)',
              backgroundColor: 'var(--card-bg-alt)',
              borderBottom: '1px solid var(--border)',
            }}>
              {formatDate(day.date, t.locale)}
            </div>
            {day.games.map(g => (
              <MatchRow
                key={g.id}
                game={g}
                forceFuture={forceFuture}
                t={t}
                onClick={onGameClick ? () => onGameClick(g.id) : undefined}
                prediction={predictions[g.id]}
                onPredict={(choice) => onPredict(g.id, choice)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const PREDICTIONS_STORAGE_KEY = 'nhl-predictions'

export function ScoresFeed({ games, centerDate, t, onGameClick }: Props) {
  const { todayList, future } = useGroupedGames(games, centerDate)

  const [predictions, setPredictions] = useState<Record<number, 'HOME' | 'AWAY'>>(() => {
    try {
      const saved = localStorage.getItem(PREDICTIONS_STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch (e) {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(PREDICTIONS_STORAGE_KEY, JSON.stringify(predictions))
    } catch (e) {}
  }, [predictions])

  const handlePredict = (gameId: number, choice: 'HOME' | 'AWAY') => {
    setPredictions(prev => ({
      ...prev,
      [gameId]: choice
    }))
  }

  let correct = 0
  let totalPredictedFinished = 0
  for (const g of games) {
    if (g.status === 'FINAL') {
      const pred = predictions[g.id]
      if (pred) {
        totalPredictedFinished++
        const homeWon = (g.homeTeam.score ?? 0) > (g.awayTeam.score ?? 0)
        const awayWon = (g.awayTeam.score ?? 0) > (g.homeTeam.score ?? 0)
        if ((pred === 'HOME' && homeWon) || (pred === 'AWAY' && awayWon)) {
          correct++
        }
      }
    }
  }

  return (
    <div>
      {totalPredictedFinished > 0 && (
        <div style={{
          marginBottom: 16,
          padding: '10px 16px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-light)',
          borderRadius: 6,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13
        }}>
          <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>{t.predictionsLabel}</span>
          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>
            {t.predictionsStats.replace('{correct}', String(correct)).replace('{total}', String(totalPredictedFinished))}
          </span>
        </div>
      )}

      <Section 
        title={t.todayMatches} 
        data={todayList} 
        t={t} 
        onGameClick={onGameClick} 
        predictions={predictions}
        onPredict={handlePredict}
      />
      <Section 
        title={t.fixtures} 
        data={future} 
        forceFuture={true} 
        t={t} 
        onGameClick={onGameClick} 
        predictions={predictions}
        onPredict={handlePredict}
      />
    </div>
  )
}
