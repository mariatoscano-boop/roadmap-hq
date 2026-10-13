import { useMemo } from 'react';
import { initiativeStats, type InitiativeStats } from '../lib/progress';
import type { Initiative } from '../types/roadmap';
import type { TenguTicket } from '../types/tengu';
import { linkedTickets, type AppState } from './store';

export interface InitiativeView {
  initiative: Initiative;
  tickets: TenguTicket[];
  stats: InitiativeStats;
}

export function useInitiativeViews(state: AppState): Record<string, InitiativeView> {
  const { roadmap, tickets } = state;
  return useMemo(() => {
    const out: Record<string, InitiativeView> = {};
    for (const i of roadmap.initiatives) {
      const t = linkedTickets({ ...state, roadmap, tickets }, i.id);
      out[i.id] = { initiative: i, tickets: t, stats: initiativeStats(i, t) };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, tickets]);
}

/** People involved with an initiative: owner + ticket assignees. */
export function peopleOf(v: InitiativeView): string[] {
  return [...new Set([v.initiative.owner, ...v.tickets.flatMap((t) => t.assignees.map((a) => a.name))])];
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
