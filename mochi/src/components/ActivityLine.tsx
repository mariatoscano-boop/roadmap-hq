import { shortAgo } from '../lib/dates';
import { useStore } from '../store/store';
import type { Activity } from '../types';
import { accentStyle, Avatar } from './ui';

const VERB: Record<Activity['verb'], string> = {
  completed: 'completed', created: 'created', moved: 'moved', assigned: 'assigned', reopened: 'reopened', scheduled: 'rescheduled', removed: 'removed',
};

/** One line of team activity: avatar, who did what, when. */
export function ActivityLine({ a, hideTask = false }: { a: Activity; hideTask?: boolean }) {
  const { ui, actions, memberOf, projectOf, state } = useStore();
  const who = memberOf(a.actorId);
  const p = projectOf(a.projectId);
  const exists = !!a.taskId && state.tasks.some((t) => t.id === a.taskId);
  return (
    <li className={`fline verb-${a.verb}${ui.fresh.includes(a.id) ? ' is-fresh' : ''}`} style={accentStyle(p.color)}>
      <Avatar m={who} size={22} />
      <span className="fline-text">
        <b>{who.id === state.me ? 'You' : who.name}</b> {VERB[a.verb]}
        {!hideTask && (
          exists ? (
            <button type="button" className="fline-task" onClick={() => actions.openTask(a.taskId!)}>{a.taskTitle}</button>
          ) : (
            <span className="fline-task static">{a.taskTitle}</span>
          )
        )}
        {a.detail && <span className="fline-detail">{a.detail}</span>}
      </span>
      <span className="fline-time">{shortAgo(a.at)}</span>
    </li>
  );
}
