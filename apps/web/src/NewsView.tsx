import { useEffect, useState } from 'react'
import type { Translation } from './i18n'
import { getNews } from './api'

interface Props {
  t: Translation
  lang: string
}

export function NewsView({ t, lang }: Props) {
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getNews(lang)
      .then(d => {
        if (!cancelled) {
          setNews(d)
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>...</div>
  if (error) return <div style={{ color: 'var(--loss)', padding: 20 }}>{error}</div>
  if (news.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Новостей пока нет</div>

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 16,
      marginTop: 16
    }}>
      {news.map((item, i) => {
        const dateObj = item.published ? new Date(item.published) : null
        const dateStr = dateObj ? dateObj.toLocaleDateString(t.locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

        return (
          <div
            key={item.id || i}
            onClick={() => item.link && window.open(item.link, '_blank')}
            style={{
              backgroundColor: 'rgba(15, 20, 30, 0.55)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
              cursor: item.link ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { 
              if (item.link) {
                e.currentTarget.style.transform = 'translateY(-2px)'; 
                e.currentTarget.style.borderColor = 'var(--accent)';
              }
            }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.transform = 'none'; 
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {item.image && (
              <div style={{ height: 160, width: '100%', backgroundColor: '#1a1d23', overflow: 'hidden' }}>
                <img 
                  src={item.image} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                />
              </div>
            )}
            
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
                {dateStr}
              </div>
              <div style={{ 
                fontSize: 16, 
                fontWeight: 'bold', 
                color: 'var(--text)', 
                lineHeight: 1.3,
                marginBottom: 8 
              }}>
                {item.title}
              </div>
              <div style={{ 
                fontSize: 13, 
                color: 'var(--text-secondary)', 
                lineHeight: 1.4,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                marginTop: 'auto'
              }}>
                {item.description}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
