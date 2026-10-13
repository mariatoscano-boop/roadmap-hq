/**
 * Where the roadmap itself is saved (initiatives, NOW/NEXT/LATER layout, items, settings).
 *
 * - SharedRoadmapStore: the Artifact's shared database. Everyone with edit access sees the same
 *   roadmap, live; changes from one person show up for the others within a second or two.
 * - LocalRoadmapStore: this browser only (local dev), seeded with sample data.
 */
import { MOCK_INITIATIVES, MOCK_ITEMS } from '../data/mock';
import { layoutOf } from '../lib/roadmap';
import type { Initiative, RoadmapItem, RoadmapLayout, Settings } from '../types/roadmap';
import { useCapability } from './runtime';

export interface RoadmapSnapshot {
  initiatives: Initiative[];
  layout: RoadmapLayout | null;
  items: RoadmapItem[];
  settings: Settings;
  /** All collections delivered at least once. */
  ready: boolean;
}

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
  putLayout(l: RoadmapLayout): Promise<void>;
  putItem(item: RoadmapItem): Promise<void>;
  deleteItem(id: string): Promise<void>;
  putSettings(s: Settings): Promise<void>;
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
    const state: RoadmapSnapshot = { initiatives: [], layout: null, items: [], settings: DEFAULT_SETTINGS, ready: false };
    const seen = new Set<string>();
    const emit = (part: string) => {
      seen.add(part);
      state.ready = seen.size === 4;
      next({ ...state });
    };
    const fail = (e: { code?: string }) =>
      error(e?.code === 'revoked' ? 'Your access to this roadmap changed. Reload the page.' : 'Live updates stopped. Reload the page to reconnect.');
    const unsubs = [
      this.db.collection('initiatives').onSnapshot((snap: any) => {
        state.initiatives = snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as Initiative);
        emit('initiatives');
      }, fail),
      this.db.collection('items').onSnapshot((snap: any) => {
        state.items = snap.docs.map((d: any) => ({ ...d.data(), id: d.id }) as RoadmapItem);
        emit('items');
      }, fail),
      this.db.doc('layout/roadmap').onSnapshot((d: any) => {
        state.layout = d.exists ? (d.data() as RoadmapLayout) : null;
        emit('layout');
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
  putLayout(l: RoadmapLayout) {
    return this.queue('layout/roadmap', () => this.db.doc('layout/roadmap').set({ now: l.now, next: l.next, later: l.later }));
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
}

// ── Local (this browser) ──────────────────────────────────────────────────────

const KEY = 'producthq.local.v2';

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
      ? { initiatives: saved.initiatives, layout: saved.layout ?? null, items: saved.items ?? [], settings: saved.settings ?? DEFAULT_SETTINGS, ready: true }
      : { initiatives: MOCK_INITIATIVES, layout: layoutOf(MOCK_INITIATIVES), items: MOCK_ITEMS, settings: DEFAULT_SETTINGS, ready: true };
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
  async putLayout(layout: RoadmapLayout) {
    this.commit({ layout });
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

  reset() {
    this.commit({ initiatives: MOCK_INITIATIVES, layout: layoutOf(MOCK_INITIATIVES), items: MOCK_ITEMS, settings: DEFAULT_SETTINGS });
  }
}

/** Shared store when running as an Artifact with a database; this browser otherwise. */
export async function createRoadmapStore(): Promise<RoadmapStore> {
  const [db, user] = await Promise.all([useCapability('db'), useCapability('user')]);
  return db ? new SharedRoadmapStore(db, user) : new LocalRoadmapStore();
}
