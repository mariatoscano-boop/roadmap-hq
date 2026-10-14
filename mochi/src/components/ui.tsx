/** Small shared pieces: avatars, project marks, status/priority glyphs, progress, numbers, Mochi. */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { daysFromToday, dueLabel } from '../lib/dates';
import { STATUS_LABEL } from '../lib/selectors';
import type { Accent, Member, Priority, Project, Status, Task } from '../types';

export const accentStyle = (a: Accent) => ({ ['--accent' as string]: `var(--${a})`, ['--accent-soft' as string]: `var(--${a}-soft)` }) as CSSProperties;

export function Avatar({ m, size = 22, ring = false, title }: { m: Member; size?: number; ring?: boolean; title?: string }) {
  return (
    <span
      className={`avatar${ring ? ' avatar-ring' : ''}`}
      style={{ ...accentStyle(m.color), width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.42)) }}
      title={title ?? m.name}
      aria-label={title ?? m.name}
      role="img"
    >
      {m.name.slice(0, 1)}
    </span>
  );
}

export function AvatarStack({ members, size = 22, max = 4 }: { members: Member[]; size?: number; max?: number }) {
  return (
    <span className="avatar-stack" aria-label={members.map((m) => m.name).join(', ')}>
      {members.slice(0, max).map((m) => <Avatar key={m.id} m={m} size={size} ring />)}
      {members.length > max && <span className="avatar avatar-more" style={{ width: size, height: size }}>+{members.length - max}</span>}
    </span>
  );
}

export function ProjectMark({ p, size = 12 }: { p: Project; size?: number }) {
  return <span className="pmark" style={{ ...accentStyle(p.color), width: size, height: size }} aria-hidden="true" />;
}

export function ProjectTag({ p, text }: { p: Project; text?: string }) {
  return (
    <span className="ptag" style={accentStyle(p.color)}>
      <ProjectMark p={p} size={7} />
      {text ?? p.name}
    </span>
  );
}

/** Status glyph. A button that completes/reopens when `onToggle` is given. */
export function StatusIcon({ status, onToggle, label, size = 16 }: { status: Status; onToggle?: () => void; label?: string; size?: number }) {
  const g = (
    <svg viewBox="0 0 16 16" width={size} height={size} className={`status status-${status}`} aria-hidden="true">
      {status === 'todo' && <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 1.8" />}
      {status === 'progress' && (<><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 4a4 4 0 0 1 0 8z" fill="currentColor" /></>)}
      {status === 'review' && (<><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 4a4 4 0 1 1-4 4h4z" fill="currentColor" /></>)}
      {status === 'blocked' && (<><circle cx="8" cy="8" r="6.6" fill="currentColor" /><path d="M5.2 8h5.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /></>)}
      {status === 'done' && (<><circle cx="8" cy="8" r="6.6" fill="currentColor" /><path className="status-check" d="m5.2 8.2 1.9 1.9 3.8-4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></>)}
    </svg>
  );
  if (!onToggle) return <span className="status-wrap" title={STATUS_LABEL[status]}>{g}</span>;
  return (
    <button
      type="button"
      className="status-btn"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      role="checkbox"
      aria-checked={status === 'done'}
      aria-label={label ?? (status === 'done' ? 'Reopen' : 'Complete')}
      title={status === 'done' ? 'Reopen' : `${STATUS_LABEL[status]} · click to complete`}
    >
      {g}
    </button>
  );
}

export function PriorityIcon({ p }: { p: Priority }) {
  if (p === 'urgent') {
    return (
      <span className="prio prio-urgent" title="Urgent" aria-label="Urgent">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="currentColor" /><path d="M8 4.5v4.2M8 11.2v.3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </span>
    );
  }
  const n = p === 'high' ? 3 : p === 'medium' ? 2 : 1;
  return (
    <span className={`prio prio-${p}`} title={`${p[0].toUpperCase()}${p.slice(1)} priority`} aria-label={`${p} priority`}>
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        {[0, 1, 2].map((i) => <rect key={i} x={2.5 + i * 4} y={10 - i * 3.5} width="2.6" height={4 + i * 3.5} rx=".8" fill="currentColor" opacity={i < n ? 1 : 0.22} />)}
      </svg>
    </span>
  );
}

export function Due({ t }: { t: Task }) {
  if (!t.dueDate) return null;
  const n = daysFromToday(t.dueDate);
  const late = t.status !== 'done' && n < 0;
  return (
    <span className={`due${late ? ' due-late' : n === 0 && t.status !== 'done' ? ' due-today' : ''}`}>
      {late ? (n === -1 ? 'Yesterday' : `${-n}d late`) : dueLabel(t.dueDate)}
    </span>
  );
}

export function Ring({ value, size = 44, stroke = 4, accent = 'var(--ink)', track = 'var(--line)', children }: { value: number; size?: number; stroke?: number; accent?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} className="ring-arc" />
      </svg>
      {children !== undefined && <span className="ring-inner">{children}</span>}
    </span>
  );
}

export function Bar({ value, accent = 'var(--ink)', height = 6, label }: { value: number; accent?: string; height?: number; label?: string }) {
  return (
    <span className="bar" style={{ height }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <i style={{ width: `${Math.min(1, Math.max(0, value)) * 100}%`, background: accent }} />
    </span>
  );
}

const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animates a number from its last value to the new one. */
export function Num({ value, format = (n: number) => String(Math.round(n)), ms = 650 }: { value: number; format?: (n: number) => string; ms?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce() || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      setShown(a + (value - a) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, ms]);
  return <span className="num">{format(shown)}</span>;
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Mochi: a small, abstract companion orb. Secondary by design: it shows up in focus mode,
 * level-ups, empty states and settings, never as a permanent panel.
 */
export function MochiOrb({ size = 28, mood = 'idle' }: { size?: number; mood?: 'idle' | 'happy' | 'focus' }) {
  return (
    <span className={`orb orb-${mood}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 40 40" width={size} height={size}>
        <defs>
          <radialGradient id="orb-g" cx="35%" cy="28%" r="80%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".38" stopColor="#d9cffd" />
            <stop offset=".78" stopColor="#7b5cfa" />
            <stop offset="1" stopColor="#e84c88" />
          </radialGradient>
        </defs>
        <path className="orb-body" d="M20 5c9 0 15 6.5 15 15.5S29 35 20 35 5 29.5 5 20.5 11 5 20 5Z" fill="url(#orb-g)" />
        {mood === 'happy' ? (
          <g fill="none" stroke="#18151a" strokeWidth="1.8" strokeLinecap="round"><path d="M14.5 21q1.8-2.4 3.6 0" /><path d="M21.9 21q1.8-2.4 3.6 0" /></g>
        ) : mood === 'focus' ? (
          <g fill="none" stroke="#18151a" strokeWidth="1.8" strokeLinecap="round"><path d="M14.5 21h3.6" /><path d="M21.9 21h3.6" /></g>
        ) : (
          <g className="orb-eyes" fill="#18151a"><circle cx="16.3" cy="20.5" r="1.7" /><circle cx="23.7" cy="20.5" r="1.7" /></g>
        )}
      </svg>
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
