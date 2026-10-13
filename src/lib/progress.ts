import type { Health, Initiative } from '../types/roadmap';
import type { StatusRole, TenguTicket } from '../types/tengu';

/** "Today" for the mock workspace — keeps sample due dates meaningful. Swap for `new Date()` with live data. */
export const TODAY = new Date('2026-10-13T12:00:00');

const COMPLETE: StatusRole[] = ['done', 'shipping', 'live'];

export const isComplete = (t: TenguTicket) => COMPLETE.includes(t.statusRole);
export const isBlocked = (t: TenguTicket) => t.statusRole === 'blocked';
export const isClosed = (t: TenguTicket) => t.statusRole === 'closed';
export const isOverdue = (t: TenguTicket, now = TODAY) =>
  !!t.dueDate && !isComplete(t) && !isClosed(t) && new Date(t.dueDate + 'T23:59:59') < now;
export const isUnassigned = (t: TenguTicket) => t.assignees.length === 0 && !isComplete(t) && !isClosed(t);

/**
 * Tengu has no progress field, so per-ticket progress is estimated from the status role.
 */
export function ticketProgress(t: TenguTicket): number {
  switch (t.statusRole) {
    case 'done':
    case 'shipping':
    case 'live':
      return 100;
    case 'review':
      return 80;
    case 'sentback':
      return 60;
    case 'started':
      return 45;
    case 'blocked':
      return 30;
    case 'available':
      return 5;
    default:
      return 0;
  }
}

export interface InitiativeStats {
  total: number;
  completed: number;
  blocked: number;
  overdue: number;
  unassigned: number;
  inFlight: number;
  /** 0–100, from linked tickets (completed / total, closed tickets excluded). */
  progress: number;
  health: Health;
  lateTarget: boolean;
}

export function initiativeStats(initiative: Initiative, tickets: TenguTicket[], now = TODAY): InitiativeStats {
  const active = tickets.filter((t) => !isClosed(t));
  const total = active.length;
  const completed = active.filter(isComplete).length;
  const blocked = active.filter(isBlocked).length;
  const overdue = active.filter((t) => isOverdue(t, now)).length;
  const unassigned = active.filter(isUnassigned).length;
  const inFlight = active.filter((t) => ['started', 'review', 'sentback'].includes(t.statusRole)).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  const [y, m] = initiative.target.split('-').map(Number);
  const targetEnd = new Date(y, m, 0, 23, 59, 59);
  const lateTarget = targetEnd < now && progress < 100;

  let health: Health = 'healthy';
  if (blocked >= 2 || (total > 0 && blocked / total >= 0.25)) health = 'blocked';
  else if (blocked > 0 || overdue > 0 || lateTarget || unassigned >= 2) health = 'at-risk';

  return { total, completed, blocked, overdue, unassigned, inFlight, progress, health, lateTarget };
}

export const HEALTH_LABEL: Record<Health, string> = {
  healthy: 'Healthy',
  'at-risk': 'At Risk',
  blocked: 'Blocked',
};
