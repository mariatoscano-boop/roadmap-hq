import { useEffect, useRef, useState } from 'react';
import { today } from '../lib/dates';
import { useStore } from '../store/store';
import type { Task } from '../types';
import { IconLock } from './Icons';
import { accentStyle, Avatar, Due, PriorityIcon, StatusIcon } from './ui';

interface Props {
  task: Task;
  showProject?: boolean;
  showAssignee?: boolean;
  /** Extra leading content, e.g. a time in the day timeline. */
  lead?: React.ReactNode;
  /** Hide the due date when it's today (the day view already says so). */
  quietToday?: boolean;
}

export function TaskRow({ task, showProject = true, showAssignee = true, lead, quietToday = false }: Props) {
  const { ui, actions, projectOf, memberOf } = useStore();
  const p = projectOf(task.projectId);
  const who = memberOf(task.assigneeId);
  const fresh = ui.fresh.includes(task.id);
  const prev = useRef(task.status);
  const [justDone, setJustDone] = useState(false);

  useEffect(() => {
    if (task.status === 'done' && prev.current !== 'done') {
      setJustDone(true);
      const t = window.setTimeout(() => setJustDone(false), 900);
      prev.current = task.status;
      return () => window.clearTimeout(t);
    }
    prev.current = task.status;
  }, [task.status]);

  const key = task.tengu?.key ?? p.key;

  return (
    <li
      className={`row${task.status === 'done' ? ' is-done' : ''}${fresh ? ' is-fresh' : ''}${justDone ? ' just-done' : ''}${ui.dragTaskId === task.id ? ' is-dragging' : ''}`}
      style={accentStyle(p.color)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        actions.setDrag(task.id);
      }}
      onDragEnd={() => actions.setDrag(null)}
    >
      {lead}
      <StatusIcon status={task.status} onToggle={() => actions.toggleDone(task.id)} label={task.status === 'done' ? `Reopen “${task.title}”` : `Complete “${task.title}”`} />
      <button type="button" className="row-main" onClick={() => actions.openTask(task.id)}>
        {showProject && (
          <span className="row-key">
            <i className="row-mark" />
            {key}
          </span>
        )}
        <span className="row-title">{task.title}</span>
        <span className="row-meta">
          {task.source === 'personal' && <span className="row-private" title="Private: only you can see this"><IconLock size={12} /></span>}
          {task.priority !== 'medium' && task.priority !== 'low' && task.status !== 'done' && <PriorityIcon p={task.priority} />}
          {!(quietToday && task.dueDate === today()) && <Due t={task} />}
          {showAssignee && <Avatar m={who} size={20} />}
        </span>
      </button>
    </li>
  );
}
