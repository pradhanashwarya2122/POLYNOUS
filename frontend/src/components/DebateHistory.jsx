export default function DebateHistory({ debates, onStartDebate }) {
  if (!debates || debates.length === 0) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#fff', fontSize: '15px', marginBottom: '16px' }}>
          🗣️ Debate History
        </h3>
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No debates yet. Try debating a topic!</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ color: '#fff', fontSize: '15px', marginBottom: '16px' }}>
        🗣️ Debate History ({debates.length})
      </h3>

      {debates.map((debate, i) => (
        <div
          key={i}
          onClick={() => onStartDebate?.(debate.topic)}
          style={{
            padding: '14px 16px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            marginBottom: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255,50,100,0.05)'
            e.target.style.borderColor = 'rgba(255,50,100,0.2)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255,255,255,0.02)'
            e.target.style.borderColor = 'rgba(255,255,255,0.05)'
          }}
        >
          <div style={{ fontSize: '14px', color: '#ccc', marginBottom: '8px', fontWeight: 500 }}>
            {debate.topic}
          </div>
          
          {/* Score bars */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                <span style={{ color: '#00ff0f' }}>FOR</span>
                <span style={{ color: '#00ff0f' }}>{debate.for_score}/10</span>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)' }}>
                <div style={{
                  width: `${(debate.for_score || 0) * 10}%`, height: '100%',
                  borderRadius: '2px', background: '#00ff0f'
                }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                <span style={{ color: '#ff3264' }}>AGAINST</span>
                <span style={{ color: '#ff3264' }}>{debate.against_score}/10</span>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)' }}>
                <div style={{
                  width: `${(debate.against_score || 0) * 10}%`, height: '100%',
                  borderRadius: '2px', background: '#ff3264'
                }} />
              </div>
            </div>
          </div>

          {/* Winner */}
          <div style={{
            fontSize: '11px', fontWeight: 600,
            color: debate.winner === 'FOR' ? '#00ff0f' : debate.winner === 'AGAINST' ? '#ff3264' : '#ffaa00'
          }}>
            🏆 Winner: {debate.winner}
          </div>
        </div>
      ))}
    </div>
  )
}