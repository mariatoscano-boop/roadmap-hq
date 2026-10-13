import type { Initiative, RoadmapLayout, Zone } from '../types/roadmap';

export const ZONES: Zone[] = ['now', 'next', 'later'];

export const ZONE_META: Record<Zone, { label: string; emoji: string; tagline: string }> = {
  now: { label: 'NOW', emoji: '🔥', tagline: 'Building this quarter' },
  next: { label: 'NEXT', emoji: '⚡', tagline: 'Lining up' },
  later: { label: 'LATER', emoji: '🌙', tagline: 'On the horizon' },
};

export function byZone(initiatives: Initiative[], zone: Zone): Initiative[] {
  return initiatives.filter((i) => i.zone === zone).sort((a, b) => a.order - b.order);
}

/** Apply the shared layout to initiatives: zone + order come from it, unknown ones go last in their stored zone. */
export function applyLayout(initiatives: Initiative[], layout: RoadmapLayout | null): Initiative[] {
  const pos = new Map<string, { zone: Zone; order: number }>();
  if (layout) for (const z of ZONES) (layout[z] ?? []).forEach((id, order) => !pos.has(id) && pos.set(id, { zone: z, order }));
  return initiatives.map((i) => {
    const p = pos.get(i.id);
    return p ? { ...i, ...p } : { ...i, order: 1000 + (i.order ?? 0) };
  });
}

export function layoutOf(initiatives: Initiative[]): RoadmapLayout {
  const out = {} as RoadmapLayout;
  for (const z of ZONES) out[z] = byZone(initiatives, z).map((i) => i.id);
  return out;
}

/**
 * Moves an initiative into `zone` at position `index` and renumbers every zone.
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

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Project id for a Tengu space name: "Prizmstack Internal" → "prizmstack-internal". */
export function projectSlug(space: string): string {
  return space.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'project';
}

/** The roadmap that existed before projects were added belongs to Fiji. */
export const LEGACY_PROJECT = 'fiji';

export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
