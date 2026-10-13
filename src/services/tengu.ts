/**
 * TenguAdapter — the only door between Product HQ and Tengu. Read-only by design: the roadmap
 * shows live Tengu status, and edits to tickets happen in Tengu ("Open in Tengu").
 *
 *   getProjects()         → list_lists, grouped by space (a project = a Tengu space)
 *   getTicket(id)         → get_task (includes comments)
 *   getTicketsByIds(ids)  → get_task per linked ticket
 *   searchTickets(q, ids) → list_tasks { text, list_id } per project list, + search (all of Tengu)
 *
 * Implementations:
 *   - MockTenguAdapter: in-memory sample data, for local dev only (never inside the published page).
 *   - McpTenguAdapter:  the viewer's own Tengu connector, through the Artifact `mcp` capability.
 *     Calls run with the viewer's credentials; the page never sees a token.
 *   - UnavailableTenguAdapter: published page where this view can't use connectors at all.
 */
import { MOCK_LISTS, MOCK_TICKETS } from '../data/mock';
import { projectSlug } from '../lib/roadmap';
import type { Project } from '../types/roadmap';
import type { SnapTicket, StatusRole, TenguComment, TenguTicket } from '../types/tengu';
import type { TenguSnapshot } from './roadmapStore';
import { inArtifact, useCapability } from './runtime';

export interface TenguAdapter {
  readonly name: string;
  readonly live: boolean;
  getProjects(): Promise<Project[]>;
  getTicket(id: string): Promise<TenguTicket>;
  getTicketsByIds(ids: string[]): Promise<{ tickets: TenguTicket[]; failed: string[] }>;
  /**
   * Tickets matching `query`. With `listIds`, searches those lists first; results from the rest of
   * Tengu may follow (their `listId` is outside `listIds`, or empty when Tengu didn't say).
   */
  searchTickets(query: string, listIds?: string[]): Promise<TenguTicket[]>;
  /** The most recently changed tickets of these lists (used to build the shared copy). */
  recentTickets(listIds: string[]): Promise<TenguTicket[]>;
}

/** Strip a ticket down to what the shared copy keeps. */
export function toSnap(t: TenguTicket, at: string): SnapTicket {
  return {
    id: t.id,
    key: t.key,
    title: t.title.slice(0, 200),
    listId: t.listId,
    listName: t.listName,
    status: t.status,
    statusRole: t.statusRole,
    priority: t.priority,
    assignees: t.assignees.map((a) => ({ id: a.id, name: a.name })),
    dueDate: t.dueDate,
    url: t.url,
    updatedAt: t.updatedAt,
    at,
  };
}

/** Did anything a viewer would see change between two copies of a ticket? */
export function snapDiffers(a: SnapTicket | undefined, b: SnapTicket): boolean {
  if (!a) return true;
  const pick = (x: SnapTicket) => JSON.stringify([x.title, x.status, x.statusRole, x.priority, x.dueDate, x.assignees.map((p) => p.name), x.url, x.key]);
  return pick(a) !== pick(b);
}

export const fromSnap = (s: SnapTicket): TenguTicket => ({ ...s, description: '', snapshotAt: s.at });

/**
 * Reads Tengu data from the shared copy that teammates' pages saved, for viewers whose own page
 * can't reach Tengu. Read-only; never calls Tengu.
 */
export class SnapshotTenguAdapter implements TenguAdapter {
  readonly name = 'Shared copy of Tengu';
  readonly live = false;
  readonly server = null;
  constructor(private snap: () => TenguSnapshot) {}

  private all(): SnapTicket[] {
    const s = this.snap();
    const map = new Map<string, SnapTicket>();
    for (const idx of Object.values(s.index)) for (const t of idx.tickets) map.set(t.id, { ...t, at: t.at || idx.at });
    for (const t of Object.values(s.tickets)) map.set(t.id, t);
    return [...map.values()];
  }

  async getProjects() {
    const p = this.snap().projects;
    if (!p) throw new TenguError('No shared copy of Tengu yet. It appears once a teammate with Tengu opens this page.', 'no_snapshot');
    return p;
  }

  async getTicket(id: string) {
    const t = this.all().find((x) => x.id === id);
    if (!t) throw new TenguError('This ticket isn’t in the shared copy yet.', 'not_found');
    return fromSnap(t);
  }

