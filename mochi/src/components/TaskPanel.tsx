/** Task details as a side panel: every property editable in place, plus this task's history. */
import { useEffect, useState } from 'react';
import { dueLabel, shortAgo } from '../lib/dates';
import { dateForPreset, DUE_OPTIONS, presetForDate } from '../lib/due';
import { STATUS_LABEL, STATUS_ORDER } from '../lib/selectors';
import { useStore } from '../store/store';
import type { Priority } from '../types';
import { ActivityLine } from './ActivityLine';
import { IconCloud, IconLock, IconPlay, IconTrash, IconX } from './Icons';
import { accentStyle, Avatar, PriorityIcon, ProjectMark, StatusIcon } from './ui';

export function TaskPanel() {
  const { state, ui, actions, projects, members, memberOf, projectOf } = useStore();
  const task = state.tasks.find((t) => t.id === ui.openTaskId) ?? null;
  const [title, setTitle] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setTitle(task?.title ?? '');
    setConfirm(false);
    setSharing(false);
  }, [task?.id, task?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!task) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && actions.openTask(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, actions]);

  if (!task) return null;
  const p = projectOf(task.projectId);
  const owners = members.filter((m) => p.memberIds.includes(m.id));
  const history = state.activity.filter((a) => a.taskId === task.id).slice(0, 8);
  const creator = memberOf(task.createdBy);

  const saveTitle = () => {
    const t = title.trim();
    if (t && t !== task.title) actions.updateTask(task.id, { title: t });
    else setTitle(task.title);
  };

  return (
    <div className="panel-layer">
      <div className="panel-backdrop" onClick={() => actions.openTask(null)} />
      <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" style={accentStyle(p.color)}>
        <div className="panel-head">
          <span className="panel-key"><ProjectMark p={p} size={10} /> {task.tengu?.key ?? `${p.key} · private`}</span>
          <button type="button" className="icon-btn" onClick={() => actions.openTask(null)} aria-label="Close"><IconX /></button>
        </div>

        <textarea
          id="panel-title"
          className="panel-title"
          rows={2}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          aria-label="Title"
        />

        <div className="status-switch" role="radiogroup" aria-label="Status">
          {STATUS_ORDER.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={task.status === s} className={task.status === s ? 'on' : ''} onClick={() => actions.setStatus(task.id, s)}>
              <StatusIcon status={s} size={14} /> {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <dl className="props">
          <dt>Project</dt>
          <dd>
            <select value={task.projectId} disabled={!!task.tengu} onChange={(e) => actions.updateTask(task.id, { projectId: e.target.value }, { announce: true })} aria-label="Project">
              {projects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </dd>

          <dt>Owner</dt>
          <dd className="owner-pick">
            {owners.map((m) => (
              <button key={m.id} type="button" className={m.id === task.assigneeId ? 'on' : ''} onClick={() => actions.updateTask(task.id, { assigneeId: m.id }, { announce: true })} aria-pressed={m.id === task.assigneeId} title={m.name}>
                <Avatar m={m} size={24} />
                <span>{m.name}</span>
              </button>
            ))}
          </dd>

          <dt>Due</dt>
          <dd className="chips">
            {DUE_OPTIONS.map((o) => (
              <button key={o.key} type="button" className={`chip chip-sm${presetForDate(task.dueDate) === o.key ? ' on' : ''}`} onClick={() => actions.updateTask(task.id, { dueDate: dateForPreset(o.key, null) }, { announce: true })}>{o.label}</button>
            ))}
            <label className={`chip chip-sm chip-date${presetForDate(task.dueDate) === 'custom' ? ' on' : ''}`}>
              <span className="sr-only">Pick a date</span>
              {presetForDate(task.dueDate) === 'custom' && <span>{dueLabel(task.dueDate)}</span>}
              <input type="date" value={task.dueDate ?? ''} onChange={(e) => e.target.value && actions.updateTask(task.id, { dueDate: e.target.value }, { announce: true })} />
            </label>
          </dd>

          <dt>Time</dt>
          <dd>
            <input type="time" className="time-input" value={task.time ?? ''} onChange={(e) => actions.updateTask(task.id, { time: e.target.value || null })} aria-label="Time of day" />
          </dd>

          <dt>Priority</dt>
          <dd className="seg seg-sm">
            {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((x) => (
              <button key={x} type="button" className={task.priority === x ? 'on' : ''} aria-pressed={task.priority === x} onClick={() => actions.updateTask(task.id, { priority: x })}>
                <PriorityIcon p={x} /> {x[0].toUpperCase() + x.slice(1)}
              </button>
            ))}
          </dd>

          <dt>Visibility</dt>
          <dd className="visibility">
            {task.tengu ? (
              <span className="vis-on"><IconCloud size={14} /> Shared with the team via Tengu</span>
            ) : p.source === 'tengu' ? (
              <>
                <span><IconLock size={13} /> Private to {creator.id === state.me ? 'you' : creator.name}</span>
                <button type="button" className="btn btn-sm btn-ghost" disabled={!state.tengu.connected || sharing} onClick={async () => { setSharing(true); await actions.shareToTengu(task.id); setSharing(false); }}>
                  {sharing ? 'Sharing…' : 'Share to Tengu'}
                </button>
              </>
            ) : (
              <span><IconLock size={13} /> {p.name} is a private project</span>
            )}
          </dd>
        </dl>

        <label className="notes">
          <span>Notes</span>
          <textarea key={task.id} rows={3} defaultValue={task.notes ?? ''} placeholder="Context, links, decisions…" onBlur={(e) => actions.updateTask(task.id, { notes: e.target.value })} />
        </label>

        {history.length > 0 && (
          <section className="panel-history">
            <h4 className="eyebrow">History</h4>
            <ul className="feed feed-compact">
              {history.map((a) => <ActivityLine key={a.id} a={a} hideTask />)}
            </ul>
          </section>
        )}
        <p className="panel-created">Created by {creator.name} · {shortAgo(task.createdAt)}</p>

        <div className="panel-foot">
          {task.status !== 'done' && (
            <button type="button" className="btn btn-primary" onClick={() => actions.startFocus([task.id])}><IconPlay size={14} /> Start focus</button>
          )}
          {confirm ? (
            <span className="confirm">
              {task.tengu ? 'Remove from Mochi? It stays in Tengu.' : 'Delete this task?'}
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => actions.deleteTask(task.id)}>{task.tengu ? 'Remove' : 'Delete'}</button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost btn-icon-text" onClick={() => setConfirm(true)}><IconTrash size={14} /> {task.tengu ? 'Remove' : 'Delete'}</button>
          )}
        </div>
      </aside>
    </div>
  );
}
