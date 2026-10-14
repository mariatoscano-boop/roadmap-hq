/**
 * A pretend external tool that lives in this browser. It starts with the external quests from the
 * sample data, accepts writes, and plays back scripted remote changes on the first syncs so
 * "Sync" visibly does something. No network calls are made.
 */
import { seedQuests } from '../data/seed';
import { addDays, today } from '../lib/dates';
import type { ExternalTask, IntegrationProvider, PullResult } from './types';
import { IntegrationError } from './types';

interface MockState {
  connected: boolean;
  tasks: ExternalTask[];
  played: number;
  next: number;
}

interface Batch {
  note: string;
  apply: (tasks: ExternalTask[]) => void;
}

const iso = () => new Date().toISOString();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockProvider implements IntegrationProvider {
  readonly kind = 'mock' as const;
  private state: MockState;
  private storageKey: string;

  constructor(
    readonly id: string,
    readonly label: string,
    private refOf: Record<string, string>,
    private keyPrefix: Record<string, string>,
    private batches: Batch[],
    firstNumber: number,
  ) {
    this.storageKey = `mochi.mock.${id}.v3`;
    this.state = this.load() ?? this.initial(firstNumber);
  }

  private initial(next: number): MockState {
    const tasks = seedQuests()
      .filter((q) => q.external?.integrationId === this.id)
      .map((q) => ({ key: q.external!.key, title: q.title, ref: this.refOf[q.worldId], done: q.done, dueDate: q.dueDate, priority: q.priority, updatedAt: q.createdAt }));
    return { connected: true, tasks, played: 0, next };
  }

  reset() {
    this.state = this.initial(this.state.next);
    this.save();
  }

  async connect() {
    await wait(700);
    this.state.connected = true;
    this.save();
  }

  async disconnect() {
    await wait(150);
    this.state.connected = false;
    this.save();
  }

  async pull(): Promise<PullResult> {
    await wait(900);
    this.guard();
    const notes: string[] = [];
    const b = this.batches[this.state.played];
    if (b) {
      b.apply(this.state.tasks);
      this.state.played++;
      notes.push(b.note);
      this.save();
    }
    return { tasks: this.state.tasks.map((t) => ({ ...t })), syncedAt: iso(), notes };
  }

  async create(d: { ref: string; title: string; dueDate: string | null; priority: 'normal' | 'high' }) {
    await wait(700);
    this.guard();
    const key = `${this.keyPrefix[d.ref] ?? 'TSK'}-${this.state.next++}`;
    const t: ExternalTask = { key, title: d.title, ref: d.ref, done: false, dueDate: d.dueDate, priority: d.priority, updatedAt: iso() };
    this.state.tasks.push(t);
    this.save();
    return { ...t };
  }

  async update(key: string, patch: Partial<Pick<ExternalTask, 'done' | 'title' | 'dueDate' | 'priority'>>) {
    await wait(250);
    this.guard();
    const t = this.state.tasks.find((x) => x.key === key);
    if (!t) throw new IntegrationError(`${key} isn’t in ${this.label} anymore.`, 'not_found');
    Object.assign(t, patch, { updatedAt: iso() });
    this.save();
    return { ...t };
  }

  private guard() {
    if (!this.state.connected) throw new IntegrationError(`${this.label} isn’t connected.`, 'not_connected');
  }

  private load(): MockState | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as MockState) : null;
    } catch {
      return null;
    }
  }

  private save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      /* storage unavailable: still works for this visit */
    }
  }
}

/** Scripted remote changes for the sample Tengu. */
export const TENGU_BATCHES: Batch[] = [
  {
    note: 'New in FIJI: Reply to QA notes on Buyer Profile',
    apply: (tasks) => tasks.push({ key: 'FIJI-158', title: 'Reply to QA notes on Buyer Profile', ref: 'space-fiji', done: false, dueDate: today(), priority: 'high', updatedAt: iso() }),
  },
  {
    note: 'Pricing section moved to tomorrow',
    apply: (tasks) => {
      const t = tasks.find((x) => x.key === 'DOS-95');
      if (t) Object.assign(t, { dueDate: addDays(today(), 1), updatedAt: iso() });
    },
  },
];

export const CLIENT_TOOL_BATCHES: Batch[] = [
  {
    note: 'New in CLIENT A: Share revised timeline',
    apply: (tasks) => tasks.push({ key: 'CMP-34', title: 'Share revised timeline', ref: 'board-campaign', done: false, dueDate: addDays(today(), 1), priority: 'normal', updatedAt: iso() }),
  },
];
