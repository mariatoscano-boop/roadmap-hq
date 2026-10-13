import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { MOCK_INITIATIVES, MOCK_LINKS } from '../data/mock';
import { isComplete } from '../lib/progress';
import { linkTickets, moveInitiative, uid, unlinkTicket, ZONE_META } from '../lib/roadmap';
import { SyncEngine, type SyncSnapshot } from '../services/sync';
import { createTenguAdapter, MockTenguAdapter, type TenguAdapter } from '../services/tengu';
import type { Initiative, RoadmapState, Zone } from '../types/roadmap';
import type { TenguList, TenguMember, TenguTicket, TenguTicketDraft, TenguTicketUpdate } from '../types/tengu';

export type Mode = 'world' | 'timeline';
export type Modal = null | 'search' | 'link' | 'create' | 'new-initiative' | 'shortcuts';

export interface Toast {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'warn';
}

export interface AppState {
  roadmap: RoadmapState;
  tickets: Record<string, TenguTicket>;
  lists: TenguList[];
  members: TenguMember[];
  loaded: boolean;
  sync: SyncSnapshot;
  mode: Mode;
  activeInitiative: string | null;
  activeTicket: string | null;
  modal: Modal;
  /** Initiative the link/create modal targets. */
  modalTarget: string | null;
  spotlight: string | null;
  /** Ticket id → time it just became complete (drives the completion animation). */
  justCompleted: Record<string, number>;
  /** Ticket id → time it was changed remotely in Tengu. */
  remotePulse: Record<string, number>;
  toasts: Toast[];
}

type Action =
  | { type: 'tickets'; tickets: TenguTicket[]; full: boolean }
  | { type: 'meta'; lists: TenguList[]; members: TenguMember[] }
  | { type: 'remote'; ids: string[] }
  | { type: 'sync'; snapshot: SyncSnapshot }
  | { type: 'roadmap'; roadmap: RoadmapState }
  | { type: 'ui'; patch: Partial<Pick<AppState, 'mode' | 'activeInitiative' | 'activeTicket' | 'modal' | 'modalTarget' | 'spotlight'>> }
  | { type: 'toast'; toast: Toast }
  | { type: 'dismiss'; id: string };

const STORAGE_KEY = 'producthq.roadmap.v1';

function loadRoadmap(): RoadmapState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RoadmapState;
      if (Array.isArray(parsed.initiatives) && parsed.links) return parsed;
    }
  } catch {
    /* storage unavailable */
  }
  return { initiatives: MOCK_INITIATIVES, links: MOCK_LINKS };
}

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'tickets': {
      const tickets = a.full ? {} : { ...state.tickets };
      const justCompleted = { ...state.justCompleted };
      for (const t of a.tickets) {
        const prev = state.tickets[t.id];
        if (prev && !isComplete(prev) && isComplete(t)) justCompleted[t.id] = Date.now();
        // Keep comments we already fetched when an update comes without them.
        tickets[t.id] = { ...t, comments: t.comments ?? prev?.comments };
      }
      if (a.full) for (const [id, t] of Object.entries(state.tickets)) if (!tickets[id]) tickets[id] = t;
      return { ...state, tickets, justCompleted, loaded: true };
    }
    case 'meta':
      return { ...state, lists: a.lists, members: a.members };
    case 'remote': {
      const remotePulse = { ...state.remotePulse };
      for (const id of a.ids) remotePulse[id] = Date.now();
      return { ...state, remotePulse };
    }
    case 'sync':
      return { ...state, sync: a.snapshot };
    case 'roadmap':
      return { ...state, roadmap: a.roadmap };
    case 'ui':
      return { ...state, ...a.patch };
    case 'toast':
      return { ...state, toasts: [...state.toasts.slice(-2), a.toast] };
    case 'dismiss':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== a.id) };
  }
}

