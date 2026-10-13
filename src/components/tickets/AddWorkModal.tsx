import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../app/store';
import type { TenguTicket } from '../../types/tengu';
import { Avatar, ROLE_COLOR } from './ticketUi';

/**
 * One box for adding work: type what it is and press Enter to add a plain roadmap item,
 * or pick matching Tengu tickets from the list underneath to link them.
 * In "link-item" mode it links one existing roadmap item to a Tengu ticket.
 */
export function AddWorkModal() {
  const { state, actions } = useStore();
  const linkMode = state.modal === 'link-item';
  const linkingItem = linkMode ? state.items.find((i) => i.id === state.modalTarget) : null;
  const [target, setTarget] = useState(
    linkingItem?.initiativeId ?? state.modalTarget ?? state.activeInitiative ?? state.initiatives[0]?.id ?? '',
  );
  const [q, setQ] = useState(linkingItem?.title ?? '');
  const [results, setResults] = useState<TenguTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<TenguTicket[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const ini = state.initiatives.find((i) => i.id === target);

  const linkedHere = useMemo(
    () => new Set(state.items.filter((i) => i.initiativeId === target && i.tengu).map((i) => i.tengu!.id)),
    [state.items, target],
  );
  const linkedElsewhere = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of state.items) if (i.tengu && i.initiativeId !== target) m.set(i.tengu.id, state.allInitiatives.find((x) => x.id === i.initiativeId)?.name ?? '');
    return m;
  }, [state.items, state.allInitiatives, target]);
  const project = state.projects.find((p) => p.id === state.projectId);
  const projectLists = new Set(project?.lists.map((l) => l.id) ?? []);

  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    let live = true;
    setError(null);
    const h = window.setTimeout(() => {
      setResults(null);
      actions.searchTengu(q).then(
        (r) => live && setResults(r),
        (e: Error) => live && (setResults([]), setError(e.message)),
      );
    }, 220);
    return () => {
      live = false;
      window.clearTimeout(h);
    };
  }, [q, actions]);

  const sorted = (results ?? []).slice().sort((a, b) => Number(linkedHere.has(a.id)) - Number(linkedHere.has(b.id)));
  // Tickets from this project's Tengu lists first; everything else Tengu found after.
  const inProject = projectLists.size ? sorted.filter((t) => projectLists.has(t.listId)) : sorted;
  const more = projectLists.size ? sorted.filter((t) => !projectLists.has(t.listId)) : [];
  const toggle = (t: TenguTicket) => {
    if (linkMode && linkingItem) {
      actions.linkItem(linkingItem.id, t);
      actions.closeModal();
      return;
    }
    setPicked((p) => (p.some((x) => x.id === t.id) ? p.filter((x) => x.id !== t.id) : [...p, t]));
  };

  const addPlain = () => {
    const title = q.trim();
    if (!title || !target) return;
    actions.addItem(target, title);
    setAdded((a) => [title, ...a].slice(0, 5));
    setQ('');
    input.current?.focus();
  };
  const addPicked = () => {
    if (!picked.length || !target) return;
    actions.linkTickets(target, picked);
    setAdded((a) => [...picked.map((t) => t.key || t.title), ...a].slice(0, 5));
    setPicked([]);
  };

  return (
    <div className="modal-scrim" onMouseDown={actions.closeModal}>
      <div className="modal add-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label={linkMode ? 'Link to a Tengu ticket' : 'Add work'}>
        <header className="modal-head">
          <h3>{linkMode ? 'Link to a Tengu ticket' : 'Add work'}</h3>
          {!linkMode && (
            <label className="modal-target">
              to
              <select id="add-target" value={target} onChange={(e) => { setTarget(e.target.value); setPicked([]); }}>
                {state.initiatives.map((i) => <option key={i.id} value={i.id}>{i.icon} {i.name}</option>)}
              </select>
            </label>
          )}
        </header>
        {linkMode && <p className="fine">Pick the ticket for “{linkingItem?.title}”. Its status will then come from Tengu.</p>}

        <div className="palette-input add-input">
          <span aria-hidden>{linkMode ? '⌕' : '+'}</span>
          <input
            id="add-query"
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={linkMode ? 'Search Tengu tickets…' : 'What’s the work? Type to add it, or find a Tengu ticket'}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (linkMode) return;
              if (picked.length) addPicked();
              else addPlain();
            }}
          />
          {!linkMode && q.trim() && <kbd>Enter</kbd>}
        </div>

        {!linkMode && q.trim() && (
          <button className="add-plain" onClick={addPlain}>
            <span className="add-plain-icon">+</span>
            <span>
              Add <b>“{q.trim()}”</b> as a roadmap item
              <small>No Tengu ticket needed. You can link one later.</small>
            </span>
          </button>
        )}

        <div className="add-section-head">
          {linkMode ? `Tengu tickets in ${project?.name ?? 'this project'}` : q.trim() ? `Or link matching Tengu tickets in ${project?.name ?? 'this project'}` : `Recent Tengu tickets in ${project?.name ?? 'this project'}`}
          {!state.tenguLive && <span className="sample-tag">sample data</span>}
        </div>
        <div className="link-results">
          {results === null && !error && <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>}
          {error && <div className="inline-error">{error} You can still add roadmap items without a link.</div>}
          {results?.length === 0 && !error && <div className="palette-empty">No Tengu tickets match “{q}”.</div>}
          {results && results.length > 0 && inProject.length === 0 && <div className="palette-empty small">Nothing in {project?.name}’s lists. See other matches below.</div>}
          {[...inProject, ...more].map((t, idx) => {
            const here = linkedHere.has(t.id);
            const on = picked.some((x) => x.id === t.id);
            const elsewhere = linkedElsewhere.get(t.id);
            const header = more.length > 0 && idx === inProject.length;
            return (
              <div key={t.id} className="link-row">
              {header && <div className="add-section-head add-section-sub">More from Tengu</div>}
              <button disabled={here} className={`link-item ${on ? 'is-on' : ''} ${here ? 'is-linked' : ''}`} onClick={() => toggle(t)}>
                {!linkMode && <span className="checkbox" aria-hidden>{here || on ? '✓' : ''}</span>}
                {t.key && <span className="pi-key">{t.key}</span>}
                <span className="link-title">{t.title}</span>
                {t.status && (
                  <span className="status-pill" style={{ ['--c' as string]: ROLE_COLOR[t.statusRole] }}><i />{t.status}</span>
                )}
                {t.assignees[0] && <Avatar name={t.assignees[0].name} size={18} />}
                {here ? <span className="muted small">Added</span> : elsewhere ? <span className="muted small">in {elsewhere}</span> : null}
              </button>
              </div>
            );
          })}
        </div>

        <footer className="modal-foot">
          {added.length > 0 ? (
            <span className="fine added-line">✓ Added {added.length === 1 ? `“${added[0]}”` : `${added.length} items`} to {ini?.name}</span>
          ) : (
            <span className="fine">{linkMode ? 'Linking doesn’t change anything in Tengu.' : 'Linked tickets keep their status from Tengu. Nothing is copied or changed there.'}</span>
          )}
          <button className="btn btn-ghost" onClick={actions.closeModal}>{added.length ? 'Done' : 'Cancel'}</button>
          {!linkMode && (
            <button className="btn btn-primary" disabled={!picked.length} onClick={addPicked}>
              Add {picked.length || ''} ticket{picked.length === 1 ? '' : 's'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
