/**
 * Where the roadmap itself is saved (initiatives, NOW/NEXT/LATER layout, items, settings).
 *
 * - SharedRoadmapStore: the Artifact's shared database. Everyone with edit access sees the same
 *   roadmap, live; changes from one person show up for the others within a second or two.
 * - LocalRoadmapStore: this browser only (local dev), seeded with sample data.
 */
import { MOCK_INITIATIVES, MOCK_ITEMS } from '../data/mock';
import { LEGACY_PROJECT, layoutOf } from '../lib/roadmap';
import type { Initiative, Project, RoadmapItem, RoadmapLayout, Settings } from '../types/roadmap';
import type { SnapTicket } from '../types/tengu';
import { useCapability } from './runtime';

/** Projects the roadmap has data for (so they still show if Tengu is unreachable). */
export type SavedProjects = Record<string, { name: string }>;

export interface RoadmapSnapshot {
  initiatives: Initiative[];
  /** Project id → its NOW / NEXT / LATER layout. */
  layouts: Record<string, RoadmapLayout>;
  projects: SavedProjects;
  items: RoadmapItem[];
  settings: Settings;
  /** All collections delivered at least once. */
  ready: boolean;
}

/**
 * The shared copy of Tengu data, written by viewers whose Tengu works and read by everyone else.
 * Docs: tengu/projects, tengu/index-{projectId}, tenguTickets/{ticketId}.
 */
export interface TenguSnapshot {
  projects: Project[] | null;
  projectsAt: string | null;
  index: Record<string, { tickets: SnapTicket[]; at: string }>;
  tickets: Record<string, SnapTicket>;
  ready: boolean;
}

export const EMPTY_SNAPSHOT: TenguSnapshot = { projects: null, projectsAt: null, index: {}, tickets: {}, ready: false };

export interface Viewer {
  id: string | null;
  /** null = the platform didn't say; try and handle refusal. */
  canWrite: boolean | null;
}

export interface RoadmapStore {
  readonly kind: 'shared' | 'local';
  viewer(): Promise<Viewer>;
  names(ids: string[]): Promise<Record<string, string>>;
  subscribe(next: (s: RoadmapSnapshot) => void, error: (message: string) => void): () => void;
  putInitiative(i: Initiative): Promise<void>;
  deleteInitiative(id: string): Promise<void>;
  putLayout(projectId: string, l: RoadmapLayout): Promise<void>;
  putProject(id: string, name: string): Promise<void>;
  putItem(item: RoadmapItem): Promise<void>;
  deleteItem(id: string): Promise<void>;
  putSettings(s: Settings): Promise<void>;
  subscribeTengu(next: (s: TenguSnapshot) => void): () => void;
  putTenguDoc(id: string, data: Record<string, unknown>): Promise<void>;
  putTenguTicket(id: string, data: Record<string, unknown>): Promise<void>;
}

export const DEFAULT_SETTINGS: Settings = { tenguBaseUrl: '' };

const strip = <T extends { id: string }>(x: T) => {
  const { id: _id, ...rest } = x;
  return JSON.parse(JSON.stringify(rest)) as Record<string, unknown>;
};

// ── Shared (Artifact db) ──────────────────────────────────────────────────────

export class SharedRoadmapStore implements RoadmapStore {
  readonly kind = 'shared';
  /** One write at a time per document. */
  private chains = new Map<string, Promise<unknown>>();
  constructor(private db: any, private user: any) {}

  async viewer(): Promise<Viewer> {
    if (!this.user) return { id: null, canWrite: null };
    const [id, canWrite] = await Promise.all([
      Promise.resolve(this.user.id?.()).catch(() => null),
      Promise.resolve(this.user.can?.('data.write')).catch(() => null),
    ]);
    return { id: id ?? null, canWrite: canWrite ?? null };
  }

  async names(ids: string[]) {
    if (!this.user?.profiles || !ids.length) return {};
    try {
      const ps = await this.user.profiles(ids);
      const out: Record<string, string> = {};
      for (const id of ids) out[id] = ps?.[id]?.name || 'Someone';
      return out;
    } catch {
      return {};
    }
  }

