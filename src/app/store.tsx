import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { ITEM_STATUS } from '../lib/missions';
import { isComplete } from '../lib/progress';
import { applyLayout, LEGACY_PROJECT, layoutOf, moveInitiative, uid, ZONE_META } from '../lib/roadmap';
import { createRoadmapStore, DEFAULT_SETTINGS, LocalRoadmapStore, type RoadmapSnapshot, type RoadmapStore, type SavedProjects } from '../services/roadmapStore';
import { SyncEngine, type SyncSnapshot } from '../services/sync';
import { useCapability } from '../services/runtime';
import { createTenguAdapter, stateForCode, TENGU_SERVER, type TenguAdapter, type TenguState } from '../services/tengu';
import type { Initiative, ItemStatus, Project, RoadmapItem, RoadmapLayout, Settings, Zone } from '../types/roadmap';
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
  /** How this viewer is connected to Tengu, and what to tell them if they aren't. */
  tengu: { state: TenguState; message: string | null };
  viewerId: string | null;
  /** False once the platform (or a refused save) says this viewer can't change the roadmap. */
  canEdit: boolean;
  /** Projects to switch between: Tengu spaces, plus any the roadmap has data for. */
  projects: Project[];
  projectId: string | null;
  /** Tengu's spaces (null until loaded); `projectsError` explains why they're missing. */
  tenguProjects: Project[] | null;
  projectsError: string | null;
  savedProjects: SavedProjects;
  layouts: Record<string, RoadmapLayout>;
  /** Every project's initiatives. */
  allInitiatives: Initiative[];
  /** The current project's initiatives — what every view shows. */
  initiatives: Initiative[];
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
  | { type: 'boot'; storeKind: 'shared' | 'local' }
  | { type: 'tengu'; state: TenguState; message: string | null }
  | { type: 'viewer'; id: string | null; canEdit: boolean }
  | { type: 'data'; snap: RoadmapSnapshot }
  | { type: 'tenguProjects'; projects: Project[] | null; error: string | null }
  | { type: 'project'; id: string }
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

const PROJECT_KEY = 'producthq.project';

function rememberProject(id: string) {
  try {
    localStorage.setItem(PROJECT_KEY, id);
  } catch {
    /* storage unavailable */
  }
  try {
    if (location.hash.slice(1) !== id) history.replaceState(null, '', `#${id}`);
  } catch {
    /* sandboxed */
  }
}

function preferredProject(): string | null {
  const hash = typeof location !== 'undefined' ? location.hash.slice(1) : '';
  if (/^[a-z0-9-]+$/.test(hash)) return hash;
  try {
    return localStorage.getItem(PROJECT_KEY);
  } catch {
    return null;
  }
}

/** Tengu spaces first-class; projects only known from saved data are kept so nothing disappears. */
function mergeProjects(state: AppState): Project[] {
  const byId = new Map<string, Project>();
  for (const p of state.tenguProjects ?? []) byId.set(p.id, p);
  const withData = new Set(state.allInitiatives.map((i) => i.projectId));
  for (const id of new Set([...Object.keys(state.savedProjects), ...withData])) {
    if (!byId.has(id)) byId.set(id, { id, name: state.savedProjects[id]?.name ?? id, lists: [], inTengu: false });
  }
  return [...byId.values()].sort((a, b) => Number(withData.has(b.id)) - Number(withData.has(a.id)) || a.name.localeCompare(b.name));
}

/** Recompute the project list, pick a project if none, and narrow initiatives to it. */
function settle(state: AppState): AppState {
  const projects = mergeProjects(state);
  let projectId = state.projectId;
  if (!projectId || (!projects.some((p) => p.id === projectId) && state.tenguProjects !== null)) {
    const pref = preferredProject();
    projectId =
      (pref && projects.find((p) => p.id === pref)?.id) ||
      projects.find((p) => p.id === LEGACY_PROJECT && state.allInitiatives.some((i) => i.projectId === p.id))?.id ||
      projects[0]?.id ||
      projectId;
  }
  const initiatives = state.allInitiatives.filter((i) => i.projectId === projectId);
  const activeInitiative = state.activeInitiative && initiatives.some((i) => i.id === state.activeInitiative) ? state.activeInitiative : null;
  return { ...state, projects, projectId, initiatives, activeInitiative };
}

