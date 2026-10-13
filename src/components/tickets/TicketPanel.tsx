import { useEffect } from 'react';
import { useStore } from '../../app/store';
import { isOverdue } from '../../lib/progress';
import { initiativesForTicket } from '../../lib/roadmap';
import type { TenguPriority } from '../../types/tengu';
import { Avatar, Markdownish, PRIORITY_LABEL, ROLE_COLOR, StatusPill, timeAgo } from './ticketUi';

export function TicketPanel() {
  const { state, actions } = useStore();
  const id = state.activeTicket;
  const t = id ? state.tickets[id] : null;

  useEffect(() => {
    if (id) void actions.loadTicketDetail(id);
  }, [id, actions]);

  if (!t) return null;
  const list = state.lists.find((l) => l.id === t.listId);
  const linked = initiativesForTicket(state.roadmap.links, t.id)
    .map((iid) => state.roadmap.initiatives.find((i) => i.id === iid))
    .filter(Boolean);
  const context = state.activeInitiative;
  const overdue = isOverdue(t);

  return (
    <>
      <div className="panel-scrim" onClick={() => actions.openTicket(null)} />
      <aside className="panel" role="dialog" aria-label={`${t.key} ${t.title}`} style={{ ['--c' as string]: ROLE_COLOR[t.statusRole] }}>
        <div className="panel-glow" aria-hidden />
        <header className="panel-head">
          <span className="panel-key">{t.key}</span>
          <span className="panel-source">Tengu · {list?.space} / {list?.name}</span>
          <button className="icon-btn" onClick={() => actions.openTicket(null)} aria-label="Close">✕</button>
        </header>
        <h2 className="panel-title">{t.title}</h2>
        <div className="panel-status-line">
          <StatusPill ticket={t} />
          <span className="muted">updated {timeAgo(t.updatedAt)}</span>
        </div>

        <a className="btn btn-primary btn-block" href={t.url} target="_blank" rel="noreferrer">
          Open in Tengu ↗
        </a>

        <section className="panel-fields">
          <div className="field-note">These fields live in Tengu — edits sync back automatically.</div>
          <label className="field">
            <span>Status</span>
            <select value={t.status} onChange={(e) => actions.updateTicket(t.id, { status: e.target.value })}>
              {(list?.statuses ?? [{ status: t.status, role: t.statusRole }]).map((s) => (
                <option key={s.status} value={s.status}>{s.status}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Priority</span>
            <select
              value={t.priority ?? ''}
              onChange={(e) => actions.updateTicket(t.id, { priority: e.target.value ? (Number(e.target.value) as TenguPriority) : null })}
            >
              <option value="">None</option>
              {([1, 2, 3, 4] as TenguPriority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Assignee</span>
            <div className="field-with-avatar">
              <Avatar name={t.assignees[0]?.name ?? null} size={20} />
              <select value={t.assignees[0]?.id ?? ''} onChange={(e) => actions.updateTicket(t.id, { assignee: e.target.value || null })}>
                <option value="">Unassigned</option>
                {state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </label>
          <label className="field">
            <span>Due date</span>
            <input
              type="date"
              className={overdue ? 'is-overdue' : ''}
              value={t.dueDate ?? ''}
              onChange={(e) => actions.updateTicket(t.id, { dueDate: e.target.value || null })}
            />
          </label>
        </section>

        <section className="panel-section">
          <h4>Description</h4>
          {t.description ? <Markdownish text={t.description} /> : <p className="muted">No description.</p>}
        </section>

        <section className="panel-section">
          <h4>Roadmap</h4>
          {linked.length === 0 && <p className="muted">Not linked to any initiative.</p>}
          {linked.map((i) => (
            <div key={i!.id} className="linked-row">
              <button className="chip" onClick={() => { actions.enterInitiative(i!.id); actions.openTicket(t.id); }}>
                {i!.icon} {i!.name}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  actions.unlink(i!.id, t.id);
                  if (context === i!.id) actions.openTicket(null);
                }}
              >
                Unlink
              </button>
            </div>
          ))}
          <p className="fine">Unlinking only removes the roadmap relationship. The ticket stays in Tengu.</p>
        </section>

        <section className="panel-section">
          <h4>Activity</h4>
          {t.comments === undefined && <div className="skeleton" />}
          {t.comments?.length === 0 && <p className="muted">No activity yet.</p>}
          <ol className="activity">
            {t.comments?.map((c) => (
              <li key={c.id}>
                <Avatar name={c.author} size={20} />
                <div>
                  <div className="activity-head"><b>{c.author}</b><span className="muted">{timeAgo(c.createdAt)}</span></div>
                  <Markdownish text={c.body} />
                </div>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </>
  );
}