  async getTicketsByIds(ids: string[]) {
    const all = new Map(this.all().map((t) => [t.id, t]));
    return { tickets: ids.filter((id) => all.has(id)).map((id) => fromSnap(all.get(id)!)), failed: ids.filter((id) => !all.has(id)) };
  }

  async searchTickets(query: string, listIds?: string[]) {
    const q = query.trim().toLowerCase();
    const inScope = (t: SnapTicket) => !listIds?.length || listIds.includes(t.listId);
    const match = this.all()
      .filter((t) => t.statusRole !== 'closed')
      .filter((t) => !q || `${t.key} ${t.title}`.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const ordered = [...match.filter(inScope), ...(q ? match.filter((t) => !inScope(t)) : [])];
    return ordered.slice(0, 40).map(fromSnap);
  }

  async recentTickets(): Promise<TenguTicket[]> {
    return [];
  }
}

/** Group Tengu lists into projects by space. */
export function projectsFromLists(lists: { id: string; name: string; space?: string }[]): Project[] {
  const out = new Map<string, Project>();
  for (const l of lists) {
    const space = (l.space || l.name).trim();
    const id = projectSlug(space);
    const p = out.get(id) ?? { id, name: space, lists: [], inTengu: true };
    p.lists.push({ id: String(l.id), name: String(l.name) });
    out.set(id, p);
  }
  return [...out.values()];
}

export class TenguError extends Error {
  constructor(message: string, readonly code = 'error') {
    super(message);
  }
}

/** How this viewer's page is connected to Tengu. */
export type TenguState =
  | 'sample' // local dev, sample data
  | 'checking' // published page, first call not answered yet
  | 'connected'
  | 'needs-allow' // the viewer hasn't allowed (or turned off) Tengu for this page
  | 'not-connected' // no Tengu connector on the viewer's claude.ai account
  | 'reconnect' // connector credentials expired
  | 'unavailable' // this view can't use connectors at all
  | 'error';

export function stateForCode(code: string): TenguState {
  switch (code) {
    case 'server_not_connected':
    case 'server_not_found':
    case 'selection_required':
      return 'not-connected';
    case 'needs_reauth':
      return 'reconnect';
    case 'not_in_manifest':
    case 'consent_required':
    case 'approval_required':
    case 'permission_denied':
      return 'needs-allow';
    case 'not_granted':
    case 'capability_disabled':
    case 'capability_removed':
    case 'mcp_unavailable':
      return 'unavailable';
    default:
      return 'error';
  }
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class MockTenguAdapter implements TenguAdapter {
  readonly name = 'Sample data';
  readonly live = false;
  readonly server = null;
  private tickets = new Map<string, TenguTicket>(clone(MOCK_TICKETS).map((t) => [t.id, t]));

  async getProjects() {
    await wait(120);
    return projectsFromLists(MOCK_LISTS);
  }

  async getTicket(id: string) {
    await wait(150 + Math.random() * 200);
    const t = this.tickets.get(id);
    if (!t) throw new TenguError(`Ticket ${id} not found`, 'not_found');
    return clone(t);
  }

  async getTicketsByIds(ids: string[]) {
    await wait(250 + Math.random() * 300);
    const tickets = ids.map((id) => this.tickets.get(id)).filter(Boolean) as TenguTicket[];
    return { tickets: clone(tickets).map(({ comments: _c, ...t }) => t as TenguTicket), failed: ids.filter((id) => !this.tickets.has(id)) };
  }

  async recentTickets(listIds: string[]) {
    await wait(150);
    return clone([...this.tickets.values()].filter((t) => listIds.includes(t.listId)));
  }

  async searchTickets(query: string, listIds?: string[]) {
    await wait(120 + Math.random() * 180);
    const q = query.trim().toLowerCase();
    const all = [...this.tickets.values()].filter((t) => t.statusRole !== 'closed');
    const match = q ? all.filter((t) => `${t.key} ${t.title} ${t.description}`.toLowerCase().includes(q)) : all;
    const inScope = (t: TenguTicket) => !listIds?.length || listIds.includes(t.listId);
    // Like the real adapter: project lists first; the rest of Tengu only when searching.
    const ordered = [...match.filter(inScope), ...(q ? match.filter((t) => !inScope(t)) : [])];
    return clone(ordered.slice(0, 20));
  }
}

// ── Real Tengu via the viewer's connector ─────────────────────────────────────

/** Declared in the Artifact manifest; matched against the viewer's connector list at runtime. */
export const TENGU_SERVER = 'Tengu OS';
const ROLES: StatusRole[] = ['planning', 'available', 'started', 'blocked', 'review', 'sentback', 'done', 'shipping', 'live', 'closed'];

type Raw = Record<string, any>;

/** Map a Tengu task (list_tasks / get_task shape) to our ticket type. */
export function fromTenguTask(t: Raw, comments?: Raw[]): TenguTicket {
  const role = ROLES.includes(t.status_role) ? (t.status_role as StatusRole) : 'planning';
  const p = Number(t.priority);
  return {
    id: String(t.id),
    key: t.custom_id ? String(t.custom_id) : '',
    title: String(t.name ?? t.title ?? 'Untitled'),
    description: String(t.description ?? ''),
    listId: String(t.list?.id ?? ''),
    listName: t.list?.name ? String(t.list.name) : undefined,
    status: String(t.status ?? role),
    statusRole: role,
    priority: p >= 1 && p <= 4 ? (p as 1 | 2 | 3 | 4) : null,
    assignees: Array.isArray(t.assignees) ? t.assignees.map((a: Raw) => ({ id: String(a.id ?? a.name), name: String(a.name ?? a.email ?? 'Someone') })) : [],
    dueDate: t.due_date ? String(t.due_date).slice(0, 10) : null,
    url: String(t.url ?? ''),
    updatedAt: String(t.updated_at ?? new Date().toISOString()),
    comments: comments?.map(fromTenguComment),
  };
}

/** Comment shape wasn't observable during development (no comments yet), so read it defensively. */
function fromTenguComment(c: Raw, i: number): TenguComment {
  const author = c.author?.name ?? c.user?.name ?? c.created_by?.name ?? c.author ?? c.user ?? 'Someone';
  return {
    id: String(c.id ?? i),
    author: typeof author === 'string' ? author : 'Someone',
    body: String(c.body ?? c.text ?? c.comment ?? c.content ?? ''),
    createdAt: String(c.created_at ?? c.createdAt ?? c.date ?? new Date().toISOString()),
  };
}

function mcpError(e: unknown): TenguError {
  const err = e as { code?: string; message?: string };
  const code = err?.code ?? 'error';
  const message =
    code === 'server_not_connected' || code === 'server_not_found' ? 'Tengu isn’t connected to your claude.ai account. Add it in claude.ai Settings → Connectors.'
      : code === 'needs_reauth' ? 'Your Tengu connection expired. Reconnect it in claude.ai Settings → Connectors.'
      : code === 'not_in_manifest' || code === 'consent_required' ? 'Tengu access is turned off for this page. Allow it from the page’s Permissions menu.'
      : code === 'selection_required' ? 'You have more than one Tengu connection. Choose one when claude.ai asks.'
      : code === 'server_unavailable' ? 'Tengu didn’t answer. It will try again shortly.'
      : err?.message || 'Tengu request failed.';
  return new TenguError(message, code);
}

export class McpTenguAdapter implements TenguAdapter {
  readonly name = 'Tengu';
  readonly live = true;
  constructor(private mcp: any, readonly server: string) {}

  private async call(tool: string, input: unknown) {
    try {
      const res = await this.mcp.callTool(this.server, tool, input, { cache: false });
      return (res?.payload ?? {}) as Raw;
    } catch (e) {
      throw mcpError(e);
    }
  }

  async recentTickets(listIds: string[]) {
    const out: TenguTicket[] = [];
    for (const list_id of listIds.slice(0, 8)) {
      const p = await this.call('list_tasks', { list_id, limit: 100 });
      for (const t of p.tasks ?? []) out.push(fromTenguTask(t));
    }
    return out;
  }

  async getProjects() {
    const p = await this.call('list_lists', {});
    return projectsFromLists(Array.isArray(p.lists) ? p.lists : []);
  }

  async getTicket(id: string) {
    const p = await this.call('get_task', { id });
    if (!p.task) throw new TenguError('Ticket not found', 'not_found');
    return fromTenguTask(p.task, Array.isArray(p.comments) ? p.comments : []);
  }

  async getTicketsByIds(ids: string[]) {
    const tickets: TenguTicket[] = [];
    const failed: string[] = [];
    let fatal: TenguError | null = null;
    const queue = [...ids];
    const worker = async () => {
      while (queue.length && !fatal) {
        const id = queue.shift()!;
        try {
          const p = await this.call('get_task', { id });
          if (p.task) tickets.push(fromTenguTask(p.task));
          else failed.push(id);
        } catch (e) {
          const err = e as TenguError;
          if (['server_not_connected', 'needs_reauth', 'not_in_manifest', 'consent_required', 'selection_required', 'not_granted', 'capability_disabled'].includes(err.code)) fatal = err;
          else failed.push(id);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker));
    if (fatal) throw fatal;
    return { tickets, failed };
  }

  async searchTickets(query: string, listIds?: string[]) {
    const q = query.trim();
    const text = q ? { text: q } : {};
    // Project lists first (list_tasks filters one list at a time), then all of Tengu via `search`.
    const scoped = listIds?.length
      ? listIds.slice(0, 8).map((list_id) => this.call('list_tasks', { ...text, list_id, limit: q ? 15 : 10 }))
      : [this.call('list_tasks', { ...text, limit: 20 })];
    const [found, ...listed] = await Promise.allSettled([
      q ? this.call('search', { query: q }) : Promise.resolve({ results: [] }),
      ...scoped,
    ]);
    if (listed.every((r) => r.status === 'rejected') && found.status === 'rejected') throw (listed[0] as PromiseRejectedResult).reason;
    const out = new Map<string, TenguTicket>();
    for (const r of listed) if (r.status === 'fulfilled') for (const t of r.value.tasks ?? []) out.set(String(t.id), fromTenguTask(t));
    // `search` reaches more lists but only returns id/title/url; status loads once linked.
    if (found.status === 'fulfilled')
      for (const r of found.value.results ?? []) {
        const id = String(r.id);
        if (!out.has(id)) {
          const m = /^([A-Z][A-Z0-9]+-\d+)\s+(.*)$/.exec(String(r.title ?? ''));
          out.set(id, { ...fromTenguTask({ id, name: m ? m[2] : r.title, url: r.url, custom_id: m?.[1] }), status: '', partial: true });
        }
      }
    return [...out.values()].filter((t) => t.statusRole !== 'closed').slice(0, 40);
  }
}

/** Published page without connector access: every call explains why. */
export class UnavailableTenguAdapter implements TenguAdapter {
  readonly name = 'Tengu (unavailable)';
  readonly live = false;
  readonly server = TENGU_SERVER;
  constructor(readonly code: string, private message: string) {}
  private fail(): never {
    throw new TenguError(this.message, this.code);
  }
  async getProjects(): Promise<Project[]> {
    return this.fail();
  }
  async getTicket(): Promise<TenguTicket> {
    return this.fail();
  }
  async getTicketsByIds(): Promise<{ tickets: TenguTicket[]; failed: string[] }> {
    return this.fail();
  }
  async searchTickets(): Promise<TenguTicket[]> {
    return this.fail();
  }
  async recentTickets(): Promise<TenguTicket[]> {
    return this.fail();
  }
}

export interface TenguBoot {
  adapter: TenguAdapter & { server: string | null };
  state: TenguState;
  message: string | null;
}

/**
 * Local dev → sample data. Published page → the viewer's own Tengu connector, or an adapter that
 * explains why it can't be reached. The published page never shows sample tickets.
 */
export async function createTenguAdapter(): Promise<TenguBoot> {
  if (!inArtifact()) return { adapter: new MockTenguAdapter(), state: 'sample', message: null };
  const mcp = await useCapability('mcp');
  if (!mcp) {
    const msg = 'Tengu can’t be reached from this view. Open the page on claude.ai, signed in to your organization.';
    return { adapter: new UnavailableTenguAdapter('mcp_unavailable', msg), state: 'unavailable', message: msg };
  }
  let server = TENGU_SERVER;
  let state: TenguState = 'checking';
  let message: string | null = null;
  try {
    const { servers } = await mcp.listTools();
    const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
    const match = servers?.find((s: { server: string }) => norm(s.server) === norm(TENGU_SERVER));
    if (match) {
      server = match.server;
      if (match.authStatus === 'needs_reauth') {
        state = 'reconnect';
        message = mcpError({ code: 'needs_reauth' }).message;
      }
    }
  } catch {
    /* calls will report the reason */
  }
  return { adapter: new McpTenguAdapter(mcp, server), state, message };
}
