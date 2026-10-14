/** Top bar, mobile bar, toasts. Navigation is minimal: the map does most of it. */
import { useEffect, useState, type ReactElement } from 'react';
import { levelOf, levelProgress, LEVEL_XP } from '../lib/world';
import { useStore } from '../store/store';
import type { View } from '../types';
import { IconCollection, IconPlug, IconPlus, IconQuests, IconToday, IconWorlds } from './Icons';
import { Kbd, Num, WorldCreature } from './ui';

type NavName = 'today' | 'worlds' | 'quests' | 'collection';
export const NAV: { name: NavName; label: string; Icon: (p: { size?: number }) => ReactElement }[] = [
  { name: 'today', label: 'Today', Icon: IconToday },
  { name: 'worlds', label: 'Worlds', Icon: IconWorlds },
  { name: 'quests', label: 'Quests', Icon: IconQuests },
  { name: 'collection', label: 'Collection', Icon: IconCollection },
];
const activeOf = (v: View): NavName => (v.name === 'world' ? 'worlds' : v.name);

export function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg viewBox="0 0 20 20" width="20" height="20"><rect x="1.5" y="3" width="17" height="14" rx="4.5" fill="var(--ink)" /><rect x="6" y="7.5" width="2" height="4" rx="1" fill="#e9fff6" /><rect x="12" y="7.5" width="2" height="4" rx="1" fill="#e9fff6" /></svg>
    </span>
  );
}

export function Xp() {
  const { state, ui } = useStore();
  const xp = state.totalXp;
  return (
    <span className="xp" title={`Level ${levelOf(xp)} · ${xp} ✦`}>
      <span className="xp-lvl">LV{levelOf(xp)}</span>
      <span className="xp-bar"><i style={{ width: `${levelProgress(xp) * 100}%` }} /></span>
      <span className="xp-n"><Num value={xp} /> ✦</span>
      {ui.xpBump > 0 && <span key={ui.xpBump} className="xp-pop" aria-hidden="true">+20 ✦</span>}
      <span className="sr-only">{xp % LEVEL_XP} of {LEVEL_XP} to next level</span>
    </span>
  );
}

export function TopBar() {
  const { ui, actions } = useStore();
  const active = activeOf(ui.view);
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={() => actions.navigate({ name: 'today' })}><Logo /> <span>MOCHI</span></button>
      <nav className="nav" aria-label="Main">
        {NAV.map(({ name, label, Icon }) => (
          <button key={name} type="button" className={active === name ? 'on' : ''} aria-current={active === name ? 'page' : undefined} onClick={() => actions.navigate({ name })}>
            <Icon size={14} /> <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="topbar-right">
        <Xp />
        <button type="button" className="icon-btn" onClick={() => actions.setConnections(true)} aria-label="Connections" title="Connections"><IconPlug /></button>
        <button type="button" className="btn btn-primary create" onClick={() => actions.openComposer()}><IconPlus size={14} /> Create <Kbd>C</Kbd></button>
      </div>
    </header>
  );
}

export function BottomBar() {
  const { ui, actions } = useStore();
  const active = activeOf(ui.view);
  const items = [NAV[0], NAV[1], null, NAV[2], NAV[3]];
  return (
    <nav className="bottombar" aria-label="Main">
      {items.map((n, i) => n ? (
        <button key={n.name} type="button" className={active === n.name ? 'on' : ''} aria-current={active === n.name ? 'page' : undefined} onClick={() => actions.navigate({ name: n.name })}>
          <n.Icon size={18} /><span>{n.label}</span>
        </button>
      ) : (
        <button key={i} type="button" className="bottom-create" onClick={() => actions.openComposer()} aria-label="Create quest"><IconPlus size={20} /></button>
      ))}
    </nav>
  );
}

export function Toasts() {
  const { ui, actions, worldOf } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {ui.toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.worldId && <span className="toast-head"><WorldCreature world={worldOf(t.worldId)} size={26} mini /></span>}
          <span className="toast-text"><b>{t.title}</b>{t.detail && <span>{t.detail}</span>}</span>
          {t.xp && <span className="toast-xp">{t.xp}</span>}
          {t.action && <button type="button" onClick={() => { t.action!.run(); actions.dismissToast(t.id); }}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}
