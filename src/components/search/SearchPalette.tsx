import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../app/store';
import { initiativesForTicket } from '../../lib/roadmap';
import type { TenguTicket } from '../../types/tengu';
import { Avatar, StatusPill } from '../tickets/ticketUi';

type Result =
  | { kind: 'initiative'; id: string; label: string; sub: string; icon: string }
  | { kind: 'ticket'; ticket: TenguTicket; sub: string }
  | { kind: 'person'; name: string; sub: string };

export function SearchPalette() {
  const { state, actions } = useStore();
  const [q, setQ] = useState('');
  const [remote, setRemote] = useState<TenguTicket[]>([]);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  useEffect(() => {
    if (!q.trim()) return setRemote([]);
    let live = true;
    const h = window.setTimeout(() => void actions.searchTengu(q).then((r) => live && setRemote(r)), 140);
    return () => {
      live = false;
      window.clearTimeout(h);
    };
  }, [q, actions]);

  const results = useMemo<Result[]>(() => {
    const s = q.trim().toLowerCase();
    const inis = state.roadmap.initiatives
      .filter((i) => !s || `${i.name} ${i.place} ${i.owner}`.toLowerCase().includes(s))
      .map<Result>((i) => ({ kind: 'initiative', id: i.id, label: i.name, icon: i.icon, sub: `${i.place} · ${i.priority} · ${i.owner}` }));
    const seen = new Set<string>();
    const local = Object.values(state.tickets).filter((t) => s && `${t.key} ${t.title}`.toLowerCase().includes(s));
    const tickets = [...local, ...remote]
      .filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)))
      .slice(0, 8)
      .map<Result>((t) => {
        const ini = initiativesForTicket(state.roadmap.links, t.id)[0];
        const name = state.roadmap.initiatives.find((i) => i.id === ini)?.name;
        return { kind: 'ticket', ticket: t, sub: name ? `in ${name}` : 'Not on the roadmap' };
      });
    const names = new Set<string>([...state.roadmap.initiatives.map((i) => i.owner), ...state.members.map((m) => m.name)]);
    const people = s
      ? [...names].filter((n) => n.toLowerCase().includes(s)).map<Result>((name) => {
          const owns = state.roadmap.initiatives.filter((i) => i.owner === name).length;
          const assigned = Object.values(state.tickets).filter((t) => t.assignees.some((a) => a.name === name)).length;
          return { kind: 'person', name, sub: `${owns ? `owns ${owns} initiative${owns > 1 ? 's' : ''} · ` : ''}${assigned} tickets` };
        })
      : [];
    return [...inis.slice(0, 6), ...tickets, ...people.slice(0, 4)];
  }, [q, remote, state.roadmap, state.tickets, state.members]);

  useEffect(() => setCursor(0), [q]);

  const choose = (r: Result) => {
    actions.closeModal();
    actions.setMode('world');
    if (r.kind === 'initiative') actions.enterInitiative(r.id);
    else if (r.kind === 'ticket') {
      const ini = initiativesForTicket(state.roadmap.links, r.ticket.id)[0];
      actions.enterInitiative(ini ?? null);
      actions.openTicket(r.ticket.id);
    } else {
      actions.enterInitiative(null);
      actions.setSpotlight(r.name);
    }
  };

  let lastKind = '';
  return (
    <div className="modal-scrim" onMouseDown={actions.closeModal}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Search">
        <div className="palette-input">
          <span aria-hidden>⌕</span>
          <input
            ref={input}
            value={q}
            placeholder="Search initiatives, Tengu tickets, people…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(results.length - 1, c + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
              if (e.key === 'Enter' && results[cursor]) choose(results[cursor]);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-results">
          {results.length === 0 && <div className="palette-empty">Nothing here yet — try “marketplace”, “FIJI-218” or “Natalia”.</div>}
          {results.map((r, i) => {
            const header = r.kind !== lastKind ? (lastKind = r.kind) : null;
            const key = r.kind === 'ticket' ? r.ticket.id : r.kind === 'initiative' ? r.id : r.name;
            return (
              <div key={`${r.kind}-${key}`}>
                {header && <div className="palette-group">{header === 'initiative' ? 'Initiatives' : header === 'ticket' ? 'Tengu tickets' : 'People'}</div>}
                <button className={`palette-item ${i === cursor ? 'is-on' : ''}`} onMouseEnter={() => setCursor(i)} onClick={() => choose(r)}>
                  {r.kind === 'initiative' && <><span className="pi-icon">{r.icon}</span><b>{r.label}</b><span className="muted">{r.sub}</span></>}
                  {r.kind === 'ticket' && <><span className="pi-key">{r.ticket.key}</span><b>{r.ticket.title}</b><StatusPill ticket={r.ticket} /><span className="muted">{r.sub}</span></>}
                  {r.kind === 'person' && <><Avatar name={r.name} size={20} /><b>{r.name}</b><span className="muted">{r.sub} · spotlight in HQ</span></>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
