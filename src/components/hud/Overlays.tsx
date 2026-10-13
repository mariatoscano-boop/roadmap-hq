import { useEffect, useState } from 'react';
import { useStore } from '../../app/store';
import { prefersReducedMotion } from '../../app/selectors';

export function Toasts() {
  const { state } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {state.toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>{t.text}</div>
      ))}
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ['/', 'Search'],
  ['P', 'Switch project'],
  ['A', 'Add work'],
  ['N', 'New initiative'],
  ['S', 'Refresh from Tengu'],
  ['1 2 3', 'World · List · Timeline'],
  ['Esc', 'Close panel / go back'],
  ['?', 'This list'],
];

export function ShortcutsOverlay() {
  const { actions } = useStore();
  return (
    <div className="modal-scrim" onMouseDown={actions.closeModal}>
      <div className="modal modal-sm" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Keyboard shortcuts">
        <header className="modal-head"><h3>Keyboard shortcuts</h3></header>
        <dl className="shortcuts">
          {SHORTCUTS.map(([k, v]) => (
            <div key={k}><dt><kbd>{k}</kbd></dt><dd>{v}</dd></div>
          ))}
        </dl>
        <p className="fine">Scroll to zoom the world · drag the ground to pan · double-click to recenter.</p>
      </div>
    </div>
  );
}

export function SpotlightChip() {
  const { state, actions } = useStore();
  if (!state.spotlight || state.activeInitiative || state.mode !== 'world') return null;
  return (
    <div className="spotlight-chip">
      Spotlight: <b>{state.spotlight}</b>
      <button onClick={() => actions.setSpotlight(null)} aria-label="Clear spotlight">✕</button>
    </div>
  );
}

export function StatusBanner() {
  const { state } = useStore();
  const msg = state.dataError;
  if (!msg) return null;
  return <div className="status-banner" role="status">{msg}</div>;
}

export function Intro() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>(prefersReducedMotion() ? 'gone' : 'in');
  useEffect(() => {
    if (phase === 'gone') return;
    const a = window.setTimeout(() => setPhase('out'), 1100);
    const b = window.setTimeout(() => setPhase('gone'), 1700);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (phase === 'gone') return null;
  return (
    <div className={`intro intro-${phase}`} aria-hidden>
      <div className="intro-mark">◆</div>
      <div className="intro-title">PRODUCT HQ</div>
      <div className="intro-sub">entering workspace</div>
    </div>
  );
}
