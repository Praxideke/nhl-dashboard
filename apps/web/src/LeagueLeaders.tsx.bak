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
    wreathGlow: '0 0 24px rgba(255, 215, 0, 0.6)',
    ribbonGradient: 'linear-gradient(135deg, #B8860B, #FFD700, #B8860B)',
    ribbonText: '#3d2b00',
    cardBg: 'var(--podium-gold-bg)',
    cardBorder: 'var(--podium-gold-border)',
    emoji: '🥇',
    photoBorder: '#FFD700',
    laurelFilter: 'none',
  },
  2: {
    wreathGlow: '0 0 22px rgba(192, 192, 192, 0.6)',
    ribbonGradient: 'linear-gradient(135deg, #909090, #E8E8E8, #909090)',
    ribbonText: '#2a2a2a',
    cardBg: 'var(--podium-silver-bg)',
    cardBorder: 'var(--podium-silver-border)',
    emoji: '🥈',
    photoBorder: '#C0C0C0',
    laurelFilter: 'grayscale(1) brightness(1.5) contrast(1.05)',
  },
  3: {
    wreathGlow: '0 0 22px rgba(205, 127, 50, 0.6)',
    ribbonGradient: 'linear-gradient(135deg, #6B3410, #CD7F32, #6B3410)',
    ribbonText: '#fff',
    cardBg: 'var(--podium-bronze-bg)',
    cardBorder: 'var(--podium-bronze-border)',
    emoji: '🥉',
    photoBorder: '#CD7F32',
    laurelFilter: 'sepia(1) saturate(2.5) hue-rotate(-15deg) brightness(0.85)',
  },
} as const

function LaurelWreath({ rank, size = 114 }: { rank: 1 | 2 | 3; size?: number }) {
  return (
    <img
      src="/laurel.png"
      alt=""
      width={size}
      height={size}
      style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none', zIndex: 1,
        filter: MEDALS[rank].laurelFilter, objectFit: 'contain',
      }}
    />
  )
}

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
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '10px 6px 10px', flex: 1, minWidth: 0,
        borderRadius: 8, background: medal.cardBg,
        border: `1px solid ${medal.cardBorder}`,
        position: 'relative', transition: 'transform 0.15s', cursor: 'default',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ position: 'absolute', top: 3, right: 6, fontSize: 18, lineHeight: 1, zIndex: 3 }}>
        {medal.emoji}
      </div>

      <div style={{
        position: 'relative', width: 114, height: 114,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <LaurelWreath rank={rank} size={114} />
        <div
          onClick={() => onPlayerClick(player.id)}
          style={{
            width: 66, height: 66, borderRadius: '50%', overflow: 'hidden',
            border: `2px solid ${medal.photoBorder}`,
            boxShadow: medal.wreathGlow, cursor: 'pointer', zIndex: 2,
            backgroundColor: 'var(--card-bg-alt)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {player.headshot ? (
            <img src={player.headshot} alt="" width={66} height={66} style={{ objectFit: 'cover' }} />
          ) : (
            <PlayerInitials name={name} size={66} />
          )}
        </div>
      </div>

      <div style={{
        background: medal.ribbonGradient, color: medal.ribbonText,
        padding: '3px 14px', borderRadius: 4,
        marginTop: 4, marginBottom: 5, fontSize: 18, fontWeight: 800, lineHeight: 1.15,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.4)',
        letterSpacing: '0.3px', minWidth: 44, textAlign: 'center',
        position: 'relative', zIndex: 2,
      }}>
        {displayValue}
      </div>

      <div style={{
        fontSize: 12, fontWeight: 'bold', color: 'var(--text)',
        textAlign: 'center', lineHeight: 1.2,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
      }}>
        {name}
      </div>
      <div style={{
        fontSize: 10, color: 'var(--text-muted)',
        textAlign: 'center', lineHeight: 1.2, marginTop: 1,
      }}>
        {player.teamAbbrev}{player.position ? ` · ${player.position}` : ''}
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
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 12px', borderTop: '1px solid var(--border-light)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--card-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 18, textAlign: 'center', fontWeight: 600 }}>
        {rank}
      </span>
      {player.headshot ? (
        <img src={player.headshot} alt="" width={25} height={25}
          style={{ objectFit: 'cover', borderRadius: '50%', backgroundColor: 'var(--card-bg-alt)', flexShrink: 0 }} />
      ) : (
        <PlayerInitials name={name} size={25} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2,
        }}>
          {name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.2 }}>
          {player.teamAbbrev}{player.position ? ` · ${player.position}` : ''}
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--accent)', minWidth: 30, textAlign: 'right' }}>
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
          display: 'flex', gap: 5, padding: '10px 7px',
          borderBottom: rest.length > 0 ? '1px solid var(--border)' : 'none',
          backgroundColor: 'var(--card-bg-alt)',
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
    display: 'grid', gridTemplateColumns: `repeat(${Math.max(skaterCards.length, 1)}, minmax(0, 1fr))`, gap: 12,
  }
  const goalieGrid: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: `repeat(${Math.max(goalieCards.length, 1)}, minmax(0, 1fr))`, gap: 12,
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
