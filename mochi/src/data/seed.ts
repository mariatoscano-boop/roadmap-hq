/**
 * Starting data so the app feels alive on first open. Dates are relative to today.
 * Tengu tasks here are what the first sync would have brought in; the mock Tengu provider
 * (integrations/tengu/mockProvider.ts) holds the matching "remote" copies.
 */
import { addDays, today } from '../lib/dates';
import type { Character, Project, Task } from '../types';

export const SEED_PROJECTS: Project[] = [
  { id: 'fiji', name: 'FIJI', icon: '🍓', color: 'strawberry', source: 'tengu', tenguSpaceId: 'space-fiji' },
  { id: 'dosify', name: 'Dosify', icon: '🫧', color: 'lavender', source: 'tengu', tenguSpaceId: 'space-dosify' },
  { id: 'personal', name: 'Personal', icon: '🎀', color: 'peach', source: 'local' },
];

type SeedTask = Omit<Task, 'createdAt' | 'dueDate' | 'completedAt'> & { due: number | null; done?: boolean };

const SEED: SeedTask[] = [
  // FIJI
  { id: 't-fiji-1', title: 'Review Buyer Profile', projectId: 'fiji', source: 'tengu', completed: false, due: 0, priority: 'high', tengu: { id: 'tg-1042', key: 'FIJI-142' } },
  { id: 't-fiji-2', title: 'Send Bryan update', projectId: 'fiji', source: 'personal', completed: false, due: 0, priority: 'medium' },
  { id: 't-fiji-3', title: 'Review Broker Fit', projectId: 'fiji', source: 'tengu', completed: true, due: 0, priority: 'medium', tengu: { id: 'tg-1043', key: 'FIJI-145' } },
  { id: 't-fiji-4', title: 'Check staging', projectId: 'fiji', source: 'tengu', completed: false, due: -1, priority: 'high', tengu: { id: 'tg-1044', key: 'FIJI-151' } },
  // Dosify
  { id: 't-dos-1', title: 'Review landing hero', projectId: 'dosify', source: 'tengu', completed: true, due: 0, priority: 'medium', tengu: { id: 'tg-2201', key: 'DOS-88' } },
  { id: 't-dos-2', title: 'Finish Community page', projectId: 'dosify', source: 'tengu', completed: false, due: 0, priority: 'high', tengu: { id: 'tg-2202', key: 'DOS-91' } },
  { id: 't-dos-3', title: 'Mobile hero', projectId: 'dosify', source: 'tengu', completed: false, due: 0, priority: 'medium', tengu: { id: 'tg-2203', key: 'DOS-92' } },
  { id: 't-dos-4', title: 'Pricing section', projectId: 'dosify', source: 'tengu', completed: false, due: 2, priority: 'medium', tengu: { id: 'tg-2204', key: 'DOS-95' } },
  { id: 't-dos-5', title: 'FAQ', projectId: 'dosify', source: 'tengu', completed: false, due: 4, priority: 'low', tengu: { id: 'tg-2205', key: 'DOS-97' } },
  { id: 't-dos-6', title: 'Record walkthrough', projectId: 'dosify', source: 'personal', completed: false, due: 3, priority: 'low' },
  // Personal
  { id: 't-me-1', title: 'Book appointment', projectId: 'personal', source: 'personal', completed: false, due: 0, priority: 'medium' },
  { id: 't-me-2', title: 'Buy groceries', projectId: 'personal', source: 'personal', completed: true, due: 0, priority: 'low' },
  { id: 't-me-3', title: 'Ask Bryan about copy', projectId: 'fiji', source: 'personal', completed: false, due: 1, priority: 'medium' },
  { id: 't-me-4', title: 'Make note for tomorrow', projectId: 'personal', source: 'personal', completed: false, due: null, priority: 'low' },
];

export function seedTasks(): Task[] {
  const t = today();
  const now = Date.now();
  return SEED.map(({ due, ...s }, i) => ({
    ...s,
    dueDate: due === null ? null : addDays(t, due),
    createdAt: new Date(now - (SEED.length - i) * 3_600_000).toISOString(),
    completedAt: s.completed ? new Date(now - 40 * 60_000).toISOString() : null,
  }));
}

export function seedCharacter(): Character {
  return {
    name: 'Maria',
    stars: 30,
    unlockedItems: ['laptop', 'coffee', 'plant'],
    placedItems: ['laptop', 'coffee', 'plant'],
    wallpaper: 'blush',
  };
}
