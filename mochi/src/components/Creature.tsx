/**
 * Mochi's creatures: small software beings with a screen for a face. One per world.
 * Shape (body), antenna and colour come from the world; mood drives the face; accessories
 * unlock as the world levels up. Idle bob, blink and glance are CSS; a change of `reactKey`
 * makes the creature hop. All motion stops under prefers-reduced-motion.
 */
import type { Accent, Accessory, Antenna, BodyShape, Mood } from '../types';

interface Props {
  body: BodyShape;
  antenna: Antenna;
  color: Accent;
  mood?: Mood;
  size?: number;
  accessories?: Accessory[];
  reactKey?: number | string;
  /** Head and shoulders only (for chips and lists). */
  mini?: boolean;
  className?: string;
  title?: string;
}

const INK = 'var(--ink)';
const SCREEN = '#16131a';
const GLOW = '#e9fff6';

/** Body outline, the y where the antenna starts, and the face centre. */
function shape(body: BodyShape): { el: JSX.Element; top: number; face: number; w: number } {
  switch (body) {
    case 'pill': return { el: <rect x="22" y="16" width="36" height="52" rx="18" />, top: 16, face: 34, w: 36 };
    case 'cube': return { el: <rect x="15" y="22" width="50" height="44" rx="9" />, top: 22, face: 40, w: 50 };
    case 'blob': return { el: <path d="M40 18C58 18 67 31 66 46 65 60 56 68 40 68 24 68 15 60 14 46 13 31 22 18 40 18Z" />, top: 18, face: 38, w: 50 };
    case 'bean': return { el: <rect x="11" y="27" width="58" height="41" rx="20" />, top: 27, face: 44, w: 56 };
    case 'drop': return { el: <path d="M40 13C50 26 64 35 64 50 64 62 54 68 40 68 26 68 16 62 16 50 16 35 30 26 40 13Z" />, top: 15, face: 46, w: 44 };
  }
}

function Eyes({ mood, cy }: { mood: Mood; cy: number }) {
  const l = 33;
  const r = 47;
  switch (mood) {
    case 'happy':
      return <g fill="none" stroke={GLOW} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={`M${l - 3} ${cy + 1.5}l3-3 3 3`} /><path d={`M${r - 3} ${cy + 1.5}l3-3 3 3`} /></g>;
    case 'focus':
      return <g fill={GLOW}><rect x={l - 3.5} y={cy - 0.5} width="7" height="2.2" rx="1" /><rect x={r - 3.5} y={cy - 0.5} width="7" height="2.2" rx="1" /></g>;
    case 'wow':
      return <g fill={GLOW}><rect x={l - 3} y={cy - 3} width="6" height="6" rx="1" /><rect x={r - 3} y={cy - 3} width="6" height="6" rx="1" /></g>;
    case 'sleepy':
      return <g fill={GLOW} opacity=".8"><rect x={l - 3} y={cy + 1} width="6" height="1.6" rx=".8" /><rect x={r - 3} y={cy + 1} width="6" height="1.6" rx=".8" /></g>;
    case 'worried':
      return <g fill={GLOW}><rect x={l - 2} y={cy - 3} width="4" height="6" rx="1" /><rect x={r - 2} y={cy - 3} width="4" height="6" rx="1" /><path d={`M${l - 4} ${cy - 4.4}l6 -2M${r + 4} ${cy - 4.4}l-6 -2`} stroke={GLOW} strokeWidth="1.4" strokeLinecap="round" /></g>;
    default:
      return <g className="cr-eyes" fill={GLOW}><rect x={l - 2} y={cy - 3.5} width="4" height="7" rx="1.2" /><rect x={r - 2} y={cy - 3.5} width="4" height="7" rx="1.2" /></g>;
  }
}

function AntennaEl({ kind, top }: { kind: Antenna; top: number }) {
  const t = top + 1;
  switch (kind) {
    case 'single':
      return <g className="cr-antenna"><path d={`M40 ${t}V${t - 10}`} stroke={INK} strokeWidth="2" strokeLinecap="round" /><circle className="cr-bulb" cx="40" cy={t - 12} r="3.4" fill="var(--glow-bulb)" stroke={INK} strokeWidth="1.6" /></g>;
    case 'double':
      return <g className="cr-antenna"><path d={`M34 ${t + 1}l-4-10M46 ${t + 1}l4-10`} stroke={INK} strokeWidth="2" strokeLinecap="round" /><circle cx="29.5" cy={t - 10.5} r="2.6" fill={INK} /><circle className="cr-bulb" cx="50.5" cy={t - 10.5} r="2.6" fill="var(--glow-bulb)" stroke={INK} strokeWidth="1.4" /></g>;
    case 'sprout':
      return <g className="cr-antenna"><path d={`M40 ${t}V${t - 8}`} stroke={INK} strokeWidth="2" strokeLinecap="round" /><path d={`M40 ${t - 7}c-7 1-10-3-10-7 5 0 9 2 10 7Z`} fill="#7ccf8e" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" /><path d={`M40 ${t - 8}c6 0 9-4 9-8-5 0-8 3-9 8Z`} fill="#a6e0b0" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" /></g>;
    case 'spark':
      return <g className="cr-antenna"><path d={`M40 ${t}V${t - 6}`} stroke={INK} strokeWidth="2" strokeLinecap="round" /><path className="cr-spark" d={`M40 ${t - 17}l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z`} fill="#ffd34d" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" /></g>;
    default:
      return null;
  }
}

