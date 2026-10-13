/**
 * TenguAdapter — the only door between Product HQ and Tengu.
 *
 * The UI never talks to Tengu (or MCP) directly; it talks to the store, the store talks to the
 * SyncEngine, and the SyncEngine talks to an adapter. Every method maps to a capability that the
 * Tengu MCP server actually exposes (see docs/TENGU_INTEGRATION.md for the inspection results):
 *
 *   getLists()          → list_lists
 *   getTickets()        → list_tasks (limit ≤ 100, optional updated_since for incremental pulls)
 *   getTicket(id)       → get_task (includes comments, oldest first)
 *   searchTickets(q)    → search / list_tasks { text }
 *   updateTicket(id,u)  → update_task (name, status, assignee, priority, due_date, description)
 *   createTicket(d)     → create_task
 *   getTicketActivity() → get_task comments (Tengu exposes comments, not a full audit log)
 *
 * Not supported by Tengu (deliberately absent): deleting tickets, updating lists/projects,
 * webhooks or realtime events, a per-ticket progress field, multiple assignees on update.
 */
import { MOCK_LISTS, MOCK_MEMBERS, MOCK_TICKETS } from '../data/mock';
import type {
  TenguComment,
  TenguList,
  TenguMember,
  TenguTicket,
  TenguTicketDraft,
  TenguTicketUpdate,
} from '../types/tengu';

export interface TenguCapabilities {
  realtime: boolean;
  webhooks: boolean;
  incrementalSync: boolean;
  deleteTickets: boolean;
  updateLists: boolean;
}

export interface TenguAdapter {
  readonly name: string;
  readonly capabilities: TenguCapabilities;
  getLists(): Promise<TenguList[]>;
  getMembers(): Promise<TenguMember[]>;
  /** All tickets the connection can see, optionally only those changed since `since`. */
  getTickets(opts?: { since?: string }): Promise<TenguTicket[]>;
  getTicket(id: string): Promise<TenguTicket>;
  searchTickets(query: string): Promise<TenguTicket[]>;
  updateTicket(id: string, updates: TenguTicketUpdate): Promise<TenguTicket>;
  createTicket(draft: TenguTicketDraft): Promise<TenguTicket>;
  getTicketActivity(id: string): Promise<TenguComment[]>;
}

export class TenguError extends Error {}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * In-memory Tengu with realistic latency. Keeps the app fully usable without a connection and
 * simulates teammates changing tickets in Tengu so you can watch the roadmap react.
 */
export class MockTenguAdapter implements TenguAdapter {
  readonly name = 'Mock Tengu';
  readonly capabilities: TenguCapabilities = {
    realtime: false,
    webhooks: false,
    incrementalSync: true,
    deleteTickets: false,
    updateLists: false,
  };

  private tickets = new Map<string, TenguTicket>(clone(MOCK_TICKETS).map((t) => [t.id, t]));
  private seq = 400;

  /** 0–1 chance an update fails (enable with ?chaos=1 to exercise retry UI). */
  constructor(private failureRate = 0) {}

  private async latency(min = 250, max = 700) {
    await wait(min + Math.random() * (max - min));
  }

  async getLists() {
    await this.latency(100, 250);
    return clone(MOCK_LISTS);
  }

  async getMembers() {
    return clone(MOCK_MEMBERS);
  }

  async getTickets(opts: { since?: string } = {}) {
    await this.latency();
    const all = [...this.tickets.values()];
    const list = opts.since ? all.filter((t) => t.updatedAt > opts.since!) : all;
    return clone(list).map(({ comments: _c, ...t }) => t as TenguTicket);
  }

  async getTicket(id: string) {
    await this.latency(150, 350);
    const t = this.tickets.get(id);
    if (!t) throw new TenguError(`Ticket ${id} not found`);
    return clone(t);
  }

