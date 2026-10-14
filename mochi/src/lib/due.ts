import { addDays, nextWeekday, parseISO, today } from './dates';

export type DuePreset = 'today' | 'tomorrow' | 'week' | 'nextweek' | 'none' | 'custom';

export const DUE_OPTIONS: { key: DuePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This week' },
  { key: 'nextweek', label: 'Next week' },
  { key: 'none', label: 'No date' },
];

/** "This week" = this Friday (or next Friday from the weekend). */
function endOfWeek(t: string) {
  const d = parseISO(t).getDay();
  return d >= 1 && d <= 4 ? nextWeekday(5, t) : d === 5 ? t : nextWeekday(5, t);
}

export function dateForPreset(p: DuePreset, custom: string | null): string | null {
  const t = today();
  switch (p) {
    case 'today': return t;
    case 'tomorrow': return addDays(t, 1);
    case 'week': return endOfWeek(t);
    case 'nextweek': return nextWeekday(1);
    case 'none': return null;
    case 'custom': return custom ?? t;
  }
}

export function presetForDate(d: string | null): DuePreset {
  if (d === null) return 'none';
  for (const p of ['today', 'tomorrow', 'week', 'nextweek'] as DuePreset[]) if (dateForPreset(p, null) === d) return p;
  return 'custom';
}
