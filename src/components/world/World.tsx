import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useStore } from '../../app/store';
import { peopleOf, prefersReducedMotion, useInitiativeViews, type InitiativeView } from '../../app/selectors';
import { HEALTH_LABEL } from '../../lib/progress';
import { byZone, monthLabel, ZONE_META, ZONES } from '../../lib/roadmap';
import type { Zone } from '../../types/roadmap';
import { Building, buildingHeight, D, HEALTH_COLOR } from './Building';

const WORLD_W = 1640;
const WORLD_H = 980;
const CX = 860;
const DISTRICT: Record<Zone, { cy: number; scale: number }> = {
  later: { cy: 250, scale: 0.78 },
  next: { cy: 510, scale: 0.9 },
  now: { cy: 790, scale: 1.04 },
};
const LOT = 205;
/** The part of the world that has content, used to fit the camera. */
const BOUNDS = { x: 170, y: 40, w: 1210, h: 900 };
const HALF_DEPTH = 64;
const THICK = 16;

interface Cam {
  x: number;
  y: number;
  s: number;
}

interface Drag {
  id: string;
  wx: number;
  wy: number;
  active: boolean;
  startX: number;
  startY: number;
  zone: Zone | null;
  index: number;
}

function lots(zone: Zone, n: number) {
  const { cy, scale } = DISTRICT[zone];
  const spacing = LOT * scale;
  return Array.from({ length: n }, (_, i) => ({ x: CX + (i - (n - 1) / 2) * spacing, y: cy }));
}

function plateGeometry(zone: Zone, n: number) {
  const { cy, scale } = DISTRICT[zone];
  const hd = HALF_DEPTH * scale;
  const half = (Math.max(n, 2) * LOT * scale) / 2 + 10;
  return { xL: CX - half, xR: CX + half, cy, hd, scale };
}

const p = (pts: [number, number][]) => pts.map(([x, y]) => `${x},${y}`).join(' ');

