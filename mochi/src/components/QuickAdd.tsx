import { useEffect, useMemo, useState } from 'react';
import { dueLabel } from '../lib/dates';
import { dateForPreset, DUE_OPTIONS, presetForDate, type DuePreset } from '../lib/due';
import { parseQuickAdd } from '../lib/parse';
import { useStore } from '../store/store';
import type { Priority } from '../types';
import { Sheet } from './Sheet';

const PRIORITIES: { key: Priority; label: string }[] = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
];

export function QuickAdd() {
  const { state, ui, actions } = useStore();
  const { open, projectId: preset } = ui.quickAdd;

  const [text, setText] = useState('');
  const [projectId, setProjectId] = useState(preset ?? 'personal');
  const [due, setDue] = useState<DuePreset>('today');
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('medium');
  const [toTengu, setToTengu] = useState(false);
  const [touched, setTouched] = useState({ project: false, due: false, priority: false });

  const defaultProject = preset ?? (ui.view.name === 'project' ? ui.view.id : 'personal');

  useEffect(() => {
    if (!open) return;
    setText('');
    setProjectId(defaultProject);
    setDue('today');
    setCustomDate(null);
    setPriority('medium');
    setToTengu(false);
    setTouched({ project: !!preset, due: false, priority: false });
  }, [open, preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = useMemo(() => parseQuickAdd(text, state.projects), [text, state.projects]);

  // Apply what the words say, unless that field was set by hand.
  useEffect(() => {
    if (!touched.project) setProjectId(parsed.projectId ?? defaultProject);
    if (!touched.due) {
      const p = parsed.dueWord !== undefined ? presetForDate(parsed.dueDate ?? null) : 'today';
      setDue(p);
      if (p === 'custom') setCustomDate(parsed.dueDate ?? null);
    }
    if (!touched.priority) setPriority(parsed.priority ?? 'medium');
  }, [parsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const project = state.projects.find((p) => p.id === projectId) ?? state.projects[0];
  const canTengu = project.source === 'tengu' && state.tengu.connected;
  useEffect(() => {
    if (!canTengu) setToTengu(false);
  }, [canTengu]);

  const dueDate = dateForPreset(due, customDate);
  const title = parsed.title || text.trim();

  const picked: string[] = [];
  if (parsed.projectId && !touched.project) picked.push(state.projects.find((p) => p.id === parsed.projectId)!.name);
  if (parsed.dueWord && !touched.due) picked.push(parsed.dueDate ? dueLabel(parsed.dueDate) : 'Someday');
  if (parsed.priority && !touched.priority) picked.push('High priority');

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title) return;
    actions.addTask({ title, projectId, dueDate, priority, toTengu });
    actions.closeQuickAdd();
  };

  return (
    <Sheet open={open} onClose={actions.closeQuickAdd} title="What are we doing? ♡" titleId="qa-title-h" className="sheet-add">
      <form className="qa" onSubmit={submit}>
        <label className="sr-only" htmlFor="qa-text">Task</label>
        <input
          id="qa-text"
          data-autofocus
          className="qa-input"
          placeholder="Review the Dosify hero tomorrow"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          enterKeyHint="done"
        />
        <div className={`qa-understood${picked.length || (parsed.title && parsed.title !== text.trim()) ? ' is-on' : ''}`} aria-live="polite">
          {picked.length > 0 ? (
            <>
              <span className="qa-spark">✦</span> From your words: <b>{picked.join(' · ')}</b>
              {parsed.title && parsed.title !== text.trim() && <span className="qa-clean"> · saving as “{parsed.title}”</span>}
            </>
          ) : (
            <span className="qa-hint">Tip: type “tomorrow”, “friday”, a project name, or “!” for urgent.</span>
          )}
        </div>

        <div className="field-grid">
          <div className="field">
            <label htmlFor="qa-project">Project</label>
            <select
              id="qa-project"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setTouched((t) => ({ ...t, project: true }));
              }}
            >
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="qa-due">Due</label>
            <select
              id="qa-due"
              value={due}
              onChange={(e) => {
                setDue(e.target.value as DuePreset);
                setTouched((t) => ({ ...t, due: true }));
              }}
            >
              {DUE_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.key === 'custom' && due === 'custom' && customDate ? dueLabel(customDate) : o.label}
                </option>
              ))}
            </select>
          </div>
          {due === 'custom' && (
            <div className="field field-wide">
              <label htmlFor="qa-date">Date</label>
              <input id="qa-date" type="date" value={customDate ?? ''} onChange={(e) => setCustomDate(e.target.value || null)} />
            </div>
          )}
        </div>

        <fieldset className="field">
          <legend>Priority</legend>
          <div className="seg">
            {PRIORITIES.map((p) => (
              <button
                key={p.key}
                type="button"
                className={priority === p.key ? 'on' : ''}
                aria-pressed={priority === p.key}
                onClick={() => {
                  setPriority(p.key);
                  setTouched((t) => ({ ...t, priority: true }));
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Where it lives</legend>
          <div className="source-pick" role="radiogroup">
            <button type="button" role="radio" aria-checked={!toTengu} className={!toTengu ? 'on' : ''} onClick={() => setToTengu(false)}>
              <b>♡ My task</b>
              <small>Just for me, stays in Mochi</small>
            </button>
            <button type="button" role="radio" aria-checked={toTengu} className={toTengu ? 'on' : ''} disabled={!canTengu} onClick={() => setToTengu(true)}>
              <b>☁ Add to Tengu</b>
              <small>
                {project.source !== 'tengu' ? `${project.name} isn’t in Tengu` : !state.tengu.connected ? 'Connect Tengu first' : `Creates a ${project.name} task`}
              </small>
            </button>
          </div>
        </fieldset>

        <button type="submit" className="btn btn-primary btn-block" disabled={!title}>
          Add task ✨
        </button>
      </form>
    </Sheet>
  );
}
