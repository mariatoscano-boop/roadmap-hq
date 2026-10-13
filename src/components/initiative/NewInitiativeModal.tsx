import { useState } from 'react';
import { useStore } from '../../app/store';
import { addMonths, monthLabel, ZONE_META, ZONES } from '../../lib/roadmap';
import type { StrategicPriority, Zone } from '../../types/roadmap';

const ICONS = ['✨', '🛰', '🧪', '💳', '🔒', '📦', '🎯', '🌐', '⚙️', '📱'];

export function NewInitiativeModal() {
  const { state, actions } = useStore();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [place, setPlace] = useState('');
  const [zone, setZone] = useState<Zone>('next');
  const [priority, setPriority] = useState<StrategicPriority>('P1');
  const [owner, setOwner] = useState(state.members[0]?.name ?? '');
  const [target, setTarget] = useState('2026-12');
  const [summary, setSummary] = useState('');
  const months = Array.from({ length: 9 }, (_, i) => addMonths('2026-10', i));

  const submit = () => {
    if (!name.trim()) return;
    const id = actions.createInitiative({
      name: name.trim(),
      icon,
      place: place.trim() || `${name.trim()} HQ`,
      zone,
      priority,
      status: zone === 'now' ? 'In Progress' : 'Planning',
      owner,
      target,
      summary: summary.trim() || 'A new initiative taking shape.',
      hue: Math.floor(Math.random() * 360),
    });
    actions.closeModal();
    actions.enterInitiative(id);
  };

  return (
    <div className="modal-scrim" onMouseDown={actions.closeModal}>
      <form className="modal modal-form" onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submit(); }} aria-label="New initiative">
        <header className="modal-head"><h3>New initiative</h3><span className="muted small">Breaks ground in Product HQ</span></header>
        <div className="icon-pick">
          {ICONS.map((i) => (
            <button type="button" key={i} className={i === icon ? 'on' : ''} onClick={() => setIcon(i)} aria-label={`Icon ${i}`}>{i}</button>
          ))}
        </div>
        <input className="input-title" autoFocus placeholder="Initiative name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Place in HQ (e.g. Payments Plaza)" value={place} onChange={(e) => setPlace(e.target.value)} />
        <textarea rows={2} placeholder="Why does this matter?" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div className="zone-switch zone-switch-lg" role="radiogroup" aria-label="Zone">
          {ZONES.map((z) => (
            <button type="button" key={z} role="radio" aria-checked={zone === z} className={`zone-${z} ${zone === z ? 'on' : ''}`} onClick={() => setZone(z)}>
              {ZONE_META[z].emoji} {ZONE_META[z].label}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <label className="field"><span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as StrategicPriority)}>
              {(['P0', 'P1', 'P2', 'P3'] as const).map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="field"><span>Owner</span>
            <select value={owner} onChange={(e) => setOwner(e.target.value)}>
              {state.members.map((m) => <option key={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Target</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m, true)} {m.slice(0, 4)}</option>)}
            </select>
          </label>
        </div>
        <footer className="modal-foot">
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={actions.closeModal}>Cancel</button>
          <button className="btn btn-primary" disabled={!name.trim()}>Break ground</button>
        </footer>
      </form>
    </div>
  );
}
