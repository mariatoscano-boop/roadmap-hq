import { useEffect, useState } from 'react';
import { dueLabel } from '../lib/dates';
import { dateForPreset, DUE_OPTIONS, presetForDate, type DuePreset } from '../lib/due';
import { useStore } from '../store/store';
import type { Priority } from '../types';
import { IconCheck, IconTrash } from './Icons';
import { Sheet } from './Sheet';
import { SourceTag } from './TaskRow';

export function TaskDetail() {
  const { state, ui, actions, projectOf } = useStore();
  const task = state.tasks.find((t) => t.id === ui.openTaskId) ?? null;
  const [title, setTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setTitle(task?.title ?? '');
    setConfirmDelete(false);
    setSending(false);
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (task) setTitle(task.title);
  }, [task?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return null;
  const project = projectOf(task.projectId);
  const due = presetForDate(task.dueDate);

  const saveTitle = () => {
    const t = title.trim();
    if (t && t !== task.title) actions.updateTask(task.id, { title: t });
    else setTitle(task.title);
  };

  const setDue = (p: DuePreset) => actions.updateTask(task.id, { dueDate: dateForPreset(p, task.dueDate) });

  return (
    <Sheet open onClose={() => actions.openTask(null)} title={<span className="td-eyebrow">{project.icon} {project.name}</span>} titleId="td-h" className={`sheet-task theme-${project.color}`}>
      <div className="td">
        <label className="sr-only" htmlFor="td-title">Title</label>
        <textarea
          id="td-title"
          className="td-title"
          rows={1}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
        />
        <div className="td-tags">
          <SourceTag task={task} />
          {task.tengu && <span className="td-key">{task.tengu.key}</span>}
        </div>

        <button type="button" className={`btn btn-block ${task.completed ? 'btn-soft' : 'btn-primary'}`} onClick={() => actions.toggleTask(task.id)}>
          {task.completed ? 'Mark as not done' : (<><IconCheck size={16} /> Mark done · +10 ✦</>)}
        </button>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="td-project">Project</label>
            <select id="td-project" value={task.projectId} disabled={!!task.tengu} onChange={(e) => actions.updateTask(task.id, { projectId: e.target.value })}>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
              ))}
            </select>
            {task.tengu && <small className="field-note">Lives in {project.name} on Tengu</small>}
          </div>
          <div className="field">
            <label htmlFor="td-due">Due</label>
            <select id="td-due" value={due} onChange={(e) => setDue(e.target.value as DuePreset)}>
              {DUE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.key === 'custom' && due === 'custom' ? dueLabel(task.dueDate) : o.label}</option>
              ))}
            </select>
          </div>
          {due === 'custom' && (
            <div className="field field-wide">
              <label htmlFor="td-date">Date</label>
              <input id="td-date" type="date" value={task.dueDate ?? ''} onChange={(e) => e.target.value && actions.updateTask(task.id, { dueDate: e.target.value })} />
            </div>
          )}
        </div>

        <fieldset className="field">
          <legend>Priority</legend>
          <div className="seg">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => (
              <button key={p} type="button" className={task.priority === p ? 'on' : ''} aria-pressed={task.priority === p} onClick={() => actions.updateTask(task.id, { priority: p })}>
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="td-notes">Notes, just for you</label>
          <textarea id="td-notes" rows={2} placeholder="Links, thoughts, a tiny pep talk..." defaultValue={task.notes ?? ''} key={task.id} onBlur={(e) => actions.updateTask(task.id, { notes: e.target.value })} />
        </div>

        <div className="td-tengu">
          {task.tengu ? (
            <p>Synced with Tengu as <b>{task.tengu.key}</b>. Changes here go there too.</p>
          ) : project.source === 'tengu' ? (
            <>
              <p>This one is just yours. Want the team to see it?</p>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                disabled={!state.tengu.connected || sending}
                onClick={async () => {
                  setSending(true);
                  await actions.sendToTengu(task.id);
                  setSending(false);
                }}
              >
                {sending ? 'Sending...' : state.tengu.connected ? '☁ Add to Tengu' : 'Connect Tengu to add'}
              </button>
            </>
          ) : (
            <p>{project.name} lives only in Mochi, so this stays private.</p>
          )}
        </div>

        <div className="td-danger">
          {confirmDelete ? (
            <div className="confirm-row" role="group" aria-label="Confirm delete">
              <span>{task.tengu ? 'Remove from Mochi? It stays in Tengu.' : 'Delete this task?'}</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>Keep</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => actions.deleteTask(task.id)}>{task.tengu ? 'Remove' : 'Delete'}</button>
            </div>
          ) : (
            <button type="button" className="link-danger" onClick={() => setConfirmDelete(true)}>
              <IconTrash size={16} /> {task.tengu ? 'Remove from Mochi' : 'Delete task'}
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
