/**
 * Tengu-shaped data: what a Tengu provider speaks. The UI never uses these directly;
 * mapping.ts turns them into app Tasks.
 */
export interface TenguSpace {
  id: string;
  name: string;
}

/** Tengu priority: 1 = urgent … 4 = low (null = none). */
export type TenguPriority = 1 | 2 | 3 | 4 | null;

/**
 * Tengu status names differ per list, but every status carries a role. Mochi only reads roles
 * (a subset of Tengu's: planning/available → todo, started, review, blocked, done).
 */
export type TenguStatusRole = 'available' | 'started' | 'review' | 'blocked' | 'done';

export interface TenguTask {
  id: string;
  /** Human key, e.g. FIJI-142. */
  key: string;
  title: string;
  spaceId: string;
  /** The list's own status name ("In progress", "QA passed"…). */
  status: string;
  statusRole: TenguStatusRole;
  /** Assignee as Tengu knows them (matched to workspace members by name). */
  assignee: string | null;
  dueDate: string | null;
  priority: TenguPriority;
  updatedAt: string;
}

export interface TenguTaskDraft {
  spaceId: string;
  title: string;
  assignee: string | null;
  dueDate: string | null;
  priority: TenguPriority;
  statusRole: TenguStatusRole;
}

export interface TenguTaskPatch {
  title?: string;
  dueDate?: string | null;
  priority?: TenguPriority;
  statusRole?: TenguStatusRole;
  assignee?: string | null;
}

export interface PullResult {
  spaces: TenguSpace[];
  tasks: TenguTask[];
  syncedAt: string;
  /** Optional human notes about what changed remotely (mock only). */
  notes?: string[];
}
