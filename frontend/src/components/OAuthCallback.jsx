import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes pulse-ring {
    0%   { transform: scale(0.85); opacity: 0.6; }
    50%  { transform: scale(1.1);  opacity: 0.15; }
    100% { transform: scale(0.85); opacity: 0.6; }
  }

  @keyframes fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes dot-bounce {
    0%, 80%, 100% { transform: translateY(0);    opacity: 0.3; }
    40%            { transform: translateY(-6px); opacity: 1;   }
  }

  .oauth-root {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #07070f;
    font-family: 'Inter', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .oauth-root::before,
  .oauth-root::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    pointer-events: none;
  }
  .oauth-root::before {
    width: 420px; height: 420px;
    background: radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%);
    top: -100px; left: -100px;
  }
  .oauth-root::after {
    width: 360px; height: 360px;
    background: radial-gradient(circle, rgba(168,85,247,0.13) 0%, transparent 70%);
    bottom: -80px; right: -80px;
  }

  .oauth-card {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 32px;
    animation: fade-up 0.5s ease both;
  }

  .logo-wrapper {
    position: relative;
    width: 72px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pulse-ring {
    position: absolute;
    inset: -10px;
    border-radius: 50%;
    border: 1.5px solid rgba(99,102,241,0.45);
    animation: pulse-ring 2s ease-in-out infinite;
  }
  .logo-circle {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #111127;
    border: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 6px rgba(99,102,241,0.06);
  }
  .spinner-track {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px solid transparent;
    border-top-color: #6366f1;
    border-right-color: rgba(99,102,241,0.3);
    animation: spin 1s linear infinite;
  }

  .text-block {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .heading {
    font-size: 20px;
    font-weight: 600;
    color: #f0f0ff;
    letter-spacing: -0.3px;
    margin: 0;
  }
  .sub {
    font-size: 14px;
    font-weight: 400;
    color: rgba(255,255,255,0.38);
    margin: 0;
    letter-spacing: 0.1px;
  }

  .dots {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #6366f1;
    animation: dot-bounce 1.4s ease-in-out infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.18s; }
  .dot:nth-child(3) { animation-delay: 0.36s; }

  .divider {
    width: 180px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
  }

  .footer-note {
    font-size: 12px;
    color: rgba(255,255,255,0.2);
    text-align: center;
    letter-spacing: 0.2px;
  }
`

// ✅ GitHub Icon SVG
function GitHubIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

// ✅ Google Icon SVG
function GoogleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  )
}

// ✅ POLYNOUS Brain Icon (generic, used when provider is unknown)
function PolynousIcon() {
  return (
    <span style={{ fontSize: '28px' }}>🧠</span>
  )
}

export default function OAuthCallback({ onLogin }) {
  const navigate = useNavigate()
  const [mounted, setMounted] = useState(false)
  const [provider, setProvider] = useState('github') // Default to GitHub

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    
    // ✅ Detect which provider based on URL params
    // GitHub sends: access_token, username, email
    // Google sends: token, username, email
    const token = params.get('access_token') || params.get('token')
    const refreshToken = params.get('refresh_token')
    const username = params.get('username')
    const email = params.get('email')
    const errorMsg = params.get('error')

    // ✅ Detect provider from the token format or referrer
    if (params.get('access_token')) {
        setProvider('github')
    } else if (params.get('token')) {
        setProvider('google')
    }

    if (errorMsg) {
        console.error('OAuth Error:', decodeURIComponent(errorMsg))
        // ✅ Delay before redirecting on error
        setTimeout(() => {
            navigate('/auth?error=' + encodeURIComponent(errorMsg))
        }, 1500)
        return
    }

    if (token && username) {
        localStorage.setItem('polynous_token', token)
        if (refreshToken) {
            localStorage.setItem('polynous_refresh_token', refreshToken)
        }
        localStorage.setItem('polynous_user', JSON.stringify({ username, email }))
        if (onLogin) onLogin({ token, username, email })
        
        // ✅ LONGER DELAY — User sees the beautiful loading screen for 2.5 seconds
        setTimeout(() => {
            navigate('/research', { replace: true })
        }, 2500)
        return
    }

    // Missing parameters — delay then redirect
    setTimeout(() => {
        navigate('/auth?error=Authentication+failed')
    }, 1500)
  }, [navigate, onLogin])

  // ✅ Show the correct icon based on provider
  const ProviderIcon = () => {
    if (provider === 'github') return <GitHubIcon />
    if (provider === 'google') return <GoogleIcon />
    return <PolynousIcon />
  }

  return (
    <>
      <style>{styles}</style>
      <div className="oauth-root">
        <div className="oauth-card">

          {/* ✅ Animated logo — shows correct provider icon */}
          <div className="logo-wrapper">
            <div className="pulse-ring" />
            <div className="spinner-track" />
            <div className="logo-circle">
              <ProviderIcon />
            </div>
          </div>

          {/* Text — ✅ Now shows provider-specific message */}
          <div className="text-block">
            <h2 className="heading">Signing you in</h2>
            <p className="sub">
              {provider === 'github' ? 'Connecting your GitHub account…' : 
               provider === 'google' ? 'Connecting your Google account…' : 
               'Verifying your account…'}
            </p>
          </div>

          {/* ✅ Animated dots — user sees this for 2.5 seconds */}
          <div className="dots">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>

          <div className="divider" />

          <p className="footer-note">You'll be redirected automatically</p>
        </div>
      </div>
    </>
  )
}