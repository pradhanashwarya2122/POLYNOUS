import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { API_BASE_URL } from '../config'

// ═══════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════
const T = {
  bg: '#0a0a1e',
  surface: 'rgba(10,8,28,0.85)',
  border: 'rgba(255,255,255,0.08)',
  borderHover: 'rgba(168,85,247,0.4)',
  purple: '#a855f7',
  purpleDim: 'rgba(168,85,247,0.15)',
  green: '#00ff0f',
  red: '#ff2040',
  cyan: '#00ccff',
  orange: '#e06c45',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.45)',
  textDim: 'rgba(255,255,255,0.25)',
  fontHead: "'Sora', 'Inter', sans-serif",
  fontBody: "'Inter', 'Hanken Grotesk', sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
}

// ═══════════════════════════════════════════════════
// COLORS + LABELS MAP
// ═══════════════════════════════════════════════════
const NODE_HEX = {
  claim: 0x00ff0f, evidence: 0x00ccff, argument: 0xff2040,
  topic: 0xe06c45, debate_topic: 0xff2040, concept: 0xa855f7,
  entity: 0x1dab82, major: 0x00ff0f, debate: 0xff2040,
  core: 0xa855f7, default: 0x5878d4
}
const NODE_CSS = {
  claim: '#00ff0f', evidence: '#00ccff', argument: '#ff2040',
  topic: '#e06c45', debate_topic: '#ff2040', concept: '#a855f7',
  entity: '#1dab82', major: '#00ff0f', debate: '#ff2040',
  core: '#a855f7', default: '#5878d4'
}
const NODE_ICON = {
  claim: '◈', evidence: '◆', argument: '▲',
  topic: '⬟', debate_topic: '◉', concept: '✦',
  entity: '⬡', major: '★', core: '❋', default: '●'
}
const NODE_LABELS = {
  claim: 'Claim', evidence: 'Evidence', argument: 'Argument',
  topic: 'Topic', debate_topic: 'Debate', concept: 'Concept',
  entity: 'Entity', major: 'Major Topic', core: 'Core Concept'
}

function nodeColor(type) {
  return NODE_CSS[type] || NODE_CSS.default
}
function nodeHex(type) {
  return NODE_HEX[type] || NODE_HEX.default
}

// Louvain community palette (mirrors the 2D graph) for colour-by-community.
const COMMUNITY_HEX = [0xa855f7, 0x22d3ee, 0xf59e0b, 0x4499ff, 0xff2d78, 0x34d399, 0xf5d442]
const COMMUNITY_CSS = ['#a855f7', '#22d3ee', '#f59e0b', '#4499ff', '#ff2d78', '#34d399', '#f5d442']

// ═══════════════════════════════════════════════════
// HELPER: Icon
// ═══════════════════════════════════════════════════
function Icon({ name, size = 18, style = {} }) {
  return (
    <span style={{
      fontFamily: 'Material Symbols Outlined',
      fontVariationSettings: "'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24",
      fontSize: size, lineHeight: 1, display: 'inline-flex',
      alignItems: 'center', ...style
    }}>{name}</span>
  )
}

// ═══════════════════════════════════════════════════
// HELPER: Synapse dots
// ═══════════════════════════════════════════════════
function SynapseDots({ color = T.purple, size = 4 }) {
  const dot = { width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }
  return (
    <>
      <span style={{ ...dot, position: 'absolute', top: 6, left: 6 }} />
      <span style={{ ...dot, position: 'absolute', top: 6, right: 6 }} />
      <span style={{ ...dot, position: 'absolute', bottom: 6, left: 6 }} />
      <span style={{ ...dot, position: 'absolute', bottom: 6, right: 6 }} />
    </>
  )
}