  subscribe(next: (s: RoadmapSnapshot) => void, error: (message: string) => void) {
    const state: RoadmapSnapshot = { initiatives: [], layouts: {}, projects: {}, items: [], settings: DEFAULT_SETTINGS, ready: false };
    const seen = new Set<string>();
    const emit = (part: string) => {
      seen.add(part);
      state.ready = seen.size === 5;
      next({ ...state });
    };
    const fail = (e: { code?: string }) =>
      error(e?.code === 'revoked' ? 'Your access to this roadmap changed. Reload the page.' : 'Live updates stopped. Reload the page to reconnect.');
    const unsubs = [
      this.db.collection('initiatives').onSnapshot((snap: any) => {
        state.initiatives = snap.docs.map((d: any) => {
          const data = d.data();
          return { ...data, projectId: data.projectId || LEGACY_PROJECT, id: d.id } as Initiative;
        });
        emit('initiatives');
      }, fail),
      this.db.collection('items').onSnapshot((snap: any) => {
        state.items = snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as RoadmapItem);
        emit('items');
      }, fail),
      this.db.collection('layout').onSnapshot((snap: any) => {
        const layouts: Record<string, RoadmapLayout> = {};
        for (const d of snap.docs) layouts[d.id === 'roadmap' ? LEGACY_PROJECT : d.id] ??= d.data() as RoadmapLayout;
        // A project's own layout wins over the pre-projects "roadmap" one.
        for (const d of snap.docs) if (d.id !== 'roadmap') layouts[d.id] = d.data() as RoadmapLayout;
        state.layouts = layouts;
        emit('layout');
      }, fail),
      this.db.collection('projects').onSnapshot((snap: any) => {
        const projects: SavedProjects = {};
        for (const d of snap.docs) projects[d.id] = { name: String(d.data()?.name ?? d.id) };
        state.projects = projects;
        emit('projects');
      }, fail),
      this.db.doc('settings/app').onSnapshot((d: any) => {
        state.settings = d.exists ? { ...DEFAULT_SETTINGS, ...(d.data() as Settings) } : DEFAULT_SETTINGS;
        emit('settings');
      }, fail),
    ];
    return () => unsubs.forEach((u) => u());
  }

  private queue(path: string, op: () => Promise<unknown>): Promise<void> {
    const prev = this.chains.get(path) ?? Promise.resolve();
    const run = prev.catch(() => undefined).then(op);
    this.chains.set(path, run);
    return run.then(() => undefined);
  }

  putInitiative(i: Initiative) {
    return this.queue(`initiatives/${i.id}`, () => this.db.doc(`initiatives/${i.id}`).set(strip(i)));
  }
  deleteInitiative(id: string) {
    return this.queue(`initiatives/${id}`, () => this.db.doc(`initiatives/${id}`).delete());
  }
  putLayout(projectId: string, l: RoadmapLayout) {
    return this.queue(`layout/${projectId}`, () => this.db.doc(`layout/${projectId}`).set({ now: l.now, next: l.next, later: l.later }));
  }
  putProject(id: string, name: string) {
    return this.queue(`projects/${id}`, () => this.db.doc(`projects/${id}`).set({ name }));
  }
  putItem(item: RoadmapItem) {
    return this.queue(`items/${item.id}`, () => this.db.doc(`items/${item.id}`).set(strip(item)));
  }
  deleteItem(id: string) {
    return this.queue(`items/${id}`, () => this.db.doc(`items/${id}`).delete());
  }
  putSettings(s: Settings) {
    return this.queue('settings/app', () => this.db.doc('settings/app').set({ ...s }));
  }

  subscribeTengu(next: (s: TenguSnapshot) => void) {
    const state: TenguSnapshot = { ...EMPTY_SNAPSHOT, index: {}, tickets: {} };
    const seen = new Set<string>();
    const emit = (part: string) => {
      seen.add(part);
      state.ready = seen.size === 2;
      next({ ...state });
    };
    const quiet = () => undefined; // the roadmap's own listeners report access problems
    const unsubs = [
      this.db.collection('tengu').onSnapshot((snap: any) => {
        state.projects = null;
        state.projectsAt = null;
        state.index = {};
        for (const d of snap.docs) {
          const data = d.data() ?? {};
          if (d.id === 'projects') {
            state.projects = Array.isArray(data.projects) ? data.projects : null;
            state.projectsAt = data.at ?? null;
          } else if (d.id.startsWith('index-')) {
            state.index[d.id.slice(6)] = { tickets: Array.isArray(data.tickets) ? data.tickets : [], at: data.at ?? '' };
          }
        }
        emit('tengu');
      }, quiet),
      this.db.collection('tenguTickets').onSnapshot((snap: any) => {
        const tickets: Record<string, SnapTicket> = {};
        for (const d of snap.docs) tickets[d.id] = { ...(d.data() as SnapTicket), id: d.id };
        state.tickets = tickets;
        emit('tickets');
      }, quiet),
    ];
    return () => unsubs.forEach((u) => u());
  }

  putTenguDoc(id: string, data: Record<string, unknown>) {
    return this.queue(`tengu/${id}`, () => this.db.doc(`tengu/${id}`).set(JSON.parse(JSON.stringify(data))));
  }
  putTenguTicket(id: string, data: Record<string, unknown>) {
    return this.queue(`tenguTickets/${id}`, () => this.db.doc(`tenguTickets/${id}`).set(JSON.parse(JSON.stringify(data))));
  }
}

