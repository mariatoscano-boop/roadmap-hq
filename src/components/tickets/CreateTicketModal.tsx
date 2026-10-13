import { useState } from 'react';
import { useStore } from '../../app/store';
import type { TenguPriority } from '../../types/tengu';
import { PRIORITY_LABEL } from './ticketUi';

export function CreateTicketModal() {
  const { state, actions } = useStore();
  const [name, setName] = useState('');
  const [listId, setListId] = useState(state.lists[0]?.id ?? '');
  const [priority, setPriority] = useState<TenguPriority>(3);
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');
  const [description, setDescription] = useState('');
  const [linkTo, setLinkTo] = useState(state.modalTarget ?? state.activeInitiative ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !listId) return;
    setBusy(true);
    const t = await actions.createTicket(
      { listId, name: name.trim(), priority, assignee: assignee || undefined, dueDate: due || undefined, description },
      linkTo || null,
    );
    setBusy(false);
    if (t) actions.closeModal();
  };

  return (
    <div className="modal-scrim" onMouseDown={actions.closeModal}>
      <form
        className="modal modal-form"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); void submit(); }}
        aria-label="Create Tengu ticket"
      >
        <header className="modal-head"><h3>+ Create Tengu ticket</h3></header>
        <input className="input-title" autoFocus placeholder="What needs doing?" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea placeholder="Details (Markdown)…" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="form-grid">
          <label className="field"><span>Tengu list</span>
            <select value={listId} onChange={(e) => setListId(e.target.value)}>
              {state.lists.map((l) => <option key={l.id} value={l.id}>{l.space} / {l.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(Number(e.target.value) as TenguPriority)}>
              {([1, 2, 3, 4] as TenguPriority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </label>
          <label className="field"><span>Assignee</span>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Unassigned</option>
              {state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Due</span><input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
          <label className="field field-wide"><span>Link to initiative</span>
            <select value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
              <option value="">Don't link</option>
              {state.roadmap.initiatives.map((i) => <option key={i.id} value={i.id}>{i.icon} {i.name}</option>)}
            </select>
          </label>
        </div>
        <footer className="modal-foot">
          <span className="fine">Creates a real ticket in Tengu.</span>
          <button type="button" className="btn btn-ghost" onClick={actions.closeModal}>Cancel</button>
          <button className="btn btn-primary" disabled={!name.trim() || busy}>{busy ? 'Creating…' : 'Create in Tengu'}</button>
        </footer>
      </form>
    </div>
  );
}