const itemDone = (i: RoadmapItem, tickets: Record<string, TenguTicket>) =>
  i.tengu && tickets[i.tengu.id] ? isComplete({ role: tickets[i.tengu.id].statusRole }) : i.status === 'done';

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'boot':
      return { ...state, storeKind: a.storeKind };
    case 'tengu':
      return state.tengu.state === a.state && state.tengu.message === a.message ? state : { ...state, tengu: { state: a.state, message: a.message } };
    case 'viewer':
      return { ...state, viewerId: a.id, canEdit: a.canEdit };
    case 'data': {
      const justCompleted = { ...state.justCompleted };
      const prev = new Map(state.items.map((i) => [i.id, i]));
      for (const i of a.snap.items) {
        const p = prev.get(i.id);
        if (p && !itemDone(p, state.tickets) && itemDone(i, state.tickets)) justCompleted[i.id] = Date.now();
      }
      const groups = new Map<string, Initiative[]>();
      for (const i of a.snap.initiatives) groups.set(i.projectId, [...(groups.get(i.projectId) ?? []), i]);
      const allInitiatives = [...groups.entries()].flatMap(([pid, list]) => applyLayout(list, a.snap.layouts[pid] ?? null));
      const activeItem = state.activeItem && a.snap.items.some((i) => i.id === state.activeItem) ? state.activeItem : null;
      return settle({
        ...state,
        ready: a.snap.ready,
        allInitiatives,
        layouts: a.snap.layouts,
        savedProjects: a.snap.projects,
        items: a.snap.items,
        settings: a.snap.settings,
        justCompleted,
        activeItem,
      });
    }
    case 'tenguProjects':
      return settle({ ...state, tenguProjects: a.projects, projectsError: a.error });
    case 'project':
      rememberProject(a.id);
      return settle({ ...state, projectId: a.id, activeInitiative: null, activeItem: null, spotlight: null });
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
  adapter: (TenguAdapter & { server: string | null }) | null;
  engine: SyncEngine | null;
}

