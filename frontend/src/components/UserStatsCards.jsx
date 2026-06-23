export default function UserStatsCards({ stats }) {
  if (!stats) return null

  const cards = [
    { icon: '.', label: 'Research Sessions', value: stats.total_research || 0, color: '#00ff0f' },
    { icon: '🗣️', label: 'Debates', value: stats.total_debates || 0, color: '#ff3264' },
    { icon: '📊', label: 'Avg Confidence', value: (stats.avg_confidence || 0) + '%', color: '#00ccff' },
    { icon: '🏷️', label: 'Unique Topics', value: stats.unique_topics || 0, color: '#ffaa00' }
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '12px',
      marginBottom: '24px'
    }}>
      {cards.map((card, i) => (
        <div key={i} style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '14px',
          padding: '18px 16px',
          textAlign: 'center',
          border: `1px solid ${card.color}20`,
          transition: 'all 0.3s',
          cursor: 'default'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = `${card.color}10`
          e.target.style.borderColor = `${card.color}40`
          e.target.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255,255,255,0.03)'
          e.target.style.borderColor = `${card.color}20`
          e.target.style.transform = 'translateY(0)'
        }}
        >
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>{card.icon}</div>
          <div style={{ fontSize: '1.6em', fontWeight: 800, color: card.color, marginBottom: '4px' }}>
            {card.value}
          </div>
          <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {card.label}
          </div>
        </div>
      ))}
    </div>
  )
}