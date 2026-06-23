export default function EmptyGraphState({ onNavigate, graphData }) {
  const hasNodes = graphData?.nodes?.length > 0;
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '40px',
      textAlign: 'center',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      
      {/* Animated brain icon */}
      <div style={{
        fontSize: '80px',
        marginBottom: '24px',
        animation: 'float 3s ease-in-out infinite',
        opacity: 0.7
      }}>
        {hasNodes ? '.' : '🌌'}
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: "'Sora', sans-serif",
        fontSize: '1.6em',
        fontWeight: 700,
        color: '#fff',
        marginBottom: '12px',
        letterSpacing: '-0.02em'
      }}>
        {hasNodes 
          ? 'Knowledge Graph is Growing'
          : 'Your Neural Network Awaits'
        }
      </h2>

      {/* Description */}
      <p style={{
        fontFamily: "'Hanken Grotesk', sans-serif",
        fontSize: '15px',
        color: '#8899aa',
        lineHeight: 1.7,
        marginBottom: '8px'
      }}>
        {hasNodes
          ? 'Your knowledge connections are forming. Keep asking questions to build richer relationships between topics.'
          : 'Every research question you ask creates new neural connections. Start exploring to build your personal knowledge universe.'
        }
      </p>

      {/* Tips */}
      <div style={{
        background: 'rgba(10,10,30,0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '20px',
        marginTop: '16px',
        width: '100%',
        textAlign: 'left'
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: '#00ff0f',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '14px',
          fontWeight: 700
        }}>
          💡 Tips to Build Your Graph
        </div>
        
        {[
          { icon: '   ', text: 'Ask research questions about related topics', action: 'Research' },
          { icon: '🗣️', text: 'Debate controversial topics to create contrast nodes', action: 'Debate' },
          { icon: '🔗', text: 'The more you explore, the richer your connections become', action: null },
        ].map((tip, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '10px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s'
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{tip.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: '13px',
                color: '#ccc',
                lineHeight: 1.5,
                margin: 0
              }}>
                {tip.text}
              </p>
              {tip.action && (
                <button
                  onClick={() => onNavigate?.(tip.action === 'Research' ? '/research' : '/debate')}
                  style={{
                    marginTop: '6px',
                    padding: '4px 12px',
                    borderRadius: '14px',
                    border: `1px solid ${tip.action === 'Research' ? '#00ff0f' : '#ff2040'}40`,
                    background: `${tip.action === 'Research' ? '#00ff0f' : '#ff2040'}10`,
                    color: tip.action === 'Research' ? '#00ff0f' : '#ff2040',
                    cursor: 'pointer',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                >
                  Go to {tip.action} →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onNavigate?.('/research')}
        style={{
          marginTop: '24px',
          padding: '14px 32px',
          borderRadius: '30px',
          border: 'none',
          background: '#00ff0f',
          color: '#0a0a1e',
          fontWeight: 700,
          fontSize: '15px',
          cursor: 'pointer',
          fontFamily: "'Sora', sans-serif",
          transition: 'all 0.3s',
          boxShadow: '0 0 20px rgba(0,255,15,0.2)'
        }}
        onMouseEnter={e => {
          e.target.style.boxShadow = '0 0 30px rgba(0,255,15,0.4)';
          e.target.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          e.target.style.boxShadow = '0 0 20px rgba(0,255,15,0.2)';
          e.target.style.transform = 'translateY(0)';
        }}
      >
        🚀 Start Researching
      </button>

      {/* Stats preview */}
      {hasNodes && (
        <div style={{
          display: 'flex',
          gap: '20px',
          marginTop: '20px',
          padding: '12px 20px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#00ff0f', fontSize: '18px', fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
              {graphData?.nodes?.length || 0}
            </div>
            <div style={{ color: '#666', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', marginTop: '2px' }}>
              Nodes
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#00ccff', fontSize: '18px', fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
              {graphData?.edges?.length || 0}
            </div>
            <div style={{ color: '#666', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', marginTop: '2px' }}>
              Connections
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}