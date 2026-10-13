import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { ITEM_STATUS } from '../lib/missions';
import { isComplete } from '../lib/progress';
import { applyLayout, layoutOf, moveInitiative, uid, ZONE_META } from '../lib/roadmap';
import { createRoadmapStore, DEFAULT_SETTINGS, LocalRoadmapStore, type RoadmapSnapshot, type RoadmapStore } from '../services/roadmapStore';
import { SyncEngine, type SyncSnapshot } from '../services/sync';
import { createTenguAdapter, type TenguAdapter } from '../services/tengu';
import type { Initiative, ItemStatus, RoadmapItem, RoadmapLayout, Settings, Zone } from '../types/roadmap';
import type { TenguTicket } from '../types/tengu';

export type Mode = 'world' | 'list' | 'timeline';
export type Modal = null | 'search' | 'add' | 'link-item' | 'new-initiative' | 'shortcuts' | 'settings';

export interface Toast {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'warn';
}

export interface AppState {
  ready: boolean;
  storeKind: 'shared' | 'local' | null;
  tenguLive: boolean;
  viewerId: string | null;
  /** False once the platform (or a refused save) says this viewer can't change the roadmap. */
  canEdit: boolean;
  initiatives: Initiative[];
  layout: RoadmapLayout | null;
  items: RoadmapItem[];
  settings: Settings;
  /** Person id → display name, for "updated by". */
  names: Record<string, string>;
  tickets: Record<string, TenguTicket>;
  sync: SyncSnapshot;
  saving: number;
  saveError: string | null;
  dataError: string | null;
  mode: Mode;
  activeInitiative: string | null;
  activeItem: string | null;
  modal: Modal;
  /** Initiative or item the open modal targets. */
  modalTarget: string | null;
  spotlight: string | null;
  justCompleted: Record<string, number>;
  remotePulse: Record<string, number>;
  toasts: Toast[];
}

type UiPatch = Partial<Pick<AppState, 'mode' | 'activeInitiative' | 'activeItem' | 'modal' | 'modalTarget' | 'spotlight'>>;

type Action =
  | { type: 'boot'; storeKind: 'shared' | 'local'; tenguLive: boolean }
  | { type: 'viewer'; id: string | null; canEdit: boolean }
  | { type: 'data'; snap: RoadmapSnapshot }
  | { type: 'names'; names: Record<string, string> }
  | { type: 'tickets'; tickets: TenguTicket[] }
  | { type: 'remote'; ids: string[] }
  | { type: 'sync'; snapshot: SyncSnapshot }
  | { type: 'saving'; delta: number; error?: string | null }
  | { type: 'readonly' }
  | { type: 'dataError'; message: string }
  | { type: 'ui'; patch: UiPatch }
  | { type: 'toast'; toast: Toast }
  | { type: 'dismiss'; id: string };

const itemDone = (i: RoadmapItem, tickets: Record<string, TenguTicket>) =>
  i.tengu && tickets[i.tengu.id] ? isComplete({ role: tickets[i.tengu.id].statusRole }) : i.status === 'done';

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'boot':
      return { ...state, storeKind: a.storeKind, tenguLive: a.tenguLive };
    case 'viewer':
      return { ...state, viewerId: a.id, canEdit: a.canEdit };
    case 'data': {
      const justCompleted = { ...state.justCompleted };
      const prev = new Map(state.items.map((i) => [i.id, i]));
      for (const i of a.snap.items) {
        const p = prev.get(i.id);
        if (p && !itemDone(p, state.tickets) && itemDone(i, state.tickets)) justCompleted[i.id] = Date.now();
      }
      const initiatives = applyLayout(a.snap.initiatives, a.snap.layout);
      const activeInitiative = state.activeInitiative && initiatives.some((i) => i.id === state.activeInitiative) ? state.activeInitiative : null;
      const activeItem = state.activeItem && a.snap.items.some((i) => i.id === state.activeItem) ? state.activeItem : null;
      return { ...state, ready: a.snap.ready, initiatives, layout: a.snap.layout, items: a.snap.items, settings: a.snap.settings, justCompleted, activeInitiative, activeItem };
    }
    case 'names':
      return { ...state, names: { ...state.names, ...a.names } };
    case 'tickets': {
      const tickets = { ...state.tickets };
      const justCompleted = { ...state.justCompleted };
      for (const t of a.tickets) {
        const prev = tickets[t.id];
        if (prev && !isComplete({ role: prev.statusRole }) && isComplete({ role: t.statusRole })) {
          for (const i of state.items) if (i.tengu?.id === t.id) justCompleted[i.id] = Date.now();
        }
        tickets[t.id] = { ...t, comments: t.comments ?? prev?.comments };
      }
      return { ...state, tickets, justCompleted };
    }
    case 'remote': {
      const remotePulse = { ...state.remotePulse };
      for (const i of state.items) if (i.tengu && a.ids.includes(i.tengu.id)) remotePulse[i.id] = Date.now();
      return { ...state, remotePulse };
    }
    case 'sync':
      return { ...state, sync: a.snapshot };
    case 'saving':
      return { ...state, saving: Math.max(0, state.saving + a.delta), saveError: a.error === undefined ? state.saveError : a.error };
    case 'readonly':
      return { ...state, canEdit: false };
    case 'dataError':
      return { ...state, dataError: a.message };
    case 'ui':
      return { ...state, ...a.patch };
    case 'toast':
      return { ...state, toasts: [...state.toasts.slice(-2), a.toast] };
    case 'dismiss':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== a.id) };
  }
}

