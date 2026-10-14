/** What Mochi (the companion) feels and says. Pure functions over app state. */
import type { Mood, Task } from '../types';
import { completedToday, isOverdue, todayTasks } from './selectors';

export interface Speech {
  mood: Mood;
  line: string;
  /** Optional task the line is about (Mochi can point at it). */
  taskId?: string;
}

/** Mochi's resting state, from what's on today. */
export function restingSpeech(tasks: Task[], hour = new Date().getHours()): Speech {
  const overdue = tasks.filter(isOverdue).sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
  const list = todayTasks(tasks);
  const open = list.filter((t) => !t.completed).length;
  const done = completedToday(tasks);

  if (overdue.length) return { mood: 'concerned', line: 'Ummm... babe... we’ve been avoiding this one. 👀', taskId: overdue[0].id };
  if (list.length === 0) return { mood: hour >= 21 || hour < 6 ? 'sleepy' : 'peaceful', line: 'Looks suspiciously peaceful around here... 🌸' };
  if (open === 0) return { mood: 'celebrate', line: 'YOU DID IT!!! 💗✨' };
  if (done >= 3) return { mood: 'proud', line: 'Productivity princess mode activated. 🎀' };
  if (hour >= 22 || hour < 6) return { mood: 'sleepy', line: `${open} left, but sleep counts as productivity too. 🌙` };
  if (open === 1) return { mood: 'happy', line: 'Just one more thing. Then we’re free! ♡' };
  return { mood: 'happy', line: `${open} things today. One at a time, we’ve got this ♡` };
}

export type Reaction =
  | 'complete' | 'streak3' | 'streak5' | 'allDone' | 'projectDone' | 'uncomplete'
  | 'add' | 'delete' | 'synced' | 'syncedNew' | 'focus' | 'unlock' | 'tenguAdded';

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export function reactionSpeech(r: Reaction, detail = ''): Speech {
  switch (r) {
    case 'complete':
      return { mood: 'excited', line: pick(['YAYYY! One less thing! ✨', 'Done and dusted! ✨', 'Look at you go! ♡', 'Checked! That felt good, right? ✨']) };
    case 'streak3':
      return { mood: 'proud', line: 'Productivity princess mode activated. 🎀' };
    case 'streak5':
      return { mood: 'celebrate', line: 'FIVE things?! Who even are you?! 💗' };
    case 'allDone':
      return { mood: 'celebrate', line: 'YOU DID IT!!! 💗✨' };
    case 'projectDone':
      return { mood: 'celebrate', line: `${detail} is all done?! Iconic. 🪩` };
    case 'uncomplete':
      return { mood: 'happy', line: 'Back on the list. No judgement ♡' };
    case 'add':
      return { mood: 'excited', line: pick(['Ooh, noted! ✍️', 'Got it, it’s on the list ♡', 'Added! Future you says thanks.']) };
    case 'delete':
      return { mood: 'happy', line: 'Poof! Gone. 🫧' };
    case 'synced':
      return { mood: 'happy', line: 'All caught up with Tengu ♡' };
    case 'syncedNew':
      return { mood: 'excited', line: `Fresh from Tengu: ${detail} 📬` };
    case 'focus':
      return { mood: 'proud', line: 'Focus mode on. Just these, okay? 💗' };
    case 'unlock':
      return { mood: 'excited', line: `New for our room: ${detail}! 🎁` };
    case 'tenguAdded':
      return { mood: 'excited', line: `Sent to Tengu as ${detail}. Fancy! ✨` };
  }
}

/** Something to say when poked. */
export function pokeSpeech(tasks: Task[]): Speech {
  const overdue = tasks.find(isOverdue);
  const open = todayTasks(tasks).filter((t) => !t.completed);
  const lines: Speech[] = [
    { mood: 'excited', line: 'Boop! ♡' },
    { mood: 'happy', line: 'Hydrate, queen. 💧' },
    { mood: 'happy', line: 'Have you eaten? A strawberry counts. 🍓' },
    { mood: 'proud', line: 'I’m small, but I’m very proud of you.' },
    { mood: 'happy', line: 'One task, then a snack. Deal?' },
    { mood: 'excited', line: 'Hehe, that tickles!' },
  ];
  if (overdue) lines.push({ mood: 'concerned', line: `Psst... “${overdue.title}” won’t do itself 👀`, taskId: overdue.id });
  if (open.length) {
    const t = open[Math.floor(Math.random() * open.length)];
    lines.push({ mood: 'happy', line: `What if we did “${t.title}” next? ♡`, taskId: t.id });
  }
  return pick(lines);
}
