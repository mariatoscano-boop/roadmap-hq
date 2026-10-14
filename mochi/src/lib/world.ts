/** Derived numbers about worlds and quests: progress, levels, today, map layout. Pure functions. */
import type { Accessory, Quest, World } from '../types';
import { daysFromToday, localDayOf, today } from './dates';

export const XP_PER_QUEST = 20;
export const WORLD_LEVEL_XP = 60;
export const LEVEL_XP = 400;

export const levelOf = (xp: number) => Math.floor(Math.max(0, xp) / LEVEL_XP) + 1;
export const levelProgress = (xp: number) => (Math.max(0, xp) % LEVEL_XP) / LEVEL_XP;
export const worldLevel = (xp: number) => Math.floor(Math.max(0, xp) / WORLD_LEVEL_XP) + 1;
export const worldLevelProgress = (xp: number) => (Math.max(0, xp) % WORLD_LEVEL_XP) / WORLD_LEVEL_XP;
/** Objects that have appeared in a world: one per level after the first. */
export const objectsIn = (xp: number) => Math.min(6, worldLevel(xp) - 1);

/** Accessories a creature unlocks as its world levels up. */
export const ACCESSORIES: { id: Accessory; name: string; level: number }[] = [
  { id: 'badge', name: 'Pixel badge', level: 2 },
  { id: 'scarf', name: 'Scarf', level: 3 },
  { id: 'headset', name: 'Headset', level: 4 },
  { id: 'cap', name: 'Cap', level: 5 },
];

export const isLate = (q: Quest) => !q.done && !!q.dueDate && daysFromToday(q.dueDate) < 0;
export const doneToday = (q: Quest) => q.done && !!q.completedAt && localDayOf(q.completedAt) === today();
/** On today's plate: late or due today and not done, and not just waiting on someone. */
export const onPlate = (q: Quest) => !q.done && !q.waitingOn && !!q.dueDate && q.dueDate <= today();

export function worldStats(worldId: string, quests: Quest[]) {
  const mine = quests.filter((q) => q.worldId === worldId);
  const done = mine.filter((q) => q.done).length;
  return {
    total: mine.length,
    done,
    open: mine.length - done,
    today: mine.filter(onPlate).length,
    waiting: mine.filter((q) => !q.done && q.waitingOn).length,
    pct: mine.length ? done / mine.length : 0,
  };
}

/** Sort: open first, then late → due soon → someday, high priority first. */
export function sortQuests(a: Quest, b: Quest) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const da = a.dueDate ?? '9999';
  const db = b.dueDate ?? '9999';
  if (da !== db) return da < db ? -1 : 1;
  if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * Where each world sits on the map: evenly around an ellipse, the hub in the middle.
 * Works for any number of worlds. Returns percentages of the map box.
 */
export function mapPositions(n: number, tall: boolean): { x: number; y: number }[] {
  const rx = tall ? 32 : 37;
  const ry = tall ? 32 : 34;
  const start = tall ? -90 : -150;
  return Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    // A little deterministic jitter so it reads as a map, not a clock face.
    const j = ((i * 37) % 7) - 3;
    return { x: 50 + rx * Math.cos(a) + j * 0.6, y: 50 + ry * Math.sin(a) + (j % 2) * 1.5 };
  });
}

export function hatched(world: World, xp: Record<string, number>) {
  return (xp[world.id] ?? 0) > 0;
}
