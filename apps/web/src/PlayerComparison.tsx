import { useState, useEffect } from 'react'
import type { Translation } from './i18n'
import { getPlayer, searchPlayer } from './api'

interface Props {
  player1Data: any
  t: Translation
  onClose: () => void
}

export function PlayerComparison({ player1Data, t, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [player2Data, setPlayer2Data] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }
    
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlayer(query)
        setSuggestions(results || [])
      } catch (e) {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = async (playerId: number) => {
    setQuery('')
    setSuggestions([])
    try {
      setSearching(true)
      setError(null)
      const data = await getPlayer(playerId)
      setPlayer2Data(data)
    } catch (err) {
      setError('Ошибка при загрузке игрока')
    } finally {
      setSearching(false)
    }
  }

  const getStats = (data: any) => {
    if (!data) return null
    const isGoalie = data.position === 'G'
    const currentSeason = data.featuredStats?.regularSeason?.subSeason || data.stats?.[0]?.splits?.[0]?.stat || {}
    
    return {
      name: data.firstName?.default ? `${data.firstName.default} ${data.lastName.default}` : data.fullName?.default || '—',
      headshot: data.headshot,
      team: data.currentTeamAbbrev,
      isGoalie,
      gamesPlayed: currentSeason.gamesPlayed ?? 0,
      goals: currentSeason.goals ?? 0,
      assists: currentSeason.assists ?? 0,
      points: currentSeason.points ?? 0,
      plusMinus: currentSeason.plusMinus ?? 0,
      pim: currentSeason.pim ?? 0,
      shots: currentSeason.shots ?? 0,
      wins: currentSeason.wins ?? 0,
      gaa: currentSeason.goalsAgainstAvg ?? 0,
      savePctg: currentSeason.savePctg ? Number(currentSeason.savePctg).toFixed(3) : '0.000',
    }
  }

  const p1 = getStats(player1Data)
  const p2 = getStats(player2Data)

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid var(--border-light)',
    fontSize: 14,
  }
  
  const statLabelStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 10px'
  }

  const statValueStyle = (isBetter: boolean): React.CSSProperties => ({
    fontWeight: isBetter ? 'bold' : 'normal',
    color: isBetter ? 'var(--win)' : 'var(--text)',
    width: 60,
    textAlign: 'center'
  })

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--overlay)', zIndex: 1400,
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }}
      />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(900px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 32px)',
        backgroundColor: '#0f1115',
        backgroundImage: 'linear-gradient(180deg, rgba(15,17,21,0.8) 0%, rgba(15,17,21,0.95) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        zIndex: 1401,
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 18px', backgroundColor: 'rgba(10, 30, 55, 0.7)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 800 }}>{t.statsComparison}</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'rgba(255,255,255,0.1)', fontSize: 22,
              cursor: 'pointer', color: '#fff', width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto' }}>
          
          {!p2 && (
            <div style={{ marginBottom: 20, position: 'relative' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlayerPlaceholder}
                style={{
                  width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  color: '#fff', outline: 'none'
                }}
              />
              {searching && <div style={{ position: 'absolute', right: 15, top: 12, color: 'var(--accent)' }}>...</div>}
              
              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                  backgroundColor: '#1a1d23', border: '1px solid var(--border)',
                  borderRadius: 6, zIndex: 10, maxHeight: 200, overflowY: 'auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                  {suggestions.map((s: any) => (
                    <div
                      key={s.playerId}
                      onClick={() => handleSelect(s.playerId)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.05)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span style={{ fontWeight: 'bold', color: '#fff' }}>{s.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--accent)' }}>{s.teamAbbrev}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {error && <div style={{ color: 'var(--loss)', marginBottom: 20, textAlign: 'center' }}>{error}</div>}

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={p1?.headshot} alt="" style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: 'var(--card-bg-alt)', border: '3px solid var(--accent)', objectFit: 'cover' }} />
              <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: 12, textAlign: 'center' }}>{p1?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 'bold' }}>{p1?.team}</div>
            </div>

            <div style={{ flex: 2, padding: '0 20px', display: 'flex', flexDirection: 'column', marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '2px solid var(--border)' }}>
                <span style={{ width: 60, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{t.gp}</span>
                <span style={{ ...statLabelStyle, width: 120 }}>STAT</span>
                <span style={{ width: 60, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{t.gp}</span>
              </div>
              
              {!p2 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  Найди второго игрока для сравнения
                </div>
              ) : (
                <>
                  <div style={statRowStyle}>
                    <span style={statValueStyle((p1?.gamesPlayed ?? 0) >= (p2.gamesPlayed ?? 0))}>{p1?.gamesPlayed ?? 0}</span>
                    <span style={statLabelStyle}>Игры</span>
                    <span style={statValueStyle((p2.gamesPlayed ?? 0) >= (p1?.gamesPlayed ?? 0))}>{p2.gamesPlayed ?? 0}</span>
                  </div>
                  
                  {(!p1?.isGoalie && !p2.isGoalie) ? (
                    <>
                      <div style={statRowStyle}>
                        <span style={statValueStyle((p1?.goals ?? 0) >= (p2.goals ?? 0))}>{p1?.goals ?? 0}</span>
                        <span style={statLabelStyle}>Голы</span>
                        <span style={statValueStyle((p2.goals ?? 0) >= (p1?.goals ?? 0))}>{p2.goals ?? 0}</span>
                      </div>
                      <div style={statRowStyle}>
                        <span style={statValueStyle((p1?.assists ?? 0) >= (p2.assists ?? 0))}>{p1?.assists ?? 0}</span>
                        <span style={statLabelStyle}>Передачи</span>
                        <span style={statValueStyle((p2.assists ?? 0) >= (p1?.assists ?? 0))}>{p2.assists ?? 0}</span>
                      </div>
                      <div style={statRowStyle}>
                        <span style={statValueStyle((p1?.points ?? 0) >= (p2.points ?? 0))}>{p1?.points ?? 0}</span>
                        <span style={statLabelStyle}>Очки</span>
                        <span style={statValueStyle((p2.points ?? 0) >= (p1?.points ?? 0))}>{p2.points ?? 0}</span>
                      </div>
                      <div style={statRowStyle}>
                        <span style={statValueStyle((p1?.plusMinus ?? 0) >= (p2.plusMinus ?? 0))}>
                          {(p1?.plusMinus ?? 0) > 0 ? `+${p1?.plusMinus}` : (p1?.plusMinus ?? 0)}
                        </span>
                        <span style={statLabelStyle}>+/-</span>
                        <span style={statValueStyle((p2.plusMinus ?? 0) >= (p1?.plusMinus ?? 0))}>
                          {(p2.plusMinus ?? 0) > 0 ? `+${p2.plusMinus}` : (p2.plusMinus ?? 0)}
                        </span>
                      </div>
                      <div style={statRowStyle}>
                        <span style={statValueStyle((p1?.shots ?? 0) >= (p2.shots ?? 0))}>{p1?.shots ?? 0}</span>
                        <span style={statLabelStyle}>Броски</span>
                        <span style={statValueStyle((p2.shots ?? 0) >= (p1?.shots ?? 0))}>{p2.shots ?? 0}</span>
                      </div>
                    </>
                  ) : (p1?.isGoalie && p2.isGoalie) ? (
                    <>
                      <div style={statRowStyle}>
                        <span style={statValueStyle((p1?.wins ?? 0) >= (p2.wins ?? 0))}>{p1?.wins ?? 0}</span>
                        <span style={statLabelStyle}>Победы</span>
                        <span style={statValueStyle((p2.wins ?? 0) >= (p1?.wins ?? 0))}>{p2.wins ?? 0}</span>
                      </div>
                      <div style={statRowStyle}>
                        <span style={statValueStyle((p1?.gaa ?? 0) <= (p2.gaa ?? 0) && (p1?.gaa ?? 0) > 0)}>{p1?.gaa ?? 0}</span>
                        <span style={statLabelStyle}>GAA</span>
                        <span style={statValueStyle((p2.gaa ?? 0) <= (p1?.gaa ?? 0) && (p2.gaa ?? 0) > 0)}>{p2.gaa ?? 0}</span>
                      </div>
                      <div style={statRowStyle}>
                        <span style={statValueStyle(Number(p1?.savePctg ?? 0) >= Number(p2.savePctg ?? 0))}>{p1?.savePctg ?? '0.000'}</span>
                        <span style={statLabelStyle}>SV%</span>
                        <span style={statValueStyle(Number(p2.savePctg ?? 0) >= Number(p1?.savePctg ?? 0))}>{p2.savePctg ?? '0.000'}</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--loss)', padding: '20px 0' }}>
                      Нельзя сравнивать полевого игрока с вратарем
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {p2 ? (
                <>
                  <div style={{ position: 'relative' }}>
                    <img src={p2.headshot} alt="" style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: 'var(--card-bg-alt)', border: '3px solid var(--accent)', objectFit: 'cover' }} />
                    <button
                      onClick={() => { setPlayer2Data(null); setQuery(''); }}
                      style={{ position: 'absolute', top: 0, right: 0, width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--loss)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12 }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 'bold', marginTop: 12, textAlign: 'center' }}>{p2.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 'bold' }}>{p2.team}</div>
                </>
              ) : (
                <div style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: 'var(--card-bg-alt)', border: '3px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 30 }}>
                  ?
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
