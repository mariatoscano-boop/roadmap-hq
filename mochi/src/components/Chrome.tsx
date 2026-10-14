/** Navigation (rail on desktop, bottom bar on phones), the floating +, toasts and confetti. */
import { useEffect, useState, type ReactElement } from 'react';
import { relativeTime } from '../lib/dates';
import { pokeSpeech, restingSpeech } from '../lib/mochi';
import { LEVEL_SIZE, levelOf, levelProgress } from '../lib/rewards';
import { useStore } from '../store/store';
import type { View } from '../types';
import { IconBow, IconFlower, IconHeart, IconPlus, IconSparkle, IconTeddy } from './Icons';
import { Mochi } from './Mochi';

type NavName = Exclude<View['name'], 'project'>;
const NAV: { name: NavName; label: string; Icon: (p: { size?: number }) => ReactElement }[] = [
  { name: 'today', label: 'Today', Icon: IconHeart },
  { name: 'projects', label: 'Projects', Icon: IconBow },
  { name: 'mine', label: 'My Tasks', Icon: IconSparkle },
  { name: 'little', label: 'Little Things', Icon: IconTeddy },
  { name: 'rewards', label: 'Rewards', Icon: IconFlower },
];

const activeOf = (v: View): NavName => (v.name === 'project' ? 'projects' : v.name);

export function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

function StarCount() {
  const { state, ui } = useStore();
  return (
    <span className="stars" aria-label={`${state.character.stars} stars`}>
      <span key={ui.starBump.key} className={ui.starBump.key ? 'stars-bump' : ''}>✦ {state.character.stars}</span>
      {ui.starBump.key > 0 && (
        <span key={`f${ui.starBump.key}`} className={`stars-float ${ui.starBump.delta < 0 ? 'neg' : ''}`} aria-hidden="true">
          {ui.starBump.delta > 0 ? `+${ui.starBump.delta}` : ui.starBump.delta}
        </span>
      )}
    </span>
  );
}

/** Mochi's small self, shown everywhere except Today (where the big Mochi lives). */
function MiniMochi({ placement }: { placement: 'rail' | 'top' }) {
  const { state, ui, actions } = useStore();
  const speech = ui.speech ?? restingSpeech(state.tasks);
  const showBubble = !!ui.speech && ui.view.name !== 'today';
  return (
    <div className={`mini-mochi mini-${placement}`}>
      <button type="button" className="mini-mochi-btn" aria-label="Poke Mochi" onClick={() => actions.say(pokeSpeech(state.tasks))}>
        <Mochi mood={speech.mood} size={placement === 'rail' ? 58 : 40} bounceKey={ui.bounce} />
      </button>
      {showBubble && (
        <div key={ui.speech!.key} className="mini-bubble" role="status">
          {ui.speech!.line}
        </div>
      )}
      <span className="mini-hover-bubble" aria-hidden="true">{speech.line}</span>
    </div>
  );
}

export function Rail() {
  const { state, ui, actions } = useStore();
  const now = useNow();
  const active = activeOf(ui.view);
  const stars = state.character.stars;
  return (
    <aside className="rail" aria-label="Main">
      <div className="brand">
        <span className="brand-word">mochi</span>
        <span className="brand-heart">♡</span>
      </div>
      <nav>
        <ul className="rail-nav">
          {NAV.map(({ name, label, Icon }) => (
            <li key={name}>
              <button type="button" className={active === name ? 'on' : ''} aria-current={active === name ? 'page' : undefined} onClick={() => actions.navigate({ name })}>
                <Icon size={20} />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <button type="button" className="btn btn-primary rail-add" onClick={() => actions.openQuickAdd()}>
        <IconPlus size={18} /> Add something
      </button>
      <div className="rail-spacer" />
      <div className="rail-pal">
        <MiniMochi placement="rail" />
        <div className="rail-pal-info">
          <StarCount />
          <span className="lvl">Level {levelOf(stars)}</span>
          <span className="lvl-bar" role="progressbar" aria-valuemin={0} aria-valuemax={LEVEL_SIZE} aria-valuenow={stars % LEVEL_SIZE} aria-label="Progress to next level">
            <i style={{ width: `${levelProgress(stars) * 100}%` }} />
          </span>
        </div>
      </div>
      <button type="button" className="rail-sync" onClick={() => actions.navigate({ name: 'little' })}>
        <span className={`dot ${state.tengu.connected ? 'ok' : 'off'}${state.tengu.syncing ? ' busy' : ''}`} />
        {state.tengu.syncing ? 'Syncing with Tengu...' : state.tengu.connected ? `Tengu · ${relativeTime(state.tengu.lastSyncedAt, now)}` : 'Tengu not connected'}
      </button>
    </aside>
  );
}

export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-word">mochi</span>
        <span className="brand-heart">♡</span>
      </div>
      <div className="topbar-right">
        <StarCount />
        <MiniMochi placement="top" />
      </div>
    </header>
  );
}

export function BottomNav() {
  const { ui, actions } = useStore();
  const active = activeOf(ui.view);
  return (
    <nav className="bottomnav" aria-label="Main">
      {NAV.map(({ name, label, Icon }) => (
        <button key={name} type="button" className={active === name ? 'on' : ''} aria-current={active === name ? 'page' : undefined} onClick={() => actions.navigate({ name })}>
          <Icon size={22} />
          <span>{label === 'Little Things' ? 'Little' : label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Fab() {
  const { actions } = useStore();
  return (
    <button type="button" className="fab" onClick={() => actions.openQuickAdd()} aria-label="Add something">
      <IconPlus size={26} />
    </button>
  );
}

export function Toasts() {
  const { ui, actions } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {ui.toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone ?? 'plain'}`}>
          <span>{t.text}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.run();
                actions.dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SHAPES = ['♡', '✦', '★', '✿', '♥', '✧'];
const COLORS = ['var(--pink)', 'var(--lilac)', 'var(--peach-deep)', 'var(--pink-deep)', 'var(--butter-deep)', 'var(--cherry)'];

export function Confetti() {
  const { ui } = useStore();
  const [pieces, setPieces] = useState<{ id: number; x: number; d: number; r: number; s: string; c: string; size: number }[]>([]);
  useEffect(() => {
    if (!ui.confetti || reduceMotion()) return;
    const base = ui.confetti * 100;
    setPieces(
      Array.from({ length: 42 }, (_, i) => ({
        id: base + i,
        x: Math.random() * 100,
        d: Math.random() * 0.5,
        r: Math.random() * 360,
        s: SHAPES[i % SHAPES.length],
        c: COLORS[(i * 7) % COLORS.length],
        size: 12 + Math.random() * 12,
      })),
    );
    const t = window.setTimeout(() => setPieces([]), 2600);
    return () => window.clearTimeout(t);
  }, [ui.confetti]);
  if (!pieces.length) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span key={p.id} style={{ left: `${p.x}%`, animationDelay: `${p.d}s`, color: p.c, fontSize: p.size, ['--r' as string]: `${p.r}deg` }}>
          {p.s}
        </span>
      ))}
    </div>
  );
}
