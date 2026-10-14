/** Local-date helpers. Due dates are plain YYYY-MM-DD strings in the user's time zone. */

const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => toISODate(new Date());

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + n));
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Whole days from today to `iso` (negative = in the past). */
export function daysFromToday(iso: string): number {
  const ms = parseISO(iso).getTime() - parseISO(today()).getTime();
  return Math.round(ms / 86_400_000);
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The next date (after today) that falls on this weekday index. */
export function nextWeekday(idx: number, from = today()): string {
  const cur = parseISO(from).getDay();
  const diff = ((idx - cur + 7) % 7) || 7;
  return addDays(from, diff);
}

export const weekdayIndex = (word: string) => WEEKDAYS.findIndex((w) => w.startsWith(word.toLowerCase().slice(0, 3)));

/** "Today", "Tomorrow", "Fri", "Oct 28", "2 days late". */
export function dueLabel(iso: string | null): string {
  if (!iso) return 'Someday';
  const n = daysFromToday(iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n < 0) return `${-n} days late`;
  if (n < 7) return SHORT_DAY[parseISO(iso).getDay()];
  const d = parseISO(iso);
  return `${SHORT_MONTH[d.getMonth()]} ${d.getDate()}`;
}

export function longDate(d = new Date()): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Bucket used for grouping in project views. */
export type DueBucket = 'overdue' | 'today' | 'week' | 'later' | 'someday';
export function bucketOf(iso: string | null): DueBucket {
  if (!iso) return 'someday';
  const n = daysFromToday(iso);
  if (n < 0) return 'overdue';
  if (n === 0) return 'today';
  if (n <= 7) return 'week';
  return 'later';
}

export function relativeTime(iso: string | null, now = Date.now()): string {
  if (!iso) return 'never';
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Hi, night owl';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Hi, night owl';
}
