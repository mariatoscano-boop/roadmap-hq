import { addDays, nextWeekday, today } from './dates';

export type DuePreset = 'today' | 'tomorrow' | 'weekend' | 'nextweek' | 'someday' | 'custom';

export function dateForPreset(p: DuePreset, custom: string | null): string | null {
  const t = today();
  switch (p) {
    case 'today': return t;
    case 'tomorrow': return addDays(t, 1);
    case 'weekend': return nextWeekday(6, addDays(t, -1));
    case 'nextweek': return nextWeekday(1);
    case 'someday': return null;
    case 'custom': return custom ?? t;
  }
}

export function presetForDate(d: string | null): DuePreset {
  if (d === null) return 'someday';
  for (const p of ['today', 'tomorrow', 'weekend', 'nextweek'] as DuePreset[]) if (dateForPreset(p, null) === d) return p;
  return 'custom';
}
