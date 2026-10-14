/**
 * Translation between Tengu and the app. Tengu owns a Tengu task's title, status, assignee,
 * due date and priority; Mochi owns private tasks, times of day and notes.
 */
import type { Member, Priority, Project, Status, Task } from '../../types';
import type { PullResult, TenguPriority, TenguStatusRole, TenguTask } from './types';

export const toTenguPriority = (p: Priority): TenguPriority => ({ urgent: 1, high: 2, medium: 3, low: 4 } as const)[p];
export const fromTenguPriority = (p: TenguPriority): Priority =>
  p === 1 ? 'urgent' : p === 2 ? 'high' : p === 3 ? 'medium' : 'low';

const ROLE_TO_STATUS: Record<TenguStatusRole, Status> = { available: 'todo', started: 'progress', review: 'review', blocked: 'blocked', done: 'done' };
const STATUS_TO_ROLE: Record<Status, TenguStatusRole> = { todo: 'available', progress: 'started', review: 'review', blocked: 'blocked', done: 'done' };
export const toTenguRole = (s: Status) => STATUS_TO_ROLE[s];
export const fromTenguRole = (r: TenguStatusRole) => ROLE_TO_STATUS[r];

export const memberByName = (members: Member[], name: string | null) =>
  name ? members.find((m) => m.name.toLowerCase() === name.toLowerCase()) : undefined;

export function projectForSpace(projects: Project[], spaceId: string): Project | undefined {
  return projects.find((p) => p.tenguSpaceId === spaceId);
}

export interface MergeResult {
  tasks: Task[];
  added: Task[];
  changed: { before: Task; after: Task }[];
}

/**
 * Fold a pull into the local task list. New Tengu tasks are added, known ones take Tengu's fields,
 * private tasks are never touched, and tasks someone removed from Mochi stay removed.
 */
export function mergePull(local: Task[], pull: PullResult, projects: Project[], members: Member[], hiddenTenguIds: string[]): MergeResult {
  const known = new Set(local.filter((t) => t.tengu).map((t) => t.tengu!.id));
  const changed: MergeResult['changed'] = [];
  const next = local.map((t) => {
    if (!t.tengu) return t;
    const remote = pull.tasks.find((r) => r.id === t.tengu!.id);
    if (!remote) return t;
    const after = applyRemote(t, remote, members);
    if (after !== t) changed.push({ before: t, after });
    return after;
  });
  const added: Task[] = [];
  for (const r of pull.tasks) {
    if (known.has(r.id) || hiddenTenguIds.includes(r.id)) continue;
    const project = projectForSpace(projects, r.spaceId);
    if (!project) continue;
    const task = fromTengu(r, project.id, members);
    next.push(task);
    added.push(task);
  }
  return { tasks: next, added, changed };
}

function applyRemote(t: Task, r: TenguTask, members: Member[]): Task {
  const priority = fromTenguPriority(r.priority);
  const status = fromTenguRole(r.statusRole);
  const assigneeId = memberByName(members, r.assignee)?.id ?? t.assigneeId;
  if (t.title === r.title && t.dueDate === r.dueDate && t.priority === priority && t.status === status && t.assigneeId === assigneeId) return t;
  return {
    ...t,
    title: r.title,
    dueDate: r.dueDate,
    priority,
    status,
    assigneeId,
    completedAt: status === 'done' ? t.completedAt ?? r.updatedAt : null,
  };
}

export function fromTengu(r: TenguTask, projectId: string, members: Member[]): Task {
  const status = fromTenguRole(r.statusRole);
  const assigneeId = memberByName(members, r.assignee)?.id ?? members[0].id;
  return {
    id: `t-${r.id}`,
    title: r.title,
    projectId,
    source: 'tengu',
    status,
    assigneeId,
    createdBy: assigneeId,
    dueDate: r.dueDate,
    time: null,
    priority: fromTenguPriority(r.priority),
    createdAt: r.updatedAt,
    completedAt: status === 'done' ? r.updatedAt : null,
    tengu: { id: r.id, key: r.key },
  };
}

/** The Tengu copy of an app task (used to seed the mock provider). */
export function toTengu(t: Task, spaceId: string, members: Member[]): TenguTask {
  return {
    id: t.tengu!.id,
    key: t.tengu!.key,
    title: t.title,
    spaceId,
    status: { todo: 'To do', progress: 'In progress', review: 'In review', blocked: 'Blocked', done: 'Done' }[t.status],
    statusRole: toTenguRole(t.status),
    assignee: members.find((m) => m.id === t.assigneeId)?.name ?? null,
    dueDate: t.dueDate,
    priority: toTenguPriority(t.priority),
    updatedAt: t.createdAt,
  };
}
