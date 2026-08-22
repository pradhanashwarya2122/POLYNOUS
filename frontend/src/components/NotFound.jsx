import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

// Themed 404 — matches the POLYNOUS dark/purple aesthetic. Rendered by the
// catch-all route so unknown URLs get a real page instead of a silent redirect.
export default function NotFound() {
  useEffect(() => {
    document.title = 'Page not found, Polynous'
    toast.error('Page not found', { id: 'not-found', description: "That link doesn't lead anywhere in POLYNOUS." })
  }, [])

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(1200px 600px at 50% -10%, rgba(124,58,237,0.18), transparent 60%), #08060f',
        color: '#e9dcff',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <div
          aria-hidden="true"
          style={{
            fontFamily: "'Sora', 'Space Grotesk', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(84px, 20vw, 168px)',
            lineHeight: 1,
            letterSpacing: '-0.04em',
            background: 'linear-gradient(180deg, #c084fc 0%, #7c3aed 70%, #4c1d95 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 12px 40px rgba(124,58,237,0.35))',
          }}
        >
          404
        </div>

        <h1
          style={{
            margin: '10px 0 8px',
            fontSize: 'clamp(20px, 4vw, 26px)',
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          This page drifted off the graph
        </h1>

        <p
          style={{
            margin: '0 0 28px',
            fontSize: 15,
            lineHeight: 1.6,
            color: 'rgba(216,208,236,0.66)',
          }}
        >
          The link you followed doesn&apos;t connect to any node in Polynous.
          Let&apos;s get you back to somewhere that does.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/"
            style={{
              padding: '11px 22px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              color: '#150a24',
              background: 'linear-gradient(180deg, #c084fc, #a855f7)',
              boxShadow: '0 10px 30px -12px rgba(168,85,247,0.8)',
            }}
          >
            Back to home
          </Link>
          <Link
            to="/graph"
            style={{
              padding: '11px 22px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              color: '#d8c7ff',
              border: '1px solid rgba(168,85,247,0.35)',
              background: 'rgba(168,85,247,0.08)',
            }}
          >
            Open Knowledge Graph
          </Link>
        </div>
      </div>
    </main>
  )
}