// ── Local (this browser) ──────────────────────────────────────────────────────

const KEY = 'producthq.local.v3';
const sample = (): RoadmapSnapshot => ({
  initiatives: MOCK_INITIATIVES,
  layouts: { [LEGACY_PROJECT]: layoutOf(MOCK_INITIATIVES) },
  projects: { [LEGACY_PROJECT]: { name: 'Fiji' } },
  items: MOCK_ITEMS,
  settings: DEFAULT_SETTINGS,
  ready: true,
});

export class LocalRoadmapStore implements RoadmapStore {
  readonly kind = 'local';
  private state: RoadmapSnapshot;
  private listeners = new Set<(s: RoadmapSnapshot) => void>();

  constructor() {
    let saved: Partial<RoadmapSnapshot> | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    } catch {
      saved = null;
    }
    this.state = saved?.initiatives
      ? { ...sample(), ...saved, ready: true }
      : sample();
  }

  async viewer(): Promise<Viewer> {
    return { id: 'local', canWrite: true };
  }
  async names() {
    return { local: 'You' };
  }

  subscribe(next: (s: RoadmapSnapshot) => void) {
    this.listeners.add(next);
    queueMicrotask(() => next({ ...this.state }));
    return () => this.listeners.delete(next);
  }

  private commit(patch: Partial<RoadmapSnapshot>) {
    this.state = { ...this.state, ...patch };
    try {
      const { ready: _r, ...persist } = this.state;
      localStorage.setItem(KEY, JSON.stringify(persist));
    } catch {
      /* storage unavailable: keep in memory */
    }
    for (const l of this.listeners) l({ ...this.state });
  }

  async putInitiative(i: Initiative) {
    const rest = this.state.initiatives.filter((x) => x.id !== i.id);
    this.commit({ initiatives: [...rest, i] });
  }
  async deleteInitiative(id: string) {
    this.commit({ initiatives: this.state.initiatives.filter((x) => x.id !== id) });
  }
  async putLayout(projectId: string, layout: RoadmapLayout) {
    this.commit({ layouts: { ...this.state.layouts, [projectId]: layout } });
  }
  async putProject(id: string, name: string) {
    this.commit({ projects: { ...this.state.projects, [id]: { name } } });
  }
  async putItem(item: RoadmapItem) {
    const rest = this.state.items.filter((x) => x.id !== item.id);
    this.commit({ items: [...rest, item] });
  }
  async deleteItem(id: string) {
    this.commit({ items: this.state.items.filter((x) => x.id !== id) });
  }
  async putSettings(settings: Settings) {
    this.commit({ settings });
  }

  /** Local dev has its own sample Tengu, so there's no shared copy to keep. */
  subscribeTengu(next: (s: TenguSnapshot) => void) {
    queueMicrotask(() => next({ ...EMPTY_SNAPSHOT, ready: true }));
    return () => undefined;
  }
  async putTenguDoc() {}
  async putTenguTicket() {}

  reset() {
    this.commit(sample());
  }
}

/** Shared store when running as an Artifact with a database; this browser otherwise. */
export async function createRoadmapStore(): Promise<RoadmapStore> {
  const [db, user] = await Promise.all([useCapability('db'), useCapability('user')]);
  return db ? new SharedRoadmapStore(db, user) : new LocalRoadmapStore();
}
