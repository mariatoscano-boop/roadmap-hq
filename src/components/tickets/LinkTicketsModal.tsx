import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../app/store';
import type { TenguTicket } from '../../types/tengu';
import { Avatar, StatusPill } from './ticketUi';

export function LinkTicketsModal() {
  const { state, actions } = useStore();
  const [target, setTarget] = useState(state.modalTarget ?? state.activeInitiative ?? state.roadmap.initiatives[0]?.id ?? '');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<TenguTicket[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const linked = new Set(state.roadmap.links[target] ?? []);
  const ini = state.roadmap.initiatives.find((i) => i.id === target);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    let live = true;
    setResults(null);
    const h = window.setTimeout(() => void actions.searchTengu(q).then((r) => live && setResults(r)), 160);
    return () => {
      live = false;
      window.clearTimeout(h);
    };
  }, [q, actions]);

  // Tickets not on the roadmap yet first, then ones linked elsewhere, then ones already here.
  const allLinked = new Set(Object.values(state.roadmap.links).flat());
  const rank = (t: TenguTicket) => (linked.has(t.id) ? 2 : allLinked.has(t.id) ? 1 : 0);
  const sorted = results && [...results].sort((a, b) => rank(a) - rank(b));

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const submit = () => {
    if (!picked.length || !target) return;
    actions.link(target, picked);
    actions.closeModal();
  };

  return (
    <div className="modal-scrim" onMouseDown={actions.closeModal}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Link Tengu tickets">
        <header className="modal-head">
          <h3>🔗 Link Tengu tickets</h3>
          <label className="modal-target">
            to
            <select value={target} onChange={(e) => { setTarget(e.target.value); setPicked([]); }}>
              {state.roadmap.initiatives.map((i) => <option key={i.id} value={i.id}>{i.icon} {i.name}</option>)}
            </select>
          </label>
        </header>
        <div className="palette-input">
          <span aria-hidden>⌕</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Tengu tickets…"
            onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && submit()}
          />
        </div>
        <div className="link-results">
          {results === null && <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>}
          {results?.length === 0 && <div className="palette-empty">No Tengu tickets match “{q}”.</div>}
          {sorted?.map((t) => {
            const already = linked.has(t.id);
            const on = picked.includes(t.id);
            return (
              <button key={t.id} disabled={already} className={`link-item ${on ? 'is-on' : ''} ${already ? 'is-linked' : ''}`} onClick={() => toggle(t.id)}>
                <span className="checkbox" aria-hidden>{already ? '✓' : on ? '✓' : ''}</span>
                <span className="pi-key">{t.key}</span>
                <span className="link-title">{t.title}</span>
                <StatusPill ticket={t} />
                <Avatar name={t.assignees[0]?.name ?? null} size={18} />
                {already ? <span className="muted small">Linked</span> : rank(t) === 1 && <span className="muted small">elsewhere</span>}
              </button>
            );
          })}
        </div>
        <footer className="modal-foot">
          <span className="fine">Linking creates a relationship only — tickets stay in Tengu, nothing is copied.</span>
          <button className="btn btn-ghost" onClick={actions.closeModal}>Cancel</button>
          <button className="btn btn-primary" disabled={!picked.length} onClick={submit}>
            Link {picked.length || ''} to {ini?.name}
          </button>
        </footer>
      </div>
    </div>
  );
}
