/** "Next move": a deterministic ranking of what to do next, with a one-line reason. */
import type { Quest } from '../types';
import { daysFromToday } from './dates';

export interface Pick {
  quest: Quest;
  reason: string;
}

export function rankQuests(quests: Quest[], max = 3): Pick[] {
  const scored = quests
    .filter((q) => !q.done && !q.waitingOn)
    .map((q) => {
      let s = q.priority === 'high' ? 30 : 0;
      let reason = '';
      if (q.dueDate) {
        const n = daysFromToday(q.dueDate);
        if (n < 0) { s += 100 + Math.min(7, -n) * 5; reason = n === -1 ? 'Carried over from yesterday' : `${-n} days late`; }
        else if (n === 0) { s += 60; reason = 'Due today'; }
        else if (n === 1) { s += 25; reason = 'Due tomorrow'; }
        else if (n <= 7) { s += 8; reason = `Due in ${n} days`; }
      }
      if (q.priority === 'high') reason = reason ? `${reason} · high priority` : 'High priority';
      return { quest: q, reason: reason || 'Whenever you like', s };
    })
    .filter((x) => x.s >= 25)
    .sort((a, b) => b.s - a.s || a.quest.createdAt.localeCompare(b.quest.createdAt));
  // Balance across worlds: no world takes every slot.
  const picks: Pick[] = [];
  const per = new Map<string, number>();
  while (picks.length < max && scored.length) {
    let bi = 0;
    let bs = -Infinity;
    scored.forEach((x, i) => {
      const adj = x.s - (per.get(x.quest.worldId) ?? 0) * 40;
      if (adj > bs) { bs = adj; bi = i; }
    });
    const [x] = scored.splice(bi, 1);
    per.set(x.quest.worldId, (per.get(x.quest.worldId) ?? 0) + 1);
    picks.push({ quest: x.quest, reason: x.reason });
  }
  return picks;
}
