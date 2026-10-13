/** Everything in this file is owned by the roadmap — never written to Tengu. */

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
  zone: Zone;
  /** Order within its zone (lower = more important). */
  order: number;
  priority: StrategicPriority;
  status: InitiativeStatus;
  owner: string;
  /** Target month, YYYY-MM. */
  target: string;
  summary: string;
  /** Hue (0-360) used to tint the building. */
  hue: number;
}

/** Ticket ↔ initiative relationships. Ticket ids are Tengu ids; tickets are never copied. */
export type Links = Record<string, string[]>;

export interface RoadmapState {
  initiatives: Initiative[];
  links: Links;
}
