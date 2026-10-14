/**
 * The task composer. The card being built IS the input: as you type and choose, the card takes
 * on the project's colour, an owner avatar, a date and a priority. Decisions are revealed one at a
 * time (Where → Who → When → Priority). Enter at any point creates the task with what's shown.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { dueLabel } from '../lib/dates';
import { dateForPreset, DUE_OPTIONS, presetForDate, type DuePreset } from '../lib/due';
import { parseComposer } from '../lib/parse';
import { isDone, projectStats } from '../lib/selectors';
import { useStore } from '../store/store';
import type { Priority } from '../types';
import { IconArrowRight, IconCalendar, IconCloud, IconLock, IconReturn, IconX } from './Icons';
import { accentStyle, Avatar, Kbd, PriorityIcon, ProjectMark } from './ui';

const STEPS = ['What', 'Where', 'Who', 'When', 'Priority'] as const;
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];

export function Composer() {
  const { ui, actions, projects, tasks, members, me, state } = useStore();
  const open = ui.composer.open;
  const preset = ui.composer.preset;

  const defaultProject = useMemo(() => {
    if (preset?.projectId) return preset.projectId;
    if (ui.view.name === 'project') return ui.view.id;
    // Where I have the most open work
    const counts = projects.map((p) => ({ id: p.id, n: tasks.filter((t) => t.projectId === p.id && t.assigneeId === me.id && !isDone(t)).length }));
    return counts.sort((a, b) => b.n - a.n)[0]?.id ?? projects[0]?.id;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const [text, setText] = useState('');
  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [due, setDue] = useState<{ preset: DuePreset; date: string | null } | null>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [share, setShare] = useState<boolean | null>(null);
  const [launching, setLaunching] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const stepPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setText('');
    setStep(0);
    setProjectId(null);
    setAssigneeId(preset?.assigneeId ?? null);
    setDue(preset?.dueDate !== undefined ? { preset: presetForDate(preset.dueDate ?? null), date: preset.dueDate ?? null } : null);
    setPriority(null);
    setShare(null);
    setLaunching(false);
    window.setTimeout(() => input.current?.focus(), 40);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = useMemo(() => parseComposer(text, projects, members), [text, projects, members]);

  // Effective values: what you chose, else what the words say, else defaults.
  const pId = projectId ?? parsed.projectId ?? defaultProject;
  const project = projects.find((p) => p.id === pId) ?? projects[0];
  const owners = members.filter((m) => project.memberIds.includes(m.id));
  const aId = assigneeId ?? (parsed.assigneeId && owners.some((m) => m.id === parsed.assigneeId) ? parsed.assigneeId : me.id);
  const owner = members.find((m) => m.id === aId) ?? me;
  const dueDate = due ? dateForPreset(due.preset, due.date) : parsed.dueWord !== undefined ? parsed.dueDate ?? null : dateForPreset('today', null);
  const prio = priority ?? parsed.priority ?? 'medium';
  const canShare = project.source === 'tengu' && state.tengu.connected;
  const willShare = canShare && (share ?? false);
  const title = parsed.title || text.trim();
  const ready = title.length > 0;

  const chosen = { project: projectId !== null || !!parsed.projectId, owner: assigneeId !== null || !!parsed.assigneeId, due: due !== null || parsed.dueWord !== undefined, prio: priority !== null || !!parsed.priority };

  const advance = (to?: number) => {
    const next = to ?? Math.min(step + 1, STEPS.length);
    setStep(next);
    if (next >= 1) window.setTimeout(() => stepPanel.current?.focus(), 30);
  };

  const create = () => {
    if (!ready || launching) return;
    setLaunching(true);
    const task = actions.createTask({ title, projectId: project.id, assigneeId: owner.id, dueDate, time: parsed.time ?? null, priority: prio, share: willShare });
    window.setTimeout(() => {
      actions.closeComposer();
      actions.toast({
        tone: 'success',
        title: 'Task created',
        detail: `${project.name} · ${dueDate ? dueLabel(dueDate) : 'No date'} · ${owner.id === me.id ? 'You' : owner.name}`,
        xp: 5,
        action: { label: 'Edit', run: () => actions.openTask(task.id) },
      });
    }, 420);
  };

  // Digits pick an option on the current step (when the title field isn't focused).
  const onStepKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      create();
      return;
    }
    const n = Number(e.key);
    if (!n) return;
    if (step === 1 && projects[n - 1]) { setProjectId(projects[n - 1].id); advance(2); }
    if (step === 2 && owners[n - 1]) { setAssigneeId(owners[n - 1].id); advance(3); }
    if (step === 3 && DUE_OPTIONS[n - 1]) { setDue({ preset: DUE_OPTIONS[n - 1].key, date: null }); advance(4); }
    if (step === 4 && PRIORITIES[n - 1]) setPriority(PRIORITIES[n - 1]);
  };

  if (!open) return null;

  const stepDone = (i: number) => step > i;
  const SummaryRow = ({ i, children }: { i: number; children: React.ReactNode }) => (
    <button type="button" className="cstep-summary" onClick={() => advance(i)}>
      <span className="cstep-label">{STEPS[i]}</span>
      <span className="cstep-value">{children}</span>
      <span className="cstep-edit">Change</span>
    </button>
  );

  return (
    <div className="composer-layer" role="dialog" aria-modal="true" aria-label="New task" onKeyDown={(e) => e.key === 'Escape' && actions.closeComposer()}>
      <div className="composer-backdrop" onClick={actions.closeComposer} />
      <div className="composer">
        <div className="composer-top">
          <span className="eyebrow">New task</span>
          <ol className="composer-steps" aria-label="Steps">
            {STEPS.map((s, i) => (
              <li key={s} className={i === step ? 'on' : i < step || (i === 0 && ready) ? 'done' : ''}>{s}</li>
            ))}
          </ol>
          <button type="button" className="icon-btn" onClick={actions.closeComposer} aria-label="Close"><IconX /></button>
        </div>

        {/* The object being built */}
        <div className={`tcard${chosen.project || ready ? ' has-project' : ''}${launching ? ' launching' : ''}`} style={accentStyle(project.color)}>
          <div className="tcard-head">
            <span className="tcard-key"><ProjectMark p={project} size={9} />{project.key}-new</span>
            <span className="tcard-src">{willShare ? (<><IconCloud size={12} /> Shared via Tengu</>) : (<><IconLock size={12} /> Private</>)}</span>
          </div>
          <label htmlFor="composer-title" className="sr-only">What are we doing?</label>
          <textarea
            id="composer-title"
            ref={input}
            className="tcard-title"
            rows={1}
            placeholder="What are we doing?"
            value={text}
            onChange={(e) => setText(e.target.value.replace(/\n/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                create();
              }
              if (e.key === 'Tab' && ready && !e.shiftKey) {
                e.preventDefault();
                advance(step === 0 ? 1 : step + 1);
              }
            }}
          />
          {title && title !== text.trim() && <p className="tcard-clean">Saves as “{title}”</p>}
          <div className="tcard-meta">
            <span className={`tslot${ready ? ' on' : ''}`}><ProjectMark p={project} size={8} />{project.name}</span>
            <span className={`tslot${ready ? ' on' : ''}`} key={`o-${owner.id}`}><Avatar m={owner} size={18} />{owner.id === me.id ? 'You' : owner.name}</span>
            <span className={`tslot${ready ? ' on' : ''}`} key={`d-${dueDate}`}><IconCalendar size={13} />{dueDate ? dueLabel(dueDate) : 'No date'}{parsed.time ? ` · ${parsed.time}` : ''}</span>
            <span className={`tslot${ready ? ' on' : ''}`} key={`p-${prio}`}><PriorityIcon p={prio} />{prio[0].toUpperCase() + prio.slice(1)}</span>
          </div>
        </div>

        {/* What Mochi understood, and how to move fast */}
        <div className={`composer-hint${ready ? ' on' : ''}`} aria-live="polite">
          {ready ? (
            <>
              {(parsed.projectId || parsed.dueWord || parsed.assigneeId || parsed.priority || parsed.time) && (
                <span className="understood">Picked up from your words: {[parsed.projectId && project.name, parsed.dueWord, parsed.time, parsed.assigneeId && `@${owner.name}`, parsed.priority].filter(Boolean).join(' · ')}</span>
              )}
              <span className="keys"><Kbd>↵</Kbd> create now <Kbd>Tab</Kbd> {step === 0 ? 'set details' : 'next'}</span>
            </>
          ) : (
            <span className="keys muted">Try “Review Dosify hero tomorrow @malika !”</span>
          )}
        </div>

        {/* Progressive decisions */}
        <div className="csteps" ref={stepPanel} tabIndex={-1} onKeyDown={onStepKey}>
          {stepDone(1) && <SummaryRow i={1}><ProjectMark p={project} size={9} /> {project.name}</SummaryRow>}
          {stepDone(2) && <SummaryRow i={2}><Avatar m={owner} size={18} /> {owner.name}</SummaryRow>}
          {stepDone(3) && <SummaryRow i={3}>{dueDate ? dueLabel(dueDate) : 'No date'}</SummaryRow>}

          {step === 1 && (
            <section className="cstep" aria-label="Where does this belong?">
              <h3>Where does this belong?</h3>
              <div className="ptiles">
                {projects.map((p, i) => {
                  const st = projectStats(p.id, tasks);
                  return (
                    <button key={p.id} type="button" className={`ptile${p.id === project.id ? ' on' : ''}`} style={accentStyle(p.color)} onClick={() => { setProjectId(p.id); advance(2); }}>
                      <span className="ptile-top"><ProjectMark p={p} size={10} /><Kbd>{i + 1}</Kbd></span>
                      <b>{p.name}</b>
                      <small>{st.total - st.done} open · {Math.round(st.pct * 100)}%</small>
                      <span className="ptile-bar"><i style={{ width: `${st.pct * 100}%` }} /></span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="cstep" aria-label="Who owns it?">
              <h3>Who owns it?</h3>
              <div className="people">
                {owners.map((m, i) => (
                  <button key={m.id} type="button" className={`person${m.id === owner.id ? ' on' : ''}`} onClick={() => { setAssigneeId(m.id); advance(3); }}>
                    <Avatar m={m} size={36} />
                    <b>{m.id === me.id ? `${m.name} (you)` : m.name}</b>
                    <small>{m.role}</small>
                    <Kbd>{i + 1}</Kbd>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="cstep" aria-label="When?">
              <h3>When?</h3>
              <div className="chips">
                {DUE_OPTIONS.map((o, i) => (
                  <button key={o.key} type="button" className={`chip${presetForDate(dueDate) === o.key ? ' on' : ''}`} onClick={() => { setDue({ preset: o.key, date: null }); advance(4); }}>
                    {o.label} <Kbd>{i + 1}</Kbd>
                  </button>
                ))}
                <label className="chip chip-date">
                  <IconCalendar size={13} />
                  <span className="sr-only">Pick a date</span>
                  <input type="date" value={presetForDate(dueDate) === 'custom' && dueDate ? dueDate : ''} onChange={(e) => { if (e.target.value) { setDue({ preset: 'custom', date: e.target.value }); advance(4); } }} />
                </label>
              </div>
            </section>
          )}

          {step >= 4 && (
            <section className="cstep" aria-label="Priority">
              <h3>How important?</h3>
              <div className="seg" role="radiogroup">
                {PRIORITIES.map((p, i) => (
                  <button key={p} type="button" role="radio" aria-checked={prio === p} className={prio === p ? 'on' : ''} onClick={() => setPriority(p)}>
                    <PriorityIcon p={p} /> {p[0].toUpperCase() + p.slice(1)} <Kbd>{i + 1}</Kbd>
                  </button>
                ))}
              </div>
              <label className={`share${canShare ? '' : ' disabled'}`}>
                <input type="checkbox" checked={willShare} disabled={!canShare} onChange={(e) => setShare(e.target.checked)} />
                <span className="switch" aria-hidden="true" />
                <span>
                  <b>Share with the team via Tengu</b>
                  <small>{project.source !== 'tengu' ? `${project.name} is private to you.` : !state.tengu.connected ? 'Connect Tengu in Settings first.' : 'Off: only you can see this task.'}</small>
                </span>
              </label>
            </section>
          )}
        </div>

        <div className="composer-foot">
          {step === 0 ? (
            <button type="button" className="btn btn-ghost" disabled={!ready} onClick={() => advance(1)}>Set details</button>
          ) : step < 4 ? (
            <button type="button" className="btn btn-ghost" onClick={() => advance()}>Skip</button>
          ) : <span />}
          <button type="button" className="btn btn-primary btn-lg" disabled={!ready} onClick={create}>
            Create task <IconArrowRight />
          </button>
        </div>
        <p className="composer-fine"><IconReturn size={12} /> Enter creates it right away. You can change anything afterwards.</p>
      </div>
    </div>
  );
}
