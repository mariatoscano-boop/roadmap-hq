import { useEffect, useMemo, useRef, useState } from 'react';
import { useInitiativeViews } from '../../app/selectors';
import { useStore } from '../../app/store';
import type { Mission } from '../../types/roadmap';
import { Avatar, StatusPill } from '../tickets/ticketUi';

type Result =
  | { kind: 'initiative'; id: string; label: string; sub: string; icon: string }
  | { kind: 'item'; mission: Mission; sub: string }
  | { kind: 'person'; name: string; sub: string };

export function SearchPalette() {
  const { state, actions } = useStore();
  const views = useInitiativeViews(state);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => setCursor(0), [q]);

  const results = useMemo<Result[]>(() => {
    const s = q.trim().toLowerCase();
    const inis = state.initiatives
      .filter((i) => !s || `${i.name} ${i.place} ${i.owner}`.toLowerCase().includes(s))
      .map<Result>((i) => ({ kind: 'initiative', id: i.id, label: i.name, icon: i.icon, sub: `${i.zone.toUpperCase()} · ${i.priority} · ${i.owner || 'No owner'}` }));
    const items = s
      ? Object.values(views)
          .flatMap((v) => v.missions.map((m) => ({ m, v })))
          .filter(({ m }) => `${m.key ?? ''} ${m.title} ${m.assignee ?? ''}`.toLowerCase().includes(s))
          .slice(0, 8)
          .map<Result>(({ m, v }) => ({ kind: 'item', mission: m, sub: `in ${v.initiative.name}` }))
      : [];
    const names = new Set<string>();
    for (const v of Object.values(views)) {
      if (v.initiative.owner) names.add(v.initiative.owner);
      for (const m of v.missions) if (m.assignee) names.add(m.assignee);
    }
    const people = s
      ? [...names].filter((n) => n.toLowerCase().includes(s)).map<Result>((name) => {
          const owns = state.initiatives.filter((i) => i.owner === name).length;
          const on = Object.values(views).reduce((n, v) => n + v.missions.filter((m) => m.assignee === name).length, 0);
          return { kind: 'person', name, sub: `${owns ? `owns ${owns} · ` : ''}${on} items` };
        })
      : [];
    return [...inis.slice(0, 6), ...items, ...people.slice(0, 4)];
  }, [q, state.initiatives, views]);

  const choose = (r: Result) => {
    actions.closeModal();
    if (r.kind === 'initiative') actions.enterInitiative(r.id);
    else if (r.kind === 'item') {
      actions.enterInitiative(r.mission.item.initiativeId);
      actions.openItem(r.mission.id);
    } else {
      actions.enterInitiative(null);
      actions.setMode('world');
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
            id="search-query"
            ref={input}
            value={q}
            placeholder="Search initiatives, work and people…"
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
          {results.length === 0 && <div className="palette-empty">Nothing matches “{q}”.</div>}
          {results.map((r, i) => {
            const header = r.kind !== lastKind ? (lastKind = r.kind) : null;
            const key = r.kind === 'item' ? r.mission.id : r.kind === 'initiative' ? r.id : r.name;
            return (
              <div key={`${r.kind}-${key}`}>
                {header && <div className="palette-group">{header === 'initiative' ? 'Initiatives' : header === 'item' ? 'Work' : 'People'}</div>}
                <button className={`palette-item ${i === cursor ? 'is-on' : ''}`} onMouseEnter={() => setCursor(i)} onClick={() => choose(r)}>
                  {r.kind === 'initiative' && <><span className="pi-icon">{r.icon}</span><b>{r.label}</b><span className="muted">{r.sub}</span></>}
                  {r.kind === 'item' && <>{r.mission.key && <span className="pi-key">{r.mission.key}</span>}<b>{r.mission.title}</b><StatusPill role={r.mission.role} label={r.mission.statusLabel} /><span className="muted">{r.sub}</span></>}
                  {r.kind === 'person' && <><Avatar name={r.name} size={20} /><b>{r.name}</b><span className="muted">{r.sub} · highlight in HQ</span></>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
