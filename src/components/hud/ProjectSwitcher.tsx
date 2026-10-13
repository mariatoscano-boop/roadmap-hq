import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../app/store';

/** Switch between projects (Tengu spaces). Each project has its own roadmap. */
export function ProjectSwitcher() {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = state.projects.find((p) => p.id === state.projectId);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false));
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc, true);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', esc, true);
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || e.metaKey || e.ctrlKey || state.modal) return;
      if (e.key.toLowerCase() === 'p') setOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.modal]);

  const counts = new Map<string, number>();
  for (const i of state.allInitiatives) counts.set(i.projectId, (counts.get(i.projectId) ?? 0) + 1);

  return (
    <div className="project-switcher" ref={root}>
      <button className="ps-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} title="Switch project (P)">
        <span className="ps-label">Project</span>
        <b>{current?.name ?? '…'}</b>
        <span className="ps-caret" aria-hidden>▾</span>
      </button>
      {open && (
        <div className="ps-menu" role="listbox" aria-label="Projects">
          <div className="ps-head">Projects from Tengu</div>
          {state.projects.map((p) => {
            const n = counts.get(p.id) ?? 0;
            return (
              <button
                key={p.id}
                role="option"
                aria-selected={p.id === state.projectId}
                className={`ps-item ${p.id === state.projectId ? 'on' : ''}`}
                onClick={() => {
                  if (p.id !== state.projectId) actions.setProject(p.id);
                  setOpen(false);
                }}
              >
                <span className="ps-mark" aria-hidden>{p.name.slice(0, 1).toUpperCase()}</span>
                <span className="ps-text">
                  <b>{p.name}</b>
                  <small>
                    {n ? `${n} initiative${n === 1 ? '' : 's'}` : 'No roadmap yet'}
                    {p.inTengu ? ` · ${p.lists.length} Tengu list${p.lists.length === 1 ? '' : 's'}` : ' · not found in your Tengu'}
                  </small>
                </span>
                {p.id === state.projectId && <span className="ps-check" aria-hidden>✓</span>}
              </button>
            );
          })}
          {state.tenguProjects === null && !state.projectsError && <div className="ps-note">Loading projects from Tengu…</div>}
          {state.projectsError && <div className="ps-note ps-error">{state.projectsError}</div>}
          <div className="ps-foot">
            <span>New Tengu spaces show up here automatically.</span>
            <button onClick={() => void actions.reloadProjects()}>Refresh</button>
          </div>
        </div>
      )}
    </div>
  );
}
