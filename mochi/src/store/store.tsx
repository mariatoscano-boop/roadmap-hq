/**
 * App state + actions. Persisted state (tasks, projects, character, Tengu connection) is saved
 * to this browser. Side effects (Tengu writes, Mochi's reactions, toasts, confetti) live in the
 * actions so components stay simple.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { seedCharacter, SEED_PROJECTS, seedTasks } from '../data/seed';
import { tengu } from '../integrations/tengu';
import { mergePull, projectForSpace, toTenguPriority } from '../integrations/tengu/mapping';
import type { TenguTaskPatch } from '../integrations/tengu/types';
import { today } from '../lib/dates';
import { reactionSpeech, type Reaction, type Speech } from '../lib/mochi';
import { newlyUnlocked, rewardById, STARS_PER_TASK } from '../lib/rewards';
import { completedToday, projectStats, todayTasks } from '../lib/selectors';
import type { Character, Priority, Project, RewardId, Task, TenguConnection, View, Wallpaper } from '../types';

export interface AppState {
  version: 1;
  projects: Project[];
  tasks: Task[];
  character: Character;
  tengu: TenguConnection;
  /** Tengu tasks the user removed from the app (they stay in Tengu). */
  hiddenTenguIds: string[];
  /** Changes to Tengu tasks made while Tengu couldn't be reached; sent on the next sync. */
  pendingTengu: Record<string, TenguTaskPatch>;
  focus: { date: string; ids: string[] } | null;
}

export interface Toast {
  id: number;
  text: string;
  tone?: 'stars' | 'plain' | 'unlock';
  action?: { label: string; run: () => void };
}

export interface UiState {
  view: View;
  speech: (Speech & { key: number }) | null;
  bounce: number;
  confetti: number;
  starBump: { key: number; delta: number };
  toasts: Toast[];
  openTaskId: string | null;
  quickAdd: { open: boolean; projectId?: string };
  plateOpen: boolean;
  /** Task ids added in the last moment, for the spring-in animation. */
  fresh: string[];
}

export interface NewTask {
  title: string;
  projectId: string;
  dueDate: string | null;
  priority: Priority;
  toTengu: boolean;
}

const STORAGE_KEY = 'mochi.v1';

function seedState(): AppState {
  return {
    version: 1,
    projects: SEED_PROJECTS,
    tasks: seedTasks(),
    character: seedCharacter(),
    tengu: { connected: true, lastSyncedAt: new Date(Date.now() - 2 * 60_000).toISOString(), syncing: false },
    hiddenTenguIds: [],
    pendingTengu: {},
    focus: null,
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s.version === 1 && Array.isArray(s.tasks)) return { ...s, tengu: { ...s.tengu, syncing: false } };
    }
  } catch {
    /* fall through to the sample data */
  }
  return seedState();
}

const VIEW_NAMES = ['today', 'projects', 'mine', 'little', 'rewards'] as const;
function viewFromHash(): View {
  const h = typeof location !== 'undefined' ? location.hash.slice(1) : '';
  if (h.startsWith('project-')) return { name: 'project', id: h.slice(8) };
  return (VIEW_NAMES as readonly string[]).includes(h) ? { name: h as (typeof VIEW_NAMES)[number] } : { name: 'today' };
}
const hashOf = (v: View) => (v.name === 'project' ? `project-${v.id}` : v.name);

const uid = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

type Ctx = ReturnType<typeof useBuildStore>;
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useBuildStore();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