// ═══════════════════════════════════════════════════
// HELPER: Glassmorphic Panel
// ═══════════════════════════════════════════════════
function GlassPanel({ children, style = {}, accentColor = T.purple }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid rgba(${hexToRgb(accentColor)},0.2)`,
      borderRadius: 16,
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      position: 'relative',
      overflow: 'hidden',
      ...style
    }}>
      <SynapseDots color={accentColor} />
      {children}
    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

// ═══════════════════════════════════════════════════
// HELPER: Pill Button
// ═══════════════════════════════════════════════════
function PillButton({ children, active, onClick, color = T.purple, style = {} }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px 14px',
        borderRadius: 25,
        border: `1px solid ${active || hovered ? `rgba(${hexToRgb(color)},0.5)` : T.border}`,
        background: active ? `rgba(${hexToRgb(color)},0.2)` : hovered ? `rgba(${hexToRgb(color)},0.1)` : 'rgba(10,10,30,0.6)',
        color: active || hovered ? T.text : T.textMuted,
        cursor: 'pointer',
        fontSize: 10,
        fontFamily: T.fontMono,
        display: 'flex', alignItems: 'center', gap: 5,
        transition: 'all 0.2s ease',
        boxShadow: active ? `0 0 12px rgba(${hexToRgb(color)},0.3)` : 'none',
        ...style
      }}
    >
      {children}
    </button>
  )
}

// ═══════════════════════════════════════════════════
// HELPER: Stat Row
// ═══════════════════════════════════════════════════
function StatRow({ label, value, color = T.purple }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: 10, color: T.textMuted, fontFamily: T.fontMono }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: T.fontMono }}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════
// DEMO DATA (fallback if no API)
// ═══════════════════════════════════════════════════
function generateDemoData() {
  const types = ['claim', 'evidence', 'argument', 'topic', 'concept', 'entity', 'core']
  const labels = [
    'AI reduces medical errors by 30%', 'Federated Learning Privacy', 'Neural Network Efficiency',
    'Quantum Computing Supremacy', 'Ethics in Autonomous Systems', 'Climate Models Accuracy',
    'Protein Folding Breakthrough', 'Dark Matter Hypothesis', 'CRISPR Gene Editing',
    'Blockchain Decentralization', 'Consciousness & AI', 'Multimodal Learning',
    'Transformer Architecture', 'Reinforcement from Feedback', 'Emergent Capabilities',
    'Interpretability Research', 'Safety Alignment Methods', 'Scalable Oversight',
    'Constitutional AI', 'Red-Teaming Defenses', 'Debate as Amplification',
    'Recursive Reward Modeling', 'Mesa-Optimization Risk', 'Corrigibility Constraints',
    'Value Lock-in Problem', 'Existential Risk Analysis', 'Tool vs Agent AI',
    'Human-AI Collaboration', 'Cognitive Architecture', 'Semantic Compression',
    'Attention Is All You Need', 'Sparse Mixture of Experts', 'In-Context Learning',
    'Prompt Injection Defense', 'Watermarking LLMs', 'Model Cards Transparency',
    'Benchmark Contamination', 'Few-Shot Generalization', 'Chain-of-Thought Prompting',
    'Tree of Thought Reasoning', 'RAG vs Fine-Tuning', 'LLM Hallucination Causes',
    'Calibration and Confidence', 'Uncertainty Quantification', 'Adversarial Robustness',
    'Distributional Shift', 'Continual Learning', 'Lifelong Memory Systems'
  ]
  const nodes = labels.map((label, i) => ({
    id: `n${i}`,
    label,
    type: types[i % types.length],
    size: 12 + Math.random() * 20,
    confidence: Math.floor(60 + Math.random() * 40),
    score: parseFloat((5 + Math.random() * 5).toFixed(1)),
    connections: Math.floor(1 + Math.random() * 15),
    created: `${Math.floor(Math.random() * 24) + 1}h ago`,
    source: ['Research Mode', 'Debate Mode', 'Manual Entry', 'Inference'][Math.floor(Math.random() * 4)]
  }))
  const edges = []
  for (let i = 0; i < 80; i++) {
    const a = Math.floor(Math.random() * nodes.length)
    const b = Math.floor(Math.random() * nodes.length)
    if (a !== b) {
      edges.push({
        source: nodes[a].id, target: nodes[b].id,
        weight: parseFloat((0.2 + Math.random() * 0.8).toFixed(2)),
        label: ['supports', 'contradicts', 'extends', 'cites', 'refutes'][Math.floor(Math.random() * 5)]
      })
    }
  }
  return { nodes, edges }
}

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function KnowledgeGraph3D({ graphData: initialData, onSwitchTo2D }) {
  // ✅ FIX 1: Add Token Helper Inside Component
  const getAuthHeaders = () => {
    const token = window.__POLYNOUS_ACCESS_TOKEN__ || 
                  localStorage.getItem('polynous_token') || '';
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  // Three.js refs
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const animRef = useRef(null)
  const clockRef = useRef(new THREE.Clock())
  const spheresRef = useRef([])
  const edgesRef = useRef([])
  const particleSystemsRef = useRef([])
  const starFieldRef = useRef(null)
  const shootingStarsRef = useRef([])
  const orbitGroupsRef = useRef([])

  // Camera state
  const camStateRef = useRef({ theta: 0, phi: 0.3, radius: 380, target: new THREE.Vector3() })
  const dragRef = useRef({ active: false, prev: { x: 0, y: 0 }, mode: 'orbit' })
  const autoRotateRef = useRef(true)
  const autoRotateTimerRef = useRef(null)

  // Node physics
  const physicsRef = useRef({ positions: [], velocities: [], active: false })

  // UI state
  const [graphData, setGraphData] = useState(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [filter, setFilter] = useState('all')
  const [autoRotate, setAutoRotate] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showTimeline, setShowTimeline] = useState(false)
  const [detailPanel, setDetailPanel] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [fps, setFps] = useState(60)
  const [viewMode, setViewMode] = useState('Orbit')
  const [pinnedNodes, setPinnedNodes] = useState(new Set())
  const [pathStart, setPathStart] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [highlightedPath, setHighlightedPath] = useState(null)
  const [entranceProgress, setEntranceProgress] = useState(0)
  const [clusterMode, setClusterMode] = useState(false)
  const [nodeDetailCache, setNodeDetailCache] = useState({})
  const [loadingDetail, setLoadingDetail] = useState(false)
  // Graph-ML parity with the 2D view: PageRank sizing, Louvain colouring, bridges.
  const [nodeMetrics, setNodeMetrics] = useState({})      // label -> {pagerank, betweenness, community}
  const [bridgeSet, setBridgeSet] = useState(new Set())   // high-betweenness concept names
  const [sizeByPageRank, setSizeByPageRank] = useState(true)
  const [colorByCommunity, setColorByCommunity] = useState(true)
  const [showExplain, setShowExplain] = useState(false)

  // ✅ FIX 6: Demo data indicator
  const [isDemoData, setIsDemoData] = useState(false)

  // ─────────────────────────────────────────
  // API helpers
  // ─────────────────────────────────────────
  const API = `${API_BASE_URL}/knowledge`

  async function fetchNodeDetail(id) {
    try {
      // ✅ FIX 5: Updated fetchNodeDetail with headers
      const res = await fetch(`${API}/node/${id}`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('not ok')
      return await res.json()
    } catch {
      return null
    }
  }

  async function fetchConnections(entity1, entity2) {
    try {
      // ✅ FIX 5: Updated fetchConnections with headers
      const params = new URLSearchParams({ entity1, entity2 })
      const res = await fetch(`${API}/connections?${params}`, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error('not ok')
      return await res.json()  // { paths: [...] }
    } catch {
      return null
    }
  }

  // ─────────────────────────────────────────
  // Load data
  // ─────────────────────────────────────────
  useEffect(() => {
    // ✅ FIX 2: Updated initial data load with auth headers and demo data flag
    if (initialData?.nodes?.length) { setGraphData(initialData); setLoading(false) }
    else {
      // Prefer the concept graph (where PageRank/Louvain/bridges are meaningful);
      // fall back to the rich graph, then to demo data.
      fetch(`${API_BASE_URL}/knowledge/graph`, { headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => {
          if (d?.nodes?.length) { setGraphData(d); setLoading(false) }
          else return Promise.reject()
        })
        .catch(() =>
          fetch(`${API_BASE_URL}/knowledge/rich-graph`, { headers: getAuthHeaders() })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(d => { setGraphData(d); setLoading(false) })
            .catch(() => { setGraphData(generateDemoData()); setLoading(false); setIsDemoData(true) })
        )
    }
    // Graph-ML metrics for size/colour parity with the 2D view.
    fetch(`${API_BASE_URL}/knowledge/graph-metrics`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(m => {
        if (m?.nodes) setNodeMetrics(m.nodes)
        if (m?.summary?.bridge_concepts) setBridgeSet(new Set(m.summary.bridge_concepts.map(b => b.name)))
      })
      .catch(() => {})
  }, [])

  // ─────────────────────────────────────────
  // Initialize Three.js scene
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const W = container.clientWidth || window.innerWidth
    const H = container.clientHeight || window.innerHeight

    // Scene
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x08060f, 0.00045)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(55, W / H, 1, 3000)
    camera.position.set(0, 120, 380)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── LIGHTING (studio 3-point + hemisphere, tuned for PBR) ──
    // Soft base ambience — low, so the physically-based spheres keep form.
    scene.add(new THREE.AmbientLight(0x141024, 1.4))
    // Hemisphere: violet sky / deep-plum ground for natural, premium shading.
    scene.add(new THREE.HemisphereLight(0x8b5cf6, 0x120a24, 1.1))
    // Key light (top-right, soft warm) — sculpts highlights.
    const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.5)
    keyLight.position.set(200, 320, 220)
    keyLight.castShadow = true
    scene.add(keyLight)
    // Fill light (left, brand purple).
    const fillLight = new THREE.PointLight(0x8b5cf6, 140, 1400)
    fillLight.position.set(-260, 110, 260)
    scene.add(fillLight)
    // Rim light (back, cool violet) — separates nodes from the fog.
    const rimLight = new THREE.PointLight(0x7c5cff, 90, 1100)
    rimLight.position.set(0, -220, -320)
    scene.add(rimLight)
    // Volume light from top for depth.
    const volLight = new THREE.SpotLight(0xa855f7, 220, 900, Math.PI / 4, 0.6, 1.5)
    volLight.position.set(0, 420, 0)
    volLight.target.position.set(0, 0, 0)
    scene.add(volLight); scene.add(volLight.target)
    // Dynamic accent lights (animated) — kept within the purple family for cohesion.
    const accentA = new THREE.PointLight(0xc084fc, 55, 650)
    accentA.position.set(150, -80, 100)
    scene.add(accentA)
    const accentB = new THREE.PointLight(0x6d5cff, 45, 550)
    accentB.position.set(-150, 80, -100)
    scene.add(accentB)
    scene.userData.lights = { fill: fillLight, rim: rimLight, accentA, accentB }

    // ── STARFIELD (spiral galaxy) ──
    buildStarfield(scene)

    // ── GRID BASE ──
    const gridGeo = new THREE.TorusGeometry(220, 0.4, 16, 128)
    const gridMesh = new THREE.Mesh(gridGeo, new THREE.MeshBasicMaterial({ color: 0x223344, transparent: true, opacity: 0.15 }))
    gridMesh.rotation.x = Math.PI / 2
    scene.add(gridMesh)
    // Inner ring
    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(80, 0.3, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.1 })
    )
    innerRing.rotation.x = Math.PI / 2
    scene.add(innerRing)

    // ── INPUT EVENTS ──
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points.threshold = 2
    const mouse = new THREE.Vector2()

    function toNDC(clientX, clientY) {
      const rect = container.getBoundingClientRect()
      return {
        x: ((clientX - rect.left) / rect.width) * 2 - 1,
        y: -((clientY - rect.top) / rect.height) * 2 + 1
      }
    }

    function hitTest(clientX, clientY) {
      const ndc = toNDC(clientX, clientY)
      mouse.set(ndc.x, ndc.y)
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(spheresRef.current.map(s => s.mesh))
      return hits.length > 0 ? hits[0].object.userData.node : null
    }

    const onPointerDown = (e) => {
      if (e.button === 1) { dragRef.current.mode = 'pan'; e.preventDefault() }
      else dragRef.current.mode = 'orbit'
      dragRef.current.active = true
      dragRef.current.prev = { x: e.clientX, y: e.clientY }
      dragRef.current.moved = false
      setContextMenu(null)
    }

    const onPointerUp = (e) => {
      if (!dragRef.current.moved) {
        const hit = hitTest(e.clientX, e.clientY)
        if (e.button === 2) {
          if (hit) setContextMenu({ node: hit, x: e.clientX, y: e.clientY })
        } else {
          if (hit) {
            setSelectedNode(hit)
            setDetailPanel(hit)
            animateCameraToNode(hit)
            // ✅ FIX 3: Fetch enriched node data from API with auth headers
            setLoadingDetail(true)
            fetch(`${API_BASE_URL}/knowledge/node/${hit.id}`, { headers: getAuthHeaders() })
              .then(r => r.ok ? r.json() : null)
              .then(data => {
                if (data) setNodeDetailCache(prev => ({ ...prev, [hit.id]: data }))
              })
              .catch(() => {})
              .finally(() => setLoadingDetail(false))
          } else {
            setSelectedNode(null)
            setDetailPanel(null)
          }
        }
      }
      dragRef.current.active = false
    }

    const onPointerMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY })
      if (dragRef.current.active) {
        const dx = e.clientX - dragRef.current.prev.x
        const dy = e.clientY - dragRef.current.prev.y
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true
        if (dragRef.current.mode === 'orbit') {
          camStateRef.current.theta -= dx * 0.005
          camStateRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, camStateRef.current.phi + dy * 0.005))
        } else {
          // Pan
          const right = new THREE.Vector3().crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize()
          const up = camera.up.clone()
          camStateRef.current.target.addScaledVector(right, -dx * 0.4)
          camStateRef.current.target.addScaledVector(up, dy * 0.4)
        }
        dragRef.current.prev = { x: e.clientX, y: e.clientY }
        // Pause auto-rotate on drag
        autoRotateRef.current = false
        setAutoRotate(false)
        clearTimeout(autoRotateTimerRef.current)
        autoRotateTimerRef.current = setTimeout(() => { autoRotateRef.current = true; setAutoRotate(true) }, 4000)
      }
      // Hover detection
      const hit = hitTest(e.clientX, e.clientY)
      setHoveredNode(hit || null)
    }

    const onWheel = (e) => {
      e.preventDefault()
      camStateRef.current.radius = Math.max(80, Math.min(900, camStateRef.current.radius + e.deltaY * 0.8))
    }

    const onDblClick = () => {
      // Reset camera
      camStateRef.current = { theta: 0, phi: 0.3, radius: 380, target: new THREE.Vector3() }
      setSelectedNode(null); setDetailPanel(null)
    }

    const onContextMenu = (e) => { e.preventDefault() }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { setSelectedNode(null); setDetailPanel(null); setContextMenu(null) }
    }

    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointerup', onPointerUp)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('dblclick', onDblClick)
    container.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('keydown', onKeyDown)

    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight
      camera.aspect = w / h; camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    setReady(true)

    return () => {
      cancelAnimationFrame(animRef.current)
      clearTimeout(autoRotateTimerRef.current)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('wheel', onWheel)
      container.removeEventListener('dblclick', onDblClick)
      container.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  // ─────────────────────────────────────────
  // Build star field
  // ─────────────────────────────────────────
  function buildStarfield(scene) {
    // Galaxy spiral
    const count = 2500
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const arm = Math.floor(Math.random() * 3) // 3 arms
      const t = Math.random()
      const angle = t * Math.PI * 8 + (arm * Math.PI * 2) / 3
      const radius = 150 + t * 600 + (Math.random() - 0.5) * 80
      const spread = (1 - t) * 30 + 5

      positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.4
      positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * spread

      // Color gradient: center = warm, outer = cool
      const warmCool = t
      colors[i * 3] = 0.3 + warmCool * 0.4   // R
      colors[i * 3 + 1] = 0.1 + warmCool * 0.3 // G
      colors[i * 3 + 2] = 0.6 + warmCool * 0.4 // B

      sizes[i] = 0.5 + Math.random() * 2.5
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

    const mat = new THREE.PointsMaterial({
      size: 1.5, vertexColors: true, transparent: true, opacity: 0.7,
      sizeAttenuation: false, blending: THREE.AdditiveBlending, depthWrite: false
    })

    const stars = new THREE.Points(geo, mat)
    stars.userData.isStarfield = true
    scene.add(stars)
    starFieldRef.current = stars

    // Nebula cloud (large faint sphere of random points)
    const nebGeo = new THREE.BufferGeometry()
    const nebPos = new Float32Array(500 * 3)
    for (let i = 0; i < 500; i++) {
      const r = 400 + Math.random() * 300
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      nebPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      nebPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.3
      nebPos[i * 3 + 2] = r * Math.cos(phi)
    }
    nebGeo.setAttribute('position', new THREE.Float32BufferAttribute(nebPos, 3))
    scene.add(new THREE.Points(nebGeo, new THREE.PointsMaterial({
      color: 0x6622aa, size: 3, transparent: true, opacity: 0.12,
      blending: THREE.AdditiveBlending, depthWrite: false
    })))
  }

  // ─────────────────────────────────────────
  // Build graph objects
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current || !ready || !graphData?.nodes?.length) return
    const scene = sceneRef.current

    // Clear old
    spheresRef.current.forEach(s => {
      scene.remove(s.group)
      s.group.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose() })
    })
    edgesRef.current.forEach(e => { scene.remove(e.line); e.line.geometry.dispose(); e.line.material.dispose() })
    particleSystemsRef.current.forEach(p => { scene.remove(p); p.geometry.dispose(); p.material.dispose() })
    spheresRef.current = []; edgesRef.current = []; particleSystemsRef.current = []

    const filtered = filter === 'all' ? graphData.nodes : graphData.nodes.filter(n => n.type === filter)
    const nodeMap = {}

    // ── BUILD NODES ──
    filtered.forEach((node, i) => {
      // Graph-ML parity: colour by Louvain community, size by PageRank influence.
      const gm = nodeMetrics[node.label]
      const hex = (colorByCommunity && gm && typeof gm.community === 'number')
        ? COMMUNITY_HEX[gm.community % COMMUNITY_HEX.length]
        : nodeHex(node.type)
      const baseSize = Math.max(5, Math.min(20, (node.size || 14) * 0.45))
      const size = (sizeByPageRank && gm && typeof gm.pagerank === 'number')
        ? 6 + Math.min(1, gm.pagerank) * 15
        : baseSize
      const isBridge = bridgeSet.has(node.label)
      const group = new THREE.Group()

      // Fibonacci sphere layout
      const t = i / Math.max(filtered.length - 1, 1)
      const phi = Math.acos(-1 + 2 * t)
      const theta = Math.sqrt(filtered.length * Math.PI) * phi
      const r = 130 + Math.random() * 60
      const targetPos = new THREE.Vector3(
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi) * 0.65,
        r * Math.cos(phi)
      )
      // Start from random (entrance animation)
      const startPos = new THREE.Vector3(
        (Math.random() - 0.5) * 800,
        (Math.random() - 0.5) * 800,
        (Math.random() - 0.5) * 800
      )
      group.position.copy(startPos)
      group.userData.targetPos = targetPos
      group.userData.startPos = startPos
      group.userData.entranceDelay = i * 0.04

      // Core sphere — physically-based glossy material (premium, not "glow blob").
      const geo = new THREE.SphereGeometry(size, 48, 48)
      const mat = new THREE.MeshStandardMaterial({
        color: hex, emissive: hex, emissiveIntensity: isBridge ? 0.5 : 0.3,
        metalness: 0.38, roughness: 0.26, transparent: true, opacity: 0.97
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.userData.node = node
      mesh.castShadow = true
      group.add(mesh)

      // Inner bright core (small sphere)
      const coreGeo = new THREE.SphereGeometry(size * 0.45, 16, 16)
      const coreMat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.9 })
      group.add(new THREE.Mesh(coreGeo, coreMat))

      // Bridge concept (high betweenness): a crisp cyan halo ring so the ideas
      // that connect separate clusters stand out in 3D too.
      if (isBridge) {
        const bGeo = new THREE.TorusGeometry(size + 3.5, 0.6, 10, 40)
        const bMat = new THREE.MeshBasicMaterial({ color: 0x38e8ff, transparent: true, opacity: 0.85, depthWrite: false })
        const bRing = new THREE.Mesh(bGeo, bMat)
        bRing.userData.isBridgeRing = true
        group.add(bRing)
      }

      // Outer glow ring (pulsing)
      const importance = (node.connections || 3) / 15
      const glowRings = Math.min(3, Math.ceil(importance * 3 + 1))
      for (let r = 0; r < glowRings; r++) {
        const ringGeo = new THREE.TorusGeometry(size + 2 + r * 1.5, 0.35 - r * 0.08, 8, 32)
        const ringMat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.25 - r * 0.06, depthWrite: false })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.userData.isGlowRing = true; ring.userData.ringIndex = r
        group.add(ring)
      }

      // Orbiting particles (1-3 per important node)
      const numOrbiters = Math.min(3, Math.ceil((node.connections || 1) / 5))
      for (let o = 0; o < numOrbiters; o++) {
        const orbitRadius = size + 4 + o * 2.5
        const orbitSpeed = 0.8 + o * 0.4 + Math.random() * 0.3
        const orbitGroup = new THREE.Group()
        const orbGeo = new THREE.SphereGeometry(0.6, 8, 8)
        const orbMat = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.8 })
        const orb = new THREE.Mesh(orbGeo, orbMat)
        orb.position.x = orbitRadius
        orbitGroup.add(orb)
        // Orbit tilt
        orbitGroup.rotation.x = (Math.random() - 0.5) * Math.PI
        orbitGroup.rotation.z = (Math.random() - 0.5) * Math.PI
        orbitGroup.userData.speed = orbitSpeed
        orbitGroup.userData.isOrbiter = true
        group.add(orbitGroup)
      }

      group.userData.node = node
      group.userData.baseScale = 1
      group.userData.breathePhase = Math.random() * Math.PI * 2
      nodeMap[node.id] = group
      spheresRef.current.push({ group, mesh, node })
      scene.add(group)
    })

    // ── BUILD EDGES (curved bezier) ──
    const fIds = new Set(filtered.map(n => n.id))
    ;(graphData.edges || []).filter(e => fIds.has(e.source) && fIds.has(e.target)).slice(0, 200).forEach((edge, idx) => {
      const srcGroup = nodeMap[edge.source]
      const tgtGroup = nodeMap[edge.target]
      if (!srcGroup || !tgtGroup) return

      const src = srcGroup.userData.targetPos
      const tgt = tgtGroup.userData.targetPos

      // Cubic bezier control points (arcing upward)
      const mid = src.clone().add(tgt).multiplyScalar(0.5)
      const dist = src.distanceTo(tgt)
      mid.y += dist * 0.2 + Math.random() * 20
      const ctrl1 = src.clone().lerp(mid, 0.5).add(new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20))
      const ctrl2 = tgt.clone().lerp(mid, 0.5).add(new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20))

      const curve = new THREE.CubicBezierCurve3(src, ctrl1, ctrl2, tgt)
      const pts = curve.getPoints(30)
      const geo = new THREE.BufferGeometry().setFromPoints(pts)

      const srcColor = new THREE.Color(nodeHex(srcGroup.userData.node.type))
      const tgtColor = new THREE.Color(nodeHex(tgtGroup.userData.node.type))
      const edgeColor = srcColor.lerp(tgtColor, 0.5)

      const weight = edge.weight || 0.5
      const mat = new THREE.LineBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: 0.18 + weight * 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
      const line = new THREE.Line(geo, mat)
      line.userData.edge = edge
      line.userData.srcGroup = srcGroup
      line.userData.tgtGroup = tgtGroup
      line.userData.curve = curve

      edgesRef.current.push({ line, edge, curve, srcGroup, tgtGroup })
      scene.add(line)

      // Flowing particle along edge
      if (idx < 60) {
        const pGeo = new THREE.SphereGeometry(0.7, 6, 6)
        const pMat = new THREE.MeshBasicMaterial({
          color: edgeColor,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
        const particle = new THREE.Mesh(pGeo, pMat)
        particle.userData.curve = curve
        particle.userData.progress = Math.random()
        particle.userData.speed = 0.15 + Math.random() * 0.25
        particleSystemsRef.current.push(particle)
        scene.add(particle)
      }
    })

    // Physics init
    const positions = filtered.map((_, i) => {
      const t = i / Math.max(filtered.length - 1, 1)
      const phi = Math.acos(-1 + 2 * t)
      const theta = Math.sqrt(filtered.length * Math.PI) * phi
      const r = 130 + Math.random() * 60
      return new THREE.Vector3(
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi) * 0.65,
        r * Math.cos(phi)
      )
    })
    physicsRef.current.positions = positions
    physicsRef.current.velocities = positions.map(() => new THREE.Vector3())

  }, [graphData, filter, ready, nodeMetrics, bridgeSet, sizeByPageRank, colorByCommunity])

  // ─────────────────────────────────────────
  // Animate camera to node
  // ─────────────────────────────────────────
  function animateCameraToNode(node) {
    const nodeObj = spheresRef.current.find(s => s.node.id === node.id)
    if (!nodeObj) return
    const targetPos = nodeObj.group.position
    const startTheta = camStateRef.current.theta
    const startRadius = camStateRef.current.radius
    const startPhi = camStateRef.current.phi
    const angle = Math.atan2(targetPos.x, targetPos.z)
    const dist = targetPos.length()
    const tEnd = 60
    let frame = 0
    const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

    const step = () => {
      const t = ease(Math.min(frame++ / tEnd, 1))
      camStateRef.current.theta = startTheta + (angle - startTheta) * t
      camStateRef.current.radius = startRadius + (Math.max(100, dist + 60) - startRadius) * t
      camStateRef.current.phi = startPhi + (0.4 - startPhi) * t
      if (frame < tEnd) requestAnimationFrame(step)
    }
    step()
  }

  // ─────────────────────────────────────────
  // Find shortest path (BFS)
  // ─────────────────────────────────────────
  function findPath(startId, endId) {
    if (!graphData) return null
    const adj = {}
    graphData.edges.forEach(e => {
      if (!adj[e.source]) adj[e.source] = []
      if (!adj[e.target]) adj[e.target] = []
      adj[e.source].push(e.target)
      adj[e.target].push(e.source)
    })
    const queue = [[startId]], visited = new Set([startId])
    while (queue.length) {
      const path = queue.shift()
      const cur = path[path.length - 1]
      if (cur === endId) return path
      for (const nb of (adj[cur] || [])) {
        if (!visited.has(nb)) { visited.add(nb); queue.push([...path, nb]) }
      }
    }
    return null
  }

  // ─────────────────────────────────────────
  // Main animation loop
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!ready || !rendererRef.current) return
    const renderer = rendererRef.current
    const scene = sceneRef.current
    let frameCount = 0, lastFPSTime = performance.now(), fpsAccum = 0

    const animate = () => {
      animRef.current = requestAnimationFrame(animate)
      const elapsed = clockRef.current.getElapsedTime()
      const delta = clockRef.current.getDelta ? 0.016 : 0.016

      // FPS
      frameCount++
      const now = performance.now()
      if (now - lastFPSTime > 500) {
        setFps(Math.round(frameCount * 1000 / (now - lastFPSTime)))
        frameCount = 0; lastFPSTime = now
      }

      // Auto-rotate camera
      if (autoRotateRef.current) {
        camStateRef.current.theta += 0.0006
      }

      // Galaxy rotation
      if (starFieldRef.current) {
        starFieldRef.current.rotation.y = elapsed * 0.015
      }

      // Shooting star (every ~7s)
      if (Math.random() < 0.002 && shootingStarsRef.current.length < 3) {
        spawnShootingStar(scene)
      }
      updateShootingStars(elapsed)

      // Update camera position (spherical)
      const { theta, phi, radius, target } = camStateRef.current
      if (cameraRef.current) {
        cameraRef.current.position.set(
          target.x + radius * Math.sin(phi) * Math.sin(theta),
          target.y + radius * Math.cos(phi),
          target.z + radius * Math.sin(phi) * Math.cos(theta)
        )
        cameraRef.current.lookAt(target)
      }

      // Color temperature cycle (warm→cool, 30s period)
      const tempPhase = (Math.sin(elapsed * 0.033) + 1) / 2
      if (scene.userData.lights) {
        const { fill, rim, accentA, accentB } = scene.userData.lights
        fill.intensity = 300 + tempPhase * 150
        rim.intensity = 150 + (1 - tempPhase) * 100
      }

      // Node animations
      const selectedId = selectedNode?.id
      const hoveredId = hoveredNode?.id
      const pathSet = highlightedPath ? new Set(highlightedPath) : null

      spheresRef.current.forEach(({ group, mesh, node }, idx) => {
        // Entrance animation
        const prog = Math.max(0, Math.min(1, (elapsed - group.userData.entranceDelay) / 1.2))
        if (prog < 1) {
          const ease = 1 - Math.pow(1 - prog, 3) // cubic ease-out
          group.position.lerpVectors(group.userData.startPos, group.userData.targetPos, ease)
        } else {
          group.position.copy(group.userData.targetPos)
        }

        // Breathing animation
        const breathe = 1 + Math.sin(elapsed * 1.5 + group.userData.breathePhase) * 0.025
        let targetScale = breathe

        const isSelected = node.id === selectedId
        const isHovered = node.id === hoveredId
        const isInPath = pathSet?.has(node.id)
        const isPinned = pinnedNodes.has(node.id)

        if (isSelected || isPinned) {
          targetScale = breathe * 1.4
          mesh.material.emissiveIntensity = 1.2
        } else if (isHovered) {
          targetScale = breathe * 1.5
          mesh.material.emissiveIntensity = 1.0
        } else if (selectedId && !isSelected && !isPinned) {
          // Check if connected to selected
          const isConnected = graphData?.edges?.some(e =>
            (e.source === selectedId && e.target === node.id) ||
            (e.target === selectedId && e.source === node.id)
          )
          if (isConnected) {
            targetScale = breathe * 1.1
            mesh.material.emissiveIntensity = 0.7
            mesh.material.opacity = 0.95
          } else {
            targetScale = breathe * 0.8
            mesh.material.emissiveIntensity = 0.15
            mesh.material.opacity = 0.2
          }
        } else if (isInPath) {
          targetScale = breathe * 1.3
          mesh.material.emissiveIntensity = 1.5
          mesh.material.color.setHex(0xffd700)
          mesh.material.emissive.setHex(0xffd700)
        } else {
          mesh.material.emissiveIntensity = 0.6
          mesh.material.opacity = 0.92
          if (!isInPath) {
            mesh.material.color.setHex(nodeHex(node.type))
            mesh.material.emissive.setHex(nodeHex(node.type))
          }
        }

        // Scale lerp
        group.userData.baseScale = group.userData.baseScale || 1
        group.userData.baseScale += (targetScale - group.userData.baseScale) * 0.12
        group.scale.setScalar(group.userData.baseScale)

        // Selected node: golden rotating ring
        if (isSelected || isPinned) {
          group.children.forEach(child => {
            if (child.userData.isGlowRing) {
              child.rotation.x = elapsed * (1 + child.userData.ringIndex * 0.5)
              child.rotation.z = elapsed * (-0.7 - child.userData.ringIndex * 0.3)
              child.material.opacity = 0.4 + Math.sin(elapsed * 3) * 0.2
            }
          })
        } else {
          group.children.forEach(child => {
            if (child.userData.isGlowRing) {
              child.rotation.x += 0.015 * (1 + child.userData.ringIndex * 0.3)
              child.rotation.y += 0.02
            }
          })
        }

        // Orbiting particles
        group.children.forEach(child => {
          if (child.userData.isOrbiter) {
            const speed = isHovered ? child.userData.speed * 2.5 : child.userData.speed
            child.rotation.y += speed * 0.04
          }
        })
      })

      // Animate edge particles
      particleSystemsRef.current.forEach(p => {
        p.userData.progress = (p.userData.progress + p.userData.speed * 0.008) % 1
        const pos = p.userData.curve.getPoint(p.userData.progress)
        p.position.copy(pos)
      })

      // Edge fade based on selection
      edgesRef.current.forEach(({ line, edge, srcGroup, tgtGroup }) => {
        const srcId = srcGroup.userData.node?.id
        const tgtId = tgtGroup.userData.node?.id
        if (selectedId) {
          const connected = srcId === selectedId || tgtId === selectedId
          line.material.opacity = connected ? 0.55 : 0.05
        } else if (pathSet) {
          const inPath = pathSet.has(srcId) && pathSet.has(tgtId)
          if (inPath) {
            line.material.opacity = 0.9
            line.material.color.setHex(0xffd700)
          } else {
            line.material.opacity = 0.05
          }
        } else {
          const weight = edge.weight || 0.5
          line.material.opacity = 0.18 + weight * 0.15
        }
      })

      renderer.render(scene, cameraRef.current)
    }

    animate()
    return () => cancelAnimationFrame(animRef.current)
  }, [ready, selectedNode, hoveredNode, highlightedPath, pinnedNodes, graphData])

  // ─────────────────────────────────────────
  // Shooting stars
  // ─────────────────────────────────────────
  function spawnShootingStar(scene) {
    const start = new THREE.Vector3(
      (Math.random() - 0.5) * 1000,
      100 + Math.random() * 200,
      (Math.random() - 0.5) * 1000
    )
    const end = start.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 300,
      -50 - Math.random() * 100,
      (Math.random() - 0.5) * 300
    ))
    const pts = []
    for (let i = 0; i <= 12; i++) pts.push(start.clone().lerp(end, i / 12))
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({
      color: 0xaaddff, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    const star = new THREE.Line(geo, mat)
    star.userData.life = 0; star.userData.maxLife = 60
    scene.add(star)
    shootingStarsRef.current.push(star)
  }

  function updateShootingStars() {
    shootingStarsRef.current = shootingStarsRef.current.filter(star => {
      star.userData.life++
      const t = star.userData.life / star.userData.maxLife
      star.material.opacity = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7
      if (star.userData.life >= star.userData.maxLife) {
        sceneRef.current?.remove(star)
        star.geometry.dispose(); star.material.dispose()
        return false
      }
      return true
    })
  }

  // ─────────────────────────────────────────
  // Sync autoRotate ref
  // ─────────────────────────────────────────
  useEffect(() => { autoRotateRef.current = autoRotate }, [autoRotate])

  // ─────────────────────────────────────────
  // Computed stats
  // ─────────────────────────────────────────
  const stats = (() => {
    if (!graphData) return { nodes: 0, edges: 0, density: 0, types: {} }
    const n = graphData.nodes.length, e = graphData.edges.length
    const maxEdges = n * (n - 1) / 2
    const types = {}
    graphData.nodes.forEach(node => { types[node.type] = (types[node.type] || 0) + 1 })
    return { nodes: n, edges: e, density: maxEdges ? (e / maxEdges).toFixed(3) : 0, types }
  })()

  const topTopics = Object.entries(stats.types).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const filteredNodes = graphData ? (filter === 'all' ? graphData.nodes : graphData.nodes.filter(n => n.type === filter)) : []
  const searchResults = searchQuery.length > 1
    ? filteredNodes.filter(n => n.label?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : []

  const filterTypes = ['all', 'claim', 'evidence', 'argument', 'topic', 'concept', 'entity', 'core']

  const hoveredColor = hoveredNode ? nodeColor(hoveredNode.type) : T.purple

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <div style={{
      width: '100%', height: '100vh',
      background: T.bg, position: 'relative', overflow: 'hidden',
      fontFamily: T.fontBody, cursor: hoveredNode ? 'pointer' : 'default'
    }}
      onClick={() => setContextMenu(null)}
    >
      {/* THREE.JS CANVAS */}
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />

      {/* GRADIENT OVERLAYS */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse at 30% 20%, rgba(168,85,247,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,204,255,0.04) 0%, transparent 60%)'
      }} />

      {/* ───── TOP BAR ───── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        background: 'linear-gradient(180deg, rgba(10,8,28,0.97) 0%, rgba(10,8,28,0.7) 70%, transparent 100%)',
        padding: '14px 20px 36px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
      }}>
        {/* Left: logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {onSwitchTo2D && (
            <PillButton onClick={onSwitchTo2D}>
              <Icon name="view_quilt" size={14} />2D View
            </PillButton>
          )}
          <div>
            <h1 style={{
              margin: 0, fontSize: 17, fontWeight: 800,
              fontFamily: T.fontHead, color: T.text,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #fff 60%, #a855f7)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              . POLYNOUS · Neural Graph
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 9.5, color: T.textMuted, fontFamily: T.fontMono }}>
              {stats.nodes} nodes · {stats.edges} edges · {fps} fps · {viewMode}
            </p>
          </div>
        </div>

        {/* Center: filter pills */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {filterTypes.map(t => (
            <PillButton key={t} active={filter === t} onClick={() => setFilter(t)}>
              {t === 'all' ? 'All' : (NODE_LABELS[t] || t)}
            </PillButton>
          ))}
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {Object.keys(nodeMetrics).length > 0 && (
            <>
              <PillButton active={sizeByPageRank} onClick={() => setSizeByPageRank(v => !v)} color={T.purple}>
                <Icon name="hub" size={13} />PageRank
              </PillButton>
              <PillButton active={colorByCommunity} onClick={() => setColorByCommunity(v => !v)} color="#22d3ee">
                <Icon name="workspaces" size={13} />Communities
              </PillButton>
            </>
          )}
          <PillButton active={autoRotate} onClick={() => setAutoRotate(!autoRotate)}>
            <Icon name={autoRotate ? 'pause' : 'play_arrow'} size={13} />
            {autoRotate ? 'Pause' : 'Rotate'}
          </PillButton>
          <PillButton active={showSidebar} onClick={() => setShowSidebar(!showSidebar)}>
            <Icon name="bar_chart" size={13} />Stats
          </PillButton>
          <PillButton active={showTimeline} onClick={() => setShowTimeline(!showTimeline)}>
            <Icon name="timeline" size={13} />Timeline
          </PillButton>
          <PillButton active={showExplain} onClick={() => setShowExplain(v => !v)} color="#f5d442">
            <Icon name="help" size={13} />?
          </PillButton>
        </div>
      </div>

      {/* Concept explainer — expands on clicking the "?" */}
      {showExplain && (
        <div onClick={() => setShowExplain(false)} style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(4,4,12,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 560, maxWidth: '94vw', maxHeight: '84vh', overflowY: 'auto', background: 'rgba(12,10,22,0.97)', border: '1px solid rgba(168,85,247,0.28)', borderRadius: 18, padding: '22px 24px', boxShadow: '0 40px 90px -30px rgba(0,0,0,0.85)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: T.fontDisplay || T.fontMono, fontWeight: 800, fontSize: 18, color: '#fff' }}>How to read this graph</div>
              <button onClick={() => setShowExplain(false)} style={{ background: 'none', border: 'none', color: '#9a8ab5', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(228,222,245,0.7)', lineHeight: 1.6, marginBottom: 16 }}>
              Every measure below is real graph ML computed on your own knowledge graph — on CPU, no GPU.
            </div>
            {[
              ['#a855f7', 'Node size = PageRank (influence)', 'Bigger nodes are the load-bearing concepts your research keeps returning to. PageRank ranks a concept by how many other important concepts point to it.'],
              ['#22d3ee', 'Node colour = community (auto-topics)', 'The Louvain algorithm groups concepts that cluster tightly together into communities, each given its own colour — your research self-organises into topics.'],
              ['#38e8ff', 'Cyan halo = bridge concept', 'High betweenness centrality: the idea sits on the shortest path between otherwise-separate clusters. These are your insight hotspots — where two topics connect.'],
              ['#34d399', 'Similarity (Jaccard)', 'Two concepts are structurally similar when they share neighbours in the graph, regardless of wording — a topological, not just semantic, match.'],
              ['#f59e0b', 'Edges = typed relations', 'Links are real relationships (ENABLES, PART_OF, SUPPORTS…) extracted from your research, not just co-occurrence.'],
            ].map(([c, title, body]) => (
              <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 13 }}>
                <span style={{ marginTop: 5, width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: c, boxShadow: `0 0 10px ${c}` }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(216,208,236,0.62)', lineHeight: 1.55 }}>{body}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11.5, color: 'rgba(216,208,236,0.5)', lineHeight: 1.6 }}>
              Toggle <b style={{ color: '#c9b6ff' }}>PageRank</b> and <b style={{ color: '#7fe9ff' }}>Communities</b> in the top bar to switch how nodes are sized and coloured. Drag to orbit, scroll to zoom, click a node for detail.
            </div>
          </div>
        </div>
      )}

      {/* ───── LEFT SIDEBAR ───── */}
      <div style={{
        position: 'absolute', top: 80, left: 16, zIndex: 20,
        width: showSidebar ? 210 : 0,
        opacity: showSidebar ? 1 : 0,
        pointerEvents: showSidebar ? 'all' : 'none',
        transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column', gap: 10
      }}>
        {/* Overview */}
        <GlassPanel style={{ padding: '16px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: T.fontHead, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="hub" size={14} style={{ color: T.purple }} />Graph Overview
          </div>
          <StatRow label="Total Nodes" value={stats.nodes} color={T.purple} />
          <StatRow label="Total Edges" value={stats.edges} color={T.cyan} />
          <StatRow label="Density" value={stats.density} color={T.orange} />
          <StatRow label="Active Filter" value={filter === 'all' ? 'All' : (NODE_LABELS[filter] || filter)} color={T.green} />
          {/* ✅ FIX 6: Demo data indicator */}
          {isDemoData && (
            <div style={{ fontSize: 9, color: '#ffaa00', fontFamily: T.fontMono, marginTop: 6, padding: '4px 8px', background: 'rgba(255,170,0,0.1)', borderRadius: 6, border: '1px solid rgba(255,170,0,0.2)' }}>
              ⚠️ Demo data - log in to see your research graph
            </div>
          )}
        </GlassPanel>

        {/* Top Topics */}
        <GlassPanel style={{ padding: '16px 14px' }} accentColor={T.cyan}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: T.fontHead, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="label" size={14} style={{ color: T.cyan }} />Top Types
          </div>
          {topTopics.map(([type, count], i) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer' }}
              onClick={() => setFilter(type)}>
              <span style={{ fontSize: 9, color: T.textMuted, fontFamily: T.fontMono, width: 14 }}>{i + 1}.</span>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: nodeColor(type), flexShrink: 0, boxShadow: `0 0 6px ${nodeColor(type)}` }} />
              <span style={{ fontSize: 10, color: T.text, fontFamily: T.fontMono, flex: 1 }}>{NODE_LABELS[type] || type}</span>
              <span style={{ fontSize: 10, color: nodeColor(type), fontFamily: T.fontMono, fontWeight: 700 }}>{count}</span>
            </div>
          ))}
        </GlassPanel>

        {/* Search */}
        <GlassPanel style={{ padding: '14px' }} accentColor={T.green}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: T.fontHead, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="search" size={14} style={{ color: T.green }} />Search Nodes
          </div>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Type to search..."
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '7px 10px', borderRadius: 10,
              border: `1px solid rgba(0,255,15,0.2)`,
              background: 'rgba(0,0,0,0.4)', color: T.text,
              fontSize: 10, fontFamily: T.fontMono, outline: 'none',
            }}
          />
          {searchResults.map(node => (
            <div key={node.id}
              onClick={() => { setSelectedNode(node); setDetailPanel(node); animateCameraToNode(node) }}
              style={{
                marginTop: 6, padding: '6px 10px', borderRadius: 8,
                background: 'rgba(0,255,15,0.06)', cursor: 'pointer',
                border: '1px solid rgba(0,255,15,0.1)',
                display: 'flex', alignItems: 'center', gap: 6
              }}>
              <span style={{ color: nodeColor(node.type), fontSize: 9 }}>●</span>
              <span style={{ fontSize: 9.5, color: T.text, fontFamily: T.fontMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.label}</span>
            </div>
          ))}
        </GlassPanel>

        {/* Legend */}
        <GlassPanel style={{ padding: '14px' }} accentColor={T.orange}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: T.fontHead, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="palette" size={14} style={{ color: T.orange }} />Node Types
          </div>
          {Object.entries(NODE_LABELS).filter(([k]) => stats.types[k]).map(([key, label]) => (
            <div key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, cursor: 'pointer', opacity: filter === 'all' || filter === key ? 1 : 0.5 }}>
              <span style={{
                width: 9, height: 9, borderRadius: '50%',
                background: nodeColor(key), flexShrink: 0,
                boxShadow: `0 0 5px ${nodeColor(key)}`
              }} />
              <span style={{ fontSize: 9.5, color: T.textMuted, fontFamily: T.fontMono, flex: 1 }}>{label}</span>
              <span style={{ fontSize: 9, color: nodeColor(key), fontFamily: T.fontMono }}>{stats.types[key]}</span>
            </div>
          ))}
        </GlassPanel>
      </div>

      {/* ───── HOVER POPUP ───── */}
      {hoveredNode && !selectedNode && (
        <div style={{
          position: 'fixed',
          left: Math.min(mousePos.x + 16, window.innerWidth - 240),
          top: Math.min(mousePos.y - 10, window.innerHeight - 220),
          zIndex: 50,
          pointerEvents: 'none',
          animation: 'fadeInUp 0.18s ease-out',
        }}>
          <GlassPanel accentColor={hoveredColor} style={{ padding: '14px 16px', minWidth: 210, maxWidth: 240 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: hoveredColor, boxShadow: `0 0 8px ${hoveredColor}`, flexShrink: 0
              }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: hoveredColor, fontFamily: T.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {NODE_ICON[hoveredNode.type] || '●'} {NODE_LABELS[hoveredNode.type] || hoveredNode.type}
              </span>
            </div>
            {/* Label */}
            <p style={{ margin: '0 0 10px', fontSize: 11.5, fontWeight: 600, color: T.text, fontFamily: T.fontHead, lineHeight: 1.4 }}>
              {hoveredNode.label}
            </p>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', marginBottom: 10 }}>
              {hoveredNode.confidence > 0 && (
                <MiniStat label="Confidence" value={`${hoveredNode.confidence}%`} color={T.green} />
              )}
              {hoveredNode.score > 0 && (
                <MiniStat label="Score" value={`${hoveredNode.score}/10`} color={T.cyan} />
              )}
              {hoveredNode.connections > 0 && (
                <MiniStat label="Connections" value={hoveredNode.connections} color={T.purple} />
              )}
              {hoveredNode.created && (
                <MiniStat label="Created" value={hoveredNode.created} color={T.orange} />
              )}
            </div>
            {hoveredNode.source && (
              <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.fontMono }}>
                Source: {hoveredNode.source}
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 9, color: T.textDim, fontFamily: T.fontMono, textAlign: 'center' }}>
              Click for details · Right-click for actions
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ───── DETAIL PANEL (RIGHT SLIDE-IN) ───── */}
      <div style={{
        position: 'absolute', top: 80, right: 16, zIndex: 20, bottom: showTimeline ? 110 : 60,
        width: detailPanel ? 260 : 0,
        opacity: detailPanel ? 1 : 0,
        pointerEvents: detailPanel ? 'all' : 'none',
        transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10
      }}>
        {detailPanel && (() => {
          const col = nodeColor(detailPanel.type)
          // Merge base node data with enriched API data from GET /knowledge/node/{id}
          const enriched = nodeDetailCache[detailPanel.id] || {}
          const mergedNode = { ...detailPanel, ...enriched }
          // API may return { name, type, connections: [...], related_nodes: [...] }
          const apiRelated = enriched.related_nodes || []
          const connections = graphData?.edges?.filter(e => e.source === detailPanel.id || e.target === detailPanel.id) || []
          const connectedIds = connections.map(e => e.source === detailPanel.id ? e.target : e.source)
          // Merge local connected nodes with API related_nodes
          const localConnected = graphData?.nodes?.filter(n => connectedIds.includes(n.id)).slice(0, 5) || []
          const apiConnectedNodes = apiRelated.slice(0, 3).map(rn => ({
            id: rn.id || rn, label: rn.name || rn.label || rn, type: rn.type || 'default'
          }))
          const connectedNodes = [...localConnected, ...apiConnectedNodes.filter(a => !localConnected.find(l => l.id === a.id))].slice(0, 6)
          return (
            <>
              <GlassPanel accentColor={col} style={{ padding: '16px', flex: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: col, boxShadow: `0 0 10px ${col}`, flexShrink: 0 }} />
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: col, fontFamily: T.fontMono, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {NODE_LABELS[detailPanel.type] || detailPanel.type}
                    </span>
                  </div>
                  <button onClick={() => { setDetailPanel(null); setSelectedNode(null) }}
                    style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>✕</button>
                </div>
                <h2 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.fontHead, lineHeight: 1.4 }}>
                  {detailPanel.label}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {mergedNode.confidence > 0 && <StatChip label="Confidence" value={`${mergedNode.confidence}%`} color={T.green} />}
                  {mergedNode.score > 0 && <StatChip label="Score" value={`${mergedNode.score}/10`} color={T.cyan} />}
                  <StatChip label="Edges" value={connections.length} color={T.purple} />
                  {mergedNode.created && <StatChip label="Age" value={mergedNode.created} color={T.orange} />}
                  {enriched.related_nodes?.length > 0 && <StatChip label="Related (API)" value={enriched.related_nodes.length} color="#ffd700" />}
                </div>
                {/* API-enriched name override */}
                {enriched.name && enriched.name !== detailPanel.label && (
                  <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 8, background: 'rgba(168,85,247,0.06)', fontSize: 9, color: T.purple, fontFamily: T.fontMono }}>
                    API name: {enriched.name}
                  </div>
                )}
                {loadingDetail && (
                  <div style={{ marginTop: 8, fontSize: 9, color: T.textDim, fontFamily: T.fontMono, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', border: `1px solid ${T.purple}`, borderTop: `1px solid transparent`, animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Fetching details from API...
                  </div>
                )}
                {mergedNode.source && (
                  <div style={{ marginTop: 8, padding: '5px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', fontSize: 9, color: T.textMuted, fontFamily: T.fontMono }}>
                    Source: {mergedNode.source}
                  </div>
                )}
              </GlassPanel>

              {/* Pathfinding */}
              <GlassPanel accentColor="#ffd700" style={{ padding: '14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#ffd700', fontFamily: T.fontHead, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="route" size={13} style={{ color: '#ffd700' }} />Find Path
                </div>
                {pathStart ? (
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 9.5, color: T.textMuted, fontFamily: T.fontMono }}>
                      From: <span style={{ color: T.text }}>{pathStart.label?.slice(0, 25)}...</span>
                    </p>
                    <p style={{ margin: '0 0 8px', fontSize: 9.5, color: T.textMuted, fontFamily: T.fontMono }}>
                      To: <span style={{ color: T.text }}>{detailPanel.label?.slice(0, 25)}...</span>
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={async () => {
                        // ✅ FIX 4: Pathfinding API call with auth headers
                        setLoadingDetail(true)
                        try {
                          const params = new URLSearchParams({ entity1: pathStart.id, entity2: detailPanel.id })
                          const res = await fetch(`${API_BASE_URL}/knowledge/connections?${params}`, { headers: getAuthHeaders() })
                          if (res.ok) {
                            const data = await res.json()
                            // API returns { paths: [[id, id, ...], ...] } - use first path
                            const apiPath = data?.paths?.[0]
                            if (apiPath?.length) { setHighlightedPath(apiPath); setPathStart(null); return }
                          }
                        } catch {}
                        // Fallback: local BFS over loaded edge data
                        const path = findPath(pathStart.id, detailPanel.id)
                        setHighlightedPath(path || [])
                        setPathStart(null)
                        setLoadingDetail(false)
                      }} style={{
                        flex: 1, padding: '6px', borderRadius: 8,
                        border: '1px solid rgba(255,215,0,0.4)',
                        background: 'rgba(255,215,0,0.1)', color: '#ffd700',
                        cursor: 'pointer', fontSize: 9, fontFamily: T.fontMono
                      }}>{loadingDetail ? '...' : 'Find Path'}</button>
                      <button onClick={() => { setPathStart(null); setHighlightedPath(null) }} style={{
                        padding: '6px 10px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.3)', color: T.textMuted,
                        cursor: 'pointer', fontSize: 9, fontFamily: T.fontMono
                      }}>Clear</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setPathStart(detailPanel)} style={{
                    width: '100%', padding: '7px', borderRadius: 8,
                    border: '1px solid rgba(255,215,0,0.25)',
                    background: 'rgba(255,215,0,0.08)', color: '#ffd700',
                    cursor: 'pointer', fontSize: 9.5, fontFamily: T.fontMono
                  }}>Set as Path Start</button>
                )}
                {highlightedPath && highlightedPath.length > 0 && (
                  <div style={{ marginTop: 8, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,215,0,0.06)', fontSize: 9, color: '#ffd700', fontFamily: T.fontMono }}>
                    ✦ Path found: {highlightedPath.length} hops
                  </div>
                )}
              </GlassPanel>

              {/* Connected nodes */}
              {connectedNodes.length > 0 && (
                <GlassPanel accentColor={T.cyan} style={{ padding: '14px', flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: T.text, fontFamily: T.fontHead, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="account_tree" size={13} style={{ color: T.cyan }} />Connected ({connections.length})
                  </div>
                  {connectedNodes.map(n => (
                    <div key={n.id}
                      onClick={() => { setSelectedNode(n); setDetailPanel(n); animateCameraToNode(n) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6,
                        padding: '5px 8px', borderRadius: 8, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.15s'
                      }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: nodeColor(n.type), flexShrink: 0, boxShadow: `0 0 5px ${nodeColor(n.type)}` }} />
                      <span style={{ fontSize: 9.5, color: T.text, fontFamily: T.fontMono, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{n.label}</span>
                    </div>
                  ))}
                </GlassPanel>
              )}
            </>
          )
        })()}
      </div>

      {/* ───── CONTEXT MENU ───── */}
      {contextMenu && (
        <div style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 100,
          background: 'rgba(10,8,28,0.97)',
          border: '1px solid rgba(168,85,247,0.3)',
          borderRadius: 12, padding: '6px 4px',
          backdropFilter: 'blur(20px)', minWidth: 180,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
        }}>
          {[
            { icon: 'search', label: 'Research This Topic', action: () => { /* navigate to research */ } },
            { icon: 'hub', label: 'Find Connections', action: () => { setSelectedNode(contextMenu.node); setDetailPanel(contextMenu.node) } },
            { icon: 'route', label: 'Set Path Start', action: () => setPathStart(contextMenu.node) },
            { icon: 'push_pin', label: pinnedNodes.has(contextMenu.node.id) ? 'Unpin Node' : 'Pin Node', action: () => {
              setPinnedNodes(prev => {
                const next = new Set(prev)
                if (next.has(contextMenu.node.id)) next.delete(contextMenu.node.id)
                else next.add(contextMenu.node.id)
                return next
              })
            }},
          ].map(item => (
            <button key={item.label} onClick={() => { item.action(); setContextMenu(null) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 12px', background: 'none', border: 'none',
                color: T.text, cursor: 'pointer', fontSize: 11, fontFamily: T.fontMono,
                borderRadius: 8, textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Icon name={item.icon} size={14} style={{ color: T.purple }} />
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ───── TIMELINE ───── */}
      {showTimeline && graphData && (
        <div style={{
          position: 'absolute', bottom: 40, left: showSidebar ? 240 : 20, right: 300,
          zIndex: 20, background: T.surface,
          border: `1px solid ${T.border}`, borderRadius: 14,
          backdropFilter: 'blur(20px)', padding: '10px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.text, fontFamily: T.fontHead }}>
              <Icon name="timeline" size={13} style={{ color: T.cyan }} /> Node Timeline
            </span>
          </div>
          <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 4 }}>
            {graphData.nodes.slice(0, 48).map((node, i) => (
              <div key={node.id}
                onClick={() => { setSelectedNode(node); setDetailPanel(node); animateCameraToNode(node) }}
                title={node.label}
                style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                  background: nodeColor(node.type),
                  boxShadow: selectedNode?.id === node.id ? `0 0 8px ${nodeColor(node.type)}` : 'none',
                  opacity: filter === 'all' || node.type === filter ? 1 : 0.25,
                  transform: selectedNode?.id === node.id ? 'scale(1.6)' : 'scale(1)',
                  transition: 'all 0.2s'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ───── BOTTOM HINT ───── */}
      <div style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, color: T.textDim, fontSize: 9, fontFamily: T.fontMono,
        pointerEvents: 'none', whiteSpace: 'nowrap'
      }}>
        Drag: rotate · Scroll: zoom · Click: select · Right-click: actions · Dbl-click: reset
      </div>

      {/* ───── LOADING OVERLAY ───── */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 200,
          background: T.bg, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            border: `3px solid rgba(168,85,247,0.2)`,
            borderTop: `3px solid ${T.purple}`,
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: 13, color: T.textMuted, fontFamily: T.fontMono }}>Initializing neural graph...</div>
        </div>
      )}

      {/* ── CSS KEYFRAMES (inline style tag) ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.3); border-radius: 4px; }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  )
}

// ── Mini stat for hover popup ──
function MiniStat({ label, value, color }) {
  return (
    <div style={{ padding: '5px 6px', borderRadius: 7, background: `rgba(${hexToRgbInline(color)},0.08)`, border: `1px solid rgba(${hexToRgbInline(color)},0.15)` }}>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono',monospace", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
    </div>
  )
}

// ── Stat chip for detail panel ──
function StatChip({ label, value, color }) {
  return (
    <div style={{ padding: '6px 8px', borderRadius: 9, background: `rgba(${hexToRgbInline(color)},0.08)`, border: `1px solid rgba(${hexToRgbInline(color)},0.15)` }}>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono',monospace", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "'JetBrains Mono',monospace" }}>{value}</div>
    </div>
  )
}

function hexToRgbInline(hex) {
  if (!hex || !hex.startsWith('#')) return '255,255,255'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}