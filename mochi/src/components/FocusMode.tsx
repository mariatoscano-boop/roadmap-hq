/** Focus mode: one task, a 25-minute timer, and nothing else. */
import { useEffect, useState } from 'react';
import { pickFocus } from '../lib/focus';
import { useStore } from '../store/store';
import { IconArrowRight, IconCheck, IconPause, IconPlay, IconX } from './Icons';
import { accentStyle, MochiOrb, ProjectTag, Ring } from './ui';

const LENGTH = 25 * 60;

export function FocusMode() {
  const { state, ui, actions, projectOf, tasks, me } = useStore();
  const f = ui.focus;
  const id = f ? f.ids[f.index] : null;
  const task = state.tasks.find((t) => t.id === id) ?? null;
  const [left, setLeft] = useState(LENGTH);
  const [running, setRunning] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setLeft(LENGTH);
    setRunning(true);
    setFinished(false);
  }, [id]);

  useEffect(() => {
    if (!task || !running || finished) return;
    const t = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [task, running, finished]);

  useEffect(() => {
    if (!f) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') actions.exitFocus();
      if (e.key === ' ' && !finished) {
        e.preventDefault();
        setRunning((r) => !r);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [f, finished, actions]);

  if (!f || !task) return null;
  const p = projectOf(task.projectId);
  const hasNext = f.index + 1 < f.ids.length;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const reason = pickFocus([task], 1)[0]?.reason;

  const complete = () => {
    actions.setStatus(task.id, 'done', { quiet: true });
    setFinished(true);
  };
  const next = () => {
    if (hasNext) actions.nextFocus();
    else {
      // Offer what's next from the ranking.
      const more = pickFocus(tasks.filter((t) => t.assigneeId === me.id && t.id !== task.id), 1)[0];
      if (more && finished) actions.startFocus([more.task.id]);
      else actions.exitFocus();
    }
  };

  return (
    <div className="focus" role="dialog" aria-modal="true" aria-label="Focus mode" style={accentStyle(p.color)}>
      <div className="focus-top">
        <span className="eyebrow">Focus{f.ids.length > 1 ? ` · ${f.index + 1} of ${f.ids.length}` : ''}</span>
        <button type="button" className="icon-btn" onClick={actions.exitFocus} aria-label="Exit focus"><IconX /></button>
      </div>

      {!finished ? (
        <div className="focus-body" key={task.id}>
          <ProjectTag p={p} text={task.tengu?.key ?? p.name} />
          <h1 className="focus-title">{task.title}</h1>
          {reason && <p className="focus-reason">{reason}</p>}
          <div className="focus-timer">
            <Ring value={left / LENGTH} size={220} stroke={6} accent="var(--accent)" track="rgba(255,255,255,.1)">
              <span className="focus-time">{mm}:{ss}</span>
              <span className="focus-state">{running ? 'In focus' : 'Paused'}</span>
            </Ring>
            <span className="focus-orb"><MochiOrb size={30} mood="focus" /></span>
          </div>
          <div className="focus-actions">
            <button type="button" className="btn btn-on-dark" onClick={() => setRunning((r) => !r)}>
              {running ? <><IconPause size={14} /> Pause</> : <><IconPlay size={14} /> Resume</>}
            </button>
            <button type="button" className="btn btn-accent btn-lg" onClick={complete}><IconCheck /> Mark done · +20 XP</button>
            <button type="button" className="btn btn-on-dark" onClick={next}>{hasNext ? 'Skip' : 'Not now'} <IconArrowRight size={14} /></button>
          </div>
          <p className="focus-keys">Space to pause · Esc to leave</p>
        </div>
      ) : (
        <div className="focus-body focus-done">
          <MochiOrb size={64} mood="happy" />
          <h1 className="focus-title">Nice. That’s done.</h1>
          <p className="focus-reason">{task.title} · +20 XP · {Math.max(1, Math.round((LENGTH - left) / 60))} min focused</p>
          <div className="focus-actions">
            <button type="button" className="btn btn-on-dark" onClick={actions.exitFocus}>Back to work</button>
            <button type="button" className="btn btn-accent btn-lg" onClick={next}>Ready for the next one? <IconArrowRight /></button>
          </div>
        </div>
      )}
    </div>
  );
}