function useBuildStore() {
  const [state, setState] = useState<AppState>(loadState);
  const [ui, setUi] = useState<UiState>(() => ({
    view: viewFromHash(),
    speech: null,
    bounce: 0,
    confetti: 0,
    starBump: { key: 0, delta: 0 },
    toasts: [],
    openTaskId: null,
    quickAdd: { open: false },
    plateOpen: false,
    fresh: [],
  }));
  const stateRef = useRef(state);
  stateRef.current = state;
  const speechTimer = useRef<number>();
  const toastId = useRef(0);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage blocked: the app keeps working for this visit */
    }
  }, [state]);

  // Hash ↔ view
  useEffect(() => {
    const onHash = () => setUi((u) => ({ ...u, view: viewFromHash() }));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((view: View) => {
    setUi((u) => ({ ...u, view, openTaskId: null }));
    try {
      history.replaceState(null, '', `#${hashOf(view)}`);
    } catch {
      /* sandboxed frame: navigation still works in-app */
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const say = useCallback((speech: Speech, ms = 4800) => {
    window.clearTimeout(speechTimer.current);
    setUi((u) => ({ ...u, speech: { ...speech, key: Date.now() }, bounce: u.bounce + 1 }));
    speechTimer.current = window.setTimeout(() => setUi((u) => ({ ...u, speech: null })), ms);
  }, []);

  const react = useCallback((r: Reaction, detail?: string) => say(reactionSpeech(r, detail)), [say]);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastId.current;
    setUi((u) => ({ ...u, toasts: [...u.toasts.slice(-2), { ...t, id }] }));
    window.setTimeout(() => setUi((u) => ({ ...u, toasts: u.toasts.filter((x) => x.id !== id) })), t.action ? 6000 : 3600);
  }, []);

  const dismissToast = useCallback((id: number) => setUi((u) => ({ ...u, toasts: u.toasts.filter((x) => x.id !== id) })), []);

  const celebrate = useCallback(() => setUi((u) => ({ ...u, confetti: u.confetti + 1 })), []);

  const markFresh = useCallback((ids: string[]) => {
    setUi((u) => ({ ...u, fresh: [...u.fresh, ...ids] }));
    window.setTimeout(() => setUi((u) => ({ ...u, fresh: u.fresh.filter((x) => !ids.includes(x)) })), 900);
  }, []);

  /** Write a Tengu-owned change; if Tengu can't be reached, queue it for the next sync. */
  const writeTengu = useCallback((tenguId: string, patch: TenguTaskPatch) => {
    const queue = () =>
      setState((s) => ({ ...s, pendingTengu: { ...s.pendingTengu, [tenguId]: { ...s.pendingTengu[tenguId], ...patch } } }));
    if (!stateRef.current.tengu.connected) return queue();
    tengu.updateTask(tenguId, patch).catch(queue);
  }, []);

  // ───────────── Tasks ─────────────

  const toggleTask = useCallback(
    (id: string) => {
      const s = stateRef.current;
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return;
      const completed = !task.completed;
      const tasks = s.tasks.map((t) => (t.id === id ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null } : t));
      const delta = completed ? STARS_PER_TASK : -STARS_PER_TASK;
      const stars = Math.max(0, s.character.stars + delta);
      let unlocked = s.character.unlockedItems;
      let placed = s.character.placedItems;
      const gained: RewardId[] = completed ? newlyUnlocked(stars, unlocked) : [];

      // Finishing a whole project
      const project = s.projects.find((p) => p.id === task.projectId)!;
      const before = projectStats(project, s.tasks);
      const after = projectStats(project, tasks);
      const projectDone = completed && after.total > 0 && after.open === 0 && before.open > 0;
      if (projectDone && !unlocked.includes('disco')) gained.push('disco');
      if (gained.length) {
        unlocked = [...unlocked, ...gained];
        placed = [...placed, ...gained];
      }

      setState({ ...s, tasks, character: { ...s.character, stars, unlockedItems: unlocked, placedItems: placed } });
      setUi((u) => ({ ...u, starBump: { key: u.starBump.key + 1, delta } }));
      if (task.tengu) writeTengu(task.tengu.id, { done: completed });

      if (!completed) {
        react('uncomplete');
        return;
      }
      const todayOpen = todayTasks(tasks).filter((t) => !t.completed).length;
      const doneToday = completedToday(tasks);
      const wasOnToday = todayTasks(s.tasks).some((t) => t.id === id);
      if (projectDone) {
        react('projectDone', project.name);
        celebrate();
      } else if (wasOnToday && todayOpen === 0) {
        react('allDone');
        celebrate();
      } else if (doneToday === 5) {
        react('streak5');
        celebrate();
      } else if (doneToday === 3) {
        react('streak3');
      } else if (gained.length) {
        react('unlock', rewardById(gained[0]).name.toLowerCase());
      } else {
        react('complete');
      }
      toast({ tone: 'stars', text: `+${STARS_PER_TASK} ✦  ${task.title}` });
      for (const g of gained) toast({ tone: 'unlock', text: `Unlocked for your room: ${rewardById(g).name}` });
    },
    [react, celebrate, toast, writeTengu],
  );

  /** Personal task → Tengu task. Only for projects that live in Tengu. */
  const sendToTengu = useCallback(
    async (id: string, given?: Task) => {
      const s = stateRef.current;
      const task = given ?? s.tasks.find((t) => t.id === id);
      const project = task && s.projects.find((p) => p.id === task.projectId);
      if (!task || !project?.tenguSpaceId) return;
      if (!s.tengu.connected) {
        toast({ text: 'Connect Tengu first (Little Things → Tengu)' });
        return;
      }
      try {
        const created = await tengu.createTask({ spaceId: project.tenguSpaceId, title: task.title, dueDate: task.dueDate, priority: toTenguPriority(task.priority) });
        setState((cur) => ({
          ...cur,
          tasks: cur.tasks.map((t) => (t.id === id ? { ...t, source: 'tengu', tengu: { id: created.id, key: created.key } } : t)),
        }));
        react('tenguAdded', created.key);
        toast({ text: `Added to Tengu as ${created.key}` });
      } catch (e) {
        toast({ text: `Couldn’t add to Tengu: ${(e as Error).message} It’s saved as your task.` });
      }
    },
    [react, toast],
  );

  const addTask = useCallback(
    (n: NewTask) => {
      const s = stateRef.current;
      const task: Task = {
        id: uid(),
        title: n.title.trim(),
        projectId: n.projectId,
        source: 'personal',
        completed: false,
        dueDate: n.dueDate,
        priority: n.priority,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      setState({ ...s, tasks: [...s.tasks, task] });
      markFresh([task.id]);
      react('add');
      if (n.toTengu) sendToTengu(task.id, task);
      else toast({ text: `Added “${task.title}”` });
    },
    [react, toast, markFresh, sendToTengu],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Pick<Task, 'title' | 'projectId' | 'dueDate' | 'priority' | 'notes'>>) => {
      const s = stateRef.current;
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return;
      setState({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
      if (task.tengu) {
        const tp: TenguTaskPatch = {};
        if (patch.title !== undefined) tp.title = patch.title;
        if (patch.dueDate !== undefined) tp.dueDate = patch.dueDate;
        if (patch.priority !== undefined) tp.priority = toTenguPriority(patch.priority);
        if (Object.keys(tp).length) writeTengu(task.tengu.id, tp);
      }
    },
    [writeTengu],
  );

  const deleteTask = useCallback(
    (id: string) => {
      const s = stateRef.current;
      const idx = s.tasks.findIndex((t) => t.id === id);
      if (idx < 0) return;
      const task = s.tasks[idx];
      setState({
        ...s,
        tasks: s.tasks.filter((t) => t.id !== id),
        hiddenTenguIds: task.tengu ? [...s.hiddenTenguIds, task.tengu.id] : s.hiddenTenguIds,
      });
      setUi((u) => ({ ...u, openTaskId: null }));
      react('delete');
      toast({
        text: task.tengu ? `Removed from Mochi (still in Tengu)` : `Deleted “${task.title}”`,
        action: {
          label: 'Undo',
          run: () =>
            setState((cur) => {
              const tasks = [...cur.tasks];
              tasks.splice(Math.min(idx, tasks.length), 0, task);
              return { ...cur, tasks, hiddenTenguIds: cur.hiddenTenguIds.filter((h) => h !== task.tengu?.id) };
            }),
        },
      });
    },
    [react, toast],
  );

  // ───────────── Tengu connection ─────────────

  const syncNow = useCallback(async () => {
    const s = stateRef.current;
    if (!s.tengu.connected || s.tengu.syncing) return;
    setState((cur) => ({ ...cur, tengu: { ...cur.tengu, syncing: true } }));
    try {
      for (const [tid, patch] of Object.entries(s.pendingTengu)) await tengu.updateTask(tid, patch).catch(() => undefined);
      const pull = await tengu.pull();
      const cur = stateRef.current;
      const m = mergePull(cur.tasks, pull, cur.projects, cur.hiddenTenguIds);
      const added = m.added;
      const newIds = m.tasks.slice(cur.tasks.length).map((t) => t.id);
      if (newIds.length) markFresh(newIds);
      setState({ ...cur, tasks: m.tasks, pendingTengu: {}, tengu: { connected: true, syncing: false, lastSyncedAt: pull.syncedAt } });
      const note = pull.notes?.[0];
      if (added) react('syncedNew', `${added} new thing${added === 1 ? '' : 's'}`);
      else react('synced');
      toast({ text: note ? `Synced · ${note}` : 'Synced with Tengu · all caught up' });
    } catch (e) {
      setState((cur) => ({ ...cur, tengu: { ...cur.tengu, syncing: false } }));
      toast({ text: `Sync didn’t work: ${(e as Error).message}` });
    }
  }, [react, toast, markFresh]);

  const connectTengu = useCallback(async () => {
    setState((cur) => ({ ...cur, tengu: { ...cur.tengu, syncing: true } }));
    await tengu.connect();
    setState((cur) => ({ ...cur, tengu: { ...cur.tengu, connected: true, syncing: false } }));
    // Let the connected state land before syncing (syncNow reads the latest state).
    window.setTimeout(() => syncNowRef.current(), 80);
  }, []);

  const disconnectTengu = useCallback(async () => {
    await tengu.disconnect();
    setState((cur) => ({ ...cur, tengu: { ...cur.tengu, connected: false, syncing: false } }));
    toast({ text: 'Tengu disconnected. Your tasks stay right here.' });
  }, [toast]);

  const syncNowRef = useRef(syncNow);
  syncNowRef.current = syncNow;

  // Quiet background sync every 5 minutes while open.
  useEffect(() => {
    const t = window.setInterval(() => syncNowRef.current(), 5 * 60_000);
    return () => window.clearInterval(t);
  }, []);

  // ───────────── Focus, room, misc ─────────────

  const setFocus = useCallback(
    (ids: string[]) => {
      setState((cur) => ({ ...cur, focus: { date: today(), ids } }));
      setUi((u) => ({ ...u, plateOpen: false }));
      navigate({ name: 'today' });
      react('focus');
    },
    [navigate, react],
  );
  const clearFocus = useCallback(() => setState((cur) => ({ ...cur, focus: null })), []);

  const togglePlaced = useCallback((id: RewardId) => {
    setState((cur) => {
      const placed = cur.character.placedItems.includes(id)
        ? cur.character.placedItems.filter((x) => x !== id)
        : [...cur.character.placedItems, id];
      return { ...cur, character: { ...cur.character, placedItems: placed } };
    });
  }, []);

  const setWallpaper = useCallback((wallpaper: Wallpaper) => setState((cur) => ({ ...cur, character: { ...cur.character, wallpaper } })), []);
  const setName = useCallback((name: string) => setState((cur) => ({ ...cur, character: { ...cur.character, name } })), []);

  const resetDemo = useCallback(() => {
    if ('reset' in tengu) (tengu as { reset(): void }).reset();
    setState(seedState());
    setUi((u) => ({ ...u, speech: null, toasts: [], openTaskId: null }));
    navigate({ name: 'today' });
    toast({ text: 'Fresh start with the sample tasks ♡' });
  }, [navigate, toast]);

  const openTask = useCallback((id: string | null) => setUi((u) => ({ ...u, openTaskId: id })), []);
  const openQuickAdd = useCallback((projectId?: string) => setUi((u) => ({ ...u, quickAdd: { open: true, projectId } })), []);
  const closeQuickAdd = useCallback(() => setUi((u) => ({ ...u, quickAdd: { open: false } })), []);
  const setPlateOpen = useCallback((plateOpen: boolean) => setUi((u) => ({ ...u, plateOpen })), []);

  const projectOf = useCallback((id: string) => state.projects.find((p) => p.id === id) ?? state.projects[0], [state.projects]);
  const tenguProjectFor = useCallback((spaceId: string) => projectForSpace(state.projects, spaceId), [state.projects]);

  const actions = useMemo(
    () => ({
      navigate, say, toast, dismissToast, toggleTask, addTask, updateTask, deleteTask, sendToTengu,
      syncNow, connectTengu, disconnectTengu, setFocus, clearFocus, togglePlaced, setWallpaper, setName,
      resetDemo, openTask, openQuickAdd, closeQuickAdd, setPlateOpen,
    }),
    [navigate, say, toast, dismissToast, toggleTask, addTask, updateTask, deleteTask, sendToTengu, syncNow, connectTengu, disconnectTengu, setFocus, clearFocus, togglePlaced, setWallpaper, setName, resetDemo, openTask, openQuickAdd, closeQuickAdd, setPlateOpen],
  );

  return { state, ui, actions, projectOf, tenguProjectFor, providerLabel: tengu.label, providerKind: tengu.kind };
}
