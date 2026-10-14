/**
 * "Up next" and focus queues: a deterministic, explainable ranking.
 * Score = urgency (overdue, due soon) + priority + already-started bonus, with a balance penalty
 * so one project doesn't take every slot. Blocked and finished work is skipped.
 */
import type { Task } from '../types';
import { daysFromToday } from './dates';

export interface FocusPick {
  task: Task;
  reason: string;
}

const PRIORITY_SCORE = { urgent: 60, high: 40, medium: 20, low: 0 } as const;

function score(t: Task): { score: number; reason: string } {
  const bits: string[] = [];
  let s = PRIORITY_SCORE[t.priority];
  if (t.dueDate) {
    const n = daysFromToday(t.dueDate);
    if (n < 0) {
      s += 100 + Math.min(-n, 7) * 5;
      bits.push(n === -1 ? 'carried over from yesterday' : `${-n} days overdue`);
    } else if (n === 0) {
      s += 60;
      bits.push(t.time ? `today at ${t.time}` : 'due today');
    } else if (n === 1) {
      s += 30;
      bits.push('due tomorrow');
    } else if (n <= 7) {
      s += 10;
      bits.push(`due in ${n} days`);
    }
  }
  if (t.priority === 'urgent' || t.priority === 'high') bits.push(`${t.priority} priority`);
  if (t.status === 'progress') {
    s += 15;
    bits.push('already started');
  }
  s += Math.min(5, (Date.now() - new Date(t.createdAt).getTime()) / 86_400_000);
  return { score: s, reason: bits.join(' · ') || 'a quick win' };
}

export function pickFocus(tasks: Task[], max = 3): FocusPick[] {
  const pool = tasks
    .filter((t) => t.status !== 'done' && t.status !== 'blocked')
    .map((t) => ({ t, ...score(t) }))
    .filter((x) => x.score >= 20)
    .sort((a, b) => b.score - a.score || a.t.title.localeCompare(b.t.title));
  const picks: FocusPick[] = [];
  const perProject = new Map<string, number>();
  while (picks.length < max && pool.length) {
    let best = 0;
    let bestScore = -Infinity;
    pool.forEach((x, i) => {
      const adjusted = x.score - (perProject.get(x.t.projectId) ?? 0) * 35;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        best = i;
      }
    });
    const [x] = pool.splice(best, 1);
    perProject.set(x.t.projectId, (perProject.get(x.t.projectId) ?? 0) + 1);
    picks.push({ task: x.t, reason: x.reason });
  }
  return picks;
}
