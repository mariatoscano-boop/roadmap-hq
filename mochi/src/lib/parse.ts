/**
 * Quick-add understanding. Deterministic and local, no AI: world names, a few date words,
 * "!" for high priority, and "waiting on <name>" / "@name" for things you're waiting for.
 * Whatever it finds is shown on the quest so you can change it.
 */
import type { World } from '../types';
import { addDays, nextWeekday, today, weekdayIndex } from './dates';

export interface Parsed {
  title: string;
  worldId?: string;
  dueDate?: string | null;
  dueWord?: string;
  waitingOn?: string;
  high?: boolean;
}

const DAY_RE = /\b(?:on\s+)?(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Words that point at a world even when its name isn't typed. */
const ALIASES: Record<string, string[]> = {
  personal: ['groceries', 'mom', 'dentist', 'gym', 'flowers', 'appointment', 'home'],
  ideas: ['idea', 'someday', 'maybe'],
};

export function parseQuest(input: string, worlds: World[]): Parsed {
  let text = ` ${input} `;
  const out: Parsed = { title: '' };
  const strip = (re: RegExp) => { text = text.replace(re, ' '); };

  const wait = text.match(/\bwaiting (?:on|for) ([A-Z][\w-]*(?: [A-Z][\w-]*)?)/) ?? text.match(/@([A-Za-z][\w-]*)/);
  if (wait) {
    out.waitingOn = wait[1][0].toUpperCase() + wait[1].slice(1);
    strip(new RegExp(esc(wait[0])));
  }

  const t = today();
  const rules: [RegExp, () => string | null, string][] = [
    [/\b(today|tonight|tdy|eod)\b/i, () => t, 'Today'],
    [/\b(tomorrow|tmrw|tmr)\b/i, () => addDays(t, 1), 'Tomorrow'],
    [/\bnext week\b/i, () => nextWeekday(1), 'Next week'],
    [/\b(this )?weekend\b/i, () => nextWeekday(6, addDays(t, -1)), 'Weekend'],
    [/\bsomeday\b/i, () => null, 'Someday'],
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
    const day = text.match(DAY_RE);
    if (day) {
      out.dueDate = nextWeekday(weekdayIndex(day[1]));
      out.dueWord = day[1][0].toUpperCase() + day[1].slice(1, 3).toLowerCase();
      strip(DAY_RE);
    }
  }
  text = text.replace(/\s(by|due|on)\s*$/i, ' ');

  if (/!/.test(text)) {
    out.high = true;
    strip(/!+/g);
  }

  // World: by name (kept in the title, since it usually reads naturally), else by alias.
  const lower = text.toLowerCase();
  const byName = worlds.find((w) => new RegExp(`(^|\\W)${esc(w.name.toLowerCase())}(\\W|$)`).test(lower));
  if (byName) out.worldId = byName.id;
  else {
    for (const [wid, words] of Object.entries(ALIASES)) {
      if (worlds.some((w) => w.id === wid) && words.some((x) => new RegExp(`\\b${x}`, 'i').test(lower))) {
        out.worldId = wid;
        break;
      }
    }
  }

  const c = text.replace(/\s+/g, ' ').trim().replace(/[,;:-]+$/, '').trim();
  out.title = c ? c[0].toUpperCase() + c.slice(1) : c;
  return out;
}
