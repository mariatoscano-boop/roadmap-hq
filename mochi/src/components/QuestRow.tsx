import { useEffect, useRef, useState } from 'react';
import { daysFromToday, dueLabel } from '../lib/dates';
import { useStore } from '../store/store';
import type { Quest } from '../types';
import { IconClock } from './Icons';
import { SourceBadge, WorldCreature, worldStyle } from './ui';

export function DueText({ q }: { q: Quest }) {
  if (!q.dueDate) return <span className="due muted">Someday</span>;
  const n = daysFromToday(q.dueDate);
  const late = !q.done && n < 0;
  return <span className={`due${late ? ' late' : n === 0 && !q.done ? ' now' : ''}`}>{late ? (n === -1 ? 'Yesterday' : `${-n}d late`) : dueLabel(q.dueDate)}</span>;
}

/** A quest as a compact object: check, its world's creature, title, where it came from. */
export function QuestRow({ q, index, showWorld = true }: { q: Quest; index?: number; showWorld?: boolean }) {
  const { ui, actions, worldOf } = useStore();
  const w = worldOf(q.worldId);
  const [completing, setCompleting] = useState(false);
  const prev = useRef(q.done);
  useEffect(() => {
    if (q.done && !prev.current) {
      setCompleting(true);
      const t = window.setTimeout(() => setCompleting(false), 700);
      prev.current = q.done;
      return () => window.clearTimeout(t);
    }
    prev.current = q.done;
  }, [q.done]);

  return (
    <li className={`quest${q.done ? ' is-done' : ''}${completing ? ' completing' : ''}${ui.fresh.includes(q.id) ? ' is-fresh' : ''}`} style={worldStyle(w)}>
      {index !== undefined && <span className="quest-n">{String(index).padStart(2, '0')}</span>}
      <button type="button" className="qcheck" role="checkbox" aria-checked={q.done} aria-label={q.done ? `Reopen “${q.title}”` : `Complete “${q.title}”`} onClick={() => actions.toggleDone(q.id)}>
        <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
          <rect x="1.5" y="1.5" width="15" height="15" rx="4.5" className="qcheck-box" />
          <path d="m5.2 9.3 2.5 2.4 5-5.4" className="qcheck-tick" />
        </svg>
        {completing && <span className="qburst" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}</span>}
      </button>
      <button type="button" className="quest-main" onClick={() => actions.openQuest(q.id)}>
        <span className="quest-title">{q.title}</span>
        <span className="quest-meta">
          {showWorld && (
            <span className="quest-world"><span className="quest-head"><WorldCreature world={w} size={16} mini /></span>{w.name}</span>
          )}
          <SourceBadge q={q} />
          {q.waitingOn && <span className="waiting"><IconClock size={11} /> Waiting on {q.waitingOn}</span>}
          {q.priority === 'high' && !q.done && <span className="hi" title="High priority">High</span>}
        </span>
      </button>
      <DueText q={q} />
    </li>
  );
}