function Accessories({ list, face, top, w }: { list: Accessory[]; face: number; top: number; w: number }) {
  return (
    <g>
      {list.includes('scarf') && (
        <g><rect x={40 - w / 2 + 2} y={face + 12} width={w - 4} height="6" rx="3" fill="var(--pink)" stroke={INK} strokeWidth="1.6" /><path d={`M${40 + w / 4} ${face + 17}l3 8 4-1-2-7`} fill="var(--pink)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" /></g>
      )}
      {list.includes('badge') && (
        <g transform={`translate(${40 + w / 2 - 12} ${face + 15})`}><rect width="8" height="8" rx="1.5" fill="#ffd34d" stroke={INK} strokeWidth="1.4" /><path d="M4 1.6l.9 1.6 1.7.4-1.2 1.2.3 1.7L4 5.7l-1.7.8.3-1.7-1.2-1.2 1.7-.4Z" fill={INK} /></g>
      )}
      {list.includes('headset') && (
        <g fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round"><path d={`M${40 - w / 2 + 1} ${face}C${40 - w / 2 + 1} ${top - 6} ${40 + w / 2 - 1} ${top - 6} ${40 + w / 2 - 1} ${face}`} /><rect x={40 - w / 2 - 4} y={face - 6} width="7" height="12" rx="3" fill={SCREEN} /><rect x={40 + w / 2 - 3} y={face - 6} width="7" height="12" rx="3" fill={SCREEN} /><path d={`M${40 + w / 2} ${face + 6}q0 8-9 9`} strokeWidth="1.5" /></g>
      )}
      {list.includes('cap') && (
        <g><path d={`M${40 - 13} ${top + 3}c0-10 26-10 26 0Z`} fill={SCREEN} stroke={INK} strokeWidth="1.6" /><path d={`M${40 + 4} ${top + 3}h15`} stroke={INK} strokeWidth="2.6" strokeLinecap="round" /></g>
      )}
    </g>
  );
}

export function Creature({ body, antenna, color, mood = 'idle', size = 72, accessories = [], reactKey, mini = false, className = '', title }: Props) {
  const s = shape(body);
  const vb = mini ? `8 ${Math.max(0, s.top - 20)} 64 ${Math.min(66, 72 - Math.max(0, s.top - 20))}` : '0 0 80 80';
  return (
    <span className={`creature mood-${mood}${mini ? ' mini' : ''} ${className}`} style={{ width: size, height: size, ['--c' as string]: `var(--${color})`, ['--c-soft' as string]: `var(--${color}-soft)` }} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <span key={reactKey ?? 'still'} className={reactKey ? 'cr-hop' : 'cr-still'}>
        <svg viewBox={vb} width="100%" height="100%" overflow="visible">
          {!mini && <ellipse className="cr-shadow" cx="40" cy="74" rx="20" ry="3.2" fill="rgba(0,0,0,.22)" />}
          <g className="cr-body">
            {!mini && (
              <g fill={INK}>
                <rect x="29" y="64" width="7" height="9" rx="3" />
                <rect x="44" y="64" width="7" height="9" rx="3" />
              </g>
            )}
            <rect className="cr-arm cr-arm-l" x={40 - s.w / 2 - 5} y={s.face + 6} width="7" height="11" rx="3.5" fill="var(--c)" stroke={INK} strokeWidth="1.8" />
            <rect className="cr-arm cr-arm-r" x={40 + s.w / 2 - 2} y={s.face + 6} width="7" height="11" rx="3.5" fill="var(--c)" stroke={INK} strokeWidth="1.8" />
            <AntennaEl kind={antenna} top={s.top} />
            <g fill="var(--c)" stroke={INK} strokeWidth="2">{s.el}</g>
            <rect x={40 - s.w / 2 + 6} y={s.top + 5} width="8" height="3" rx="1.5" fill="#fff" opacity=".45" />
            <rect x="24" y={s.face - 9} width="32" height="18" rx="5.5" fill={SCREEN} />
            <rect x="24" y={s.face - 9} width="32" height="18" rx="5.5" fill="none" stroke="rgba(255,255,255,.08)" />
            <g className="cr-face"><Eyes mood={mood} cy={s.face} /></g>
            <Accessories list={accessories} face={s.face} top={s.top} w={s.w} />
          </g>
        </svg>
      </span>
    </span>
  );
}

/** A creature that hasn't hatched yet. */
export function Egg({ color, size = 72, title }: { color: Accent; size?: number; title?: string }) {
  return (
    <span className="creature egg" style={{ width: size, height: size, ['--c' as string]: `var(--${color})` }} role="img" aria-label={title ?? 'Not hatched yet'}>
      <svg viewBox="0 0 80 80" width="100%" height="100%">
        <ellipse cx="40" cy="74" rx="16" ry="2.8" fill="rgba(0,0,0,.2)" />
        <g className="egg-body">
          <path d="M40 14C54 14 62 36 62 50 62 63 52 72 40 72 28 72 18 63 18 50 18 36 26 14 40 14Z" fill="rgba(255,255,255,.04)" stroke="var(--c)" strokeWidth="2" strokeDasharray="4 3" />
          <g fill="var(--c)" opacity=".85"><rect x="36" y="38" width="3" height="3" /><rect x="39" y="35" width="3" height="3" /><rect x="42" y="38" width="3" height="3" /><rect x="39" y="41" width="3" height="3" /><rect x="39" y="47" width="3" height="3" /></g>
        </g>
      </svg>
    </span>
  );
}
