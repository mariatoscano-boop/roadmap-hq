/** Derived numbers: what's visible, progress, pulse, weekly charts, levels. Pure functions. */
import type { Activity, Member, Project, Status, Task, Team } from '../types';
import { addDays, daysFromToday, localDayOf, startOfWeek, today } from './dates';

export const isDone = (t: Task) => t.status === 'done';
export const isOverdue = (t: Task) => !isDone(t) && !!t.dueDate && daysFromToday(t.dueDate) < 0;
export const isDueToday = (t: Task) => t.dueDate === today();
export const doneToday = (t: Task) => isDone(t) && !!t.completedAt && localDayOf(t.completedAt) === today();

export const STATUS_LABEL: Record<Status, string> = { todo: 'To do', progress: 'In progress', review: 'In review', blocked: 'Blocked', done: 'Done' };
export const STATUS_ORDER: Status[] = ['todo', 'progress', 'review', 'blocked', 'done'];

/** Projects this person can see in this team. Private projects are visible only to their owner. */
export function visibleProjects(projects: Project[], team: Team, me: string): Project[] {
  return projects.filter((p) => team.projectIds.includes(p.id) && (!p.ownerId || p.ownerId === me));
}

/** Tasks this person can see: shared (Tengu) tasks, plus their own private ones. */
export function visibleTasks(tasks: Task[], projects: Project[], me: string): Task[] {
  const ids = new Set(projects.map((p) => p.id));
  return tasks.filter((t) => ids.has(t.projectId) && (t.source === 'tengu' || t.createdBy === me));
}

/** Today for one person: overdue + due today, plus anything they finished today. */
export function todayFor(tasks: Task[], who: string | null): Task[] {
  return tasks.filter((t) => (!who || t.assigneeId === who) && (isDone(t) ? doneToday(t) || isDueToday(t) : !!t.dueDate && t.dueDate <= today()));
}

export interface ProjectStats {
  total: number;
  done: number;
  progress: number;
  review: number;
  blocked: number;
  todo: number;
  upcoming: number;
  pct: number;
}

export function projectStats(projectId: string, tasks: Task[]): ProjectStats {
  const mine = tasks.filter((t) => t.projectId === projectId);
  const count = (s: Status) => mine.filter((t) => t.status === s).length;
  const done = count('done');
  return {
    total: mine.length,
    done,
    progress: count('progress'),
    review: count('review'),
    blocked: count('blocked'),
    todo: count('todo'),
    upcoming: mine.filter((t) => t.status === 'todo' && t.dueDate && daysFromToday(t.dueDate) > 0).length,
    pct: mine.length ? done / mine.length : 0,
  };
}

/** Milestones reached = the project's level. */
export const projectLevel = (p: Project, pct: number) => p.milestones.filter((m) => pct >= m.at - 1e-9).length;
export const nextMilestone = (p: Project, pct: number) => p.milestones.find((m) => pct < m.at - 1e-9);

/** Tasks that matter for "this week": due by Sunday or finished since Monday. */
function inThisWeek(t: Task) {
  const mon = startOfWeek();
  const sun = addDays(mon, 6);
  if (isDone(t)) return !!t.completedAt && localDayOf(t.completedAt) >= mon;
  return !!t.dueDate && t.dueDate <= sun;
}

export function weekProgress(tasks: Task[], who: string | null) {
  const week = tasks.filter((t) => (!who || t.assigneeId === who) && inThisWeek(t));
  const done = week.filter(isDone).length;
  return { done, total: week.length, pct: week.length ? done / week.length : 0 };
}

export interface MemberPulse {
  member: Member;
  pct: number;
  done: number;
  total: number;
  active: number;
  blocked: number;
}

export function memberPulse(members: Member[], tasks: Task[]): MemberPulse[] {
  return members.map((member) => {
    const w = weekProgress(tasks, member.id);
    const open = tasks.filter((t) => t.assigneeId === member.id && !isDone(t));
    return {
      member,
      pct: w.pct,
      done: w.done,
      total: w.total,
      active: open.filter((t) => t.status === 'progress' || t.status === 'review').length,
      blocked: open.filter((t) => t.status === 'blocked').length,
    };
  });
}

/** Completions per day (Mon–Sun) this week, from the activity log. */
export function weeklyCompletions(activity: Activity[], who: string | null) {
  const mon = startOfWeek();
  const t = today();
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(mon, i);
    return {
      day,
      label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
      count: activity.filter((a) => a.verb === 'completed' && (!who || a.actorId === who) && localDayOf(a.at) === day).length,
      isToday: day === t,
      future: day > t,
    };
  });
}

export const XP_PER_TASK = 20;
/** Small, so creating tasks can't out-earn finishing them. */
export const XP_PER_CREATE = 5;
export const LEVEL_SIZE = 400;
export const levelOf = (xp: number) => Math.floor(Math.max(0, xp) / LEVEL_SIZE) + 1;
export const levelProgress = (xp: number) => (Math.max(0, xp) % LEVEL_SIZE) / LEVEL_SIZE;

/** Consecutive days (ending today or yesterday) with at least one completion. */
export function streak(activity: Activity[], who: string): number {
  const days = new Set(activity.filter((a) => a.verb === 'completed' && a.actorId === who).map((a) => localDayOf(a.at)));
  let d = days.has(today()) ? today() : addDays(today(), -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

const P = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
/** Open before done; then overdue → scheduled time → due date → priority. */
export function sortTasks(a: Task, b: Task): number {
  if (isDone(a) !== isDone(b)) return isDone(a) ? 1 : -1;
  const da = a.dueDate ?? '9999';
  const db = b.dueDate ?? '9999';
  if (da !== db) return da < db ? -1 : 1;
  const ta = a.time ?? '99';
  const tb = b.time ?? '99';
  if (ta !== tb) return ta < tb ? -1 : 1;
  return P[a.priority] - P[b.priority] || a.createdAt.localeCompare(b.createdAt);
}
