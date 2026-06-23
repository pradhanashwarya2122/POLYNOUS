import { useState } from 'react'

export default function MemoryTimeline({ history, onStartResearch }) {
  const [expanded, setExpanded] = useState(null)

  const getConfidenceColor = (v) => {
    if (v >= 80) return '#00ff0f'
    if (v >= 60) return '#ffaa00'
    return '#ff3232'
  }

  const groupByDate = (items) => {
    const groups = {}
    items.forEach(item => {
      const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      }) : 'Unknown'
      if (!groups[date]) groups[date] = []
      groups[date].push(item)
    })
    return groups
  }

  const grouped = groupByDate(history)

  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ color: '#fff', fontSize: '15px', marginBottom: '16px' }}>
         Research Timeline
      </h3>

      {history.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No research yet. Start asking questions!</p>
        </div>
      )}

      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <div style={{
            fontSize: '11px', color: '#555', fontWeight: 600,
            padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
            marginBottom: '4px'
          }}>
            {date}
          </div>
          {items.map((item, i) => (
            <div
              key={i}
              onClick={() => onStartResearch?.(item.query)}
              style={{
                display: 'flex', gap: '12px', padding: '10px 8px',
                cursor: 'pointer', borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              {/* Dot */}
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: getConfidenceColor(item.confidence),
                marginTop: '5px', flexShrink: 0,
                boxShadow: `0 0 6px ${getConfidenceColor(item.confidence)}`
              }} />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px', color: '#ccc', lineHeight: 1.4,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {item.query}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '10px', color: getConfidenceColor(item.confidence),
                    fontWeight: 600
                  }}>
                    {item.confidence}% confidence
                  </span>
                  <span style={{ fontSize: '10px', color: '#555' }}>
                    {item.mode || 'research'}
                  </span>
                  {item.topics?.filter(t => t).slice(0, 3).map((topic, j) => (
                    <span key={j} style={{
                      fontSize: '9px', padding: '1px 6px', borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)', color: '#777'
                    }}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}