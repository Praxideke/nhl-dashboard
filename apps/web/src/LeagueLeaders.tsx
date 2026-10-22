import { useEffect, useState } from 'react'
import type { Translation } from './i18n'
import { getLeaders } from './api'

interface Props {
  season: string
  t: Translation
  onPlayerClick: (playerId: number) => void
}

function PlayerInitials({ name, size = 36 }: { name?: string; size?: number }) {
  const parts = (name ?? '').split(' ').filter(Boolean)
  const initials = parts.length === 0 ? '?' : parts.length === 1
    ? parts[0].slice(0, 1).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: 'var(--accent)', color: 'var(--accent-text)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.42), fontWeight: 'bold', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

type Category = 'points' | 'goals' | 'assists' | 'wins' | 'savePctg' | 'goalsAgainstAvg' | 'shutouts'

function formatValue(value: any, category: Category): string {
  if (value === undefined || value === null) return '—'
  const n = Number(value)
  if (isNaN(n)) return String(value)
  switch (category) {
    case 'savePctg': return n.toFixed(3).replace(/^0/, '')
    case 'goalsAgainstAvg': return n.toFixed(2)
    default: return String(Math.round(n))
  }
}

function playerName(p: any): string {
  return p.firstName?.default && p.lastName?.default
    ? `${p.firstName.default} ${p.lastName.default}`
    : (p.name?.default ?? '—')
}

const MEDALS = {
  1: {
    numberColor: '#FFD700',
    photoBorder: '#FFD700',
    photoGlow: '0 0 24px rgba(255, 215, 0, 0.55)',
    cardBg: 'var(--podium-gold-bg)',
    cardBorder: 'var(--podium-gold-border)',
  },
  2: {
    numberColor: '#C0C0C0',
    photoBorder: '#C0C0C0',
    photoGlow: '0 0 20px rgba(192, 192, 192, 0.45)',
    cardBg: 'var(--podium-silver-bg)',
    cardBorder: 'var(--podium-silver-border)',
  },
  3: {
    numberColor: '#CD7F32',
    photoBorder: '#CD7F32',
    photoGlow: '0 0 20px rgba(205, 127, 50, 0.5)',
    cardBg: 'var(--podium-bronze-bg)',
    cardBorder: 'var(--podium-bronze-border)',
  },
} as const

function PodiumCard({
  player, rank, category, onPlayerClick,
}: {
  player: any
  rank: 1 | 2 | 3
  category: Category
  onPlayerClick: (id: number) => void
}) {
  const name = playerName(player)
  const displayValue = formatValue(player.value, category)
  const medal = MEDALS[rank]

  return (
    <div
      onClick={() => onPlayerClick(player.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 14px',
        backgroundColor: medal.cardBg,
        border: `1px solid ${medal.cardBorder}`,
        borderRadius: 10,
        cursor: 'pointer',
        transition: 'transform 0.15s',
        flex: 1,
        minWidth: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{
        fontSize: 40,
        fontWeight: 800,
        color: medal.numberColor,
        minWidth: 40,
        textAlign: 'center',
        fontFamily: 'sans-serif',
        lineHeight: 1,
        textShadow: `0 0 12px ${medal.numberColor}55`,
        flexShrink: 0,
      }}>
        {rank}
      </div>

      {player.headshot ? (
        <img
          src={player.headshot}
          alt=""
          width={110}
          height={110}
          style={{
            objectFit: 'cover',
            borderRadius: '50%',
            border: `3px solid ${medal.photoBorder}`,
            boxShadow: medal.photoGlow,
            backgroundColor: 'var(--card-bg-alt)',
            flexShrink: 0,
          }}
        />
      ) : (
        <PlayerInitials name={name} size={110} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text)',
          lineHeight: 1.2,
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}>
          {name}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {player.teamAbbrev}{player.position ? ` · ${player.position}` : ''}
        </div>
      </div>

      <div style={{
        fontSize: 28,
        fontWeight: 800,
        color: 'var(--accent)',
        minWidth: 52,
        textAlign: 'right',
        fontFamily: 'sans-serif',
        flexShrink: 0,
      }}>
        {displayValue}
      </div>
    </div>
  )
}

function CompactRow({
  player, rank, category, onPlayerClick,
}: {
  player: any
  rank: number
  category: Category
  onPlayerClick: (id: number) => void
}) {
  const name = playerName(player)
  const displayValue = formatValue(player.value, category)

  return (
    <div
      onClick={() => onPlayerClick(player.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderTop: '1px solid var(--border-light)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--card-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 20, textAlign: 'center', fontWeight: 600 }}>
        {rank}
      </span>
      {player.headshot ? (
        <img src={player.headshot} alt="" width={36} height={36}
          style={{ objectFit: 'cover', borderRadius: '50%', backgroundColor: 'var(--card-bg-alt)', flexShrink: 0 }} />
      ) : (
        <PlayerInitials name={name} size={36} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
        }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2 }}>
          {player.teamAbbrev}{player.position ? ` · ${player.position}` : ''}
        </div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 'bold', color: 'var(--accent)', minWidth: 32, textAlign: 'right' }}>
        {displayValue}
      </span>
    </div>
  )
}

function LeaderCard({
  title, players, valueLabel, category, onPlayerClick,
}: {
  title: string
  players: any[]
  valueLabel: string
  category: Category
  onPlayerClick: (playerId: number) => void
}) {
  if (!players || players.length === 0) return null
  const top = players.slice(0, 10)
  const podium = top.slice(0, 3) as any[]
  const rest = top.slice(3)

  return (
    <div style={{
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border)', borderRadius: 8,
      overflow: 'hidden', boxShadow: '0 1px 3px var(--shadow)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '9px 13px', backgroundColor: 'var(--header-bg)',
        color: 'var(--header-text)', fontWeight: 'bold', fontSize: 13,
        textTransform: 'uppercase', letterSpacing: '0.4px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{title}</span>
        <span style={{ fontSize: 10, opacity: 0.75 }}>{valueLabel}</span>
      </div>

      {podium.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8, padding: '12px',
          borderBottom: rest.length > 0 ? '1px solid var(--border)' : 'none',
        }}>
          {podium.map((p, i) => (
            <PodiumCard key={p.id ?? i} player={p} rank={(i + 1) as 1 | 2 | 3} category={category} onPlayerClick={onPlayerClick} />
          ))}
        </div>
      )}

      {rest.map((p, i) => (
        <CompactRow key={p.id ?? (i + 3)} player={p} rank={i + 4} category={category} onPlayerClick={onPlayerClick} />
      ))}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ marginTop: 10, marginBottom: 8, paddingBottom: 5, borderBottom: '2px solid var(--accent)' }}>
      <h3 style={{ margin: 0, fontSize: 15, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </h3>
    </div>
  )
}

