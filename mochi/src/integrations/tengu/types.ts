/**
 * Tengu-shaped data: what a Tengu provider speaks. The app never uses these directly in the UI;
 * mapping.ts turns them into app Tasks.
 */
export interface TenguSpace {
  id: string;
  name: string;
}

/** Tengu priority: 1 = urgent ... 4 = low (null = none). */
export type TenguPriority = 1 | 2 | 3 | 4 | null;

export interface TenguTask {
  id: string;
  /** Human key, e.g. FIJI-142. */
  key: string;
  title: string;
  spaceId: string;
  /** The list's own status name ("In progress", "QA passed"...). */
  status: string;
  done: boolean;
  dueDate: string | null;
  priority: TenguPriority;
  updatedAt: string;
}

export interface TenguTaskDraft {
  spaceId: string;
  title: string;
  dueDate: string | null;
  priority: TenguPriority;
}

export interface TenguTaskPatch {
  title?: string;
  dueDate?: string | null;
  priority?: TenguPriority;
  done?: boolean;
}

export interface PullResult {
  spaces: TenguSpace[];
  tasks: TenguTask[];
  syncedAt: string;
  /** Optional human notes about what changed remotely (mock only). */
  notes?: string[];
}
