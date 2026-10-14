import { useState } from 'react';
import { daysFromToday, dueLabel } from '../lib/dates';
import { useStore } from '../store/store';
import type { Project, Task } from '../types';
import { IconCheck, IconCloud, IconHeart } from './Icons';

export function SourceTag({ task }: { task: Task }) {
  return task.source === 'tengu' ? (
    <span className="tag tag-tengu" title={task.tengu ? `Tengu task ${task.tengu.key}` : 'Tengu task'}>
      <IconCloud size={12} /> Tengu
    </span>
  ) : (
    <span className="tag tag-mine" title="Your own task. It stays in Mochi.">
      <IconHeart size={11} /> My task
    </span>
  );
}

export function DueChip({ task }: { task: Task }) {
  if (!task.dueDate) return <span className="due due-someday">Someday</span>;
  const n = daysFromToday(task.dueDate);
  const cls = task.completed ? 'due' : n < 0 ? 'due due-late' : n === 0 ? 'due due-today' : 'due';
  return <span className={cls}>{dueLabel(task.dueDate)}</span>;
}

interface Props {
  task: Task;
  project?: Project;
  showProject?: boolean;
}

export function TaskRow({ task, project, showProject }: Props) {
  const { actions, ui, projectOf } = useStore();
  const p = project ?? projectOf(task.projectId);
  const [burst, setBurst] = useState(0);
  const fresh = ui.fresh.includes(task.id);

  const toggle = () => {
    if (!task.completed) setBurst((b) => b + 1);
    actions.toggleTask(task.id);
  };

  return (
    <li className={`task theme-${p.color}${task.completed ? ' is-done' : ''}${fresh ? ' is-fresh' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={task.completed ? `Mark “${task.title}” as not done` : `Complete “${task.title}”`}
        className="check"
        onClick={toggle}
      >
        <IconCheck size={16} />
        {burst > 0 && (
          <span key={burst} className="burst" aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} style={{ ['--a' as string]: `${i * (360 / 7)}deg` }} />
            ))}
          </span>
        )}
      </button>
      <button type="button" className="task-main" onClick={() => actions.openTask(task.id)} aria-label={`Open “${task.title}”`}>
        <span className="task-title">{task.title}</span>
        <span className="task-meta">
          {showProject && <span className="proj-chip">{p.icon} {p.name}</span>}
          <DueChip task={task} />
          {task.priority === 'high' && !task.completed && <span className="prio" title="High priority">!</span>}
          <SourceTag task={task} />
        </span>
      </button>
    </li>
  );
}

/** Progress as a little garden: blooms for done, sprouts for still growing. */
export function Garden({ done, total, max = 10 }: { done: number; total: number; max?: number }) {
  const n = Math.min(total, max);
  const blooms = total ? Math.round((done / total) * n) : 0;
  return (
    <span className="garden" role="img" aria-label={`${done} of ${total} done`}>
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} viewBox="0 0 20 22" className={i < blooms ? 'bloom' : 'sprout'} style={{ animationDelay: `${i * 40}ms` }}>
          {i < blooms ? (
            <g transform="translate(10 9)">
              {[0, 72, 144, 216, 288].map((r) => (
                <ellipse key={r} cx="0" cy="-4" rx="3" ry="4" transform={`rotate(${r})`} fill="var(--theme)" stroke="var(--ink)" strokeWidth="1" />
              ))}
              <circle r="2" fill="var(--butter)" stroke="var(--ink)" strokeWidth=".9" />
            </g>
          ) : (
            <g fill="none" stroke="var(--sage-ink)" strokeWidth="1.5" strokeLinecap="round">
              <path d="M10 21V12" />
              <path d="M10 14c-3 0-5-2-5-5 3 0 5 2 5 5Z" fill="var(--sage)" />
              <path d="M10 12c0-3 2-5 5-5 0 3-2 5-5 5Z" fill="var(--sage)" />
            </g>
          )}
        </svg>
      ))}
    </span>
  );
}
