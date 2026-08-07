// NavDock — a premium macOS-style dock for POLYNOUS, adapted from the React Bits
// Dock. Themed to the app (dark glass + neon green), fixed at bottom-center,
// mounted globally so it floats over every authenticated page. Uses react-router
// for smooth SPA navigation and highlights the current page.
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { Children, cloneElement, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import GlassSurface from './react-bits/GlassSurface';
import './NavDock.css';

// Only the essential entry points live in the dock, so it complements the
// sidebar (full nav) instead of duplicating it: the two core modes plus the
// two exploration surfaces. Everything else stays in the sidebar.
const NAV = [
  { icon: 'travel_explore', label: 'Research',        path: '/research' },
  { icon: 'forum',          label: 'Debate Chamber',  path: '/debate' },
  { icon: 'account_tree',   label: 'Knowledge Graph', path: '/graph' },
  { icon: 'search',         label: 'Semantic Search', path: '/search' },
];

// Routes where the dock should stay hidden (marketing / auth / setup).
const HIDDEN_PREFIXES = ['/auth', '/privacy', '/terms', '/docs'];

const SPRING = { mass: 0.1, stiffness: 170, damping: 13 };

function DockIcon({ children, className = '' }) {
  return <div className={`navdock-icon ${className}`}>{children}</div>;
}

function DockLabel({ children, ...rest }) {
  const { isHovered } = rest;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const unsub = isHovered.on('change', (v) => setVisible(v === 1));
    return () => unsub();
  }, [isHovered]);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: -8 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.18 }}
          className="navdock-label"
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockItem({ children, onClick, mouseX, distance, magnification, baseItemSize, label, active }) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: baseItemSize };
    return val - rect.x - baseItemSize / 2;
  });
  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, SPRING);

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      className={`navdock-item ${active ? 'is-active' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      {Children.map(children, (child) => cloneElement(child, { isHovered }))}
    </motion.div>
  );
}

export default function NavDock({ baseItemSize = 46, magnification = 66, distance = 180, panelHeight = 62 }) {
  const mouseX = useMotionValue(Infinity);
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  if (HIDDEN_PREFIXES.some((p) => path.startsWith(p)) || path === '/') return null;

  return (
    <div className="navdock-outer" style={{ height: panelHeight }}>
      <motion.div
        onMouseMove={({ pageX }) => mouseX.set(pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="navdock-panel"
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="POLYNOUS navigation dock"
      >
        {/* Real refractive glass surface behind the items (falls back to a dark
            blur on Safari/Firefox). It refracts the neural canvas behind it. */}
        <GlassSurface
          className="navdock-glass"
          width="100%" height="100%" borderRadius={18}
          displace={0.4} distortionScale={-130}
          redOffset={4} greenOffset={12} blueOffset={22}
          brightness={58} opacity={0.9} blur={9} backgroundOpacity={0.25} saturation={1.4}
          style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        />
        <div className="navdock-row">
        {NAV.map((item) => {
          const active = path === item.path || path.startsWith(item.path + '/');
          return (
            <DockItem
              key={item.path}
              onClick={() => navigate(item.path)}
              mouseX={mouseX}
              distance={distance}
              magnification={magnification}
              baseItemSize={baseItemSize}
              label={item.label}
              active={active}
            >
              <DockIcon>
                <span className="material-symbols-outlined">{item.icon}</span>
              </DockIcon>
              <DockLabel>{item.label}</DockLabel>
            </DockItem>
          );
        })}
        </div>
      </motion.div>
    </div>
  );
}
