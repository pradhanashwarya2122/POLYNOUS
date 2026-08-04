// ─── Enhanced AuthFallback ────────────────────────────────────
// Drop-in replacement - assumes C, SynapseDot, Icon are in scope

const fallbackStyles = `
  @keyframes errorPulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(255,32,64,0); }
    50%      { box-shadow: 0 0 0 12px rgba(255,32,64,0.08); }
  }
  @keyframes warnSpin {
    0%   { transform: rotate(0deg)   scale(1);   opacity: 0.9; }
    25%  { transform: rotate(-6deg)  scale(1.08); opacity: 1; }
    50%  { transform: rotate(0deg)   scale(1);   opacity: 0.9; }
    75%  { transform: rotate(6deg)   scale(1.06); opacity: 1; }
    100% { transform: rotate(0deg)   scale(1);   opacity: 0.9; }
  }
  @keyframes traceLeft {
    0%   { width: 0%;   opacity: 0; }
    20%  { opacity: 1; }
    100% { width: 100%; opacity: 0.6; }
  }
  @keyframes codeScroll {
    0%   { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
  @keyframes blinkCaret {
    50% { opacity: 0; }
  }
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ripple {
    0%   { transform: scale(0.85); opacity: 0.6; }
    100% { transform: scale(2.2);  opacity: 0; }
  }

  .fallback-card {
    background: rgba(10,10,28,0.72);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,32,64,0.18);
    border-radius: 18px;
    padding: 44px 36px 36px;
    position: relative;
    overflow: hidden;
    width: 100%;
    text-align: center;
    box-shadow:
      0 32px 72px rgba(0,0,0,0.7),
      0 0 0 1px rgba(255,32,64,0.06),
      inset 0 1px 0 rgba(255,255,255,0.03);
    animation: fadeSlideUp 0.5s cubic-bezier(.22,.68,0,1.2) both;
  }

  /* Scrolling error-log background */
  .fallback-logbg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    opacity: 0.03;
    z-index: 0;
  }
  .fallback-logbg-inner {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #ff2040;
    line-height: 1.8;
    white-space: nowrap;
    animation: codeScroll 18s linear infinite;
  }

  /* Top red trace line */
  .fallback-trace {
    position: absolute;
    top: 0; left: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #ff2040, transparent);
    animation: traceLeft 1.2s ease-out 0.2s both;
  }

  /* Corner brackets - red-tinted */
  .fallback-corner {
    position: absolute;
    width: 14px; height: 14px;
  }
  .fallback-corner.tl { top: 0; left: 0;  border-top: 1px solid rgba(255,32,64,0.55); border-left:  1px solid rgba(255,32,64,0.55); }
  .fallback-corner.tr { top: 0; right: 0; border-top: 1px solid rgba(255,32,64,0.55); border-right: 1px solid rgba(255,32,64,0.55); }
  .fallback-corner.bl { bottom: 0; left: 0;  border-bottom: 1px solid rgba(255,32,64,0.55); border-left:  1px solid rgba(255,32,64,0.55); }
  .fallback-corner.br { bottom: 0; right: 0; border-bottom: 1px solid rgba(255,32,64,0.55); border-right: 1px solid rgba(255,32,64,0.55); }

  /* Icon ring + ripple */
  .fallback-icon-wrap {
    position: relative;
    width: 76px; height: 76px;
    margin: 0 auto 22px;
    display: flex; align-items: center; justify-content: center;
    animation: errorPulse 3s ease-in-out infinite;
  }
  .fallback-icon-ring {
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 1px solid rgba(255,32,64,0.3);
    background: radial-gradient(circle, rgba(255,32,64,0.08) 0%, transparent 70%);
  }
  .fallback-ripple {
    position: absolute; inset: 0;
    border-radius: 50%;
    border: 1px solid rgba(255,32,64,0.4);
    animation: ripple 2.4s ease-out infinite;
  }
  .fallback-ripple:nth-child(2) { animation-delay: 0.8s; }
  .fallback-ripple:nth-child(3) { animation-delay: 1.6s; }
  .fallback-warn {
    font-size: 32px;
    animation: warnSpin 4s ease-in-out infinite;
    display: inline-block;
    filter: drop-shadow(0 0 10px rgba(255,32,64,0.7));
    line-height: 1;
    position: relative; z-index: 1;
  }

  /* Error code badge */
  .fallback-code {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,32,64,0.08);
    border: 1px solid rgba(255,32,64,0.2);
    border-radius: 6px;
    padding: 4px 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: rgba(255,32,64,0.7);
    letter-spacing: 0.1em;
    margin-bottom: 14px;
  }
  .fallback-code-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #ff2040;
    animation: blinkCaret 1.1s step-end infinite;
  }

  .fallback-title {
    font-family: 'Sora', sans-serif;
    font-size: 24px;
    font-weight: 700;
    color: #ff2040;
    letter-spacing: -0.02em;
    margin-bottom: 10px;
    line-height: 1.2;
  }

  .fallback-msg {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    color: rgba(185,204,176,0.7);
    line-height: 1.75;
    max-width: 310px;
    margin: 0 auto;
  }

  /* Divider */
  .fallback-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,32,64,0.15), transparent);
    margin: 24px 0;
  }

  /* What went wrong checklist */
  .fallback-checks {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 24px;
    padding: 0 4px;
  }
  .fallback-check-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: rgba(185,204,176,0.55);
    line-height: 1.5;
  }
  .fallback-check-icon {
    font-size: 10px;
    margin-top: 2px;
    flex-shrink: 0;
    color: rgba(255,32,64,0.6);
  }

  /* Retry button */
  .fallback-retry {
    width: 100%;
    border: none;
    cursor: pointer;
    border-radius: 10px;
    padding: 13px 28px;
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: #00ff0f;
    color: #003a00;
    box-shadow: 0 0 20px rgba(0,255,15,0.3), 0 4px 16px rgba(0,0,0,0.4);
    transition: transform 0.2s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }
  .fallback-retry::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 200% 100%;
    animation: shimmerGrad 2.5s linear infinite;
  }
  .fallback-retry:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 32px rgba(0,255,15,0.5), 0 8px 24px rgba(0,0,0,0.5);
  }
  .fallback-retry:active { transform: translateY(0); }

  /* Guest button */
  .fallback-guest {
    width: 100%;
    padding: 12px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    color: rgba(255,255,255,0.35);
    cursor: pointer;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.04em;
    transition: all 0.25s;
  }
  .fallback-guest:hover {
    border-color: rgba(0,204,255,0.35);
    color: #00ccff;
    background: rgba(0,204,255,0.04);
  }

  @keyframes shimmerGrad {
    from { background-position: -200% 0; }
    to   { background-position:  200% 0; }
  }
`;

