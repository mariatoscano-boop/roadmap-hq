/**
 * Sample worlds so Mochi opens lived-in. Dates are relative to today. External quests here match
 * the "remote" copies the mock integrations start with.
 */
import { addDays, today } from '../lib/dates';
import type { Quest, World } from '../types';

const created = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export const SEED_WORLDS: World[] = [
  { id: 'fiji', name: 'FIJI', color: 'teal', terrain: 'waves', kind: 'client', creature: { name: 'Tidal', body: 'pill', antenna: 'single' }, link: { integrationId: 'tengu', ref: 'space-fiji' }, notes: 'Buyer Profile copy: check tone with Bryan before Thursday.', createdAt: created(900) },
  { id: 'dosify', name: 'DOSIFY', color: 'violet', terrain: 'bubbles', kind: 'client', creature: { name: 'Dot', body: 'bean', antenna: 'double' }, link: { integrationId: 'tengu', ref: 'space-dosify' }, notes: '', createdAt: created(800) },
  { id: 'client-a', name: 'CLIENT A', color: 'orange', terrain: 'circuit', kind: 'client', creature: { name: 'Volt', body: 'cube', antenna: 'spark' }, link: { integrationId: 'clienttool', ref: 'board-campaign' }, notes: '', createdAt: created(400) },
  { id: 'client-b', name: 'CLIENT B', color: 'blue', terrain: 'blocks', kind: 'client', creature: { name: 'Brick', body: 'cube', antenna: 'none' }, link: null, notes: 'No shared tool yet. Everything lives here for now.', createdAt: created(300) },
  { id: 'personal', name: 'PERSONAL', color: 'pink', terrain: 'garden', kind: 'life', creature: { name: 'Mochi', body: 'blob', antenna: 'sprout' }, link: null, notes: '', createdAt: created(1000) },
  { id: 'ideas', name: 'IDEAS', color: 'yellow', terrain: 'stars', kind: 'ideas', creature: { name: 'Spark', body: 'drop', antenna: 'spark' }, link: null, notes: 'Half-formed things go here. No pressure.', createdAt: created(700) },
];

type S = Omit<Quest, 'dueDate' | 'createdAt' | 'completedAt' | 'waitingOn' | 'priority' | 'done'> & {
  due: number | null; done?: boolean; waitingOn?: string; priority?: 'high';
};
const ext = (integrationId: string, key: string) => ({ integrationId, key });

const SEED: S[] = [
  // FIJI · Tengu
  { id: 'q-fiji-1', title: 'Review Buyer Profile', worldId: 'fiji', source: 'external', external: ext('tengu', 'FIJI-142'), due: 0, priority: 'high' },
  { id: 'q-fiji-2', title: 'Check staging', worldId: 'fiji', source: 'external', external: ext('tengu', 'FIJI-151'), due: -1, priority: 'high' },
  { id: 'q-fiji-3', title: 'Review Broker Fit', worldId: 'fiji', source: 'external', external: ext('tengu', 'FIJI-145'), due: 0, done: true },
  { id: 'q-fiji-4', title: 'Buyer profile QA notes', worldId: 'fiji', source: 'external', external: ext('tengu', 'FIJI-150'), due: 2 },
  { id: 'q-fiji-5', title: 'Ask Bryan about Buyer Profile copy', worldId: 'fiji', source: 'private', due: 0 },
  { id: 'q-fiji-6', title: 'Review notes before meeting', worldId: 'fiji', source: 'private', due: 1 },
  { id: 'q-fiji-7', title: 'Staging credentials', worldId: 'fiji', source: 'private', due: 1, waitingOn: 'Bryan' },
  // DOSIFY · Tengu
  { id: 'q-dos-1', title: 'Finish Community page', worldId: 'dosify', source: 'external', external: ext('tengu', 'DOS-91'), due: 0, priority: 'high' },
  { id: 'q-dos-2', title: 'Mobile hero', worldId: 'dosify', source: 'external', external: ext('tengu', 'DOS-92'), due: 1 },
  { id: 'q-dos-3', title: 'Review landing hero', worldId: 'dosify', source: 'external', external: ext('tengu', 'DOS-88'), due: 0, done: true },
  { id: 'q-dos-4', title: 'Pricing section', worldId: 'dosify', source: 'external', external: ext('tengu', 'DOS-95'), due: 3 },
  { id: 'q-dos-5', title: 'Think about new onboarding flow', worldId: 'dosify', source: 'private', due: null },
  { id: 'q-dos-6', title: 'Hero illustrations from Malika', worldId: 'dosify', source: 'private', due: 2, waitingOn: 'Malika' },
  // CLIENT A · client tool
  { id: 'q-a-1', title: 'Approve homepage mockups', worldId: 'client-a', source: 'external', external: ext('clienttool', 'CMP-31'), due: 0 },
  { id: 'q-a-2', title: 'Q4 campaign brief review', worldId: 'client-a', source: 'external', external: ext('clienttool', 'CMP-28'), due: 1 },
  { id: 'q-a-3', title: 'Prep questions for Thursday call', worldId: 'client-a', source: 'private', due: 2 },
  // CLIENT B · Mochi only
  { id: 'q-b-1', title: 'Send proposal draft', worldId: 'client-b', source: 'private', due: 3, priority: 'high' },
  { id: 'q-b-2', title: 'Signed SOW', worldId: 'client-b', source: 'private', due: 4, waitingOn: 'Client B legal' },
  // PERSONAL
  { id: 'q-me-1', title: 'Book appointment', worldId: 'personal', source: 'private', due: 0 },
  { id: 'q-me-2', title: 'Buy groceries', worldId: 'personal', source: 'private', due: 0, done: true },
  { id: 'q-me-3', title: 'Buy flowers', worldId: 'personal', source: 'private', due: 3 },
  { id: 'q-me-4', title: 'Call mom', worldId: 'personal', source: 'private', due: null },
  // IDEAS
  { id: 'q-i-1', title: 'Creature evolutions for Mochi', worldId: 'ideas', source: 'private', due: null },
  { id: 'q-i-2', title: 'Newsletter about building in public', worldId: 'ideas', source: 'private', due: null },
  { id: 'q-i-3', title: 'Learn Rive for animations', worldId: 'ideas', source: 'private', due: null, done: true },
];

export function seedQuests(): Quest[] {
  const t = today();
  return SEED.map(({ due, done, waitingOn, priority, ...s }, i) => ({
    ...s,
    done: !!done,
    waitingOn: waitingOn ?? null,
    priority: priority ?? 'normal',
    dueDate: due === null ? null : addDays(t, due),
    createdAt: created(80 + i * 4),
    completedAt: done ? created(1 + (i % 3)) : null,
  }));
}

/** XP already earned per world. Client A and B haven't been completed in yet, so their creatures haven't hatched. */
export const SEED_WORLD_XP: Record<string, number> = { fiji: 100, dosify: 140, 'client-a': 0, 'client-b': 0, personal: 80, ideas: 20 };
export const SEED_TOTAL_XP = 1180;
