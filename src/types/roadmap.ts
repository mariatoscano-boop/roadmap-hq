/** Everything in this file is owned by the roadmap — never written to Tengu. */
import type { StatusRole, TenguPriority, TenguTicket } from './tengu';

export type Zone = 'now' | 'next' | 'later';

export type StrategicPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type InitiativeStatus = 'Discovery' | 'Planning' | 'In Progress' | 'Paused' | 'Shipped';

export type Health = 'healthy' | 'at-risk' | 'blocked';

export interface Initiative {
  id: string;
  name: string;
  icon: string;
  /** The place in Product HQ, e.g. "Marketplace District". */
  place: string;
  /** Derived from the layout (see RoadmapLayout); stored as a fallback. */
  zone: Zone;
  /** Order within its zone (lower = more important). Derived from the layout. */
  order: number;
  priority: StrategicPriority;
  status: InitiativeStatus;
  owner: string;
  /** Target month, YYYY-MM. */
  target: string;
  summary: string;
  /** Hue (0-360) used to tint the building. */
  hue: number;
  updatedAt?: string;
  updatedBy?: string | null;
}

/** NOW / NEXT / LATER order, kept in one record so a move is a single save. */
export type RoadmapLayout = Record<Zone, string[]>;

/** Status of a roadmap item that isn't linked to Tengu. */
export type ItemStatus = 'todo' | 'doing' | 'blocked' | 'done';

export interface TenguRef {
  id: string;
  key: string;
  url: string;
}

/**
 * A piece of work on the roadmap. Optionally linked to a Tengu ticket: when linked, Tengu is the
 * source of truth for its status and assignee; the item only stores the reference.
 */
export interface RoadmapItem {
  id: string;
  initiativeId: string;
  title: string;
  status: ItemStatus;
  owner: string | null;
  tengu: TenguRef | null;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface Settings {
  /** Web address of Tengu, used to open tickets whose link is relative. */
  tenguBaseUrl: string;
}

/** What the UI renders for one item: the item merged with live Tengu data when linked. */
export interface Mission {
  id: string;
  item: RoadmapItem;
  ticket: TenguTicket | null;
  title: string;
  role: StatusRole;
  statusLabel: string;
  assignee: string | null;
  priority: TenguPriority | null;
  dueDate: string | null;
  key: string | null;
  url: string | null;
  linked: boolean;
}
