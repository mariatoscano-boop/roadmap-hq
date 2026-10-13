import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../app/store';

export function QuickActions() {
  const { state, actions } = useStore();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  const items = [
    { label: 'New Initiative', key: 'N', run: () => actions.openModal('new-initiative') },
    { label: 'Link Tengu Ticket', key: 'L', run: () => actions.openModal('link', state.activeInitiative) },
    { label: 'Create Tengu Ticket', key: 'C', run: () => actions.openModal('create', state.activeInitiative) },
    { label: 'Sync Now', key: 'S', run: () => void actions.syncNow() },
  ];

  return (
    <div className={`fab ${open ? 'is-open' : ''}`} ref={root}>
      <div className="fab-menu" role="menu" aria-hidden={!open}>
        {items.map((it, i) => (
          <button key={it.label} role="menuitem" tabIndex={open ? 0 : -1} style={{ ['--i' as string]: items.length - i }} onClick={() => { setOpen(false); it.run(); }}>
            <span>{it.label}</span>
            <kbd>{it.key}</kbd>
          </button>
        ))}
      </div>
      <button className="fab-btn" onClick={() => setOpen((o) => !o)} aria-label="Quick actions" aria-expanded={open}>
        +
      </button>
    </div>
  );
}
