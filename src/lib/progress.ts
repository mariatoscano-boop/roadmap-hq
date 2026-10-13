import type { Health, Initiative, Mission } from '../types/roadmap';
import type { StatusRole } from '../types/tengu';

export const today = () => new Date();

const COMPLETE: StatusRole[] = ['done', 'shipping', 'live'];

export const isComplete = (m: { role: StatusRole }) => COMPLETE.includes(m.role);
export const isBlocked = (m: { role: StatusRole }) => m.role === 'blocked';
export const isClosed = (m: { role: StatusRole }) => m.role === 'closed';
export const isOverdue = (m: Pick<Mission, 'role' | 'dueDate'>, now = today()) =>
  !!m.dueDate && !isComplete(m) && !isClosed(m) && new Date(m.dueDate.slice(0, 10) + 'T23:59:59') < now;
export const isUnassigned = (m: Pick<Mission, 'role' | 'assignee'>) => !m.assignee && !isComplete(m) && !isClosed(m);

/** Neither roadmap items nor Tengu have a progress field, so it's estimated from the status. */
export function missionProgress(m: { role: StatusRole }): number {
  switch (m.role) {
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
  /** 0–100: completed / total (dropped work excluded). */
  progress: number;
  health: Health;
  lateTarget: boolean;
}

export function initiativeStats(initiative: Initiative, missions: Mission[], now = today()): InitiativeStats {
  const active = missions.filter((m) => !isClosed(m));
  const total = active.length;
  const completed = active.filter(isComplete).length;
  const blocked = active.filter(isBlocked).length;
  const overdue = active.filter((m) => isOverdue(m, now)).length;
  const unassigned = active.filter(isUnassigned).length;
  const inFlight = active.filter((m) => ['started', 'review', 'sentback'].includes(m.role)).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  const [y, mo] = initiative.target.split('-').map(Number);
  const targetEnd = new Date(y, mo, 0, 23, 59, 59);
  const lateTarget = targetEnd < now && total > 0 && progress < 100;

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
