import type { Initiative, Links, Zone } from '../types/roadmap';

export const ZONES: Zone[] = ['now', 'next', 'later'];

export const ZONE_META: Record<Zone, { label: string; emoji: string; tagline: string }> = {
  now: { label: 'NOW', emoji: '🔥', tagline: 'Building this quarter' },
  next: { label: 'NEXT', emoji: '⚡', tagline: 'Lining up' },
  later: { label: 'LATER', emoji: '🌙', tagline: 'On the horizon' },
};

export function byZone(initiatives: Initiative[], zone: Zone): Initiative[] {
  return initiatives.filter((i) => i.zone === zone).sort((a, b) => a.order - b.order);
}

/**
 * Moves an initiative into `zone` at position `index` and renumbers both zones.
 * Only roadmap ordering changes — linked Tengu tickets are untouched.
 */
export function moveInitiative(initiatives: Initiative[], id: string, zone: Zone, index: number): Initiative[] {
  const moving = initiatives.find((i) => i.id === id);
  if (!moving) return initiatives;
  const result = new Map(initiatives.map((i) => [i.id, i]));
  for (const z of ZONES) {
    const list = byZone(initiatives, z).filter((i) => i.id !== id);
    if (z === zone) list.splice(Math.max(0, Math.min(index, list.length)), 0, { ...moving, zone });
    list.forEach((i, order) => result.set(i.id, { ...i, zone: z, order }));
  }
  return initiatives.map((i) => result.get(i.id)!);
}

export function linkTickets(links: Links, initiativeId: string, ticketIds: string[]): Links {
  const current = links[initiativeId] ?? [];
  return { ...links, [initiativeId]: [...current, ...ticketIds.filter((t) => !current.includes(t))] };
}

export function unlinkTicket(links: Links, initiativeId: string, ticketId: string): Links {
  return { ...links, [initiativeId]: (links[initiativeId] ?? []).filter((t) => t !== ticketId) };
}

export function initiativesForTicket(links: Links, ticketId: string): string[] {
  return Object.keys(links).filter((id) => links[id].includes(ticketId));
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(target: string, long = false): string {
  const [, m] = target.split('-').map(Number);
  return (long ? MONTHS_LONG : MONTHS)[m - 1];
}

export function addMonths(target: string, delta: number): string {
  const [y, m] = target.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
