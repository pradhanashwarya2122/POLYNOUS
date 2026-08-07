import { useState } from 'react'
import ActiveModelBadge from './ActiveModelBadge'

export default function NeuralSidebar({ user, onLogout, currentPage, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false)

  const menuItems = [
    { id: 'dashboard', icon: '   ', label: 'Research', path: '/dashboard' },
    { id: 'debate', icon: '🗣️', label: 'Debate', path: '/debate' },
    { id: 'memory', icon: '💾', label: 'Memory Bank', path: '/memory' },
    { id: 'graph', icon: '.', label: 'Knowledge Graph', path: '/graph' },
    { id: 'search', icon: ' ', label: 'Semantic Search', path: '/search' },
    
  ]

  if (collapsed) {
    return (
      <div style={{
        width: '50px', minWidth: '50px', height: '100vh',
        background: 'rgba(10,10,30,0.95)', borderRight: '1px solid rgba(0,255,15,0.1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0',
        transition: 'all 0.3s'
      }}>
        <button onClick={() => setCollapsed(false)} style={{ color: '#00ff0f', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', marginBottom: '20px' }}>☰</button>
        {menuItems.map(item => (
          <div key={item.id} onClick={() => onNavigate?.(item.path)} style={{ padding: '10px', cursor: 'pointer', fontSize: '18px', opacity: currentPage === item.id ? 1 : 0.5 }} title={item.label}>
            {item.icon}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{
      width: '260px', minWidth: '260px', height: '100vh',
      background: 'linear-gradient(180deg, rgba(10,10,30,0.98) 0%, rgba(15,15,40,0.98) 100%)',
      borderRight: '1px solid rgba(0,255,15,0.08)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, Segoe UI, sans-serif',
      overflow: 'hidden',
      transition: 'all 0.3s'
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/favicon.png" alt="POLYNOUS" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover', boxShadow: '0 0 10px rgba(0,255,15,0.35)', border: '1px solid rgba(0,255,15,0.25)' }} />
            <div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '16px' }}>POLYNOUS</div>
              <div style={{ color: '#555', fontSize: '10px' }}>Neural Memory</div>
            </div>
          </div>
          <button onClick={() => setCollapsed(true)} style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>◀</button>
        </div>
        <div style={{ marginTop: 14 }}><ActiveModelBadge /></div>
      </div>

      {/* User Info */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,255,15,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#00ff0f' }}>
            👤
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#ccc', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.username || 'Guest'}
            </div>
            <div style={{ color: '#555', fontSize: '10px' }}>{user?.email || 'guest'}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="pn-stagger" style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        <div style={{ color: '#555', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 8px', marginBottom: '8px' }}>
          Navigation
        </div>
        {menuItems.map(item => (
          <div
            key={item.id}
            onClick={() => onNavigate?.(item.path)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
              marginBottom: '2px', transition: 'all 0.2s',
              background: currentPage === item.id ? 'rgba(0,255,15,0.08)' : 'transparent',
              color: currentPage === item.id ? '#00ff0f' : '#888',
              fontWeight: currentPage === item.id ? 600 : 400,
              fontSize: '13px'
            }}
            onMouseEnter={(e) => {
              if (currentPage !== item.id) {
                e.target.style.background = 'rgba(255,255,255,0.03)'
                e.target.style.color = '#ccc'
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== item.id) {
                e.target.style.background = 'transparent'
                e.target.style.color = '#888'
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '8px', borderRadius: '8px',
            border: '1px solid rgba(255,50,50,0.2)', background: 'rgba(255,50,50,0.05)',
            color: '#ff4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            transition: 'all 0.3s'
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  )
}