interface Services {
  store: RoadmapStore | null;
  adapter: TenguAdapter | null;
  engine: SyncEngine | null;
}

function createActions(get: () => AppState, dispatch: (a: Action) => void, svc: Services) {
  const toast = (text: string, tone: Toast['tone'] = 'info') => {
    const id = uid('toast');
    dispatch({ type: 'toast', toast: { id, text, tone } });
    window.setTimeout(() => dispatch({ type: 'dismiss', id }), 3800);
  };
  const ui = (patch: UiPatch) => dispatch({ type: 'ui', patch });
  const stamp = () => ({ updatedAt: new Date().toISOString(), updatedBy: get().viewerId });

  /** Every save goes through here: tracks "Saving…", and turns a refusal into view-only mode. */
  const save = async (op: () => Promise<void>, what: string) => {
    if (!svc.store) return;
    if (!get().canEdit) return toast('You have view-only access to this roadmap.', 'warn');
    dispatch({ type: 'saving', delta: 1 });
    try {
      await op();
      dispatch({ type: 'saving', delta: -1, error: null });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'invalid_argument') {
        dispatch({ type: 'readonly' });
        dispatch({ type: 'saving', delta: -1, error: 'View only' });
        toast('You have view-only access, so your change wasn’t saved. Ask the owner for Contributor access.', 'warn');
      } else {
        const msg = code === 'quota_exceeded' ? 'The roadmap is full. Remove old items to add more.' : `Couldn’t save ${what}. Check your connection and try again.`;
        dispatch({ type: 'saving', delta: -1, error: msg });
        toast(msg, 'warn');
      }
    }
  };

  const itemById = (id: string) => get().items.find((i) => i.id === id);

  return {
    toast,
    ui,
    setMode: (mode: Mode) => ui({ mode }),
    enterInitiative: (id: string | null) => ui({ activeInitiative: id, activeItem: null }),
    openItem: (id: string | null) => ui({ activeItem: id }),
    openModal: (modal: Modal, modalTarget: string | null = null) => ui({ modal, modalTarget }),
    closeModal: () => ui({ modal: null, modalTarget: null }),
    setSpotlight: (spotlight: string | null) => ui({ spotlight }),

    // ── Initiatives ────────────────────────────────────────────────
    moveInitiative(id: string, zone: Zone, index: number) {
      const s = get();
      const before = s.initiatives.find((i) => i.id === id);
      const moved = moveInitiative(s.initiatives, id, zone, index);
      void save(() => svc.store!.putLayout(layoutOf(moved)), 'the new order');
      if (before && before.zone !== zone) {
        toast(`${before.icon} ${before.name} moved to ${ZONE_META[zone].emoji} ${ZONE_META[zone].label}`, 'success');
      }
    },
    nudge(id: string, delta: -1 | 1) {
      const s = get();
      const ini = s.initiatives.find((i) => i.id === id);
      if (!ini) return;
      const zoneList = s.initiatives.filter((i) => i.zone === ini.zone).sort((a, b) => a.order - b.order);
      const idx = zoneList.findIndex((i) => i.id === id);
      const target = idx + delta;
      if (target < 0 || target >= zoneList.length) return;
      const moved = moveInitiative(s.initiatives, id, ini.zone, target);
      void save(() => svc.store!.putLayout(layoutOf(moved)), 'the new order');
    },
    updateInitiative(id: string, patch: Partial<Initiative>) {
      const ini = get().initiatives.find((i) => i.id === id);
      if (!ini) return;
      void save(() => svc.store!.putInitiative({ ...ini, ...patch, ...stamp() }), ini.name);
    },
    createInitiative(draft: Omit<Initiative, 'id' | 'order'>) {
      const s = get();
      const id = uid('ini');
      const ini: Initiative = { ...draft, id, order: 999, ...stamp() };
      const layout = layoutOf(s.initiatives);
      layout[draft.zone] = [...layout[draft.zone], id];
      void save(async () => {
        await svc.store!.putInitiative(ini);
        await svc.store!.putLayout(layout);
      }, draft.name);
      toast(`${draft.icon} ${draft.name} added to ${ZONE_META[draft.zone].label}`, 'success');
      return id;
    },
    deleteInitiative(id: string) {
      const s = get();
      const ini = s.initiatives.find((i) => i.id === id);
      if (!ini) return;
      const layout = layoutOf(s.initiatives.filter((i) => i.id !== id));
      const items = s.items.filter((i) => i.initiativeId === id);
      ui({ activeInitiative: null, activeItem: null });
      void save(async () => {
        await svc.store!.putLayout(layout);
        for (const it of items) await svc.store!.deleteItem(it.id);
        await svc.store!.deleteInitiative(id);
      }, ini.name);
      toast(`Removed ${ini.name}. Tengu tickets weren’t touched.`, 'info');
    },

    // ── Items ──────────────────────────────────────────────────────
    addItem(initiativeId: string, title: string) {
      const item: RoadmapItem = { id: uid('item'), initiativeId, title: title.trim(), status: 'todo', owner: null, tengu: null, createdAt: new Date().toISOString(), ...stamp() };
      void save(() => svc.store!.putItem(item), 'the item');
      return item.id;
    },
    linkTickets(initiativeId: string, tickets: TenguTicket[]) {
      const s = get();
      const already = new Set(s.items.filter((i) => i.initiativeId === initiativeId && i.tengu).map((i) => i.tengu!.id));
      const fresh = tickets.filter((t) => !already.has(t.id));
      dispatch({ type: 'tickets', tickets: fresh.filter((t) => !t.partial) });
      const now = Date.now();
      void save(async () => {
        for (const [n, t] of fresh.entries()) {
          await svc.store!.putItem({
            id: uid('item'),
            initiativeId,
            title: t.title,
            status: 'todo',
            owner: null,
            tengu: { id: t.id, key: t.key, url: t.url },
            createdAt: new Date(now + n).toISOString(),
            ...stamp(),
          });
        }
      }, 'the linked tickets');
      if (fresh.length) toast(`Added ${fresh.length} Tengu ticket${fresh.length === 1 ? '' : 's'}`, 'success');
    },
    updateItem(id: string, patch: Partial<Pick<RoadmapItem, 'title' | 'status' | 'owner'>>) {
      const it = itemById(id);
      if (!it) return;
      void save(() => svc.store!.putItem({ ...it, ...patch, ...stamp() }), 'the item');
    },
    moveItem(id: string, initiativeId: string) {
      const it = itemById(id);
      if (!it || it.initiativeId === initiativeId) return;
      const to = get().initiatives.find((i) => i.id === initiativeId);
      void save(() => svc.store!.putItem({ ...it, initiativeId, ...stamp() }), 'the item');
      if (get().activeInitiative) ui({ activeInitiative: initiativeId, activeItem: id });
      toast(`Moved to ${to?.icon ?? ''} ${to?.name ?? 'initiative'}`, 'success');
    },
    linkItem(id: string, t: TenguTicket) {
      const it = itemById(id);
      if (!it) return;
      if (!t.partial) dispatch({ type: 'tickets', tickets: [t] });
      void save(() => svc.store!.putItem({ ...it, tengu: { id: t.id, key: t.key, url: t.url }, ...stamp() }), 'the link');
      toast(`Linked to ${t.key || 'Tengu ticket'}`, 'success');
    },
    unlinkItem(id: string) {
      const s = get();
      const it = itemById(id);
      if (!it?.tengu) return;
      const t = s.tickets[it.tengu.id];
      // Keep what we last knew so the item doesn't jump backwards.
      const status: ItemStatus = t
        ? isComplete({ role: t.statusRole }) ? 'done' : t.statusRole === 'blocked' ? 'blocked' : ['started', 'review', 'sentback'].includes(t.statusRole) ? 'doing' : 'todo'
        : it.status;
      void save(() => svc.store!.putItem({ ...it, tengu: null, title: t?.title ?? it.title, status, owner: t?.assignees[0]?.name ?? it.owner, ...stamp() }), 'the item');
      toast('Unlinked. The ticket is still in Tengu.', 'info');
    },
    removeItem(id: string) {
      const it = itemById(id);
      if (!it) return;
      if (get().activeItem === id) ui({ activeItem: null });
      void save(() => svc.store!.deleteItem(id), 'the item');
      toast(`Removed “${it.title}” from the roadmap${it.tengu ? '. The Tengu ticket wasn’t touched.' : ''}`, 'info');
    },

    saveSettings(s: Settings) {
      void save(() => svc.store!.putSettings(s), 'settings');
    },
    resetLocal() {
      if (svc.store instanceof LocalRoadmapStore) {
        svc.store.reset();
        toast('Sample roadmap restored');
      }
    },

    // ── Tengu ──────────────────────────────────────────────────────
    async loadTicketDetail(id: string) {
      try {
        const t = await svc.adapter?.getTicket(id);
        if (t) dispatch({ type: 'tickets', tickets: [t] });
      } catch {
        /* keep cached */
      }
    },
    searchTengu: async (q: string) => (svc.adapter ? svc.adapter.searchTickets(q) : []),
    syncNow: () => svc.engine?.pull(),
    itemStatusLabel: (s: ItemStatus) => ITEM_STATUS[s].label,
  };
}

