import { useRef, useEffect, useState } from "react";
import ProfileSetup from './ProfileSetup'
import { API_BASE_URL } from '../config'

// ─── Design Tokens ────────────────────────────────────────────
const C = {
  green:   "#00ff0f",
  cyan:    "#00ccff",
  void:    "#0a0a1e",
  surface: "#111125",
  surfaceContainerLowest: "#0c0c20",
  surfaceContainer: "#1e1e32",
  onSurface: "#e2e0fc",
  onSurfaceVariant: "#b9ccb0",
  white10: "rgba(255,255,255,0.1)",
  white5:  "rgba(255,255,255,0.05)",
};

// ─── Global Styles ────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        background: #0a0a1e;
        color: #e2e0fc;
        font-family: 'Hanken Grotesk', sans-serif;
        min-height: 100vh;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      ::selection { background: rgba(0,255,15,0.25); }

      @keyframes neural-pulse {
        0%,100% { transform: scale(1);   filter: drop-shadow(0 0 10px rgba(0,255,15,0.4)); }
        50%      { transform: scale(1.1); filter: drop-shadow(0 0 28px rgba(0,255,15,0.9)); }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes blink { 50% { opacity: 0; } }

      .pulse-brain  { animation: neural-pulse 3s infinite ease-in-out; display: inline-block; }
      .fade-up      { animation: fadeUp 0.5s ease forwards; }

      .neural-border {
        background: rgba(10,10,30,0.8);
        border: 1px solid rgba(0,204,255,0.3);
        transition: border-color 0.3s, box-shadow 0.3s;
      }
      .neural-border:hover {
        border-color: #00ccff;
        box-shadow: 0 0 15px rgba(0,204,255,0.4);
      }

      .btn-glow-green {
        background: #00ff0f;
        color: #003a00;
        box-shadow: 0 0 10px rgba(0,255,15,0.5);
        transition: box-shadow 0.3s, transform 0.3s;
      }
      .btn-glow-green:hover {
        box-shadow: 0 0 28px rgba(0,255,15,0.85);
        transform: translateY(-2px);
      }
      .btn-glow-green:active { transform: translateY(0); }

      .footer-link { transition: color 0.2s; }
      .footer-link:hover { color: #00ccff !important; }

      .register-link:hover { text-decoration: underline; }
      .forgot-link:hover   { text-decoration: underline; }

      .remember-label:hover span { color: #00ff0f; }

      input[type="checkbox"] {
        accent-color: #00ff0f;
        width: 14px;
        height: 14px;
        cursor: pointer;
        border-radius: 4px;
      }
    `}</style>
  );
}

// ─── Material Icon ────────────────────────────────────────────
function Icon({ name, style }) {
  return (
    <span
      style={{
        fontFamily: "Material Symbols Outlined",
        fontVariationSettings: "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24",
        lineHeight: 1,
        userSelect: "none",
        ...style,
      }}
    >
      {name}
    </span>
  );
}

// ─── Synapse Dot ──────────────────────────────────────────────
function SynapseDot({ style }) {
  return (
    <div style={{
      position: "absolute", width: 4, height: 4,
      background: C.green, borderRadius: "50%",
      boxShadow: `0 0 8px ${C.green}`, ...style,
    }} />
  );
}

// ─── Neural Canvas ────────────────────────────────────────────
function NeuralCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let particles = [], animId;
    const N = 120, maxDist = 150;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", () => { resize(); init(); });
    resize();

    class P {
      constructor() {
        this.x  = Math.random() * canvas.width;
        this.y  = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.r  = Math.random() * 2 + 1;
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > canvas.width)  this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height)  this.vy *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,255,15,0.4)";
        ctx.fill();
      }
    }

    function init() { particles = Array.from({ length: N }, () => new P()); }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p, i) => {
        p.update(); p.draw();
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0,204,255,${0.1 * (1 - dist / maxDist)})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
      });
      animId = requestAnimationFrame(animate);
    }

    init(); animate();

    const onMove = (e) => {
      particles.forEach(p => {
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) { p.vx += dx * 0.00005; p.vy += dy * 0.00005; }
      });
    };
    window.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas ref={ref} style={{
      position: "fixed", top: 0, left: 0,
      width: "100%", height: "100%",
      zIndex: 0, pointerEvents: "none",
    }} />
  );
}

// ─── Focused Input ────────────────────────────────────────────
function NeuralInput({ type, placeholder, icon, label, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13, color: C.onSurfaceVariant, marginLeft: 8,
      }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <Icon
          name={icon}
          style={{
            position: "absolute", left: 16,
            top: "50%", transform: "translateY(-50%)",
            color: C.cyan, fontSize: 20,
          }}
        />
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            background: "rgba(12,12,32,0.5)",
            border: `1px solid ${focused ? C.cyan : C.white10}`,
            borderRadius: 9999,
            padding: "12px 24px 12px 48px",
            color: "#fff",
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 16,
            outline: "none",
            boxShadow: focused ? `0 0 12px rgba(0,204,255,0.4)` : "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        />
      </div>
    </div>
  );
}

// ─── OAuth Button ─────────────────────────────────────────────
function OAuthButton({ label, children, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="neural-border"
      style={{
        borderRadius: 9999,
        padding: "12px 24px",
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: 12,
        cursor: "pointer", background: "rgba(10,10,30,0.8)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}
    >
      {children}
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13, color: "#fff",
      }}>
        {label}
      </span>
    </button>
  );
}

// ─── Banner ───────────────────────────────────────────────────
function Banner({ type, message }) {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div style={{
      background: isError ? "rgba(255,32,64,0.1)" : "rgba(0,255,15,0.08)",
      border: `1px solid ${isError ? "rgba(255,32,64,0.35)" : "rgba(0,255,15,0.35)"}`,
      borderRadius: 10, padding: "10px 16px",
      color: isError ? "#ff2040" : C.green,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
    }}>
      {isError ? "⚠ " : "✓ "}{message}
    </div>
  );
}

// ─── Login Card ───────────────────────────────────────────────
function LoginCard({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [isLogin, setIsLogin]   = useState(true);

  const handleSubmit = async () => {
    setError(""); setSuccess("");
    if (!email || !password) { setError("All fields are required."); return; }
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register'
      const body = isLogin 
        ? { email, password } 
        : { email, username: 'new_user', password }
      
      // ✅ FIXED: Use API_BASE_URL instead of hardcoded localhost
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      
      if (!res.ok) {
        let errorMsg = data.detail || "Authentication failed.";
        if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map(e => e.msg).join('. ');
        } else if (typeof data.detail === 'object') {
          if (data.detail.errors) {
            errorMsg = data.detail.errors.map(e => e.message).join('. ');
          } else if (data.detail.msg) {
            errorMsg = data.detail.msg;
          }
        }
        throw new Error(errorMsg);
      }
      
      const token = data.access_token || data.token;
      window.__POLYNOUS_ACCESS_TOKEN__ = token;
      localStorage.setItem('polynous_token', token);
      
      if (data.refresh_token) {
        window.__POLYNOUS_REFRESH_TOKEN__ = data.refresh_token;
      }
      
      localStorage.setItem('polynous_user', JSON.stringify({ 
          username: data.username || email.split('@')[0], 
          email: email,
          user_id: data.user_id
      }));
      localStorage.setItem('polynous_user_id', data.user_id);
      localStorage.setItem('polynous_username', data.username || email.split('@')[0]);
      
      if (!isLogin && onLogin) {
        onLogin({ ...data, email, needs_profile_setup: true });
      } else if (onLogin) {
        onLogin(data);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Use API_BASE_URL for OAuth redirects
  const handleOAuth = (provider) => {
    window.location.href = `${API_BASE_URL}/oauth/${provider}`;
  };

  const handleGuest = () => {
    const guest = { skip: true, username: 'Guest', email: 'guest@polynous.ai' }
    const guestToken = 'guest_' + Date.now()
    window.__POLYNOUS_ACCESS_TOKEN__ = guestToken
    localStorage.setItem('polynous_token', guestToken)
    localStorage.setItem('polynous_user', JSON.stringify({ username: 'Guest', email: 'guest@polynous.ai', user_id: 'guest' }))
    localStorage.setItem('polynous_user_id', 'guest')
    localStorage.setItem('polynous_username', 'Guest')
    if (onLogin) onLogin(guest)
    else window.location.href = '/dashboard'
  };

  return (
    <div
      className="fade-up"
      style={{
        background: "rgba(10,10,30,0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${C.white10}`,
        borderRadius: 16,
        padding: "40px 40px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 15px rgba(0,255,15,0.1)",
        width: "100%",
      }}
    >
      <SynapseDot style={{ top: 16, left: 16 }} />
      <SynapseDot style={{ top: 16, right: 16 }} />
      <SynapseDot style={{ bottom: 16, left: 16 }} />
      <SynapseDot style={{ bottom: 16, right: 16 }} />

      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div className="pulse-brain" style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>.</div>
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 38, fontWeight: 700, color: C.green, letterSpacing: "-0.03em", marginBottom: 4 }}>POLYNOUS</h1>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.2em" }}>Cerebral Vitality Engine</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Toggle: Login / Sign Up */}
        <div style={{ display: "flex", background: C.white5, borderRadius: 14, padding: 4 }}>
          <button onClick={() => { setIsLogin(true); setError(''); setSuccess('') }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer', background: isLogin ? C.green : 'transparent', color: isLogin ? C.void : C.onSurfaceVariant, fontWeight: 600, fontSize: 14, fontFamily: "'Sora', sans-serif" }}>Login</button>
          <button onClick={() => { setIsLogin(false); setError(''); setSuccess('') }} style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', cursor: 'pointer', background: !isLogin ? C.green : 'transparent', color: !isLogin ? C.void : C.onSurfaceVariant, fontWeight: 600, fontSize: 14, fontFamily: "'Sora', sans-serif" }}>Sign Up</button>
        </div>

        {/* OAuth buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <OAuthButton label="Google" onClick={() => handleOAuth("google")}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#fff" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" />
            </svg>
          </OAuthButton>
          <OAuthButton label="GitHub" onClick={() => handleOAuth("github")}>
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#fff" }}>
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.192.694.805.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </OAuthButton>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1, borderTop: `1px solid ${C.white10}` }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap" }}>Or connect via neural link</span>
          <div style={{ flex: 1, borderTop: `1px solid ${C.white10}` }} />
        </div>

        {/* Form - Added Enter key support */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }} onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}>
          <NeuralInput label="Neural Identity (Email)" type="email" placeholder="researcher@neural.bank" icon="alternate_email" value={email} onChange={e => setEmail(e.target.value)} />
          <NeuralInput label="Cortex Key (Password)" type="password" placeholder="••••••••" icon="fingerprint" value={password} onChange={e => setPassword(e.target.value)} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
            <label className="remember-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.onSurfaceVariant }}>Keep Synapse Active</span>
            </label>
            <a href="#" className="forgot-link" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.cyan, textDecoration: "none" }}>Lost Cortex Access?</a>
          </div>

          <Banner type="error" message={error} />
          <Banner type="success" message={success} />

          <button onClick={handleSubmit} disabled={loading} className="btn-glow-green" style={{ width: "100%", border: "none", cursor: loading ? "not-allowed" : "pointer", borderRadius: 9999, padding: "14px 32px", fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 8, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Connecting..." : isLogin ? "Connect to Brain" : "Initialize Profile"}
            {!loading && <Icon name="bolt" style={{ fontSize: 20, color: "#003a00" }} />}
          </button>
        </div>

        {/* Skip Button - Continue as guest */}
        <button onClick={handleGuest} style={{ width: '100%', padding: '12px', background: 'transparent', border: `1px solid ${C.white10}`, borderRadius: 14, color: '#888', cursor: 'pointer', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.3s' }} onMouseEnter={e => { e.target.style.borderColor = '#00ccff'; e.target.style.color = '#00ccff' }} onMouseLeave={e => { e.target.style.borderColor = C.white10; e.target.style.color = '#888' }}>
          Skip for now → Continue as guest
        </button>
      </div>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────
function Footer() {
  const links = ["Privacy Neural Protocol", "System Integrity", "Contact Core"];
  return (
    <div style={{
      display: "flex", justifyContent: "center",
      alignItems: "center", gap: 24, marginTop: 24,
    }}>
      {links.map((l, i) => (
        <span key={l} style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a
            href="#"
            className="footer-link"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, color: C.onSurfaceVariant, textDecoration: "none",
            }}
          >
            {l}
          </a>
          {i < links.length - 1 && (
            <span style={{ color: C.white10 }}>|</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────
export default function PolynousLoginV2({ onLogin }) {
  const [profileSetupUser, setProfileSetupUser] = useState(null);

  useEffect(() => {
    // Your auth logic — ensure cleanup to prevent double execution
    return () => {
      // Cleanup
    };
  }, []);

  const handleLogin = (data) => {
    if (data.needs_profile_setup) {
      setProfileSetupUser(data);
    } else if (onLogin) {
      onLogin(data);
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleProfileComplete = (username) => {
    const stored = JSON.parse(localStorage.getItem('polynous_user') || '{}');
    localStorage.setItem('polynous_user', JSON.stringify({ ...stored, username }));
    if (onLogin) {
      onLogin({ ...profileSetupUser, username });
    } else {
      window.location.href = '/dashboard';
    }
    setProfileSetupUser(null);
  };

  return (
    <>
      <GlobalStyles />
      <NeuralCanvas />

      <main style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: 480,
        padding: "0 16px",
        display: "flex", flexDirection: "column",
      }}>
        {profileSetupUser ? (
          <ProfileSetup
            email={profileSetupUser.email}
            onComplete={handleProfileComplete}
          />
        ) : (
          <LoginCard onLogin={handleLogin} />
        )}
        <Footer />
      </main>
    </>
  );
}