export function World() {
  const { state, actions } = useStore();
  const views = useInitiativeViews(state);
  const viewport = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, s: 0.6 });
  const [fit, setFit] = useState<Cam>({ x: 0, y: 0, s: 0.6 });
  const [animating, setAnimating] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [entering, setEntering] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const h = window.setTimeout(() => setLive(true), 2600);
    return () => window.clearTimeout(h);
  }, []);
  const pan = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const reduced = prefersReducedMotion();

  const zones = useMemo(() => {
    const out = {} as Record<Zone, InitiativeView[]>;
    for (const z of ZONES) out[z] = byZone(state.roadmap.initiatives, z).map((i) => views[i.id]).filter(Boolean);
    return out;
  }, [state.roadmap.initiatives, views]);

  // Fit world to viewport.
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      // Portrait screens zoom in a bit further and let you pan sideways.
      const s = Math.min(r.height / BOUNDS.h, (r.width / BOUNDS.w) * (r.width < 700 ? 1.6 : 1));
      const f = { s, x: r.width / 2 - (BOUNDS.x + BOUNDS.w / 2) * s, y: r.height / 2 - (BOUNDS.y + BOUNDS.h / 2) * s };
      setFit(f);
      setCam(f);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Coming back from an initiative: glide out.
  useEffect(() => {
    if (!state.activeInitiative && entering) {
      setEntering(null);
      setAnimating(!reduced);
      setCam(fit);
    }
  }, [state.activeInitiative, entering, fit, reduced]);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const r = viewport.current!.getBoundingClientRect();
      return { wx: (clientX - r.left - cam.x) / cam.s, wy: (clientY - r.top - cam.y) / cam.s };
    },
    [cam],
  );

  const zoomBy = (factor: number, cx?: number, cy?: number) => {
    const r = viewport.current!.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    setCam((c) => {
      const s = Math.max(fit.s * 0.7, Math.min(fit.s * 3, c.s * factor));
      const k = s / c.s;
      return { s, x: px - (px - c.x) * k, y: py - (py - c.y) * k };
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    if (state.activeInitiative) return;
    setAnimating(false);
    const r = viewport.current!.getBoundingClientRect();
    zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  };

  const enter = (id: string) => {
    const zone = state.roadmap.initiatives.find((i) => i.id === id)!.zone;
    const idx = zones[zone].findIndex((v) => v.initiative.id === id);
    const lot = lots(zone, zones[zone].length)[idx];
    const r = viewport.current!.getBoundingClientRect();
    const s = fit.s * 3.2;
    setEntering(id);
    setHover(null);
    if (reduced) return actions.enterInitiative(id);
    setAnimating(true);
    setCam({ s, x: r.width / 2 - lot.x * s, y: r.height * 0.62 - (lot.y - 50) * s });
    window.setTimeout(() => actions.enterInitiative(id), 420);
  };

  // Searching/jumping straight into an initiative from elsewhere.
  useEffect(() => {
    if (state.activeInitiative && !entering) setEntering(state.activeInitiative);
  }, [state.activeInitiative, entering]);

  // ── Drag & drop ──────────────────────────────────────────────
  const targetFor = (wx: number, wy: number, id: string): { zone: Zone | null; index: number } => {
    let best: Zone | null = null;
    let dist = Infinity;
    for (const z of ZONES) {
      const d = Math.abs(wy - DISTRICT[z].cy);
      if (d < dist) {
        dist = d;
        best = z;
      }
    }
    if (!best || dist > 170) return { zone: null, index: 0 };
    const others = zones[best].filter((v) => v.initiative.id !== id);
    const positions = lots(best, others.length + 1);
    let index = 0;
    let bd = Infinity;
    positions.forEach((pos, i) => {
      const d = Math.abs(pos.x - wx);
      if (d < bd) {
        bd = d;
        index = i;
      }
    });
    return { zone: best, index };
  };

  const onBuildingDown = (e: RPointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const { wx, wy } = toWorld(e.clientX, e.clientY);
    setDrag({ id, wx, wy, active: false, startX: e.clientX, startY: e.clientY, zone: null, index: 0 });
  };

  const dragRef = useRef(drag);
  dragRef.current = drag;
  const dragging_ = drag !== null;
  useEffect(() => {
    if (!dragging_) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6;
      const { wx, wy } = toWorld(e.clientX, e.clientY);
      if (moved && !d.active) setHover(null);
      setDrag({ ...d, wx, wy, active: d.active || moved, ...targetFor(wx, wy, d.id) });
    };
    const up = () => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      if (!d.active) enter(d.id);
      else if (d.zone) actions.moveInitiative(d.id, d.zone, d.index);
    };
    const cancel = (e: KeyboardEvent) => e.key === 'Escape' && setDrag(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', cancel);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging_, toWorld]);

  // ── Panning the ground ───────────────────────────────────────
  const onGroundDown = (e: RPointerEvent) => {
    if (e.button !== 0) return;
    pan.current = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
    setAnimating(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onGroundMove = (e: RPointerEvent) => {
    const pn = pan.current;
    if (!pn) return;
    setCam((c) => ({ ...c, x: pn.cx + e.clientX - pn.x, y: pn.cy + e.clientY - pn.y }));
  };
  const onGroundUp = () => (pan.current = null);

  const spotlight = state.spotlight;
  const dimmed = (v: InitiativeView) => !!spotlight && !peopleOf(v).includes(spotlight);

  const dragging = drag?.active ? drag : null;

  return (
    <div
      ref={viewport}
      className={`world-viewport ${live ? 'is-live' : ''} ${dragging ? 'is-dragging' : ''} ${state.activeInitiative ? 'is-behind' : ''}`}
      onWheel={onWheel}
      onPointerDown={onGroundDown}
      onPointerMove={onGroundMove}
      onPointerUp={onGroundUp}
      onDoubleClick={() => {
        setAnimating(!reduced);
        setCam(fit);
      }}
    >
      <div className="sky" aria-hidden />
      <div
        className={`camera ${animating ? 'camera-animate' : ''}`}
        style={{ width: WORLD_W, height: WORLD_H, transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})` }}
        onTransitionEnd={() => setAnimating(false)}
      >
        <Roads />
        {ZONES.map((zone, zi) => {
          const list = zones[zone];
          const visible = dragging ? list.filter((v) => v.initiative.id !== dragging.id) : list;
          const count = dragging?.zone === zone ? visible.length + 1 : list.length;
          const positions = lots(zone, count);
          const g = plateGeometry(zone, count);
          const isTarget = dragging?.zone === zone;
          let slot = 0;
          return (
            <section
              key={zone}
              className={`district district-${zone} ${isTarget ? 'is-target' : ''}`}
              style={{ ['--d' as string]: `${zi * 160}ms` }}
              aria-label={`${ZONE_META[zone].label} district`}
            >
              <Plate zone={zone} g={g} lots={positions} dropIndex={isTarget ? dragging!.index : -1} />
              <div className="district-label" style={{ left: g.xL - 2 * g.hd - 26, top: g.cy - 30 }}>
                <span className="district-emoji">{ZONE_META[zone].emoji}</span>
                <span className="district-name">{ZONE_META[zone].label}</span>
                <span className="district-tag">
                  {ZONE_META[zone].tagline} · {list.length}
                </span>
              </div>
              {visible.map((v, i) => {
                if (isTarget && slot === dragging!.index) slot++;
                const pos = positions[isTarget ? slot++ : i];
                return (
                  <Lot
                    key={v.initiative.id}
                    view={v}
                    x={pos.x}
                    y={pos.y}
                    scale={DISTRICT[zone].scale}
                    delay={zi * 160 + i * 90}
                    hovered={hover === v.initiative.id}
                    selected={entering === v.initiative.id}
                    dimmed={dimmed(v)}
                    pulse={state.remotePulse}
                    onHover={setHover}
                    onPointerDown={onBuildingDown}
                    onKeyEnter={enter}
                  />
                );
              })}
            </section>
          );
        })}
        {dragging && (
          <div className="drag-ghost" style={{ left: dragging.wx, top: dragging.wy + 30 }}>
            <Building
              initiative={views[dragging.id].initiative}
              tickets={views[dragging.id].tickets}
              health={views[dragging.id].stats.health}
            />
          </div>
        )}
      </div>

      <div className="world-controls" onPointerDown={(e) => e.stopPropagation()}>
        <button onClick={() => zoomBy(1.2)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">−</button>
        <button onClick={() => { setAnimating(!reduced); setCam(fit); }} aria-label="Reset view">⌂</button>
      </div>
      <div className="world-hint">Click a building to enter · drag it between districts to reprioritize</div>
    </div>
  );
}

function Roads() {
  // Roads run from the horizon (LATER) down to the front (NOW): the future arrives.
  const segs: [Zone, Zone][] = [['later', 'next'], ['next', 'now']];
  return (
    <svg className="roads" width={WORLD_W} height={WORLD_H} aria-hidden>
      {segs.map(([a, b]) => {
        const y1 = DISTRICT[a].cy + HALF_DEPTH * DISTRICT[a].scale + THICK;
        const y2 = DISTRICT[b].cy - HALF_DEPTH * DISTRICT[b].scale;
        return (
          <g key={a}>
            {[-60, 60].map((dx) => (
              <path key={dx} className="road" d={`M ${CX + dx * 0.8} ${y1} L ${CX + dx} ${y2}`} />
            ))}
            <path className="road-flow" d={`M ${CX - 20} ${y1} L ${CX - 24} ${y2}`} />
            <path className="road-flow road-flow-b" d={`M ${CX + 20} ${y1} L ${CX + 24} ${y2}`} />
          </g>
        );
      })}
    </svg>
  );
}

function Plate({ zone, g, lots: lotPositions, dropIndex }: { zone: Zone; g: ReturnType<typeof plateGeometry>; lots: { x: number; y: number }[]; dropIndex: number }) {
  const { xL, xR, cy, hd, scale } = g;
  const top: [number, number][] = [[xL - 2 * hd, cy], [xL, cy - hd], [xR, cy - hd], [xR + 2 * hd, cy], [xR, cy + hd], [xL, cy + hd]];
  const lw = 58 * scale;
  const ld = 29 * scale;
  return (
    <svg className="plate" width={WORLD_W} height={WORLD_H} aria-hidden>
      <defs>
        <pattern id={`grid-${zone}`} width={24 * scale} height={12 * scale} patternUnits="userSpaceOnUse">
          <path d={`M 0 ${6 * scale} L ${12 * scale} 0 L ${24 * scale} ${6 * scale} L ${12 * scale} ${12 * scale} Z`} className="plate-grid" />
        </pattern>
        <linearGradient id={`plate-${zone}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="plate-top-a" />
          <stop offset="1" className="plate-top-b" />
        </linearGradient>
      </defs>
      <ellipse className="plate-aura" cx={CX} cy={cy + 10} rx={(xR - xL) / 2 + 3 * hd} ry={hd * 2.1} />
      <polygon className="plate-side" points={p([[xL - 2 * hd, cy], [xL, cy + hd], [xL, cy + hd + THICK], [xL - 2 * hd, cy + THICK]])} />
      <polygon className="plate-side plate-side-front" points={p([[xL, cy + hd], [xR, cy + hd], [xR, cy + hd + THICK], [xL, cy + hd + THICK]])} />
      <polygon className="plate-side" points={p([[xR, cy + hd], [xR + 2 * hd, cy], [xR + 2 * hd, cy + THICK], [xR, cy + hd + THICK]])} />
      <polygon className="plate-top" points={p(top)} fill={`url(#plate-${zone})`} />
      <polygon points={p(top)} fill={`url(#grid-${zone})`} />
      <polygon className="plate-edge" points={p(top)} />
      {lotPositions.map((l, i) => (
        <polygon
          key={i}
          className={`lot ${i === dropIndex ? 'lot-drop' : ''}`}
          points={p([[l.x - lw, l.y], [l.x, l.y - ld], [l.x + lw, l.y], [l.x, l.y + ld]])}
        />
      ))}
    </svg>
  );
}

interface LotProps {
  view: InitiativeView;
  x: number;
  y: number;
  scale: number;
  delay: number;
  hovered: boolean;
  selected: boolean;
  dimmed: boolean;
  pulse: Record<string, number>;
  onHover(id: string | null): void;
  onPointerDown(e: RPointerEvent, id: string): void;
  onKeyEnter(id: string): void;
}

function Lot({ view, x, y, scale, delay, hovered, selected, dimmed, pulse, onHover, onPointerDown, onKeyEnter }: LotProps) {
  const { initiative: ini, stats, tickets } = view;
  const now = Date.now();
  const pulsing = new Set(tickets.filter((t) => pulse[t.id] && now - pulse[t.id] < 6000).map((t) => t.id));
  const h = buildingHeight(stats.total);
  return (
    <div
      className={`lot-el ${hovered ? 'is-hover' : ''} ${selected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''}`}
      style={{ left: x, top: y, transform: `scale(${scale})`, ['--delay' as string]: `${delay}ms`, ['--hue' as string]: ini.hue }}
    >
      <div
        className="lot-hit"
        role="button"
        tabIndex={0}
        aria-label={`${ini.name}, ${ini.priority}, ${stats.progress}% complete, ${HEALTH_LABEL[stats.health]}. Press Enter to open.`}
        style={{ height: h + D * 2 + 10, top: -(h + D + 6) }}
        onPointerEnter={() => onHover(ini.id)}
        onPointerLeave={() => onHover(null)}
        onFocus={() => onHover(ini.id)}
        onBlur={() => onHover(null)}
        onPointerDown={(e) => onPointerDown(e, ini.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onKeyEnter(ini.id);
          }
        }}
      />
      <div className="lot-rise">
        <Building initiative={ini} tickets={tickets} health={stats.health} pulse={pulsing} />
        <div className="nameplate" style={{ top: -(h + D + 64) }}>
          <div className="nameplate-row">
            <span className="nameplate-icon">{ini.icon}</span>
            <span className="nameplate-name">{ini.name}</span>
            <span className={`prio prio-${ini.priority}`}>{ini.priority}</span>
          </div>
          <div className="nameplate-bar">
            <i style={{ width: `${stats.progress}%` }} />
          </div>
          <div className="nameplate-meta">
            <span>{stats.progress}%</span>
            <span className="dot" style={{ background: HEALTH_COLOR[stats.health] }} />
            <span>{stats.total} tickets</span>
            {stats.blocked > 0 && <span className="meta-blocked">{stats.blocked} blocked</span>}
          </div>
        </div>
        <div className="place-sign" style={{ top: D + 10 }}>{ini.place}</div>
      </div>
      {hovered && (
        <div className="holo-card" style={{ top: -(h + D) / 2 - 70 }}>
          <div className="holo-head">
            <span>{ini.icon}</span>
            <strong>{ini.name}</strong>
          </div>
          <p className="holo-summary">{ini.summary}</p>
          <dl>
            <dt>Status</dt><dd>{ini.status}</dd>
            <dt>Owner</dt><dd>{ini.owner}</dd>
            <dt>Target</dt><dd>{monthLabel(ini.target, true)}</dd>
            <dt>Progress</dt><dd>{stats.completed} / {stats.total} done</dd>
            <dt>Health</dt><dd style={{ color: HEALTH_COLOR[stats.health] }}>● {HEALTH_LABEL[stats.health]}</dd>
          </dl>
          {(stats.blocked > 0 || stats.overdue > 0 || stats.unassigned > 0) && (
            <div className="holo-flags">
              {stats.blocked > 0 && <span className="flag flag-red">{stats.blocked} blocked</span>}
              {stats.overdue > 0 && <span className="flag flag-amber">{stats.overdue} overdue</span>}
              {stats.unassigned > 0 && <span className="flag">{stats.unassigned} unassigned</span>}
            </div>
          )}
          <div className="holo-hint">Click to enter ↵</div>
        </div>
      )}
    </div>
  );
}
