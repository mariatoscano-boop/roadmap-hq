/**
 * Mochi's state and actions. One person, many worlds. Private quests stay in Mochi.
 * External quests mirror a linked tool and are the only ones ever written back
 * (or a private quest you explicitly send). Saved to this browser.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SEED_TOTAL_XP, SEED_WORLD_XP, SEED_WORLDS, seedQuests } from '../data/seed';
import { INTEGRATIONS, integrationLabel } from '../integrations';
import { mergePull } from '../integrations/merge';
import type { ExternalTask } from '../integrations/types';
import { today } from '../lib/dates';
import { levelOf, objectsIn, worldLevel, worldStats, XP_PER_QUEST } from '../lib/world';
import type { Accent, Accessory, IntegrationState, Mood, Quest, Terrain, View, World } from '../types';

export interface AppState {
  version: 3;
  name: string;
  worlds: World[];
  quests: Quest[];
  worldXp: Record<string, number>;
  totalXp: number;
  equipped: Record<string, Accessory[]>;
  integrations: Record<string, IntegrationState>;
  /** External quests removed from Mochi (`integrationId:key`); later syncs don't bring them back. */
  hidden: string[];
  /** Write-backs that couldn't reach their tool; retried on the next sync. */
  pending: { integrationId: string; key: string; patch: Partial<Pick<ExternalTask, 'done' | 'title' | 'dueDate' | 'priority'>> }[];
}

export interface Toast {
  id: number;
  title: string;
  detail?: string;
  xp?: string;
  worldId?: string;
  action?: { label: string; run: () => void };
}

export interface Reaction {
  key: number;
  worldId: string;
  line: string;
  mood: Mood;
}

export interface UiState {
  view: View;
  toasts: Toast[];
  openQuestId: string | null;
  composer: { open: boolean; worldId?: string };
  focus: { ids: string[]; index: number } | null;
  connectionsOpen: boolean;
  newWorldOpen: boolean;
  reaction: Reaction | null;
  /** "+1" pops on a world (map node, tiles) after something lands there. */
  pulse: { worldId: string; key: number; text: string } | null;
  fresh: string[];
  xpBump: number;
}

export interface NewQuest {
  title: string;
  worldId: string;
  dueDate: string | null;
  priority: 'normal' | 'high';
  waitingOn: string | null;
  /** Also create it in the world's linked tool. Off by default: quests are private. */
  connect: boolean;
}

export type QuestPatch = Partial<Pick<Quest, 'title' | 'worldId' | 'dueDate' | 'priority' | 'waitingOn' | 'notes'>>;

const KEY = 'mochi.v3';

function seedState(): AppState {
  return {
    version: 3,
    name: 'Maria',
    worlds: SEED_WORLDS,
    quests: seedQuests(),
    worldXp: { ...SEED_WORLD_XP },
    totalXp: SEED_TOTAL_XP,
    equipped: { dosify: ['badge'], fiji: [] },
    integrations: Object.fromEntries(Object.keys(INTEGRATIONS).map((id) => [id, { id, connected: true, lastSyncedAt: new Date(Date.now() - 2 * 60_000).toISOString(), syncing: false }])),
    hidden: [],
    pending: [],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s.version === 3 && Array.isArray(s.quests)) {
        for (const i of Object.values(s.integrations)) i.syncing = false;
        return s;
      }
    }
  } catch {
    /* fall back to the sample worlds */
  }
  return seedState();
}

