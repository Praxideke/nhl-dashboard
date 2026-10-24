import { useEffect, useState } from 'react'
import type { Translation } from './i18n'
import { getCalendar } from './api'

interface Props {
  t: Translation
  onGameClick?: (gameId: number) => void
}

export function CalendarView({ t, onGameClick }: Props) {
  // Текущая дата для старта
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  )
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCalendar(currentMonth)
      .then(d => {
        if (!cancelled) {
          setGames(d)
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e.message)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [currentMonth])

  const [year, month] = currentMonth.split('-').map(Number)
  
  // Получаем название месяца на нужном языке
  const monthName = new Date(year, month - 1, 1).toLocaleDateString(t.locale, { month: 'long', year: 'numeric' })

  // Вычисляем дни
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  // Переводим день недели так, чтобы Пн был 0, а Вс был 6
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const nextMonth = () => {
    const d = new Date(year, month, 1)
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Группируем игры по ЛОКАЛЬНЫМ датам (Москва)
  const gamesByDate: Record<string, any[]> = {}
  for (const g of games) {
    let localDateStr = g.date // запасной вариант
    
    if (g.startTimeUTC) {
      const d = new Date(g.startTimeUTC)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      localDateStr = `${y}-${m}-${day}`
    }
    
    if (!gamesByDate[localDateStr]) gamesByDate[localDateStr] = []
    gamesByDate[localDateStr].push(g)
  }

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
  if (t.locale === 'en-US') {
    weekDays.splice(0, 7, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')
  }

  const btnStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: 18,
    width: 36,
    height: 36,
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  }

  return (
    <div style={{
      backgroundColor: 'rgba(15, 20, 30, 0.55)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 16,
      marginTop: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={prevMonth} style={btnStyle}>&lt;</button>
        <h2 style={{ margin: 0, textTransform: 'capitalize', fontSize: 20, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
          {monthName}
        </h2>
        <button onClick={nextMonth} style={btnStyle}>&gt;</button>
      </div>

      {error && <div style={{ color: 'var(--loss)', marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {/* Заголовки дней недели */}
        {weekDays.map(d => (
          <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 12, color: 'var(--text-muted)', paddingBottom: 8, textTransform: 'uppercase' }}>
            {d}
          </div>
        ))}

        {/* Пустые ячейки до начала месяца */}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} style={{ backgroundColor: 'transparent', minHeight: 100 }} />
        ))}

        {/* Дни месяца */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          const dayGames = gamesByDate[dateStr] || []
          
          // Подсвечиваем сегодняшний день
          const isToday = new Date().toISOString().split('T')[0] === dateStr

          return (
            <div 
              key={dayNum} 
              style={{ 
                backgroundColor: isToday ? 'rgba(74, 158, 255, 0.15)' : 'var(--card-bg-alt)', 
                border: isToday ? '1px solid var(--accent)' : '1px solid var(--border-light)',
                borderRadius: 6, 
                padding: 6,
                minHeight: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <div style={{ 
                fontSize: 12, 
                fontWeight: 'bold', 
                color: isToday ? 'var(--accent)' : 'var(--text-muted)',
                marginBottom: 4
              }}>
                {dayNum}
              </div>

              <div className="calendar-games-list" style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1, maxHeight: 120 }}>
                {loading ? (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>...</div>
                ) : (
                  dayGames.map(g => (
                    <div 
                      key={g.id}
                      onClick={() => onGameClick?.(g.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 4,
                        padding: '2px 4px',
                        cursor: onGameClick ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                        border: '1px solid transparent'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(74, 158, 255, 0.2)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'transparent' }}
                    >
                      <img src={`https://assets.nhle.com/logos/nhl/svg/${g.awayAbbrev}_dark.svg`} style={{ width: 20, height: 20, objectFit: 'contain' }} alt={g.awayAbbrev} />
                      
                      {g.gameState === 'FINAL' || g.gameState === 'OFF' ? (
                         <span style={{ fontSize: 10, fontWeight: 'bold', color: 'var(--text-muted)' }}>
                           {g.awayScore}-{g.homeScore}
                         </span>
                      ) : (
                         <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>@</span>
                      )}
                      
                      <img src={`https://assets.nhle.com/logos/nhl/svg/${g.homeAbbrev}_dark.svg`} style={{ width: 20, height: 20, objectFit: 'contain' }} alt={g.homeAbbrev} />
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
