import { useEffect, useState } from 'react'
import type { Translation } from './i18n'
import { getInjuries, searchPlayer } from './api'

interface Props {
  t: Translation
  lang: string
  onPlayerClick?: (playerId: number | string) => void
}

function getLocalizedStatus(status: string, t: Translation): string {
  const s = status.toLowerCase()
  if (s.includes('out')) return t.out
  if (s.includes('day-to-day') || s.includes('day to day')) return t.dayToDay
  if (s.includes('injured reserve') || s.includes('ir')) return t.injuredReserve
  if (s.includes('injured')) return t.injured
  return status
}

export function InjuriesView({ t, lang, onPlayerClick }: Props) {
  const [injuries, setInjuries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchingId, setSearchingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getInjuries(lang)
      .then(d => {
        if (!cancelled) {
          const sorted = [...d].sort((a, b) => {
            if (a.teamAbbrev !== b.teamAbbrev) return a.teamAbbrev.localeCompare(b.teamAbbrev)
            return a.playerName.localeCompare(b.playerName)
          })
          setInjuries(sorted)
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
  }, [lang])

  const handlePlayerClick = async (espnId: string, playerName: string, teamAbbrev: string) => {
    if (!onPlayerClick) return
    try {
      setSearchingId(espnId)
      const results = await searchPlayer(playerName, teamAbbrev)
      if (results && results.length > 0 && results[0].playerId) {
        onPlayerClick(results[0].playerId)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSearchingId(null)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>...</div>
  if (error) return <div style={{ color: 'var(--loss)', padding: 20 }}>{error}</div>
  if (injuries.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t.noInjuries}</div>

  return (
    <div style={{
      backgroundColor: 'rgba(15, 20, 30, 0.55)',
      backdropFilter: 'blur(10px)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      marginTop: 16
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--header-bg)', color: 'var(--header-text)' }}>
            <th style={{ padding: '12px 16px', fontWeight: 700, width: 70 }}></th>
            <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t.playerCol}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, width: 100 }}>{t.positionCol}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, width: 200 }}>{t.injuryTeam}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, width: 150 }}>{t.injuryStatus}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700, width: 120 }}>{t.injuryDate}</th>
            <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t.injuryComment}</th>
          </tr>
        </thead>
        <tbody>
          {injuries.map((inj, i) => {
            const isEven = i % 2 === 0
            const bg = isEven ? 'rgba(20, 25, 35, 0.55)' : 'rgba(25, 30, 42, 0.55)'
            
            const dateObj = inj.date ? new Date(inj.date) : null
            const dateStr = dateObj ? dateObj.toLocaleDateString(t.locale, { day: 'numeric', month: 'short' }) : ''
            const isSearching = searchingId === inj.playerId

            const s = inj.status.toLowerCase()
            const isRed = s.includes('out') || s.includes('ir') || s.includes('reserve')
            const isYellow = s.includes('day-to-day') || s.includes('day to day') || s.includes('injured')

            return (
              <tr 
                key={`${inj.playerId}-${i}`} 
                style={{ backgroundColor: bg, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = bg }}
              >
                <td style={{ padding: '4px 16px' }}>
                  {inj.headshot && (
                    <img 
                      src={inj.headshot} 
                      alt="" 
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} 
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                </td>
                <td style={{ padding: '4px 16px', fontWeight: 600 }}>
                  <span 
                    onClick={() => handlePlayerClick(inj.playerId, inj.playerName, inj.teamAbbrev)}
                    style={{ 
                      color: isSearching ? 'var(--accent)' : 'var(--text)', 
                      cursor: onPlayerClick ? 'pointer' : 'default',
                      textDecoration: 'underline',
                      textDecorationColor: 'transparent',
                      transition: 'text-decoration-color 0.2s'
                    }}
                    onMouseEnter={(e) => { if (onPlayerClick) e.currentTarget.style.textDecorationColor = 'var(--accent)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecorationColor = 'transparent' }}
                  >
                    {isSearching ? '...' : inj.playerName}
                  </span>
                </td>
                <td style={{ padding: '4px 16px', color: 'var(--text-muted)' }}>
                  {inj.position}
                </td>
                <td style={{ padding: '4px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img 
                      src={`https://assets.nhle.com/logos/nhl/svg/${inj.teamAbbrev}_dark.svg`} 
                      alt="" 
                      style={{ width: 48, height: 48, objectFit: 'contain' }} 
                    />
                    <span style={{ fontWeight: 600 }}>{inj.teamAbbrev}</span>
                  </div>
                </td>
                <td style={{ padding: '4px 16px' }}>
                  <span style={{ 
                    padding: '2px 8px', 
                    borderRadius: 4, 
                    fontSize: 12, 
                    fontWeight: 700,
                    backgroundColor: isRed ? 'rgba(208, 2, 27, 0.2)' : (isYellow ? 'rgba(240, 165, 0, 0.2)' : 'transparent'),
                    color: isRed ? 'var(--loss)' : (isYellow ? '#f0a500' : 'var(--text)')
                  }}>
                    {getLocalizedStatus(inj.status, t)}
                  </span>
                </td>
                <td style={{ padding: '4px 16px', color: 'var(--text-muted)' }}>
                  {dateStr}
                </td>
                <td style={{ padding: '4px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>
                  {inj.comment}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