export function LeagueLeaders({ season, t, onPlayerClick }: Props) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getLeaders(season)
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [season])

  if (loading) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>...</div>
  if (error) return <div style={{ padding: 30, textAlign: 'center', color: 'var(--loss)' }}>Error: {error}</div>
  if (!data?.skaters && !data?.goalies) {
    return <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>{t.noLeadersData}</div>
  }

  const skaters = data?.skaters ?? {}
  const goalies = data?.goalies ?? {}

  const skaterCards = [
    { title: t.topPoints, players: skaters.points ?? [], valueLabel: t.ptsShort, category: 'points' as Category },
    { title: t.topGoals, players: skaters.goals ?? [], valueLabel: t.gShort, category: 'goals' as Category },
    { title: t.topAssists, players: skaters.assists ?? [], valueLabel: t.assistsCol, category: 'assists' as Category },
  ].filter(c => c.players.length > 0)

  const goalieCards = [
    { title: t.topWins, players: goalies.wins ?? [], valueLabel: t.wShort, category: 'wins' as Category },
    { title: t.topSavePctg, players: goalies.savePctg ?? [], valueLabel: t.savePctgStat, category: 'savePctg' as Category },
    { title: t.topGaa, players: goalies.goalsAgainstAvg ?? [], valueLabel: t.gaaStat, category: 'goalsAgainstAvg' as Category },
    { title: t.topShutouts, players: goalies.shutouts ?? [], valueLabel: t.shutoutsStat, category: 'shutouts' as Category },
  ].filter(c => c.players.length > 0)

  const skaterGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: 12,
  }
  const goalieGrid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: 12,
  }

  return (
    <div>
      {skaterCards.length > 0 && (
        <div>
          <SectionHeader title={t.skaters} />
          <div style={skaterGrid}>
            {skaterCards.map(c => (
              <LeaderCard key={c.title} title={c.title} players={c.players} valueLabel={c.valueLabel} category={c.category} onPlayerClick={onPlayerClick} />
            ))}
          </div>
        </div>
      )}

      {goalieCards.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <SectionHeader title={t.goalieLeaders} />
          <div style={goalieGrid}>
            {goalieCards.map(c => (
              <LeaderCard key={c.title} title={c.title} players={c.players} valueLabel={c.valueLabel} category={c.category} onPlayerClick={onPlayerClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