export type Actions = ReturnType<typeof createActions>;

const Ctx = createContext<{ state: AppState; actions: Actions } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    ready: false,
    storeKind: null,
    tenguLive: false,
    viewerId: null,
    canEdit: true,
    initiatives: [],
    layout: null,
    items: [],
    settings: DEFAULT_SETTINGS,
    names: {},
    tickets: {},
    sync: { status: 'idle', lastSyncedAt: null, error: null, missing: 0 },
    saving: 0,
    saveError: null,
    dataError: null,
    mode: 'world',
    activeInitiative: null,
    activeItem: null,
    modal: null,
    modalTarget: null,
    spotlight: null,
    justCompleted: {},
    remotePulse: {},
    toasts: [],
  } satisfies AppState));

  const stateRef = useRef(state);
  stateRef.current = state;
  const svc = useRef<Services>({ store: null, adapter: null, engine: null }).current;
  const actions = useMemo(() => createActions(() => stateRef.current, dispatch, svc), [svc]);

  useEffect(() => {
    let cancelled = false;
    let unsub = () => {};
    void (async () => {
      const [store, adapter] = await Promise.all([createRoadmapStore(), createTenguAdapter()]);
      if (cancelled) return;
      svc.store = store;
      svc.adapter = adapter;
      dispatch({ type: 'boot', storeKind: store.kind, tenguLive: adapter.live });
      svc.engine = new SyncEngine(adapter, {
        onTickets: (tickets) => dispatch({ type: 'tickets', tickets }),
        onRemoteChanges: (tickets) => {
          dispatch({ type: 'remote', ids: tickets.map((t) => t.id) });
          for (const t of tickets.slice(0, 2)) actions.toast(`${t.key || t.title} is now “${t.status}” in Tengu`, isComplete({ role: t.statusRole }) ? 'success' : 'info');
        },
        onState: (snapshot) => dispatch({ type: 'sync', snapshot }),
      }, adapter.live ? 90_000 : 30_000);
      svc.engine.start();
      unsub = store.subscribe(
        (snap) => {
          dispatch({ type: 'data', snap });
          svc.engine?.setIds([...new Set(snap.items.filter((i) => i.tengu).map((i) => i.tengu!.id))]);
        },
        (message) => dispatch({ type: 'dataError', message }),
      );
      const viewer = await store.viewer();
      if (!cancelled) dispatch({ type: 'viewer', id: viewer.id, canEdit: viewer.canWrite !== false });
    })();
    return () => {
      cancelled = true;
      unsub();
      svc.engine?.stop();
    };
  }, [svc, actions]);

  // Resolve names for "updated by" whenever new people appear.
  useEffect(() => {
    const ids = new Set<string>();
    for (const x of [...state.initiatives, ...state.items]) if (x.updatedBy && !state.names[x.updatedBy]) ids.add(x.updatedBy);
    if (!ids.size || !svc.store) return;
    void svc.store.names([...ids]).then((names) => Object.keys(names).length && dispatch({ type: 'names', names }));
  }, [state.initiatives, state.items, state.names, svc]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}
