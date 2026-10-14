/**
 * Quick-add understanding. Deterministic and local: it looks for project names, a few date words
 * and urgency words. Anything it picks up is shown as a suggestion you can change.
 */
import type { Priority, Project } from '../types';
import { addDays, nextWeekday, today, weekdayIndex } from './dates';

export interface Parsed {
  title: string;
  projectId?: string;
  dueDate?: string | null;
  dueWord?: string;
  priority?: Priority;
}

const DAY_RE = /\b(?:on\s+)?(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;

export function parseQuickAdd(input: string, projects: Project[]): Parsed {
  let text = ` ${input} `;
  const out: Parsed = { title: '' };
  const strip = (re: RegExp) => {
    text = text.replace(re, ' ');
  };

  // Due date
  const t = today();
  const dateRules: [RegExp, () => string | null, string][] = [
    [/\b(today|tonight|tdy)\b/i, () => t, 'Today'],
    [/\b(tomorrow|tmrw|tmr)\b/i, () => addDays(t, 1), 'Tomorrow'],
    [/\bnext week\b/i, () => nextWeekday(1), 'Next week'],
    [/\b(this )?weekend\b/i, () => nextWeekday(6, addDays(t, -1)), 'This weekend'],
    [/\bsomeday\b/i, () => null, 'Someday'],
  ];
  for (const [re, fn, word] of dateRules) {
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
      const idx = weekdayIndex(day[1]);
      out.dueDate = nextWeekday(idx);
      out.dueWord = day[1][0].toUpperCase() + day[1].slice(1, 3).toLowerCase();
      strip(DAY_RE);
    }
  }
  // "by", "due", "on" left dangling after removing the date word
  text = text.replace(/\b(by|due|on)\s*$/i, ' ').replace(/\s(by|due)\s+(?=\s)/gi, ' ');

  // Priority
  if (/(!{1,3}|\b(urgent|asap|important)\b)/i.test(text)) {
    out.priority = 'high';
    strip(/(!{1,3}|\b(urgent|asap|important)\b)/gi);
  }

  // Project: mentioned by name. Kept in the title because it usually reads naturally there
  // ("Review Dosify hero"), except a trailing "for personal" style tag, which is removed.
  for (const p of projects) {
    const name = p.name.toLowerCase();
    const tag = new RegExp(`\\s(?:for|in|#)\\s?${escape(name)}\\s*$`, 'i');
    if (tag.test(text)) {
      out.projectId = p.id;
      strip(tag);
      break;
    }
    if (new RegExp(`(^|\\W)#?${escape(name)}(\\W|$)`, 'i').test(text)) {
      out.projectId = p.id;
      text = text.replace(new RegExp(`#(${escape(name)})`, 'i'), '$1');
      break;
    }
  }

  out.title = tidy(text);
  return out;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tidy = (s: string) => {
  const c = s.replace(/\s+/g, ' ').trim().replace(/[,;:-]+$/, '').trim();
  return c ? c[0].toUpperCase() + c.slice(1) : c;
};
