import type { CSSProperties } from 'react';
import { isBlocked, isComplete, isOverdue, missionProgress } from '../../lib/progress';
import type { Mission } from '../../types/roadmap';
import { Avatar, formatDue, PriorityChip, ROLE_COLOR, StatusPill } from './ticketUi';

interface Props {
  mission: Mission;
  index: number;
  selected: boolean;
  justCompleted: boolean;
  remote: boolean;
  style?: CSSProperties;
  onOpen(id: string): void;
}

export function MissionCard({ mission: m, index, selected, justCompleted, remote, style, onOpen }: Props) {
  const done = isComplete(m);
  const blocked = isBlocked(m);
  const overdue = isOverdue(m);
  const progress = missionProgress(m);
  return (
    <button
      className={[
        'mission',
        done && 'is-done',
        blocked && 'is-blocked',
        selected && 'is-selected',
        justCompleted && 'just-done',
        remote && 'is-remote',
      ].filter(Boolean).join(' ')}
      style={{ ...style, ['--i' as string]: index, ['--c' as string]: ROLE_COLOR[m.role] }}
      onClick={() => onOpen(m.id)}
      aria-label={`${m.key ?? ''} ${m.title}, ${m.statusLabel}`}
    >
      <div className="mission-top">
        {m.linked ? <span className="mission-key" title="Linked to Tengu">{m.key || 'Tengu'}</span> : <span className="mission-src">Roadmap item</span>}
        {m.priority && <PriorityChip priority={m.priority} />}
        {done && (
          <svg className="mission-check" viewBox="0 0 20 20" aria-hidden>
            <circle cx="10" cy="10" r="9" />
            <path d="M5.5 10.5 L8.5 13.5 L14.5 7" />
          </svg>
        )}
        {blocked && <span className="mission-alert" aria-hidden>!</span>}
      </div>
      <div className="mission-title">{m.title}</div>
      <div className="mission-row">
        <StatusPill role={m.role} label={m.statusLabel} />
      </div>
      <div className="mission-row mission-foot">
        <span className="mission-person">
          <Avatar name={m.assignee} size={18} />
          <span className={m.assignee ? '' : 'muted'}>{m.assignee ?? 'No owner'}</span>
        </span>
        {m.dueDate && <span className={`mission-due ${overdue ? 'is-overdue' : ''}`}>{overdue ? 'Overdue · ' : ''}{formatDue(m.dueDate)}</span>}
      </div>
      {!done && (
        <div className="mission-bar" title="Estimated from status">
          <i style={{ width: `${progress}%` }} />
        </div>
      )}
      {justCompleted && <span className="mission-burst" aria-hidden />}
    </button>
  );
}
