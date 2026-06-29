import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes outer-spin { to { transform: rotate(-360deg); } }
  @keyframes fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes dot-bounce { 0%,80%,100% { transform: translateY(0); opacity: 0.3; } 40% { transform: translateY(-5px); opacity: 1; } }
  @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
  @keyframes glow-pulse { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.12; transform: scale(1.15); } }
  @keyframes step-in { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: translateX(0); } }

  .oa-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #08080f;
    font-family: 'Inter', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .oa-glow-1 {
    position: absolute;
    width: 560px; height: 560px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%);
    top: -200px; left: -160px;
    pointer-events: none;
  }
  .oa-glow-2 {
    position: absolute;
    width: 440px; height: 440px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(168,85,247,0.09) 0%, transparent 65%);
    bottom: -160px; right: -120px;
    pointer-events: none;
  }
  .oa-glow-3 {
    position: absolute;
    width: 220px; height: 220px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
    bottom: 80px; left: 40px;
    pointer-events: none;
  }

  .oa-card {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;
    animation: fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both;
  }

  .oa-logo-area {
    position: relative;
    width: 90px; height: 90px;
    display: flex; align-items: center; justify-content: center;
  }

  .oa-ring-outer {
    position: absolute;
    inset: -14px;
    border-radius: 50%;
    border: 1px solid rgba(99,102,241,0.2);
    animation: glow-pulse 2.4s ease-in-out infinite;
  }
  .oa-ring-spinner {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 1.5px solid transparent;
    border-top-color: #6366f1;
    border-right-color: rgba(139,92,246,0.5);
    animation: spin 1.1s linear infinite;
  }
  .oa-ring-spinner-2 {
    position: absolute;
    inset: -12px;
    border-radius: 50%;
    border: 1px solid transparent;
    border-bottom-color: rgba(99,102,241,0.3);
    border-left-color: rgba(168,85,247,0.18);
    animation: outer-spin 2.2s linear infinite;
  }

  .oa-logo-circle {
    width: 90px; height: 90px;
    border-radius: 50%;
    background: linear-gradient(145deg, #141428, #0e0e1e);
    border: 1px solid rgba(255,255,255,0.07);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 0 1px rgba(99,102,241,0.07), inset 0 1px 0 rgba(255,255,255,0.04);
  }

  .oa-headline {
    font-size: 22px;
    font-weight: 600;
    color: #f0f0ff;
    letter-spacing: -0.4px;
    margin: 0;
    text-align: center;
  }
  .oa-sub {
    font-size: 14px;
    font-weight: 400;
    color: rgba(255,255,255,0.35);
    margin: 4px 0 0;
    text-align: center;
  }

  .oa-provider-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.03);
    border: 0.5px solid rgba(255,255,255,0.09);
    border-radius: 999px;
    padding: 6px 14px 6px 10px;
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    margin-top: 8px;
  }

  .oa-dots { display: flex; gap: 7px; align-items: center; }
  .oa-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #6366f1;
    animation: dot-bounce 1.4s ease-in-out infinite;
  }
  .oa-dot:nth-child(2) { animation-delay: 0.18s; }
  .oa-dot:nth-child(3) { animation-delay: 0.36s; }

  .oa-steps {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 220px;
  }
  .oa-step {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: rgba(255,255,255,0.18);
    transition: color 0.4s ease;
  }
  .oa-step.active {
    color: rgba(255,255,255,0.6);
    animation: step-in 0.3s ease both;
  }
  .oa-step.done { color: rgba(99,102,241,0.75); }
  .oa-step-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.3s;
  }
  .oa-step.active .oa-step-dot,
  .oa-step.done .oa-step-dot { opacity: 1; }

  .oa-divider {
    width: 200px; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
  }

  .oa-footer {
    font-size: 11px;
    color: rgba(255,255,255,0.14);
    letter-spacing: 0.2px;
    text-align: center;
  }
