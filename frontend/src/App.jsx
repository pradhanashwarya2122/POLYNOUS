import SettingsPage from './components/SettingsPage'
import ProfileSetup from './components/ProfileSetup'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';

// Page imports
import GraphFeatureShowcase from './components/GraphFeatureShowcase'
import KnowledgeGraph3D from './components/KnowledgeGraph3D'
import PremiumHomepage from './components/PremiumHomepage';
import AuthPage from './components/AuthPage';
import OAuthCallback from './components/OAuthCallback';
import MemoryBank from './components/MemoryBank';
import ResearchInterface from './components/ResearchInterface';
import DebateInterface from './components/DebateInterface';
import KnowledgeGraphPage from './components/KnowledgeGraphPage';
import SemanticSearchPage from './components/SemanticSearchPage';
import PdfLabPage from './components/PdfLabPage';
import PolynousDashboard from './components/PolynousDashboard';
import { API_BASE_URL } from './config';

const getInitialAuthState = () => {
  const token = localStorage.getItem('polynous_token')
  const userData = localStorage.getItem('polynous_user')

  if (token && token !== 'guest_token' && userData) {
    try {
      const parsed = JSON.parse(userData)
      if (parsed.email && parsed.email !== 'guest@polynous.ai') {
        return { isLoggedIn: true, user: parsed }
      }
      localStorage.clear()
    } catch {
      localStorage.clear()
    }
  }

  return { isLoggedIn: false, user: null }
}

// ========== LOAD USER PREFERENCES ==========
function loadUserPreferences(userEmail) {
  const userId = userEmail || 'guest_user';
  fetch(`${API_BASE_URL}/settings/preferences?user_id=${encodeURIComponent(userId)}`)
    .then(r => r.json())
    .then(data => {
      console.log("✅ Applying preferences:", data);
      // Set default mode
      if (data.default_mode === 'debate') {
        localStorage.setItem('polynous_default_mode', 'debate');
      } else {
        localStorage.setItem('polynous_default_mode', 'research');
      }
      // Store confidence threshold
      if (data.confidence_threshold !== undefined) {
        localStorage.setItem('polynous_confidence_threshold', data.confidence_threshold);
      }
      // Store response style
      if (data.response_style) {
        localStorage.setItem('polynous_response_style', data.response_style);
      }
      // Store streaming preference
      if (data.streaming_enabled !== undefined) {
        localStorage.setItem('polynous_streaming', data.streaming_enabled);
      }
      // Store auto-save preference
      if (data.auto_save !== undefined) {
        localStorage.setItem('polynous_autosave', data.auto_save);
      }
      // Store theme preference
      if (data.theme) {
        localStorage.setItem('polynous_theme', data.theme);
      }
      console.log("✅ Preferences applied to localStorage");
    })
    .catch(() => console.log("ℹ️ Using default preferences (backend not available)"));
}

