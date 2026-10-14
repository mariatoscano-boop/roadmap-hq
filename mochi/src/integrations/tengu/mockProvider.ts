/**
 * MockTenguProvider: a pretend Tengu that lives in this browser.
 * It starts with the same Tengu tasks as the sample workspace, accepts writes, and plays back a
 * few scripted teammate changes on the first syncs so "Sync now" visibly does something.
 * No network calls are made.
 */
import { SEED_MEMBERS, SEED_PROJECTS, seedTasks } from '../../data/seed';
import { addDays, today } from '../../lib/dates';
import { toTengu } from './mapping';
import type { TenguProvider } from './provider';
import { TenguProviderError } from './provider';
import type { PullResult, TenguSpace, TenguTask, TenguTaskDraft, TenguTaskPatch } from './types';

const STORAGE_KEY = 'mochi.mockTengu.v2';
const LATENCY = 800;

const SPACES: TenguSpace[] = [
  { id: 'space-fiji', name: 'FIJI' },
  { id: 'space-dosify', name: 'Dosify' },
];
const PREFIX: Record<string, string> = { 'space-fiji': 'FIJI', 'space-dosify': 'DOS' };
const STATUS_NAME = { available: 'To do', started: 'In progress', review: 'In review', blocked: 'Blocked', done: 'Done' } as const;

interface MockState {
  connected: boolean;
  tasks: TenguTask[];
  played: number;
  nextNumber: Record<string, number>;
}

const iso = () => new Date().toISOString();

function initialState(): MockState {
  const tasks = seedTasks()
    .filter((t) => t.tengu)
    .map((t) => toTengu(t, SEED_PROJECTS.find((p) => p.id === t.projectId)!.tenguSpaceId!, SEED_MEMBERS));
  return { connected: true, tasks, played: 0, nextNumber: { 'space-fiji': 160, 'space-dosify': 101 } };
}

/** Scripted remote changes, one batch per sync. */
const BATCHES: { apply: (s: MockState) => void; note: string }[] = [
  {
    note: 'Bryan assigned you 2 tasks',
    apply: (s) => {
      const t = today();
      s.tasks.push(
        { id: 'tg-FIJI-158', key: 'FIJI-158', title: 'Reply to QA notes on Buyer Profile', spaceId: 'space-fiji', status: 'To do', statusRole: 'available', assignee: 'Maria', dueDate: t, priority: 2, updatedAt: iso() },
        { id: 'tg-DOS-99', key: 'DOS-99', title: 'Approve Final CTA copy', spaceId: 'space-dosify', status: 'To do', statusRole: 'available', assignee: 'Maria', dueDate: addDays(t, 2), priority: 3, updatedAt: iso() },
      );
    },
  },
  {
    note: 'Natalia started “FAQ”',
    apply: (s) => {
      const faq = s.tasks.find((x) => x.id === 'tg-DOS-97');
      if (faq && faq.statusRole === 'available') Object.assign(faq, { statusRole: 'started', status: 'In progress', updatedAt: iso() });
    },
  },
];

export class MockTenguProvider implements TenguProvider {
  readonly kind = 'mock' as const;
  readonly label = 'Sample Tengu (prototype)';
  private state: MockState;

  constructor() {
    this.state = this.load() ?? initialState();
  }

  reset() {
    this.state = initialState();
    this.save();
  }

  async connect() {
    await wait(LATENCY);
    this.state.connected = true;
    this.save();
  }

  async disconnect() {
    await wait(200);
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
    if (!SPACES.some((s) => s.id === d.spaceId)) throw new TenguProviderError('That project isn’t in Tengu.', 'not_found');
    const n = this.state.nextNumber[d.spaceId]++;
    const key = `${PREFIX[d.spaceId]}-${n}`;
    const task: TenguTask = {
      id: `tg-${key}`, key, title: d.title, spaceId: d.spaceId, status: STATUS_NAME[d.statusRole], statusRole: d.statusRole,
      assignee: d.assignee, dueDate: d.dueDate, priority: d.priority, updatedAt: iso(),
    };
    this.state.tasks.push(task);
    this.save();
    return { ...task };
  }

  async updateTask(id: string, patch: TenguTaskPatch): Promise<TenguTask> {
    await wait(300);
    this.requireConnected();
    const task = this.state.tasks.find((t) => t.id === id);
    if (!task) throw new TenguProviderError('That task isn’t in Tengu anymore.', 'not_found');
    Object.assign(task, patch, { updatedAt: iso() });
    if (patch.statusRole) task.status = STATUS_NAME[patch.statusRole];
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
