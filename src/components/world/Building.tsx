import type { Health, Initiative, Mission } from '../../types/roadmap';
import type { StatusRole } from '../../types/tengu';

export const W = 46; // footprint half-width
export const D = 23; // footprint half-depth
const F = 11; // floor height
const LOBBY = 12;
const MAX_FLOORS = 12;

const FLOOR_ORDER: StatusRole[] = ['live', 'shipping', 'done', 'review', 'sentback', 'started', 'blocked', 'available', 'planning'];

export const HEALTH_COLOR: Record<Health, string> = {
  healthy: '#3ddc97',
  'at-risk': '#ffb547',
  blocked: '#ff5c6c',
};

export function buildingHeight(floors: number) {
  return LOBBY + Math.max(3, Math.min(MAX_FLOORS, floors)) * F;
}

/** Bounds of the svg relative to the footprint centre (0,0). */
export function buildingBox(floors: number) {
  const h = buildingHeight(floors);
  return { left: -W - 4, top: -(D + h + 26), width: 2 * W + 8, height: D + h + 26 + D + 6 };
}

function windowClass(role: StatusRole | undefined) {
  if (!role) return 'win win-empty';
  if (role === 'done' || role === 'shipping' || role === 'live') return 'win win-done';
  if (role === 'blocked') return 'win win-blocked';
  if (role === 'review') return 'win win-review';
  if (role === 'sentback') return 'win win-sentback';
  if (role === 'started') return 'win win-started';
  return 'win win-dark';
}

const pts = (p: [number, number][]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

interface Props {
  initiative: Initiative;
  missions: Mission[];
  health: Health;
  /** Item ids that just changed in Tengu — their floors flash. */
  pulse?: Set<string>;
  className?: string;
}

export function Building({ initiative, missions, health, pulse, className }: Props) {
  const sorted = [...missions]
    .filter((t) => t.role !== 'closed')
    .sort((a, b) => FLOOR_ORDER.indexOf(a.role) - FLOOR_ORDER.indexOf(b.role))
    .slice(0, MAX_FLOORS);
  const floors = Math.max(3, sorted.length);
  const H = buildingHeight(sorted.length);
  const box = buildingBox(sorted.length);
  const h = initiative.hue;

  const left: [number, number][] = [[-W, 0], [0, D], [0, D - H], [-W, -H]];
  const right: [number, number][] = [[0, D], [W, 0], [W, -H], [0, D - H]];
  const roof: [number, number][] = [[-W, -H], [0, -D - H], [W, -H], [0, D - H]];

  const lx = (u: number) => -W + u * W;
  const ly = (u: number) => u * D;
  const rx = (u: number) => u * W;
  const ry = (u: number) => D - u * D;
  const cols: [number, number][] = [[0.1, 0.34], [0.4, 0.62], [0.68, 0.9]];

  const windows = [];
  for (let k = 0; k < floors; k++) {
    const t = sorted[k];
    const b = LOBBY + k * F + 2;
    const top = b + F - 4;
    const cls = windowClass(t?.role) + (t && pulse?.has(t.id) ? ' win-pulse' : '');
    for (const [u0, u1] of cols) {
      windows.push(
        <polygon key={`l${k}${u0}`} className={cls} points={pts([[lx(u0), ly(u0) - b], [lx(u1), ly(u1) - b], [lx(u1), ly(u1) - top], [lx(u0), ly(u0) - top]])} />,
        <polygon key={`r${k}${u0}`} className={cls} points={pts([[rx(u0), ry(u0) - b], [rx(u1), ry(u1) - b], [rx(u1), ry(u1) - top], [rx(u0), ry(u0) - top]])} />,
      );
    }
  }

  const beaconY = -H - D - 2;
  return (
    <svg
      className={`building ${className ?? ''}`}
      width={box.width}
      height={box.height}
      viewBox={`${box.left} ${box.top} ${box.width} ${box.height}`}
      style={{ left: box.left, top: box.top }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`glass-l-${initiative.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${h} 38% 30%)`} />
          <stop offset="1" stopColor={`hsl(${h} 40% 16%)`} />
        </linearGradient>
        <linearGradient id={`glass-r-${initiative.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${h} 42% 40%)`} />
          <stop offset="1" stopColor={`hsl(${h} 45% 22%)`} />
        </linearGradient>
      </defs>
      <ellipse className="building-glow" cx="0" cy="2" rx={W * 1.25} ry={D * 1.25} fill={`hsl(${h} 90% 60%)`} />
      <g className="building-body">
        <polygon points={pts(left)} fill={`url(#glass-l-${initiative.id})`} />
        <polygon points={pts(right)} fill={`url(#glass-r-${initiative.id})`} />
        <polygon points={pts(roof)} fill={`hsl(${h} 45% 48%)`} />
        <polygon points={pts([[-W * 0.55, -H], [0, -H - D * 0.55], [W * 0.55, -H], [0, -H + D * 0.55]])} fill={`hsl(${h} 50% 58%)`} opacity="0.5" />
        <polyline points={pts([[-W, -H], [0, D - H], [W, -H]])} fill="none" stroke={`hsl(${h} 90% 80%)`} strokeOpacity="0.55" strokeWidth="1" />
        <line x1="0" y1={D - H} x2="0" y2={D} stroke={`hsl(${h} 90% 80%)`} strokeOpacity="0.25" strokeWidth="1" />
        {windows}
        {/* lobby door */}
        <polygon points={pts([[rx(0.18), ry(0.18)], [rx(0.36), ry(0.36)], [rx(0.36), ry(0.36) - 9], [rx(0.18), ry(0.18) - 9]])} fill={`hsl(${h} 90% 75%)`} opacity="0.7" />
        {/* antenna + health beacon */}
        <line x1="0" y1={-H} x2="0" y2={beaconY + 4} stroke={`hsl(${h} 40% 70%)`} strokeWidth="1.5" />
        <circle className={`beacon beacon-${health}`} cx="0" cy={beaconY} r="3.5" fill={HEALTH_COLOR[health]} />
        <circle className={`beacon-ring beacon-${health}`} cx="0" cy={beaconY} r="3.5" fill="none" stroke={HEALTH_COLOR[health]} />
      </g>
    </svg>
  );
}