const LOG_LINES = [
  "ERR  oauth/google → 404 Not Found",
  "WARN callback route missing on api server",
  "ERR  token exchange failed - no response",
  "INFO retrying connection... timeout 5000ms",
  "ERR  ECONNREFUSED polynous-api.railway.app:443",
  "WARN session invalidated - clearing tokens",
  "ERR  oauth/google → 404 Not Found",
  "WARN callback route missing on api server",
  "ERR  token exchange failed - no response",
  "INFO retrying connection... timeout 5000ms",
];

function AuthFallback({ errorMsg, onRetry }) {
  return (
    <>
      <style>{fallbackStyles}</style>

      <div className="fallback-card">

        {/* Scrolling log background */}
        <div className="fallback-logbg">
          <div className="fallback-logbg-inner">
            {[...LOG_LINES, ...LOG_LINES].map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>

        {/* Top trace line */}
        <div className="fallback-trace" />

        {/* Corner brackets */}
        <div className="fallback-corner tl" />
        <div className="fallback-corner tr" />
        <div className="fallback-corner bl" />
        <div className="fallback-corner br" />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Icon */}
          <div className="fallback-icon-wrap">
            <div className="fallback-ripple" />
            <div className="fallback-ripple" />
            <div className="fallback-ripple" />
            <div className="fallback-icon-ring" />
            <span className="fallback-warn">⚠</span>
          </div>

          {/* Error badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <span className="fallback-code">
              <span className="fallback-code-dot" />
              OAUTH_CALLBACK_404
            </span>
          </div>

          <h1 className="fallback-title">Neural Link Failed</h1>
          <p className="fallback-msg">
            {errorMsg || "Google couldn't complete the sign-in. The callback route returned an error."}
          </p>

          <div className="fallback-divider" />

          {/* What likely went wrong */}
          <div className="fallback-checks">
            {[
              "Callback route not registered on your backend",
              "Railway deployment may be offline or crashed",
              "Redirect URI mismatch in Google Cloud Console",
            ].map((s, i) => (
              <div className="fallback-check-row" key={i}>
                <span className="fallback-check-icon">✕</span>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              className="fallback-retry"
              onClick={onRetry || (() => window.location.reload())}
            >
              ↺ Try again
            </button>

            <button
              className="fallback-guest"
              onClick={() => {
                const guestToken = 'guest_' + Date.now();
                window.__POLYNOUS_ACCESS_TOKEN__ = guestToken;
                localStorage.setItem('polynous_token', guestToken);
                localStorage.setItem('polynous_user', JSON.stringify({ username: 'Guest', email: 'guest@polynous.ai', user_id: 'guest' }));
                localStorage.setItem('polynous_user_id', 'guest');
                localStorage.setItem('polynous_username', 'Guest');
                window.location.href = '/research';
              }}
            >
              Continue as guest →
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

export default AuthFallback;