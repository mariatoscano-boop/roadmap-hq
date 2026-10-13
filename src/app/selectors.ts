import { useMemo } from 'react';
import { toMission } from '../lib/missions';
import { initiativeStats, type InitiativeStats } from '../lib/progress';
import type { Initiative, Mission } from '../types/roadmap';
import type { AppState } from './store';

export interface InitiativeView {
  initiative: Initiative;
  missions: Mission[];
  stats: InitiativeStats;
}

export function useInitiativeViews(state: AppState): Record<string, InitiativeView> {
  const { initiatives, items, tickets, settings } = state;
  return useMemo(() => {
    const out: Record<string, InitiativeView> = {};
    for (const i of initiatives) {
      const missions = items
        .filter((it) => it.initiativeId === i.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((it) => toMission(it, it.tengu ? tickets[it.tengu.id] : undefined, settings.tenguBaseUrl));
      out[i.id] = { initiative: i, missions, stats: initiativeStats(i, missions) };
    }
    return out;
  }, [initiatives, items, tickets, settings]);
}

export function useMission(state: AppState, id: string | null): Mission | null {
  const { items, tickets, settings } = state;
  return useMemo(() => {
    const it = id ? items.find((x) => x.id === id) : null;
    return it ? toMission(it, it.tengu ? tickets[it.tengu.id] : undefined, settings.tenguBaseUrl) : null;
  }, [id, items, tickets, settings]);
}

/** People involved with an initiative: owner + assignees. */
export function peopleOf(v: InitiativeView): string[] {
  return [...new Set([v.initiative.owner, ...v.missions.map((m) => m.assignee).filter(Boolean) as string[]])];
}

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function timeAgo(iso: string | undefined) {
  if (!iso) return '';
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
