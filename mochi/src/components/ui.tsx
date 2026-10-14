/** Shared pieces: source badges, the live creature for a world, speech, numbers, bars, rings. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { integrationLabel } from '../integrations';
import { hatched } from '../lib/world';
import { useStore } from '../store/store';
import type { Mood, Quest, World } from '../types';
import { Creature, Egg } from './Creature';
import { IconExternal } from './Icons';

/** The Mochi mark: a tiny screen-face. Used for "Private". */
export function MochiMark({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true">
      <rect x=".75" y="1.75" width="10.5" height="8.5" rx="3" fill="currentColor" />
      <rect x="3.6" y="4.4" width="1.3" height="2.4" rx=".6" fill="var(--canvas)" />
      <rect x="7.1" y="4.4" width="1.3" height="2.4" rx=".6" fill="var(--canvas)" />
    </svg>
  );
}

export function SourceBadge({ q, long = false }: { q: Quest; long?: boolean }) {
  if (q.source === 'external' && q.external) {
    return (
      <span className="src src-ext" title={`From ${integrationLabel(q.external.integrationId)} · ${q.external.key}`}>
        <IconExternal size={11} /> {integrationLabel(q.external.integrationId)}{long ? ` · ${q.external.key}` : ''}
      </span>
    );
  }
  return <span className="src src-priv" title="Private: made in Mochi, only you can see it"><MochiMark size={11} /> Private</span>;
}

/**
 * A world's creature as it is right now: an egg until hatched, otherwise its creature wearing
 * what you've equipped, reacting whenever something happens in that world.
 */
export function WorldCreature({ world, size = 64, mini = false, mood, showSpeech = false }: { world: World; size?: number; mini?: boolean; mood?: Mood; showSpeech?: boolean }) {
  const { state, ui } = useStore();
  const r = ui.reaction?.worldId === world.id ? ui.reaction : null;
  if (!hatched(world, state.worldXp)) {
    return <span className="wc">{<Egg color={world.color} size={size} title={`${world.name}: not hatched yet`} />}</span>;
  }
  return (
    <span className="wc">
      <Creature
        body={world.creature.body}
        antenna={world.creature.antenna}
        color={world.color}
        mood={r?.mood ?? mood ?? 'idle'}
        size={size}
        mini={mini}
        accessories={state.equipped[world.id] ?? []}
        reactKey={r?.key}
        title={`${world.creature.name}, the ${world.name} creature`}
      />
      {showSpeech && r && <span key={r.key} className="speech" role="status">{r.line}</span>}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function Bar({ value, color = 'var(--ink)', label }: { value: number; color?: string; label?: string }) {
  return (
    <span className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-label={label}>
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </span>
  );
}

export function Ring({ value, size = 40, stroke = 3, color = 'var(--c)', track = 'rgba(255,255,255,.12)', children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle className="ring-arc" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      {children !== undefined && <span className="ring-inner">{children}</span>}
    </span>
  );
}

const reduce = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts from the last value to the new one. */
export function Num({ value, format = (n: number) => Math.round(n).toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduce() || from.current === value) { from.current = value; setShown(value); return; }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 650);
      setShown(a + (value - a) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value]);
  return <span className="num">{format(shown)}</span>;
}

export const worldStyle = (w: World) => ({ ['--c' as string]: `var(--${w.color})`, ['--c-soft' as string]: `var(--${w.color}-soft)` });

/** Animate a small token from one element to another (used when a quest lands in a world). */
export function fly(from: Element | null, to: Element | null, label: string, color: string, onLand?: () => void) {
  if (!from || !to || reduce()) { onLand?.(); return; }
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'flyer';
  el.textContent = label;
  el.style.setProperty('--c', color);
  el.style.left = `${a.left + a.width / 2}px`;
  el.style.top = `${a.top + a.height / 2}px`;
  document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = el.animate(
    [
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 90}px)) scale(.8)`, opacity: 1, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.25)`, opacity: 0.2 },
    ],
    { duration: 720, easing: 'cubic-bezier(.3,.6,.3,1)' },
  );
  anim.onfinish = () => { el.remove(); onLand?.(); };
}
