import type { Project, Task } from '../types';
import { daysFromToday, today } from './dates';

export const isOverdue = (t: Task) => !t.completed && !!t.dueDate && daysFromToday(t.dueDate) < 0;

/** What belongs on Today: due today or overdue, plus anything finished today. */
export function todayTasks(tasks: Task[]): Task[] {
  const t = today();
  return tasks.filter((x) => {
    if (x.completed) return x.dueDate === t || (!!x.completedAt && sameLocalDay(x.completedAt, t));
    return !!x.dueDate && x.dueDate <= t;
  });
}

export function completedToday(tasks: Task[]): number {
  const t = today();
  return tasks.filter((x) => x.completed && x.completedAt && sameLocalDay(x.completedAt, t)).length;
}

const sameLocalDay = (isoTime: string, day: string) => {
  const d = new Date(isoTime);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === day;
};

export interface ProjectStats {
  total: number;
  done: number;
  open: number;
  progress: number;
}

export function projectStats(project: Project, tasks: Task[]): ProjectStats {
  const mine = tasks.filter((t) => t.projectId === project.id);
  const done = mine.filter((t) => t.completed).length;
  return { total: mine.length, done, open: mine.length - done, progress: mine.length ? done / mine.length : 0 };
}

/** Sort: open before done, then overdue → due soon → someday, then priority. */
const P = { high: 0, medium: 1, low: 2 } as const;
export function sortTasks(a: Task, b: Task): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  const da = a.dueDate ?? '9999';
  const db = b.dueDate ?? '9999';
  if (da !== db) return da < db ? -1 : 1;
  return P[a.priority] - P[b.priority] || a.createdAt.localeCompare(b.createdAt);
}