  async searchTickets(query: string) {
    await this.latency(120, 300);
    const q = query.trim().toLowerCase();
    const all = [...this.tickets.values()].filter((t) => t.statusRole !== 'closed');
    if (!q) return clone(all.slice(0, 20));
    return clone(
      all
        .map((t) => {
          const hay = `${t.key} ${t.title} ${t.description}`.toLowerCase();
          const score = t.key.toLowerCase() === q ? 100 : t.title.toLowerCase().includes(q) ? 10 : hay.includes(q) ? 1 : 0;
          return { t, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.t),
    );
  }

  async updateTicket(id: string, u: TenguTicketUpdate) {
    await this.latency(400, 900);
    if (Math.random() < this.failureRate) throw new TenguError('Tengu did not respond (simulated)');
    const t = this.tickets.get(id);
    if (!t) throw new TenguError(`Ticket ${id} not found`);
    const list = MOCK_LISTS.find((l) => l.id === t.listId)!;
    if (u.status !== undefined) {
      const s = list.statuses.find((x) => x.status === u.status);
      if (!s) throw new TenguError(`"${u.status}" is not a status of ${list.name}`);
      t.status = s.status;
      t.statusRole = s.role;
    }
    if (u.name !== undefined) t.title = u.name;
    if (u.priority !== undefined) t.priority = u.priority;
    if (u.dueDate !== undefined) t.dueDate = u.dueDate;
    if (u.description !== undefined) t.description = u.description;
    if (u.assignee !== undefined) {
      const m = MOCK_MEMBERS.find((x) => x.id === u.assignee || x.email === u.assignee);
      t.assignees = m ? [m] : [];
    }
    t.updatedAt = new Date().toISOString();
    return clone(t);
  }

  async createTicket(d: TenguTicketDraft) {
    await this.latency(500, 900);
    const list = MOCK_LISTS.find((l) => l.id === d.listId);
    if (!list) throw new TenguError('Unknown list');
    const n = ++this.seq;
    const assignee = MOCK_MEMBERS.find((m) => m.id === d.assignee);
    const status = assignee ? list.statuses[0] : list.statuses.find((s) => s.role === 'available') ?? list.statuses[0];
    const t: TenguTicket = {
      id: `tk-${n}`,
      key: `FIJI-${n}`,
      title: d.name,
      description: d.description ?? '',
      listId: d.listId,
      status: status.status,
      statusRole: status.role,
      priority: d.priority ?? 3,
      assignees: assignee ? [assignee] : [],
      dueDate: d.dueDate ?? null,
      url: `https://tengu.example/t/FIJI-${n}`,
      updatedAt: new Date().toISOString(),
      comments: [],
    };
    this.tickets.set(t.id, t);
    return clone(t);
  }

  async getTicketActivity(id: string) {
    return (await this.getTicket(id)).comments ?? [];
  }

  /** Simulates a teammate moving a ticket forward in Tengu. Returns what changed. */
  simulateRemoteChange(): TenguTicket | null {
    const flow: Record<string, string> = {
      'current week': 'in progress',
      'in progress': 'qa review',
      'qa review': 'qa passed',
      'qa passed': 'merged to dev',
      rework: 'qa review',
    };
    const candidates = [...this.tickets.values()].filter((t) => flow[t.status]);
    if (!candidates.length) return null;
    const t = candidates[Math.floor(Math.random() * candidates.length)];
    const next = MOCK_LISTS.find((l) => l.id === t.listId)!.statuses.find((s) => s.status === flow[t.status])!;
    t.status = next.status;
    t.statusRole = next.role;
    t.updatedAt = new Date().toISOString();
    t.comments = [...(t.comments ?? []), { id: `c-r${Date.now()}`, author: t.assignees[0]?.name ?? 'Tengu', body: `Moved to **${next.status}**.`, createdAt: t.updatedAt }];
    return clone(t);
  }
}

export function createTenguAdapter(): TenguAdapter {
  let chaos = false;
  try {
    chaos = new URLSearchParams(window.location.search).has('chaos');
  } catch {
    /* non-browser */
  }
  return new MockTenguAdapter(chaos ? 0.35 : 0);
}
