import SettingsPage from './components/SettingsPage'
import ProfileSetup from './components/ProfileSetup'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PageTransition from './components/PageTransition';

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
import InfoPage from './components/InfoPage';
import { API_BASE_URL } from './config';

// ═══════════════════════════════════════════════════════════════
// INITIAL AUTH STATE - Safe, non‑destructive localStorage check
// ═══════════════════════════════════════════════════════════════
const getInitialAuthState = () => {
  const token = localStorage.getItem('polynous_token')
  const userData = localStorage.getItem('polynous_user')

  if (token && userData) {
    try {
      const parsed = JSON.parse(userData)
      // Only reject guest tokens - don't clear localStorage for missing fields
      const isGuest = token.startsWith('guest_') || 
                      (parsed.email && parsed.email === 'guest@polynous.ai')
      if (!isGuest) {
        return { isLoggedIn: true, user: parsed }
      }
    } catch {
      // Only clear if JSON is completely corrupted
      localStorage.clear()
    }
  }
  return { isLoggedIn: false, user: null }
}

// ═══════════════════════════════════════════════════════════════
// LOAD USER PREFERENCES
// ═══════════════════════════════════════════════════════════════
function loadUserPreferences(userEmail) {
  const userId = userEmail || 'guest_user'
  // The endpoint is auth-gated - must send the token, or default_mode etc.
  // never populate localStorage (previously a silent 401).
  const token = localStorage.getItem('polynous_token') || window.__POLYNOUS_ACCESS_TOKEN__ || ''
  fetch(`${API_BASE_URL}/settings/preferences?user_id=${encodeURIComponent(userId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(r => r.json())
    .then(data => {
      if (data.default_mode) localStorage.setItem('polynous_default_mode', data.default_mode)
      if (data.confidence_threshold !== undefined) localStorage.setItem('polynous_confidence_threshold', data.confidence_threshold)
      if (data.response_style) localStorage.setItem('polynous_response_style', data.response_style)
      if (data.streaming_enabled !== undefined) localStorage.setItem('polynous_streaming', data.streaming_enabled)
      if (data.auto_save !== undefined) localStorage.setItem('polynous_autosave', data.auto_save)
      if (data.theme) localStorage.setItem('polynous_theme', data.theme)
    })
    .catch(() => console.log('ℹ️ Using default preferences'))
}

// ═══════════════════════════════════════════════════════════════
// APP COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [initialAuth] = useState(getInitialAuthState)
  const [isLoggedIn, setIsLoggedIn] = useState(initialAuth.isLoggedIn)
  const [user, setUser] = useState(initialAuth.user)

  // ✅ NEW: Controls whether ProfileSetup is shown
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false)

  // ✅ NEW: Detect OAuth new user flag on mount
  useEffect(() => {
    const needsSetup = localStorage.getItem('polynous_needs_setup')
    if (needsSetup === 'true' && isLoggedIn) {
      setNeedsProfileSetup(true)
    }
  }, [isLoggedIn])

  // ── Keep the session alive ("Keep Synapse Active") ──────────────────────────
  // The access token lives only 15 min; previously it was refreshed ONLY when an
  // API call happened to hit a 401, so an idle or returning user got silently
  // logged out. This proactively refreshes on mount and every 12 min using the
  // (httpOnly) refresh cookie, so the session stays alive for as long as the
  // refresh token is valid (30 days when "Keep Synapse Active" is checked).
  useEffect(() => {
    const token = localStorage.getItem('polynous_token') || ''
    if (!isLoggedIn || token.startsWith('guest_')) return
    let cancelled = false
    const refresh = async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!r.ok || cancelled) return
        const d = await r.json().catch(() => ({}))
        if (d.access_token) {
          localStorage.setItem('polynous_token', d.access_token)
          window.__POLYNOUS_ACCESS_TOKEN__ = d.access_token
        }
      } catch (_) { /* offline / transient - leave the existing token in place */ }
    }
    refresh()                                   // immediately on mount / login
    const id = setInterval(refresh, 12 * 60 * 1000)   // before the 15-min expiry
    return () => { cancelled = true; clearInterval(id) }
  }, [isLoggedIn])

  // ═══════════════════════════════════════════════════════════
  // AUTH HANDLERS
  // ═══════════════════════════════════════════════════════════
  const handleLogin = (data) => {
    console.log('🔑 handleLogin called with:', data)

    // ✅ Profile setup just completed - clear flag only
    if (data?.profile_setup_complete) {
      setNeedsProfileSetup(false)
      localStorage.removeItem('polynous_needs_setup')
      return
    }

    // ✅ Guest login
    if (data?.skip) {
      const guestUser = { username: 'Guest', email: 'guest@polynous.ai', isGuest: true }
      localStorage.setItem('polynous_token', 'guest_' + Date.now())
      localStorage.setItem('polynous_user', JSON.stringify(guestUser))
      setIsLoggedIn(true)
      setUser(guestUser)
      setNeedsProfileSetup(false)
      return
    }

    // ✅ Email/password registration - needs profile setup
    if (data?.needs_profile_setup === true) {
      localStorage.setItem('polynous_token', data.token)
      const userData = { email: data.email, username: data.username || '' }
      localStorage.setItem('polynous_user', JSON.stringify(userData))
      setIsLoggedIn(true)
      setUser(userData)
      setNeedsProfileSetup(true)
      return
    }

    // ✅ Normal login (email/password or OAuth existing user)
    if (data?.token) {
      const safeUsername = data.username || data.email?.split('@')[0] || 'User'
      const userData = { username: safeUsername, email: data.email || '', isGuest: false }
      localStorage.setItem('polynous_token', data.token)
      localStorage.setItem('polynous_user', JSON.stringify(userData))
      setIsLoggedIn(true)
      setUser(userData)

      // ✅ Check if OAuth new user needs profile setup
      const needsSetup = localStorage.getItem('polynous_needs_setup') === 'true'
      if (needsSetup) {
        setNeedsProfileSetup(true)
      } else {
        setNeedsProfileSetup(false)
        if (data.email) loadUserPreferences(data.email)
      }
      return
    }

    // ✅ OAuth fallback (username + email, no token)
    if (data?.username) {
      const userData = { username: data.username, email: data.email || '', isGuest: false }
      if (data.token) localStorage.setItem('polynous_token', data.token)
      localStorage.setItem('polynous_user', JSON.stringify(userData))
      setIsLoggedIn(true)
      setUser(userData)
      setNeedsProfileSetup(false)
      if (data.email) loadUserPreferences(data.email)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    setIsLoggedIn(false)
    setUser(null)
    setNeedsProfileSetup(false)
    window.location.href = '/'
  }

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION HELPERS
  // ═══════════════════════════════════════════════════════════
  const navigateTo = (path) => { window.location.href = path }
  const startResearch = (topic) => { window.location.href = `/research?query=${encodeURIComponent(topic)}` }

  // Landing destination honours the user's "Default Mode" preference
  const defaultRoute = (localStorage.getItem('polynous_default_mode') === 'debate') ? '/debate' : '/research'

  // ═══════════════════════════════════════════════════════════
  // PROFILE SETUP MODE - Full screen, bypasses Router
  // ═══════════════════════════════════════════════════════════
  if (needsProfileSetup && isLoggedIn) {
    return (
      <ProfileSetup 
        email={user?.email}
        token={localStorage.getItem('polynous_token')}
        onComplete={async (username, responseStyle) => {
          // ✅ Update username on backend
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

          // ✅ Persist the chosen response style - without this, the
          // style picked during onboarding never reached the backend and
          // had zero effect on generated answers.
          if (responseStyle) {
            try {
              await fetch(`${API_BASE_URL}/settings/preferences`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ response_style: responseStyle })
              })
            } catch (e) {
              console.error('Failed to save response style', e)
            }
          }

          // ✅ Update local state
          const updatedUser = { ...user, username }
          setUser(updatedUser)
          localStorage.setItem('polynous_user', JSON.stringify(updatedUser))
          localStorage.removeItem('polynous_needs_setup')
          setNeedsProfileSetup(false)

          // ✅ Load preferences now that profile is complete
          if (user?.email) loadUserPreferences(user.email)
        }}
      />
    )
  }

  // ═══════════════════════════════════════════════════════════
  // ROUTES
  // ═══════════════════════════════════════════════════════════
  return (
    <Router>
      <PageTransition />
      <Routes>
        {/* ── PUBLIC ROUTES ─────────────────────────────── */}
        <Route 
          path="/" 
          element={isLoggedIn ? <Navigate to={defaultRoute} replace /> : <PremiumHomepage user={user} onNavigate={navigateTo} />} 
        />
        
        {/* ✅ Auth page - allows access when profile setup is needed */}
        <Route 
          path="/auth" 
          element={
            isLoggedIn && !needsProfileSetup
              ? <Navigate to={defaultRoute} replace />
              : <AuthPage onLogin={handleLogin} />
          } 
        />
        
        {/* ✅ OAuth Callback - only ONE route */}
        <Route
          path="/auth/callback"
          element={<OAuthCallback onLogin={handleLogin} />}
        />

        {/* ✅ Help / Info - PUBLIC so troubleshooting is readable even when login is broken */}
        <Route
          path="/info"
          element={<InfoPage user={user} onNavigate={navigateTo} onLogout={handleLogout} />}
        />

        {/* ── PROTECTED ROUTES ──────────────────────────── */}
        <Route path="/settings" element={isLoggedIn ? <SettingsPage user={user} onNavigate={navigateTo} onLogout={handleLogout} /> : <Navigate to="/auth" />} />
        <Route path="/research" element={isLoggedIn ? <ResearchInterface user={user} onNavigate={navigateTo} onStartResearch={startResearch} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
        <Route path="/debate" element={isLoggedIn ? <DebateInterface user={user} onNavigate={navigateTo} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
        <Route path="/graph" element={isLoggedIn ? <KnowledgeGraphPage user={user} onStartResearch={startResearch} onNavigate={navigateTo} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
        <Route path="/graph3d" element={isLoggedIn ? <KnowledgeGraph3D onSwitchTo2D={() => window.location.href = '/graph'} /> : <Navigate to="/auth" />} />
        <Route path="/graph-lab" element={isLoggedIn ? <GraphFeatureShowcase /> : <Navigate to="/auth" />} />
        <Route path="/memory" element={isLoggedIn ? <MemoryBank user={user} onNavigate={navigateTo} onStartResearch={startResearch} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
        <Route path="/search" element={isLoggedIn ? <SemanticSearchPage user={user} onStartResearch={startResearch} onNavigate={navigateTo} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
        <Route path="/pdf-lab" element={isLoggedIn ? <PdfLabPage user={user} onNavigate={navigateTo} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />
        <Route path="/analytics" element={isLoggedIn ? <PolynousDashboard user={user} onNavigate={navigateTo} onLogout={handleLogout} /> : <Navigate to="/auth" replace />} />

        {/* ── CATCH-ALL ─────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}