function createActions(
  get: () => AppState,
  dispatch: (a: Action) => void,
  engine: () => SyncEngine,
  adapter: TenguAdapter,
) {
  const toast = (text: string, tone: Toast['tone'] = 'info') => {
    const id = uid('toast');
    dispatch({ type: 'toast', toast: { id, text, tone } });
    window.setTimeout(() => dispatch({ type: 'dismiss', id }), 3600);
  };
  const setRoadmap = (roadmap: RoadmapState) => dispatch({ type: 'roadmap', roadmap });
  const ui = (patch: Extract<Action, { type: 'ui' }>['patch']) => dispatch({ type: 'ui', patch });

  return {
    toast,
    ui,
    setMode: (mode: Mode) => ui({ mode }),
    enterInitiative: (id: string | null) => ui({ activeInitiative: id, activeTicket: null }),
    openTicket: (id: string | null) => ui({ activeTicket: id }),
    openModal: (modal: Modal, modalTarget: string | null = null) => ui({ modal, modalTarget }),
    closeModal: () => ui({ modal: null, modalTarget: null }),
    setSpotlight: (spotlight: string | null) => ui({ spotlight }),

    // ── Roadmap-owned ──────────────────────────────────────────────
    moveInitiative(id: string, zone: Zone, index: number) {
      const s = get();
      const before = s.roadmap.initiatives.find((i) => i.id === id);
      setRoadmap({ ...s.roadmap, initiatives: moveInitiative(s.roadmap.initiatives, id, zone, index) });
      if (before && before.zone !== zone) {
        toast(`${before.icon} ${before.name} → ${ZONE_META[zone].emoji} ${ZONE_META[zone].label} · Tengu ticket priorities unchanged`, 'success');
      }
    },
    updateInitiative(id: string, patch: Partial<Initiative>) {
      const s = get();
      setRoadmap({ ...s.roadmap, initiatives: s.roadmap.initiatives.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
    },
    createInitiative(draft: Omit<Initiative, 'id' | 'order'>) {
      const s = get();
      const id = uid('ini');
      const order = s.roadmap.initiatives.filter((i) => i.zone === draft.zone).length;
      setRoadmap({ initiatives: [...s.roadmap.initiatives, { ...draft, id, order }], links: { ...s.roadmap.links, [id]: [] } });
      toast(`${draft.icon} ${draft.name} is under construction in ${ZONE_META[draft.zone].label}`, 'success');
      return id;
    },
    link(initiativeId: string, ticketIds: string[]) {
      const s = get();
      setRoadmap({ ...s.roadmap, links: linkTickets(s.roadmap.links, initiativeId, ticketIds) });
      toast(`Linked ${ticketIds.length} Tengu ticket${ticketIds.length === 1 ? '' : 's'}`, 'success');
    },
    unlink(initiativeId: string, ticketId: string) {
      const s = get();
      setRoadmap({ ...s.roadmap, links: unlinkTicket(s.roadmap.links, initiativeId, ticketId) });
      const t = s.tickets[ticketId];
      toast(`Unlinked ${t?.key ?? 'ticket'} — it's still safe in Tengu`, 'info');
    },
    resetRoadmap() {
      setRoadmap({ initiatives: MOCK_INITIATIVES, links: MOCK_LINKS });
      toast('Roadmap reset to sample data');
    },

    // ── Tengu-owned (optimistic, pushed through the adapter) ───────
    async updateTicket(id: string, updates: TenguTicketUpdate) {
      const s = get();
      const previous = s.tickets[id];
      if (!previous) return;
      const optimistic: TenguTicket = { ...previous, updatedAt: new Date().toISOString() };
      if (updates.status !== undefined) {
        const st = s.lists.find((l) => l.id === previous.listId)?.statuses.find((x) => x.status === updates.status);
        if (st) Object.assign(optimistic, { status: st.status, statusRole: st.role });
      }
      if (updates.priority !== undefined) optimistic.priority = updates.priority;
      if (updates.dueDate !== undefined) optimistic.dueDate = updates.dueDate;
      if (updates.name !== undefined) optimistic.title = updates.name;
      if (updates.assignee !== undefined) {
        const m = s.members.find((x) => x.id === updates.assignee);
        optimistic.assignees = m ? [m] : [];
      }
      dispatch({ type: 'tickets', tickets: [optimistic], full: false });
      const res = await engine().push(id, updates, previous);
      if (!res) toast(`Couldn't update ${previous.key} in Tengu — change rolled back`, 'warn');
    },
    async createTicket(draft: TenguTicketDraft, linkTo: string | null) {
      try {
        const t = await adapter.createTicket(draft);
        dispatch({ type: 'tickets', tickets: [t], full: false });
        if (linkTo) {
          const s = get();
          setRoadmap({ ...s.roadmap, links: linkTickets(s.roadmap.links, linkTo, [t.id]) });
        }
        toast(`Created ${t.key} in Tengu${linkTo ? ' and linked it' : ''}`, 'success');
        return t;
      } catch (e) {
        toast(`Couldn't create ticket: ${(e as Error).message}`, 'warn');
        return null;
      }
    },
    async loadTicketDetail(id: string) {
      try {
        const t = await adapter.getTicket(id);
        dispatch({ type: 'tickets', tickets: [t], full: false });
      } catch {
        /* keep cached */
      }
    },
    searchTengu: (q: string) => adapter.searchTickets(q),
    syncNow: () => engine().pull(false),
    retrySync: () => engine().retry(),
  };
}

export type Actions = ReturnType<typeof createActions>;

const Ctx = createContext<{ state: AppState; actions: Actions } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    roadmap: loadRoadmap(),
    tickets: {},
    lists: [],
    members: [],
    loaded: false,
    sync: { status: 'idle', lastSyncedAt: null, error: null, failedOps: 0 },
    mode: 'world',
    activeInitiative: null,
    activeTicket: null,
    modal: null,
    modalTarget: null,
    spotlight: null,
    justCompleted: {},
    remotePulse: {},
    toasts: [],
  } satisfies AppState));

  const stateRef = useRef(state);
  stateRef.current = state;

  const adapter = useMemo(() => createTenguAdapter(), []);
  const engineRef = useRef<SyncEngine | null>(null);

  const actions = useMemo(
    () => createActions(() => stateRef.current, dispatch, () => engineRef.current!, adapter),
    [adapter],
  );

  useEffect(() => {
    const engine = new SyncEngine(adapter, {
      onTickets: (tickets, { full }) => dispatch({ type: 'tickets', tickets, full }),
      onRemoteChanges: (tickets) => {
        dispatch({ type: 'remote', ids: tickets.map((t) => t.id) });
        const linked = new Set(Object.values(stateRef.current.roadmap.links).flat());
        for (const t of tickets.filter((x) => linked.has(x.id)).slice(0, 2)) {
          actions.toast(`${t.key} moved to “${t.status}” in Tengu`, isComplete(t) ? 'success' : 'info');
        }
      },
      onState: (snapshot) => dispatch({ type: 'sync', snapshot }),
    });
    engineRef.current = engine;
    void Promise.all([adapter.getLists(), adapter.getMembers()]).then(([lists, members]) =>
      dispatch({ type: 'meta', lists, members }),
    );
    engine.start();

    // Mock only: a teammate occasionally moves a ticket in Tengu, then we notice on the next pull.
    let remote: number | undefined;
    if (adapter instanceof MockTenguAdapter) {
      remote = window.setInterval(() => {
        if (adapter.simulateRemoteChange()) void engine.pull(false);
      }, 45_000);
    }
    return () => {
      engine.stop();
      window.clearInterval(remote);
    };
  }, [adapter, actions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.roadmap));
    } catch {
      /* storage unavailable */
    }
  }, [state.roadmap]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

/** Linked tickets for an initiative (only those already in the cache). */
export function linkedTickets(state: AppState, initiativeId: string): TenguTicket[] {
  return (state.roadmap.links[initiativeId] ?? []).map((id) => state.tickets[id]).filter(Boolean);
}
