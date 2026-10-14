/** App-owned data model. Tengu-shaped data lives in integrations/tengu/types.ts. */

export type Status = 'todo' | 'progress' | 'review' | 'blocked' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
/** 'tengu' = shared with the team through Tengu; 'personal' = private to its creator. */
export type TaskSource = 'tengu' | 'personal';
export type Accent = 'pink' | 'violet' | 'blue' | 'green' | 'orange' | 'yellow';

export interface Member {
  id: string;
  name: string;
  initials: string;
  color: Accent;
  role: string;
}

export interface Milestone {
  id: string;
  name: string;
  /** Progress (0–1) at which the milestone is reached. */
  at: number;
}

export interface Project {
  id: string;
  name: string;
  /** Short key used in task ids, e.g. FIJI. */
  key: string;
  color: Accent;
  /** 'tengu' = mirrors a Tengu space; 'local' = lives only in Mochi. */
  source: 'tengu' | 'local';
  tenguSpaceId?: string;
  memberIds: string[];
  /** Set for a private project: only this member sees it. */
  ownerId?: string;
  milestones: Milestone[];
  blurb: string;
}

export interface Team {
  id: string;
  name: string;
  projectIds: string[];
  memberIds: string[];
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  source: TaskSource;
  status: Status;
  assigneeId: string;
  createdBy: string;
  /** YYYY-MM-DD in local time, or null for "no date". */
  dueDate: string | null;
  /** Optional time of day, HH:MM. */
  time: string | null;
  priority: Priority;
  createdAt: string;
  completedAt: string | null;
  notes?: string;
  /** Present on Tengu tasks: the ticket's id and human key (e.g. FIJI-142). */
  tengu?: { id: string; key: string };
}

export type ActivityVerb = 'completed' | 'created' | 'moved' | 'assigned' | 'reopened' | 'scheduled' | 'removed';

export interface Activity {
  id: string;
  actorId: string;
  verb: ActivityVerb;
  taskId?: string;
  taskTitle: string;
  projectId: string;
  /** e.g. "→ In review", "→ Bryan", "→ Tomorrow". */
  detail?: string;
  at: string;
}

export interface TenguConnection {
  connected: boolean;
  lastSyncedAt: string | null;
  syncing: boolean;
}

export type View =
  | { name: 'today' }
  | { name: 'work' }
  | { name: 'projects' }
  | { name: 'project'; id: string }
  | { name: 'team' }
  | { name: 'activity' };