function viewFromHash(): View {
  const h = typeof location !== 'undefined' ? location.hash.slice(1) : '';
  if (h.startsWith('world-')) return { name: 'world', id: h.slice(6) };
  return (['today', 'worlds', 'quests', 'collection'] as const).includes(h as never) ? { name: h as 'today' } : { name: 'today' };
}
const hashOf = (v: View) => (v.name === 'world' ? `world-${v.id}` : v.name);
const uid = () => `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

type Ctx = ReturnType<typeof useBuild>;
const C = createContext<Ctx | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  return <C.Provider value={useBuild()}>{children}</C.Provider>;
}
export function useStore() {
  const v = useContext(C);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

function useBuild() {
  const [state, setState] = useState<AppState>(load);
  const [ui, setUi] = useState<UiState>(() => ({
    view: viewFromHash(), toasts: [], openQuestId: null, composer: { open: false }, focus: null,
    connectionsOpen: false, newWorldOpen: false, reaction: null, pulse: null, fresh: [], xpBump: 0,
  }));
  const ref = useRef(state);
  ref.current = state;
  const tid = useRef(0);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
  }, [state]);
  useEffect(() => {
    const f = () => setUi((u) => ({ ...u, view: viewFromHash() }));
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  // ───────── UI helpers ─────────
  const navigate = useCallback((view: View) => {
    setUi((u) => ({ ...u, view, openQuestId: null }));
    try { history.replaceState(null, '', `#${hashOf(view)}`); } catch { /* sandboxed */ }
    window.scrollTo({ top: 0 });
  }, []);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++tid.current;
    setUi((u) => ({ ...u, toasts: [...u.toasts.slice(-2), { ...t, id }] }));
    window.setTimeout(() => setUi((u) => ({ ...u, toasts: u.toasts.filter((x) => x.id !== id) })), t.action ? 5200 : 3000);
  }, []);
  const dismissToast = useCallback((id: number) => setUi((u) => ({ ...u, toasts: u.toasts.filter((x) => x.id !== id) })), []);

  /** A creature says something and reacts. Every view showing that world's creature responds. */
  const say = useCallback((worldId: string, line: string, mood: Mood = 'happy') => {
    const key = Date.now() + Math.random();
    setUi((u) => ({ ...u, reaction: { key, worldId, line, mood } }));
    window.setTimeout(() => setUi((u) => (u.reaction?.key === key ? { ...u, reaction: null } : u)), 2600);
  }, []);

  const pulseWorld = useCallback((worldId: string, text: string) => {
    const key = Date.now();
    setUi((u) => ({ ...u, pulse: { worldId, key, text } }));
    window.setTimeout(() => setUi((u) => (u.pulse?.key === key ? { ...u, pulse: null } : u)), 1600);
  }, []);

  const markFresh = useCallback((ids: string[]) => {
    setUi((u) => ({ ...u, fresh: [...u.fresh, ...ids] }));
    window.setTimeout(() => setUi((u) => ({ ...u, fresh: u.fresh.filter((x) => !ids.includes(x)) })), 1200);
  }, []);

  /** Write back to the quest's tool; queue it if the tool can't be reached. */
  const writeBack = useCallback((q: Quest, patch: AppState['pending'][number]['patch']) => {
    if (!q.external) return;
    const { integrationId, key } = q.external;
    const queue = () => setState((s) => ({ ...s, pending: [...s.pending, { integrationId, key, patch }] }));
    if (!ref.current.integrations[integrationId]?.connected) return queue();
    INTEGRATIONS[integrationId]?.update(key, patch).catch(queue);
  }, []);

  // ───────── Quests ─────────
  const toggleDone = useCallback((id: string, opts: { quiet?: boolean } = {}) => {
    const s = ref.current;
    const q = s.quests.find((x) => x.id === id);
    if (!q) return;
    const done = !q.done;
    const w = s.worlds.find((x) => x.id === q.worldId)!;
    const before = worldStats(w.id, s.quests);
    const quests = s.quests.map((x) => (x.id === id ? { ...x, done, completedAt: done ? new Date().toISOString() : null } : x));
    const after = worldStats(w.id, quests);
    const delta = done ? XP_PER_QUEST : -XP_PER_QUEST;
    const wxBefore = s.worldXp[w.id] ?? 0;
    const wx = Math.max(0, wxBefore + delta);
    const total = Math.max(0, s.totalXp + delta);
    setState({ ...s, quests, worldXp: { ...s.worldXp, [w.id]: wx }, totalXp: total });
    setUi((u) => ({ ...u, xpBump: u.xpBump + (done ? 1 : 0) }));
    writeBack(q, { done });
    if (!done) {
      if (!opts.quiet) toast({ title: 'Back on your list', detail: q.title, worldId: w.id });
      return;
    }
    const gain = Math.round((after.pct - before.pct) * 100);
    if (wxBefore === 0) {
      say(w.id, `Hello. I’m ${w.creature.name}.`, 'wow');
      toast({ title: `${w.creature.name} hatched`, detail: `${w.name} has a creature now. See it in Collection.`, worldId: w.id });
    } else if (worldLevel(wx) > worldLevel(wxBefore)) {
      say(w.id, 'World updated.', 'wow');
      toast({ title: `${w.name} reached level ${worldLevel(wx)}`, detail: objectsIn(wx) > objectsIn(wxBefore) ? 'Something new appeared in this world.' : 'World updated.', worldId: w.id });
    } else {
      const left = quests.filter((x) => x.worldId === w.id && !x.done && x.dueDate && x.dueDate <= today()).length;
      say(w.id, left === 0 ? pick(['That’s everything today.', 'Clear. Nice.']) : pick(['Nice.', 'Done.', 'That’s one.', 'Next?']), 'happy');
    }
    if (levelOf(total) > levelOf(s.totalXp)) toast({ title: `You reached level ${levelOf(total)}`, detail: `${total.toLocaleString()} ✦ across your worlds.` });
    if (!opts.quiet) {
      toast({
        title: 'Nice. That’s done.', detail: q.title, xp: `+${XP_PER_QUEST} ✦ · ${w.name} +${Math.max(0, gain)}%`, worldId: w.id,
        action: { label: 'Undo', run: () => toggleRef.current(id, { quiet: true }) },
      });
    }
  }, [toast, say, writeBack]);
  const toggleRef = useRef(toggleDone);
  toggleRef.current = toggleDone;

  const sendExternal = useCallback(async (id: string, given?: Quest) => {
    const s = ref.current;
    const q = given ?? s.quests.find((x) => x.id === id);
    const w = q && s.worlds.find((x) => x.id === q.worldId);
    if (!q || !w?.link) return;
    const { integrationId, ref: r } = w.link;
    const label = integrationLabel(integrationId);
    if (!s.integrations[integrationId]?.connected) {
      toast({ title: `${label} isn’t connected`, detail: 'Connect it in Connections first. The quest stays private.' });
      return;
    }
    try {
      const t = await INTEGRATIONS[integrationId].create({ ref: r, title: q.title, dueDate: q.dueDate, priority: q.priority });
      setState((cur) => ({ ...cur, quests: cur.quests.map((x) => (x.id === id ? { ...x, source: 'external', external: { integrationId, key: t.key } } : x)) }));
      toast({ title: `Connected to ${label} as ${t.key}`, detail: 'This quest is now shared in that tool.', worldId: w.id });
    } catch (e) {
      toast({ title: `Couldn’t send to ${label}`, detail: `${(e as Error).message} It stays private.` });
    }
  }, [toast]);

  const createQuest = useCallback((n: NewQuest): Quest => {
    const s = ref.current;
    const q: Quest = {
      id: uid(), title: n.title.trim(), worldId: n.worldId, source: 'private', done: false, waitingOn: n.waitingOn,
      dueDate: n.dueDate, priority: n.priority, createdAt: new Date().toISOString(), completedAt: null,
    };
    setState({ ...s, quests: [...s.quests, q] });
    markFresh([q.id]);
    if (n.connect) sendExternal(q.id, q);
    return q;
  }, [markFresh, sendExternal]);

  const updateQuest = useCallback((id: string, patch: QuestPatch) => {
    const s = ref.current;
    const q = s.quests.find((x) => x.id === id);
    if (!q) return;
    if (patch.worldId && patch.worldId !== q.worldId && q.external) {
      toast({ title: 'This quest belongs to its tool', detail: `${q.external.key} stays in ${s.worlds.find((w) => w.id === q.worldId)?.name}.` });
      return;
    }
    setState({ ...s, quests: s.quests.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
    if (patch.worldId && patch.worldId !== q.worldId) {
      const w = s.worlds.find((x) => x.id === patch.worldId)!;
      pulseWorld(w.id, '+1');
      say(w.id, 'Got it.', 'happy');
    }
    const wb: AppState['pending'][number]['patch'] = {};
    if (patch.title !== undefined) wb.title = patch.title;
    if (patch.dueDate !== undefined) wb.dueDate = patch.dueDate;
    if (patch.priority !== undefined) wb.priority = patch.priority;
    if (Object.keys(wb).length) writeBack(q, wb);
  }, [toast, pulseWorld, say, writeBack]);

  const deleteQuest = useCallback((id: string) => {
    const s = ref.current;
    const idx = s.quests.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const q = s.quests[idx];
    const hid = q.external ? `${q.external.integrationId}:${q.external.key}` : null;
    setState({ ...s, quests: s.quests.filter((x) => x.id !== id), hidden: hid ? [...s.hidden, hid] : s.hidden });
    setUi((u) => ({ ...u, openQuestId: null }));
    toast({
      title: q.external ? 'Removed from Mochi' : 'Quest deleted',
      detail: q.external ? `${q.external.key} is still in ${integrationLabel(q.external.integrationId)}.` : q.title,
      action: {
        label: 'Undo',
        run: () => setState((cur) => {
          const quests = [...cur.quests];
          quests.splice(Math.min(idx, quests.length), 0, q);
          return { ...cur, quests, hidden: cur.hidden.filter((h) => h !== hid) };
        }),
      },
    });
  }, [toast]);

  // ───────── Integrations ─────────
  const sync = useCallback(async (integrationId: string, opts: { quiet?: boolean } = {}) => {
    const s = ref.current;
    const st = s.integrations[integrationId];
    if (!st?.connected || st.syncing) return;
    const setI = (patch: Partial<IntegrationState>) => setState((cur) => ({ ...cur, integrations: { ...cur.integrations, [integrationId]: { ...cur.integrations[integrationId], ...patch } } }));
    setI({ syncing: true });
    try {
      const mine = s.pending.filter((p) => p.integrationId === integrationId);
      for (const p of mine) await INTEGRATIONS[integrationId].update(p.key, p.patch).catch(() => undefined);
      const pull = await INTEGRATIONS[integrationId].pull();
      const cur = ref.current;
      const m = mergePull(cur.quests, integrationId, pull, cur.worlds, cur.hidden);
      setState({
        ...cur, quests: m.quests, pending: cur.pending.filter((p) => p.integrationId !== integrationId),
        integrations: { ...cur.integrations, [integrationId]: { ...cur.integrations[integrationId], syncing: false, lastSyncedAt: pull.syncedAt } },
      });
      if (m.added.length) {
        markFresh(m.added.map((q) => q.id));
        for (const q of m.added) { pulseWorld(q.worldId, `+${m.added.filter((x) => x.worldId === q.worldId).length}`); say(q.worldId, 'Something new came in.', 'wow'); }
      }
      if (!opts.quiet) toast({ title: `Synced with ${integrationLabel(integrationId)}`, detail: pull.notes[0] ?? 'Nothing new.' });
    } catch (e) {
      setI({ syncing: false });
      toast({ title: `${integrationLabel(integrationId)} didn’t sync`, detail: (e as Error).message });
    }
  }, [toast, markFresh, pulseWorld, say]);
  const syncRef = useRef(sync);
  syncRef.current = sync;

  const syncAll = useCallback(() => {
    for (const id of Object.keys(ref.current.integrations)) syncRef.current(id);
  }, []);

  const setConnected = useCallback(async (integrationId: string, on: boolean) => {
    setState((cur) => ({ ...cur, integrations: { ...cur.integrations, [integrationId]: { ...cur.integrations[integrationId], syncing: true } } }));
    await (on ? INTEGRATIONS[integrationId].connect() : INTEGRATIONS[integrationId].disconnect());
    setState((cur) => ({ ...cur, integrations: { ...cur.integrations, [integrationId]: { ...cur.integrations[integrationId], connected: on, syncing: false } } }));
    if (on) window.setTimeout(() => syncRef.current(integrationId), 60);
    else toast({ title: `${integrationLabel(integrationId)} disconnected`, detail: 'Its quests stay in your worlds. Changes are sent when you reconnect.' });
  }, [toast]);

  useEffect(() => {
    const t = window.setInterval(() => { for (const id of Object.keys(ref.current.integrations)) syncRef.current(id, { quiet: true }); }, 5 * 60_000);
    return () => window.clearInterval(t);
  }, []);

  // ───────── Worlds & creatures ─────────
  const createWorld = useCallback((w: { name: string; color: Accent; terrain: Terrain; body: World['creature']['body']; antenna: World['creature']['antenna']; creatureName: string; kind: World['kind'] }) => {
    const id = `${w.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'world'}-${Date.now().toString(36).slice(-3)}`;
    const world: World = { id, name: w.name.toUpperCase(), color: w.color, terrain: w.terrain, kind: w.kind, creature: { name: w.creatureName, body: w.body, antenna: w.antenna }, link: null, notes: '', createdAt: new Date().toISOString() };
    setState((cur) => ({ ...cur, worlds: [...cur.worlds, world], worldXp: { ...cur.worldXp, [id]: 0 } }));
    setUi((u) => ({ ...u, newWorldOpen: false }));
    toast({ title: `${world.name} added to your map`, detail: `Finish a quest there to hatch ${w.creatureName}.`, worldId: id });
    return world;
  }, [toast]);

  const setNotes = useCallback((worldId: string, notes: string) => setState((cur) => ({ ...cur, worlds: cur.worlds.map((w) => (w.id === worldId ? { ...w, notes } : w)) })), []);

  const toggleAccessory = useCallback((worldId: string, a: Accessory) => {
    setState((cur) => {
      const list = cur.equipped[worldId] ?? [];
      return { ...cur, equipped: { ...cur.equipped, [worldId]: list.includes(a) ? list.filter((x) => x !== a) : [...list, a] } };
    });
    say(worldId, pick(['Looking sharp.', 'Oh, nice.', 'I like it.']), 'happy');
  }, [say]);

  const resetDemo = useCallback(() => {
    for (const p of Object.values(INTEGRATIONS)) p.reset?.();
    setState(seedState());
    setUi((u) => ({ ...u, toasts: [], openQuestId: null, connectionsOpen: false, focus: null }));
    navigate({ name: 'today' });
    toast({ title: 'Worlds reset', detail: 'Back to the sample quests.' });
  }, [navigate, toast]);

  const ux = useMemo(() => ({
    openQuest: (id: string | null) => setUi((u) => ({ ...u, openQuestId: id })),
    openComposer: (worldId?: string) => setUi((u) => ({ ...u, composer: { open: true, worldId }, openQuestId: null })),
    closeComposer: () => setUi((u) => ({ ...u, composer: { open: false } })),
    startFocus: (ids: string[]) => ids.length && setUi((u) => ({ ...u, focus: { ids, index: 0 }, openQuestId: null })),
    nextFocus: () => setUi((u) => (u.focus && u.focus.index + 1 < u.focus.ids.length ? { ...u, focus: { ...u.focus, index: u.focus.index + 1 } } : { ...u, focus: null })),
    exitFocus: () => setUi((u) => ({ ...u, focus: null })),
    setConnections: (connectionsOpen: boolean) => setUi((u) => ({ ...u, connectionsOpen })),
    setNewWorld: (newWorldOpen: boolean) => setUi((u) => ({ ...u, newWorldOpen })),
  }), []);

  const actions = useMemo(() => ({
    navigate, toast, dismissToast, say, pulseWorld, toggleDone, createQuest, updateQuest, deleteQuest, sendExternal,
    sync, syncAll, setConnected, createWorld, setNotes, toggleAccessory, resetDemo, ...ux,
  }), [navigate, toast, dismissToast, say, pulseWorld, toggleDone, createQuest, updateQuest, deleteQuest, sendExternal, sync, syncAll, setConnected, createWorld, setNotes, toggleAccessory, resetDemo, ux]);

  const worldOf = useCallback((id: string) => state.worlds.find((w) => w.id === id) ?? state.worlds[0], [state.worlds]);
  return { state, ui, actions, worldOf };
}
