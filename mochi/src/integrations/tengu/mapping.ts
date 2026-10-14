/**
 * Translation between Tengu and the app. Tengu owns a Tengu task's title, due date, priority and
 * done state; the app owns everything personal (personal tasks, focus picks, hidden tasks).
 */
import type { Priority, Project, Task } from '../../types';
import type { PullResult, TenguPriority, TenguTask } from './types';

export const toTenguPriority = (p: Priority): TenguPriority => (p === 'high' ? 2 : p === 'medium' ? 3 : 4);
export const fromTenguPriority = (p: TenguPriority): Priority => (p === null || p >= 4 ? 'low' : p <= 2 ? 'high' : 'medium');

export function projectForSpace(projects: Project[], spaceId: string): Project | undefined {
  return projects.find((p) => p.tenguSpaceId === spaceId);
}

export interface MergeResult {
  tasks: Task[];
  added: number;
  updated: number;
}

/**
 * Fold a pull into the local task list. New Tengu tasks are added, known ones take Tengu's fields,
 * personal tasks are never touched, and tasks the user removed from the app stay removed.
 */
export function mergePull(local: Task[], pull: PullResult, projects: Project[], hiddenTenguIds: string[]): MergeResult {
  const byTenguId = new Map(local.filter((t) => t.tengu).map((t) => [t.tengu!.id, t]));
  let added = 0;
  let updated = 0;
  const next = local.map((t) => {
    if (!t.tengu) return t;
    const remote = pull.tasks.find((r) => r.id === t.tengu!.id);
    if (!remote) return t;
    const merged = applyRemote(t, remote);
    if (merged !== t) updated++;
    return merged;
  });
  for (const r of pull.tasks) {
    if (byTenguId.has(r.id) || hiddenTenguIds.includes(r.id)) continue;
    const project = projectForSpace(projects, r.spaceId);
    if (!project) continue;
    next.push(fromTengu(r, project.id));
    added++;
  }
  return { tasks: next, added, updated };
}

function applyRemote(t: Task, r: TenguTask): Task {
  const priority = fromTenguPriority(r.priority);
  if (t.title === r.title && t.dueDate === r.dueDate && t.priority === priority && t.completed === r.done) return t;
  return {
    ...t,
    title: r.title,
    dueDate: r.dueDate,
    priority,
    completed: r.done,
    completedAt: r.done ? t.completedAt ?? r.updatedAt : null,
  };
}

export function fromTengu(r: TenguTask, projectId: string): Task {
  return {
    id: `t-${r.id}`,
    title: r.title,
    projectId,
    source: 'tengu',
    completed: r.done,
    dueDate: r.dueDate,
    priority: fromTenguPriority(r.priority),
    createdAt: r.updatedAt,
    completedAt: r.done ? r.updatedAt : null,
    tengu: { id: r.id, key: r.key },
  };
}