// ========== GLOBAL AUTH STATE ==========
export default function App() {
  const [initialAuth] = useState(getInitialAuthState)
  const [isLoggedIn, setIsLoggedIn] = useState(initialAuth.isLoggedIn)
  const [user, setUser] = useState(initialAuth.user)
  const initialCheckDone = true

  // --- NEW: state to show ProfileSetup after registration ---
  const [showProfileSetup, setShowProfileSetup] = useState(false)

  // ========== AUTH HANDLERS ==========
  const handleLogin = (data) => {
    if (data?.skip) {
      const guestUser = { username: 'Guest', email: 'guest@polynous.ai', isGuest: true }
      localStorage.setItem('polynous_token', 'guest_' + Date.now())
      localStorage.setItem('polynous_user', JSON.stringify(guestUser))
      setIsLoggedIn(true)
      setUser(guestUser)
      // Load preferences for guest
      loadUserPreferences('guest_user');
    } else if (data?.needs_profile_setup) {
      // Brand new registration – store token, set basic user, then show ProfileSetup
      localStorage.setItem('polynous_token', data.token)
      const userData = { email: data.email, username: data.username || '' }
      localStorage.setItem('polynous_user', JSON.stringify(userData))
      setIsLoggedIn(true)
      setUser(userData)
      setShowProfileSetup(true)
      // Preferences will be loaded after profile setup completes (or later)
    } else if (data?.token) {
      const userData = { username: data.username || 'User', email: data.email || '', isGuest: false }
      localStorage.setItem('polynous_token', data.token)
      localStorage.setItem('polynous_user', JSON.stringify(userData))
      setIsLoggedIn(true)
      setUser(userData)
      // Load preferences for logged-in user
      if (data.email) loadUserPreferences(data.email);
    } else if (data?.username) {
      const userData = { username: data.username, email: data.email || '', isGuest: false }
      if (data.token) localStorage.setItem('polynous_token', data.token)
      localStorage.setItem('polynous_user', JSON.stringify(userData))
      setIsLoggedIn(true)
      setUser(userData)
      // Load preferences for logged-in user
      if (data.email) loadUserPreferences(data.email);
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    setIsLoggedIn(false)
    setUser(null)
    window.location.href = '/'
  }

  // ========== NAVIGATION HELPERS ==========
  const navigateTo = (path) => {
    window.location.href = path
  }

  const startResearch = (topic) => {
    window.location.href = `/research?query=${encodeURIComponent(topic)}`
  }

  // ========== LOADING STATE ==========
  if (!initialCheckDone) {
    return (
      <div style={{ 
        minHeight: '100vh', display: 'flex', justifyContent: 'center', 
        alignItems: 'center', background: '#0a0a1e', flexDirection: 'column', gap: 16 
      }}>
        <div style={{ 
          width: 40, height: 40, borderRadius: '50%', 
          border: '3px solid rgba(0,255,15,0.15)', borderTop: '3px solid #00ff0f',
          animation: 'spin 1s linear infinite' 
        }} />
        <div style={{ color: '#00ff0f', fontFamily: "'Sora',sans-serif", fontWeight: 600, fontSize: 14 }}>
          Initializing POLYNOUS
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // --- NEW: Show ProfileSetup if user just registered ---
  if (isLoggedIn && showProfileSetup) {
    return (
      <ProfileSetup 
        email={user?.email}
        onComplete={async (username) => {
          // Update username in backend
          const token = localStorage.getItem('polynous_token')
          try {
            await fetch(`${API_BASE_URL}/auth/me`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ username })
            })
          } catch (e) {
            console.error('Failed to update username on backend', e)
          }
          
          // Update local state and localStorage
          setUser(prev => ({ ...prev, username }))
          localStorage.setItem('polynous_user', JSON.stringify({ ...user, username }))
          setShowProfileSetup(false)
          
          // Optionally load preferences now
          if (user?.email) loadUserPreferences(user.email);
        }}
      />
    )
  }

  return (
    <Router>
      <Routes>
        {/* ========== PUBLIC ROUTES ========== */}
        
        {/* Landing Page */}
        <Route 
          path="/" 
          element={
            isLoggedIn 
              ? <Navigate to="/research" replace /> 
              : <PremiumHomepage user={user} onNavigate={navigateTo} />
          } 
        />
        
        {/* Auth Page */}
        <Route 
          path="/auth" 
          element={
            isLoggedIn 
              ? <Navigate to="/research" replace /> 
              : <AuthPage onLogin={handleLogin} />
          } 
        />
        
        {/* OAuth Callback */}
        <Route 
          path="/auth/callback" 
          element={<OAuthCallback onLogin={handleLogin} />} 
        />

        {/* ========== PROTECTED ROUTES ========== */}
        
        {/* Settings Page */}
        <Route 
          path="/settings" 
          element={
            isLoggedIn 
              ? <SettingsPage 
                  user={user} 
                  onNavigate={(path) => window.location.href = path}
                  onLogout={handleLogout}
                />
              : <Navigate to="/auth" />
          } 
        />
        
        {/* Research Interface */}
        <Route 
          path="/research" 
          element={
            isLoggedIn 
              ? <ResearchInterface 
                  user={user} 
                  onNavigate={navigateTo} 
                  onStartResearch={startResearch}
                  onLogout={handleLogout}
                />
              : <Navigate to="/auth" replace />
          } 
        />

        {/* Debate Interface */}
        <Route 
          path="/debate" 
          element={
            isLoggedIn 
              ? <DebateInterface 
                  user={user} 
                  onNavigate={navigateTo}
                  onLogout={handleLogout}
                />
              : <Navigate to="/auth" replace />
          } 
        />

        {/* Knowledge Graph */}
        <Route 
          path="/graph" 
          element={
            isLoggedIn 
              ? <KnowledgeGraphPage 
                  user={user} 
                  onStartResearch={startResearch}
                  onNavigate={navigateTo}
                  onLogout={handleLogout}
                />
              : <Navigate to="/auth" replace />
          } 
        />

        {/* 3D Knowledge Graph */}
        <Route 
          path="/graph3d" 
          element={
            isLoggedIn 
              ? <KnowledgeGraph3D 
                  onSwitchTo2D={() => window.location.href = '/graph'} 
                />
              : <Navigate to="/auth" />
          } 
        />

        {/* Graph Feature Showcase */}
        <Route 
          path="/graph-lab" 
          element={
            isLoggedIn 
              ? <GraphFeatureShowcase />
              : <Navigate to="/auth" />
          } 
        />

        {/* Memory Bank */}
        <Route 
          path="/memory" 
          element={
            isLoggedIn 
              ? <MemoryBank 
                  user={user}
                  onNavigate={navigateTo}
                  onStartResearch={startResearch}
                  onLogout={handleLogout}
                />
              : <Navigate to="/auth" replace />
          } 
        />

        {/* Semantic Search */}
        <Route 
          path="/search" 
          element={
            isLoggedIn 
              ? <SemanticSearchPage 
                  user={user} 
                  onStartResearch={startResearch}
                  onNavigate={navigateTo}
                  onLogout={handleLogout}
                />
              : <Navigate to="/auth" replace />
          } 
        />

        {/* PDF Lab */}
        <Route 
          path="/pdf-lab" 
          element={
            isLoggedIn 
              ? <PdfLabPage 
                  user={user} 
                  onNavigate={navigateTo}
                  onLogout={handleLogout}
                />
              : <Navigate to="/auth" replace />
          } 
        />

        {/* Analytics Dashboard */}
        <Route 
          path="/analytics" 
          element={
            isLoggedIn 
              ? <PolynousDashboard 
                  user={user} 
                  onNavigate={navigateTo}
                  onLogout={handleLogout}
                />
              : <Navigate to="/auth" replace />
          } 
        />

        {/* ========== CATCH-ALL ========== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}