/** Wrap an adapter so every call reports whether Tengu answered. */
function tracked<T extends TenguAdapter & { server: string | null }>(a: T, ok: () => void, fail: (e: unknown) => void): T {
  const wrap = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => async (...args: A) => {
    try {
      const r = await fn(...args);
      ok();
      return r;
    } catch (e) {
      fail(e);
      throw e;
    }
  };
  return {
    ...a,
    name: a.name,
    live: a.live,
    server: a.server,
    getProjects: wrap(a.getProjects.bind(a)),
    getTicket: wrap(a.getTicket.bind(a)),
    getTicketsByIds: wrap(a.getTicketsByIds.bind(a)),
    searchTickets: wrap(a.searchTickets.bind(a)),
  };
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

  const reloadProjects = async () => {
    if (!svc.adapter) return;
    try {
      dispatch({ type: 'tenguProjects', projects: await svc.adapter.getProjects(), error: null });
    } catch (e) {
      dispatch({ type: 'tenguProjects', projects: get().tenguProjects, error: (e as Error).message });
    }
  };
  const itemById = (id: string) => get().items.find((i) => i.id === id);
  const pid = () => get().projectId ?? LEGACY_PROJECT;

  return {
    toast,
    ui,
    setMode: (mode: Mode) => ui({ mode }),
    setProject: (id: string) => dispatch({ type: 'project', id }),
    reloadProjects,
    /** Try Tengu again (after connecting, allowing, or a hiccup). */
    async retryTengu() {
      await reloadProjects();
      await svc.engine?.pull();
    },
    /** Ask the viewer to allow Tengu for this page, or open the Permissions panel if they turned it off. */
    async allowTengu() {
      const perms = await useCapability('permissions');
      const name = `mcp:${svc.adapter?.server ?? TENGU_SERVER}`;
      if (perms) {
        const st = await Promise.resolve(perms.state(name)).catch(() => 'unavailable');
        if (st === 'denied') {
          try {
            await perms.manage();
          } catch {
            toast('Open this page’s Permissions menu and turn Tengu on, then reload.', 'warn');
          }
        } else {
          await Promise.resolve(perms.request([name])).catch(() => null);
        }
      }
      await reloadProjects();
      await svc.engine?.pull();
    },
    reloadPage() {
      try {
        location.reload();
      } catch {
        toast('Reload the page to try again.', 'info');
      }
    },
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
      void save(() => svc.store!.putLayout(pid(), layoutOf(moved)), 'the new order');
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
      void save(() => svc.store!.putLayout(pid(), layoutOf(moved)), 'the new order');
    },
    updateInitiative(id: string, patch: Partial<Initiative>) {
      const ini = get().initiatives.find((i) => i.id === id);
      if (!ini) return;
      void save(() => svc.store!.putInitiative({ ...ini, ...patch, ...stamp() }), ini.name);
    },
    createInitiative(draft: Omit<Initiative, 'id' | 'order' | 'projectId'>) {
      const s = get();
      const id = uid('ini');
      const projectId = pid();
      const ini: Initiative = { ...draft, projectId, id, order: 999, ...stamp() };
      const layout = layoutOf(s.initiatives);
      layout[draft.zone] = [...layout[draft.zone], id];
      const project = s.projects.find((p) => p.id === projectId);
      void save(async () => {
        await svc.store!.putInitiative(ini);
        await svc.store!.putLayout(projectId, layout);
        if (!s.savedProjects[projectId]) await svc.store!.putProject(projectId, project?.name ?? projectId);
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
        await svc.store!.putLayout(pid(), layout);
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
    searchTengu: async (q: string) => {
      if (!svc.adapter) return [];
      const lists = get().projects.find((p) => p.id === get().projectId)?.lists.map((l) => l.id) ?? [];
      return svc.adapter.searchTickets(q, lists);
    },
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
    tengu: { state: 'checking', message: null },
    viewerId: null,
    canEdit: true,
    projects: [],
    projectId: null,
    tenguProjects: null,
    projectsError: null,
    savedProjects: {},
    layouts: {},
    allInitiatives: [],
    initiatives: [],
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
      const [store, boot] = await Promise.all([createRoadmapStore(), createTenguAdapter()]);
      if (cancelled) return;
      svc.store = store;
      dispatch({ type: 'boot', storeKind: store.kind });
      dispatch({ type: 'tengu', state: boot.state, message: boot.message });
      const adapter = tracked(
        boot.adapter,
        () => {
          const cur = stateRef.current.tengu.state;
          if (cur !== 'sample' && cur !== 'connected') dispatch({ type: 'tengu', state: 'connected', message: null });
        },
        (e) => {
          const code = (e as { code?: string })?.code ?? 'error';
          if (stateRef.current.tengu.state === 'sample') return;
          // A brief outage shouldn't hide a working connection behind a setup message.
          if (code === 'server_unavailable' && stateRef.current.tengu.state === 'connected') return;
          dispatch({ type: 'tengu', state: stateForCode(code), message: (e as Error)?.message || 'Tengu request failed.' });
        },
      );
      svc.adapter = adapter;
      // A viewer who turned Tengu off for this page gets the fix button right away.
      if (boot.state === 'checking') {
        void useCapability('permissions').then(async (perms) => {
          const st = perms ? await Promise.resolve(perms.state(`mcp:${boot.adapter.server ?? TENGU_SERVER}`)).catch(() => null) : null;
          if (st === 'denied') dispatch({ type: 'tengu', state: 'needs-allow', message: 'Tengu is turned off for this page.' });
        });
      }
      svc.engine = new SyncEngine(adapter, {
        onTickets: (tickets) => dispatch({ type: 'tickets', tickets }),
        onRemoteChanges: (tickets) => {
          dispatch({ type: 'remote', ids: tickets.map((t) => t.id) });
          for (const t of tickets.slice(0, 2)) actions.toast(`${t.key || t.title} is now “${t.status}” in Tengu`, isComplete({ role: t.statusRole }) ? 'success' : 'info');
        },
        onState: (snapshot) => dispatch({ type: 'sync', snapshot }),
      }, boot.adapter.live ? 90_000 : 30_000);
      svc.engine.start();
      void actions.reloadProjects();
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
