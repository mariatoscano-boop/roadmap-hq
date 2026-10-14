/**
 * Mochi's data model: one person, many worlds.
 * A world is anything you work in (a client, a project, your life, your ideas). It may be linked
 * to an external tool through an integration. Every quest is either PRIVATE (made in Mochi, only
 * you see it) or EXTERNAL (mirrored from a linked tool).
 */

export type Accent = 'teal' | 'violet' | 'orange' | 'blue' | 'pink' | 'yellow' | 'green';

export type BodyShape = 'pill' | 'cube' | 'blob' | 'bean' | 'drop';
export type Antenna = 'none' | 'single' | 'double' | 'sprout' | 'spark';
export type Accessory = 'headset' | 'scarf' | 'cap' | 'badge';
export type Terrain = 'waves' | 'bubbles' | 'circuit' | 'blocks' | 'garden' | 'stars';
export type Mood = 'idle' | 'happy' | 'focus' | 'wow' | 'sleepy' | 'worried';

export interface CreatureSpec {
  name: string;
  body: BodyShape;
  antenna: Antenna;
}

export interface IntegrationLink {
  /** Which integration (see integrations/index.ts). */
  integrationId: string;
  /** The space/board/project inside that tool. */
  ref: string;
}

export interface World {
  id: string;
  name: string;
  color: Accent;
  terrain: Terrain;
  creature: CreatureSpec;
  kind: 'client' | 'project' | 'life' | 'ideas';
  /** null = Mochi only. */
  link: IntegrationLink | null;
  /** Private notes for this world. */
  notes: string;
  createdAt: string;
}

export type QuestSource = 'private' | 'external';

export interface Quest {
  id: string;
  title: string;
  worldId: string;
  /** PRIVATE: created in Mochi, visible only to you, never pushed unless you choose to.
   *  EXTERNAL: mirrored from the world's linked tool. */
  source: QuestSource;
  external?: { integrationId: string; key: string };
  done: boolean;
  /** Someone you're waiting on, if any. */
  waitingOn: string | null;
  /** YYYY-MM-DD, or null for "someday". */
  dueDate: string | null;
  priority: 'normal' | 'high';
  createdAt: string;
  completedAt: string | null;
  notes?: string;
}

export interface IntegrationState {
  id: string;
  connected: boolean;
  lastSyncedAt: string | null;
  syncing: boolean;
}

export type View =
  | { name: 'today' }
  | { name: 'worlds' }
  | { name: 'world'; id: string }
  | { name: 'quests' }
  | { name: 'collection' };
