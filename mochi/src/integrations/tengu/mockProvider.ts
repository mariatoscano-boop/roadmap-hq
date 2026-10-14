/**
 * MockTenguProvider: a pretend Tengu that lives in this browser.
 * It starts with the same Tengu tasks the seed data shows, accepts writes, and plays back a few
 * scripted "teammate" changes on the first syncs so "Sync now" visibly does something.
 * No network calls are made.
 */
import { addDays, today } from '../../lib/dates';
import type { TenguProvider } from './provider';
import { TenguProviderError } from './provider';
import type { PullResult, TenguSpace, TenguTask, TenguTaskDraft, TenguTaskPatch } from './types';

const STORAGE_KEY = 'mochi.mockTengu.v1';
const LATENCY = 900;

const SPACES: TenguSpace[] = [
  { id: 'space-fiji', name: 'FIJI' },
  { id: 'space-dosify', name: 'Dosify' },
];

interface MockState {
  connected: boolean;
  tasks: TenguTask[];
  /** How many scripted batches have been played back. */
  played: number;
  nextNumber: Record<string, number>;
}

const iso = () => new Date().toISOString();

function initialTasks(): TenguTask[] {
  const t = today();
  const mk = (id: string, key: string, title: string, spaceId: string, due: number, priority: TenguTask['priority'], done = false): TenguTask => ({
    id, key, title, spaceId, status: done ? 'Done' : 'In progress', done, dueDate: addDays(t, due), priority, updatedAt: iso(),
  });
  return [
    mk('tg-1042', 'FIJI-142', 'Review Buyer Profile', 'space-fiji', 0, 2),
    mk('tg-1043', 'FIJI-145', 'Review Broker Fit', 'space-fiji', 0, 3, true),
    mk('tg-1044', 'FIJI-151', 'Check staging', 'space-fiji', -1, 2),
    mk('tg-2201', 'DOS-88', 'Review landing hero', 'space-dosify', 0, 3, true),
    mk('tg-2202', 'DOS-91', 'Finish Community page', 'space-dosify', 0, 2),
    mk('tg-2203', 'DOS-92', 'Mobile hero', 'space-dosify', 0, 3),
    mk('tg-2204', 'DOS-95', 'Pricing section', 'space-dosify', 2, 3),
    mk('tg-2205', 'DOS-97', 'FAQ', 'space-dosify', 4, 4),
  ];
}

/** Scripted remote changes, one batch per sync. */
const BATCHES: { apply: (s: MockState) => void; note: string }[] = [
  {
    note: 'Bryan assigned you 2 new tasks',
    apply: (s) => {
      const t = today();
      s.tasks.push(
        { id: 'tg-1058', key: 'FIJI-158', title: 'Reply to QA notes on Buyer Profile', spaceId: 'space-fiji', status: 'To do', done: false, dueDate: t, priority: 2, updatedAt: iso() },
        { id: 'tg-2209', key: 'DOS-99', title: 'Final CTA', spaceId: 'space-dosify', status: 'To do', done: false, dueDate: addDays(t, 5), priority: 3, updatedAt: iso() },
      );
    },
  },
  {
    note: 'Ana finished “FAQ” in Tengu',
    apply: (s) => {
      const faq = s.tasks.find((x) => x.id === 'tg-2205');
      if (faq && !faq.done) Object.assign(faq, { done: true, status: 'Done', updatedAt: iso() });
    },
  },
];

export class MockTenguProvider implements TenguProvider {
  readonly kind = 'mock' as const;
  readonly label = 'Sample Tengu (prototype)';
  private state: MockState;

  constructor() {
    this.state = this.load() ?? { connected: true, tasks: initialTasks(), played: 0, nextNumber: { 'space-fiji': 160, 'space-dosify': 101 } };
  }

  reset() {
    this.state = { connected: true, tasks: initialTasks(), played: 0, nextNumber: { 'space-fiji': 160, 'space-dosify': 101 } };
    this.save();
  }

  get connected() {
    return this.state.connected;
  }

  async connect() {
    await wait(LATENCY);
    this.state.connected = true;
    this.save();
  }

  async disconnect() {
    await wait(250);
    this.state.connected = false;
    this.save();
  }

  async pull(): Promise<PullResult> {
    await wait(LATENCY + 300);
    this.requireConnected();
    const notes: string[] = [];
    const batch = BATCHES[this.state.played];
    if (batch) {
      batch.apply(this.state);
      this.state.played++;
      notes.push(batch.note);
      this.save();
    }
    return { spaces: SPACES, tasks: this.state.tasks.map((t) => ({ ...t })), syncedAt: iso(), notes };
  }

  async createTask(d: TenguTaskDraft): Promise<TenguTask> {
    await wait(LATENCY);
    this.requireConnected();
    const space = SPACES.find((s) => s.id === d.spaceId);
    if (!space) throw new TenguProviderError('That project isn’t in Tengu.', 'not_found');
    const n = this.state.nextNumber[d.spaceId]++;
    const prefix = space.name === 'Dosify' ? 'DOS' : space.name.toUpperCase();
    const task: TenguTask = { id: `tg-${d.spaceId}-${n}`, key: `${prefix}-${n}`, title: d.title, spaceId: d.spaceId, status: 'To do', done: false, dueDate: d.dueDate, priority: d.priority, updatedAt: iso() };
    this.state.tasks.push(task);
    this.save();
    return { ...task };
  }

  async updateTask(id: string, patch: TenguTaskPatch): Promise<TenguTask> {
    await wait(350);
    this.requireConnected();
    const task = this.state.tasks.find((t) => t.id === id);
    if (!task) throw new TenguProviderError('That task isn’t in Tengu anymore.', 'not_found');
    Object.assign(task, patch, { updatedAt: iso() });
    if (patch.done !== undefined) task.status = patch.done ? 'Done' : 'In progress';
    this.save();
    return { ...task };
  }

  private requireConnected() {
    if (!this.state.connected) throw new TenguProviderError('Tengu isn’t connected.', 'not_connected');
  }

  private load(): MockState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as MockState) : null;
    } catch {
      return null;
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      /* storage unavailable: the mock still works for this visit */
    }
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