`

function GitHubIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function GoogleIcon({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

const STEPS = [
  'Verifying OAuth token',
  'Loading your profile',
  'Preparing your workspace',
]

export default function OAuthCallback({ onLogin }) {
  const navigate = useNavigate()
  const [provider, setProvider] = useState(null)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    // ✅ ALL timers tracked in a single array for cleanup
    const timers = []

    const params = new URLSearchParams(window.location.search)
    const token = params.get('access_token') || params.get('token')
    const refreshToken = params.get('refresh_token')
    const username = params.get('username')
    const email = params.get('email')
    const errorMsg = params.get('error')
    const isNewUser = params.get('new_user') === 'true'
    const isExistingUser = params.get('existing_user') === 'true'

    const detectedProvider = params.get('access_token') ? 'github' : 'google'
    setProvider(detectedProvider)

    // Handle OAuth error
    if (errorMsg) {
      navigate('/auth?error=' + encodeURIComponent(errorMsg), { replace: true })
      return () => timers.forEach(clearTimeout)
    }

    // Handle successful OAuth
    if (token && email) {
      localStorage.setItem('polynous_token', token)
      if (refreshToken) localStorage.setItem('polynous_refresh_token', refreshToken)
      localStorage.setItem('polynous_user', JSON.stringify({ username, email }))

      if (onLogin) onLogin({ token, username, email })

      timers.push(setTimeout(() => setActiveStep(1), 700))
      timers.push(setTimeout(() => setActiveStep(2), 1400))

      // ✅ New user → profile setup
      if (isNewUser) {
        localStorage.setItem('polynous_needs_setup', 'true')
        timers.push(setTimeout(() => {
          setActiveStep(3)
          navigate('/auth?setup=new', { replace: true })
        }, 2500))
        return () => timers.forEach(clearTimeout)
      }

      // ✅ Existing user → research
      timers.push(setTimeout(() => {
        setActiveStep(3)
        navigate('/research', { replace: true })
      }, 2500))
      return () => timers.forEach(clearTimeout)
    }

    // Fallback: no valid token
    timers.push(setTimeout(() => {
      navigate('/auth?error=Authentication+failed', { replace: true })
    }, 1500))
    
    return () => timers.forEach(clearTimeout)
  }, [navigate, onLogin])

  const providerLabel = provider === 'github' ? 'GitHub' : 'Google'

  return (
    <>
      <style>{styles}</style>
      <div className="oa-root">
        <div className="oa-glow-1" />
        <div className="oa-glow-2" />
        <div className="oa-glow-3" />

        <div className="oa-card">
          <div className="oa-logo-area">
            <div className="oa-ring-outer" />
            <div className="oa-ring-spinner-2" />
            <div className="oa-ring-spinner" />
            <div className="oa-logo-circle">
              {provider === 'github' ? <GitHubIcon /> : <GoogleIcon />}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <h2 className="oa-headline">Signing you in</h2>
            <p className="oa-sub">
              {provider === 'github' ? 'Connecting your GitHub account…' : 'Connecting your Google account…'}
            </p>
            <div className="oa-provider-badge">
              {provider === 'github'
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.45)"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                : <GoogleIcon size={13} />
              }
              <span>via {providerLabel} OAuth</span>
            </div>
          </div>

          <div className="oa-dots">
            <div className="oa-dot" />
            <div className="oa-dot" />
            <div className="oa-dot" />
          </div>

          <div className="oa-steps">
            {STEPS.map((label, i) => {
              const cls = i < activeStep ? 'done' : i === activeStep ? 'active' : ''
              return (
                <div key={i} className={`oa-step ${cls}`}>
                  <div className="oa-step-dot" />
                  <span>{label}</span>
                </div>
              )
            })}
          </div>

          <div className="oa-divider" />
          <p className="oa-footer">Secured by Polynous · You'll be redirected automatically</p>
        </div>
      </div>
    </>
  )
}