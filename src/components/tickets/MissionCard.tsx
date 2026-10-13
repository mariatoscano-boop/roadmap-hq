import type { CSSProperties } from 'react';
import { isBlocked, isComplete, isOverdue, ticketProgress } from '../../lib/progress';
import type { TenguTicket } from '../../types/tengu';
import { Avatar, formatDue, PriorityChip, ROLE_COLOR, StatusPill } from './ticketUi';

interface Props {
  ticket: TenguTicket;
  index: number;
  selected: boolean;
  justCompleted: boolean;
  remote: boolean;
  style?: CSSProperties;
  onOpen(id: string): void;
}

export function MissionCard({ ticket: t, index, selected, justCompleted, remote, style, onOpen }: Props) {
  const done = isComplete(t);
  const blocked = isBlocked(t);
  const overdue = isOverdue(t);
  const progress = ticketProgress(t);
  const assignee = t.assignees[0]?.name ?? null;
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
      style={{ ...style, ['--i' as string]: index, ['--c' as string]: ROLE_COLOR[t.statusRole] }}
      onClick={() => onOpen(t.id)}
      aria-label={`${t.key} ${t.title}, ${t.status}`}
    >
      <div className="mission-top">
        <span className="mission-key">{t.key}</span>
        <PriorityChip priority={t.priority} />
        {done && (
          <svg className="mission-check" viewBox="0 0 20 20" aria-hidden>
            <circle cx="10" cy="10" r="9" />
            <path d="M5.5 10.5 L8.5 13.5 L14.5 7" />
          </svg>
        )}
        {blocked && <span className="mission-alert" aria-hidden>!</span>}
      </div>
      <div className="mission-title">{t.title}</div>
      <div className="mission-row">
        <StatusPill ticket={t} />
      </div>
      <div className="mission-row mission-foot">
        <span className="mission-person">
          <Avatar name={assignee} size={18} />
          <span className={assignee ? '' : 'muted'}>{assignee ?? 'Unassigned'}</span>
        </span>
        {t.dueDate && <span className={`mission-due ${overdue ? 'is-overdue' : ''}`}>{overdue ? 'Overdue · ' : ''}{formatDue(t.dueDate)}</span>}
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
