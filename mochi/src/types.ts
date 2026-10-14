/** App-owned data model. Tengu-shaped data lives in integrations/tengu/types.ts. */

export type TaskSource = 'tengu' | 'personal';
export type Priority = 'low' | 'medium' | 'high';
export type ProjectTheme = 'strawberry' | 'lavender' | 'peach';

export interface Project {
  id: string;
  name: string;
  icon: string;
  color: ProjectTheme;
  /** 'tengu' = mirrors a Tengu space; 'local' = lives only in this app. */
  source: 'tengu' | 'local';
  tenguSpaceId?: string;
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  source: TaskSource;
  completed: boolean;
  /** YYYY-MM-DD in local time, or null for "someday". */
  dueDate: string | null;
  priority: Priority;
  createdAt: string;
  completedAt?: string | null;
  notes?: string;
  /** Present on Tengu tasks: the ticket's id and human key (e.g. FIJI-142). */
  tengu?: { id: string; key: string };
}

export type Mood = 'happy' | 'excited' | 'proud' | 'concerned' | 'sleepy' | 'peaceful' | 'celebrate';

export type RewardId =
  | 'laptop' | 'coffee' | 'plant' | 'flowers' | 'bow' | 'candle' | 'plushie' | 'bag' | 'cat' | 'disco';

export interface Reward {
  id: RewardId;
  type: 'decor' | 'pet' | 'special';
  name: string;
  /** Unlocks when your stars reach this; null = unlocked by finishing a project. */
  stars: number | null;
  blurb: string;
}

export type Wallpaper = 'blush' | 'lilac' | 'cream' | 'peach';

export interface Character {
  name: string;
  stars: number;
  unlockedItems: RewardId[];
  /** Unlocked items currently shown in the room. */
  placedItems: RewardId[];
  wallpaper: Wallpaper;
}

export interface TenguConnection {
  connected: boolean;
  lastSyncedAt: string | null;
  syncing: boolean;
}

export type View =
  | { name: 'today' }
  | { name: 'projects' }
  | { name: 'project'; id: string }
  | { name: 'mine' }
  | { name: 'little' }
  | { name: 'rewards' };
