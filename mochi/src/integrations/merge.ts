/**
 * Folding a pull into Mochi. External quests take the tool's title, date, priority and done state.
 * Private quests are never touched. Quests you removed from Mochi stay removed.
 */
import type { Quest, World } from '../types';
import type { PullResult } from './types';

export function mergePull(quests: Quest[], integrationId: string, pull: PullResult, worlds: World[], hidden: string[]) {
  const worldByRef = new Map(worlds.filter((w) => w.link?.integrationId === integrationId).map((w) => [w.link!.ref, w]));
  const known = new Set(quests.filter((q) => q.external?.integrationId === integrationId).map((q) => q.external!.key));
  let changed = 0;
  const next = quests.map((q) => {
    if (q.external?.integrationId !== integrationId) return q;
    const r = pull.tasks.find((t) => t.key === q.external!.key);
    if (!r) return q;
    if (r.title === q.title && r.dueDate === q.dueDate && r.priority === q.priority && r.done === q.done) return q;
    changed++;
    return { ...q, title: r.title, dueDate: r.dueDate, priority: r.priority, done: r.done, completedAt: r.done ? q.completedAt ?? r.updatedAt : null };
  });
  const added: Quest[] = [];
  for (const r of pull.tasks) {
    const key = `${integrationId}:${r.key}`;
    if (known.has(r.key) || hidden.includes(key)) continue;
    const w = worldByRef.get(r.ref);
    if (!w) continue;
    added.push({
      id: `q-${integrationId}-${r.key}`, title: r.title, worldId: w.id, source: 'external', external: { integrationId, key: r.key },
      done: r.done, waitingOn: null, dueDate: r.dueDate, priority: r.priority, createdAt: r.updatedAt, completedAt: r.done ? r.updatedAt : null,
    });
  }
  return { quests: [...next, ...added], added, changed };
}
