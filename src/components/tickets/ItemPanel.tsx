import { useEffect, useState } from 'react';
import { timeAgo, useMission } from '../../app/selectors';
import { useStore } from '../../app/store';
import { ITEM_STATUS, ITEM_STATUSES } from '../../lib/missions';
import { isOverdue } from '../../lib/progress';
import { Avatar, formatDue, Markdownish, PRIORITY_LABEL, ROLE_COLOR, StatusPill } from './ticketUi';

export function ItemPanel() {
  const { state, actions } = useStore();
  const m = useMission(state, state.activeItem);
  const [confirm, setConfirm] = useState(false);
  const tenguId = m?.item.tengu?.id;

  useEffect(() => setConfirm(false), [state.activeItem]);
  useEffect(() => {
    if (tenguId) void actions.loadTicketDetail(tenguId);
  }, [tenguId, actions]);

  if (!m) return null;
  const t = m.ticket;
  const edit = state.canEdit;
  const who = m.item.updatedBy ? state.names[m.item.updatedBy] : null;

  return (
    <>
      <div className="panel-scrim" onClick={() => actions.openItem(null)} />
      <aside className="panel" role="dialog" aria-label={m.title} style={{ ['--c' as string]: ROLE_COLOR[m.role] }}>
        <div className="panel-glow" aria-hidden />
        <header className="panel-head">
          {m.linked ? <span className="panel-key">{m.key || 'Tengu'}</span> : <span className="panel-key panel-key-plain">Roadmap item</span>}
          <span className="panel-source">{m.linked ? `Tengu${t?.listName ? ` · ${t.listName}` : ''}` : 'Not linked to Tengu'}</span>
          <button className="icon-btn" onClick={() => actions.openItem(null)} aria-label="Close">✕</button>
        </header>

        {m.linked ? (
          <h2 className="panel-title">{m.title}</h2>
        ) : (
          <textarea
            id="item-title"
            key={m.item.id + m.item.title}
            className="panel-title panel-title-input"
            defaultValue={m.item.title}
            disabled={!edit}
            rows={2}
            onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== m.item.title && actions.updateItem(m.id, { title: e.target.value.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), (e.target as HTMLTextAreaElement).blur())}
          />
        )}

        {m.linked ? (
          <>
            <div className="panel-status-line">
              <StatusPill role={m.role} label={m.statusLabel} />
              {t && <span className="muted">updated in Tengu {timeAgo(t.updatedAt)}</span>}
              {!t && <span className="muted">Loading from Tengu…</span>}
            </div>
            {m.url ? (
              <a className="btn btn-primary btn-block" href={m.url} target="_blank" rel="noreferrer">Open in Tengu ↗</a>
            ) : (
              <p className="fine">To open tickets from here, add your Tengu web address in Settings (⚙).</p>
            )}
            <section className="panel-facts">
              <div><span>Assignee</span><b><Avatar name={m.assignee} size={18} /> {m.assignee ?? 'Unassigned'}</b></div>
              <div><span>Priority</span><b>{m.priority ? PRIORITY_LABEL[m.priority] : '—'}</b></div>
              <div><span>Due</span><b className={isOverdue(m) ? 'is-overdue' : ''}>{formatDue(m.dueDate) ?? '—'}</b></div>
              <div><span>Status</span><b>{m.statusLabel}</b></div>
              <p className="field-note">Status, assignee and dates come from Tengu. Change them there.</p>
            </section>
            {t?.description && (
              <section className="panel-section">
                <h4>Description</h4>
                <Markdownish text={t.description} />
              </section>
            )}
            <section className="panel-section">
              <h4>Activity in Tengu</h4>
              {t?.comments === undefined && <div className="skeleton" />}
              {t?.comments?.length === 0 && <p className="muted">No comments yet.</p>}
              <ol className="activity">
                {t?.comments?.map((c) => (
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
          </>
        ) : (
          <section className="panel-fields">
            <div className="field field-wide">
              <span>Status</span>
              <div className="seg" role="radiogroup" aria-label="Status">
                {ITEM_STATUSES.map((s) => (
                  <button
                    key={s}
                    role="radio"
                    disabled={!edit}
                    aria-checked={m.item.status === s}
                    className={m.item.status === s ? 'on' : ''}
                    style={{ ['--c' as string]: ROLE_COLOR[ITEM_STATUS[s].role] }}
                    onClick={() => actions.updateItem(m.id, { status: s })}
                  >
                    {ITEM_STATUS[s].label}
                  </button>
                ))}
              </div>
            </div>
            <label className="field field-wide">
              <span>Owner</span>
              <input
                id="item-owner"
                key={m.item.id + (m.item.owner ?? '')}
                disabled={!edit}
                defaultValue={m.item.owner ?? ''}
                placeholder="Who’s on it?"
                onBlur={(e) => (e.target.value.trim() || null) !== m.item.owner && actions.updateItem(m.id, { owner: e.target.value.trim() || null })}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            </label>
            {edit && (
              <button className="btn btn-block" onClick={() => actions.openModal('link-item', m.id)}>🔗 Link to a Tengu ticket</button>
            )}
          </section>
        )}

        <section className="panel-section">
          <h4>On the roadmap</h4>
          <label className="field">
            <span>Initiative</span>
            <select
              id="item-initiative"
              disabled={!edit}
              value={m.item.initiativeId}
              onChange={(e) => actions.moveItem(m.id, e.target.value)}
            >
              {state.initiatives.map((i) => <option key={i.id} value={i.id}>{i.icon} {i.name}</option>)}
            </select>
          </label>
          {m.item.updatedAt && <p className="fine">Last changed {who ? `by ${who} ` : ''}{timeAgo(m.item.updatedAt)}</p>}
          {edit && (
            <div className="panel-actions">
              {m.linked && <button className="btn btn-ghost btn-sm" onClick={() => actions.unlinkItem(m.id)}>Unlink from Tengu</button>}
              {confirm ? (
                <span className="confirm">
                  Remove from the roadmap?
                  <button className="btn btn-sm btn-danger" onClick={() => actions.removeItem(m.id)}>Remove</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>Keep</button>
                </span>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(true)}>Remove from roadmap</button>
              )}
            </div>
          )}
          {m.linked && <p className="fine">Unlinking or removing never changes the ticket in Tengu.</p>}
        </section>
      </aside>
    </>
  );
}
