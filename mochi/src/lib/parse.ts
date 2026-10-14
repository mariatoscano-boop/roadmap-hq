/**
 * Composer understanding. Deterministic and local: project names, "@owner", a few date words,
 * "at 3pm" / "15:00", and "!" (high) / "!!" or "urgent" (urgent). Whatever it finds is shown
 * as a suggestion the person can change; nothing is hidden.
 */
import type { Member, Priority, Project } from '../types';
import { addDays, nextWeekday, today, weekdayIndex } from './dates';

export interface Parsed {
  title: string;
  projectId?: string;
  assigneeId?: string;
  dueDate?: string | null;
  dueWord?: string;
  time?: string;
  priority?: Priority;
}

const DAY_RE = /\b(?:on\s+)?(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseComposer(input: string, projects: Project[], members: Member[]): Parsed {
  let text = ` ${input} `;
  const out: Parsed = { title: '' };
  const strip = (re: RegExp) => {
    text = text.replace(re, ' ');
  };

  // Owner: only an explicit @mention ("Send Bryan update" is about Bryan, not for him).
  const at = text.match(/@(\w+)/);
  if (at) {
    const m = members.find((x) => x.name.toLowerCase().startsWith(at[1].toLowerCase()));
    if (m) {
      out.assigneeId = m.id;
      strip(/@\w+/);
    }
  }

  // Time
  const tm = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) ?? text.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (tm) {
    let h = Number(tm[1]);
    const mins = tm[2] ? Number(tm[2]) : 0;
    const ap = tm[3]?.toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    if (h <= 23) {
      out.time = `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
      strip(new RegExp(escape(tm[0]), 'i'));
    }
  }

  // Due date
  const t = today();
  const rules: [RegExp, () => string | null, string][] = [
    [/\b(today|tonight|tdy|eod)\b/i, () => t, 'Today'],
    [/\b(tomorrow|tmrw|tmr)\b/i, () => addDays(t, 1), 'Tomorrow'],
    [/\bnext week\b/i, () => nextWeekday(1), 'Next week'],
    [/\bthis week\b/i, () => nextWeekday(5, addDays(t, -1)), 'This week'],
  ];
  for (const [re, fn, word] of rules) {
    if (re.test(text)) {
      out.dueDate = fn();
      out.dueWord = word;
      strip(re);
      break;
    }
  }
  if (out.dueWord === undefined) {
    const inDays = text.match(/\bin (\d{1,2}) days?\b/i);
    const day = text.match(DAY_RE);
    if (inDays) {
      out.dueDate = addDays(t, Number(inDays[1]));
      out.dueWord = `In ${inDays[1]} days`;
      strip(/\bin \d{1,2} days?\b/i);
    } else if (day) {
      out.dueDate = nextWeekday(weekdayIndex(day[1]));
      out.dueWord = day[1][0].toUpperCase() + day[1].slice(1, 3).toLowerCase();
      strip(DAY_RE);
    }
  }
  text = text.replace(/\s(by|due|on)\s*$/i, ' ');

  // Priority
  if (/!!|\burgent\b|\basap\b/i.test(text)) out.priority = 'urgent';
  else if (/!/.test(text)) out.priority = 'high';
  strip(/!+|\burgent\b|\basap\b/gi);

  // Project: mentioned by name. Kept in the title ("Review Dosify hero"), except a trailing tag.
  for (const p of projects) {
    const name = escape(p.name.toLowerCase());
    const tag = new RegExp(`\\s(?:for|in|#)\\s?${name}\\s*$`, 'i');
    if (tag.test(text)) {
      out.projectId = p.id;
      strip(tag);
      break;
    }
    if (new RegExp(`(^|\\W)#?${name}(\\W|$)`, 'i').test(text)) {
      out.projectId = p.id;
      text = text.replace(new RegExp(`#(${name})`, 'i'), '$1');
      break;
    }
  }

  const c = text.replace(/\s+/g, ' ').trim().replace(/[,;:-]+$/, '').trim();
  out.title = c ? c[0].toUpperCase() + c.slice(1) : c;
  return out;
}
