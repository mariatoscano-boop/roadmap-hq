/**
 * Shapes mirrored from the Tengu MCP server (inspected via list_lists / list_tasks / get_task).
 * Tengu is the source of truth for everything in this file.
 */

/** The role a list status plays — Tengu exposes this on every list (status names differ per list). */
export type StatusRole =
  | 'planning'
  | 'available'
  | 'started'
  | 'blocked'
  | 'review'
  | 'sentback'
  | 'done'
  | 'shipping'
  | 'live'
  | 'closed';

export interface TenguStatus {
  status: string;
  role: StatusRole;
}

export interface TenguList {
  id: string;
  name: string;
  space: string;
  statuses: TenguStatus[];
}

export interface TenguMember {
  id: string;
  name: string;
  email?: string;
}

/** Tengu priority: 1 urgent, 2 high, 3 normal, 4 low. */
export type TenguPriority = 1 | 2 | 3 | 4;

export interface TenguComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface TenguTicket {
  /** Tengu task id. */
  id: string;
  /** Human key (`custom_id`), e.g. FIJI-142. */
  key: string;
  title: string;
  description: string;
  listId: string;
  listName?: string;
  status: string;
  statusRole: StatusRole;
  priority: TenguPriority | null;
  assignees: TenguMember[];
  dueDate: string | null;
  url: string;
  updatedAt: string;
  /** Comments — only present after getTicket(). */
  comments?: TenguComment[];
  /** True for search hits whose status hasn't been loaded yet. */
  partial?: boolean;
}

