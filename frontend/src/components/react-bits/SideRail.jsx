import LineSidebar from './LineSidebar';

/*
  SideRail — POLYNOUS-themed, fixed right-middle section navigator built on
  LineSidebar. Pass `items` as [{ label, id }]. Clicking an item smooth-scrolls
  to the element with that id (searched inside `getContainer()` if provided,
  else the document), scrolling whichever ancestor actually scrolls.

  Defaults are tuned to the neural-navy theme: green accent, muted navy text.
*/
export default function SideRail({
  items = [],
  accentColor = '#00ff0f',
  textColor = 'rgba(150,166,186,0.62)',
  markerColor = 'rgba(120,138,160,0.35)',
  defaultActive = 0,
  getContainer,
  className = ''
}) {
  if (!items.length) return null;

  const handleClick = (index) => {
    const item = items[index];
    if (!item || !item.id) return;
    const root = (getContainer && getContainer()) || document;
    const el = root.querySelector ? root.querySelector(`#${CSS.escape(item.id)}`) : null;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={`side-rail${className ? ` ${className}` : ''}`}>
      <LineSidebar
        items={items.map((it) => it.label)}
        accentColor={accentColor}
        textColor={textColor}
        markerColor={markerColor}
        showIndex
        showMarker
        proximityRadius={110}
        maxShift={22}
        falloff="smooth"
        markerLength={46}
        markerGap={12}
        tickScale={0.5}
        scaleTick
        itemGap={17}
        fontSize={0.82}
        smoothing={120}
        defaultActive={defaultActive}
        onItemClick={handleClick}
      />
    </div>
  );
}
