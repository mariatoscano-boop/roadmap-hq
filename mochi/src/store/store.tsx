/**
 * App state + actions. Persisted state (workspace, tasks, activity, XP, Tengu connection) is saved
 * to this browser. Side effects (Tengu writes, activity, XP, toasts, level-ups) live in the actions
 * so components stay simple. Every action is performed as `me`, the member using the app.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SEED_MEMBERS, SEED_PROJECTS, SEED_TEAMS, SEED_XP, seedActivity, seedTasks } from '../data/seed';
import { tengu } from '../integrations/tengu';
import { memberByName, mergePull, toTenguPriority, toTenguRole } from '../integrations/tengu/mapping';
import type { TenguTaskPatch } from '../integrations/tengu/types';
import { dueLabel, today } from '../lib/dates';
import {
  doneToday, isDone, levelOf, projectLevel, projectStats, STATUS_LABEL, todayFor, visibleProjects, visibleTasks, XP_PER_CREATE, XP_PER_TASK,
} from '../lib/selectors';
import type { Activity, ActivityVerb, Member, Priority, Project, Status, Task, Team, TenguConnection, View } from '../types';

export interface AppState {
  version: 2;
  me: string;
  teamId: string;
  members: Member[];
  teams: Team[];
  projects: Project[];
  tasks: Task[];
  activity: Activity[];
  xp: Record<string, number>;
  /** Milestones reached per project, so a level-up is announced once. */
  projectLevels: Record<string, number>;
  tengu: TenguConnection;
  hiddenTenguIds: string[];
  pendingTengu: Record<string, TenguTaskPatch>;
  /** How many scripted teammate events have played. */
  scriptPlayed: number;
}

export interface Toast {
  id: number;
  title: string;
  detail?: string;
  xp?: number;
  tone?: 'plain' | 'success' | 'level';
  action?: { label: string; run: () => void };
}

export interface LevelUp {
  key: number;
  kind: 'user' | 'project';
  title: string;
  detail: string;
  color?: string;
}

export interface UiState {
  view: View;
  toasts: Toast[];
  openTaskId: string | null;
  composer: { open: boolean; preset?: Partial<Pick<Task, 'projectId' | 'assigneeId' | 'dueDate'>> };
  focus: { ids: string[]; index: number } | null;
  settingsOpen: boolean;
  dragTaskId: string | null;
  xpBump: { key: number; delta: number };
  levelUp: LevelUp | null;
  /** Ids that just appeared (tasks or activity) for enter animations. */
  fresh: string[];
}

export interface NewTask {
  title: string;
  projectId: string;
  assigneeId: string;
  dueDate: string | null;
  time: string | null;
  priority: Priority;
  /** Create it in Tengu so the team sees it. Otherwise it stays private. */
  share: boolean;
}

export type TaskPatch = Partial<Pick<Task, 'title' | 'projectId' | 'assigneeId' | 'dueDate' | 'time' | 'priority' | 'notes'>>;

const STORAGE_KEY = 'mochi.v2';

function seedState(): AppState {
  const tasks = seedTasks();
  return {
    version: 2,
    me: 'maria',
    teamId: 'all',
    members: SEED_MEMBERS,
    teams: SEED_TEAMS,
    projects: SEED_PROJECTS,
    tasks,
    activity: seedActivity(),
    xp: { ...SEED_XP },
    projectLevels: Object.fromEntries(SEED_PROJECTS.map((p) => [p.id, projectLevel(p, projectStats(p.id, tasks).pct)])),
    tengu: { connected: true, lastSyncedAt: new Date(Date.now() - 2 * 60_000).toISOString(), syncing: false },
    hiddenTenguIds: [],
    pendingTengu: {},
    scriptPlayed: 0,
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s.version === 2 && Array.isArray(s.tasks)) return { ...s, tengu: { ...s.tengu, syncing: false } };
    }
  } catch {
    /* fall through to the sample workspace */
  }
  return seedState();
}

const VIEWS = ['today', 'work', 'projects', 'team', 'activity'] as const;
function viewFromHash(): View {
  const h = typeof location !== 'undefined' ? location.hash.slice(1) : '';
  if (h.startsWith('project-')) return { name: 'project', id: h.slice(8) };
  return (VIEWS as readonly string[]).includes(h) ? { name: h as (typeof VIEWS)[number] } : { name: 'today' };
}
const hashOf = (v: View) => (v.name === 'project' ? `project-${v.id}` : v.name);
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Teammates "working" while the app is open: one change every ~40s, then quiet. */
const SCRIPT: { actorId: string; taskId: string; to: Status }[] = [
  { actorId: 'bryan', taskId: 't-fiji-6', to: 'done' },
  { actorId: 'malika', taskId: 't-dos-7', to: 'review' },
  { actorId: 'bryan', taskId: 't-dos-8', to: 'progress' },
  { actorId: 'malika', taskId: 't-dos-3', to: 'done' },
  { actorId: 'natalia', taskId: 't-fiji-8', to: 'progress' },
];

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
    toasts: [],
    openTaskId: null,
    composer: { open: false },
    focus: null,
    settingsOpen: false,
    dragTaskId: null,
    xpBump: { key: 0, delta: 0 },
    levelUp: null,
    fresh: [],
  }));
  const stateRef = useRef(state);
  stateRef.current = state;
  const toastId = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage blocked: the app keeps working for this visit */
    }
  }, [state]);

  useEffect(() => {
    const onHash = () => setUi((u) => ({ ...u, view: viewFromHash() }));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // ───────────── Derived for the current person + team ─────────────
  const team = state.teams.find((t) => t.id === state.teamId) ?? state.teams[0];
  const projects = useMemo(() => visibleProjects(state.projects, team, state.me), [state.projects, team, state.me]);
  const tasks = useMemo(() => visibleTasks(state.tasks, projects, state.me), [state.tasks, projects, state.me]);
  const members = useMemo(() => state.members.filter((m) => team.memberIds.includes(m.id)), [state.members, team]);
  const activity = useMemo(() => {
    const ids = new Set(projects.map((p) => p.id));
    const priv = new Set(state.tasks.filter((t) => t.source === 'personal' && t.createdBy !== state.me).map((t) => t.id));
    return state.activity.filter((a) => ids.has(a.projectId) && !(a.taskId && priv.has(a.taskId)));
  }, [state.activity, state.tasks, projects, state.me]);
  const me = state.members.find((m) => m.id === state.me)!;

  // ───────────── UI helpers ─────────────
  const navigate = useCallback((view: View) => {
    setUi((u) => ({ ...u, view, openTaskId: null }));
    try {
      history.replaceState(null, '', `#${hashOf(view)}`);
    } catch {
      /* sandboxed frame: navigation still works in-app */
    }
    window.scrollTo({ top: 0 });
  }, []);

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastId.current;
    setUi((u) => ({ ...u, toasts: [...u.toasts.slice(-2), { ...t, id }] }));
    window.setTimeout(() => setUi((u) => ({ ...u, toasts: u.toasts.filter((x) => x.id !== id) })), t.action ? 5500 : 3200);
  }, []);
  const dismissToast = useCallback((id: number) => setUi((u) => ({ ...u, toasts: u.toasts.filter((x) => x.id !== id) })), []);

  const markFresh = useCallback((ids: string[]) => {
    setUi((u) => ({ ...u, fresh: [...u.fresh, ...ids] }));
    window.setTimeout(() => setUi((u) => ({ ...u, fresh: u.fresh.filter((x) => !ids.includes(x)) })), 1200);
  }, []);

  const showLevelUp = useCallback((l: Omit<LevelUp, 'key'>) => {
    const key = Date.now();
    setUi((u) => ({ ...u, levelUp: { ...l, key } }));
    window.setTimeout(() => setUi((u) => (u.levelUp?.key === key ? { ...u, levelUp: null } : u)), 4200);
  }, []);

  const log = (s: AppState, actorId: string, verb: ActivityVerb, task: Task, detail?: string): Activity[] => {
    const a: Activity = { id: uid('a'), actorId, verb, taskId: task.id, taskTitle: task.title, projectId: task.projectId, detail, at: new Date().toISOString() };
    markFresh([a.id]);
    return [a, ...s.activity].slice(0, 300);
  };

  /** Write a Tengu-owned change; if Tengu can't be reached, queue it for the next sync. */
  const writeTengu = useCallback((tenguId: string, patch: TenguTaskPatch) => {
    const queue = () => setState((s) => ({ ...s, pendingTengu: { ...s.pendingTengu, [tenguId]: { ...s.pendingTengu[tenguId], ...patch } } }));
    if (!stateRef.current.tengu.connected) return queue();
    tengu.updateTask(tenguId, patch).catch(queue);
  }, []);

  /** After tasks change: announce project milestones reached, and keep the stored levels in step. */
  const checkProjectLevels = (s: AppState, tasks: Task[], projectIds: string[], announce: boolean) => {
    const levels = { ...s.projectLevels };
    for (const pid of projectIds) {
      const p = s.projects.find((x) => x.id === pid);
      if (!p) continue;
      const lvl = projectLevel(p, projectStats(pid, tasks).pct);
      if (announce && lvl > (levels[pid] ?? 0)) {
        const m = p.milestones[lvl - 1];
        showLevelUp({ kind: 'project', title: `${p.name} · Level ${lvl}`, detail: lvl === p.milestones.length ? `${m.name}. Every task is done.` : `Milestone reached: ${m.name}`, color: p.color });
      }
      levels[pid] = lvl;
    }
    return levels;
  };

  // ───────────── Tasks ─────────────

  const setStatus = useCallback(
    (id: string, status: Status, opts: { quiet?: boolean } = {}) => {
      const s = stateRef.current;
      const task = s.tasks.find((t) => t.id === id);
      if (!task || task.status === status) return;
      const wasDone = isDone(task);
      const nowDone = status === 'done';
      const updated: Task = { ...task, status, completedAt: nowDone ? new Date().toISOString() : wasDone ? null : task.completedAt };
      const tasks = s.tasks.map((t) => (t.id === id ? updated : t));
      const xpDelta = nowDone && !wasDone ? XP_PER_TASK : wasDone && !nowDone ? -XP_PER_TASK : 0;
      const xpBefore = s.xp[s.me] ?? 0;
      const xp = { ...s.xp, [s.me]: Math.max(0, xpBefore + xpDelta) };
      const verb: ActivityVerb = nowDone ? 'completed' : wasDone ? 'reopened' : 'moved';
      const activity = log(s, s.me, verb, updated, verb === 'moved' ? `→ ${STATUS_LABEL[status]}` : undefined);
      const projectLevels = checkProjectLevels(s, tasks, [task.projectId], nowDone);
      setState({ ...s, tasks, xp, activity, projectLevels });
      if (xpDelta) setUi((u) => ({ ...u, xpBump: { key: u.xpBump.key + 1, delta: xpDelta } }));
      if (task.tengu) writeTengu(task.tengu.id, { statusRole: toTenguRole(status) });

      if (nowDone && levelOf(xp[s.me]) > levelOf(xpBefore)) {
        showLevelUp({ kind: 'user', title: `Level ${levelOf(xp[s.me])}`, detail: `${xp[s.me].toLocaleString()} XP. You're on a roll.` });
      }
      if (opts.quiet) return;
      if (nowDone) {
        const mineToday = todayFor(tasks, s.me);
        const left = mineToday.filter((t) => !isDone(t)).length;
        const doneCount = tasks.filter((t) => t.assigneeId === s.me && doneToday(t)).length;
        const title = left === 0 && mineToday.length > 0 ? 'Clean sweep. Today’s done.' : doneCount === 3 ? 'You’re on a roll.' : 'Nice. That’s done.';
        toast({
          tone: 'success', title, detail: task.title, xp: XP_PER_TASK,
          action: { label: 'Undo', run: () => setStatusRef.current(id, task.status, { quiet: true }) },
        });
      } else if (verb === 'moved') {
        toast({ title: `Moved to ${STATUS_LABEL[status]}`, detail: task.title });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast, writeTengu, showLevelUp],
  );
  const setStatusRef = useRef(setStatus);
  setStatusRef.current = setStatus;

  const toggleDone = useCallback((id: string) => {
    const t = stateRef.current.tasks.find((x) => x.id === id);
    if (t) setStatus(id, isDone(t) ? 'todo' : 'done');
  }, [setStatus]);

  const updateTask = useCallback(
    (id: string, patch: TaskPatch, opts: { announce?: boolean } = {}) => {
      const s = stateRef.current;
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return;
      if (patch.projectId && patch.projectId !== task.projectId && task.tengu) {
        toast({ title: 'Tengu tasks stay in their project', detail: `${task.tengu.key} lives in ${s.projects.find((p) => p.id === task.projectId)?.name}` });
        return;
      }
      const updated = { ...task, ...patch };
      let activity = s.activity;
      let note = '';
      if (patch.assigneeId && patch.assigneeId !== task.assigneeId) {
        const who = s.members.find((m) => m.id === patch.assigneeId)!.name;
        activity = log({ ...s, activity }, s.me, 'assigned', updated, `→ ${who}`);
        note = `Assigned to ${who}`;
      }
      if (patch.dueDate !== undefined && patch.dueDate !== task.dueDate) {
        activity = log({ ...s, activity }, s.me, 'scheduled', updated, `→ ${dueLabel(patch.dueDate)}`);
        note = `Due ${dueLabel(patch.dueDate).toLowerCase()}`;
      }
      if (patch.projectId && patch.projectId !== task.projectId) {
        const pn = s.projects.find((p) => p.id === patch.projectId)!.name;
        activity = log({ ...s, activity }, s.me, 'moved', updated, `→ ${pn}`);
        note = `Moved to ${pn}`;
      }
      const tasks = s.tasks.map((t) => (t.id === id ? updated : t));
      setState({ ...s, tasks, activity, projectLevels: checkProjectLevels(s, tasks, [task.projectId, updated.projectId], false) });
      if (opts.announce && note) toast({ title: note, detail: task.title });
      if (task.tengu) {
        const tp: TenguTaskPatch = {};
        if (patch.title !== undefined) tp.title = patch.title;
        if (patch.dueDate !== undefined) tp.dueDate = patch.dueDate;
        if (patch.priority !== undefined) tp.priority = toTenguPriority(patch.priority);
        if (patch.assigneeId !== undefined) tp.assignee = s.members.find((m) => m.id === patch.assigneeId)?.name ?? null;
        if (Object.keys(tp).length) writeTengu(task.tengu.id, tp);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast, writeTengu],
  );

  /** Private task → Tengu task, visible to the team. */
  const shareToTengu = useCallback(
    async (id: string, given?: Task) => {
      const s = stateRef.current;
      const task = given ?? s.tasks.find((t) => t.id === id);
      const project = task && s.projects.find((p) => p.id === task.projectId);
      if (!task || !project?.tenguSpaceId) return;
      if (!s.tengu.connected) {
        toast({ title: 'Tengu isn’t connected', detail: 'Connect it in Settings to share tasks.' });
        return;
      }
      try {
        const created = await tengu.createTask({
          spaceId: project.tenguSpaceId,
          title: task.title,
          assignee: s.members.find((m) => m.id === task.assigneeId)?.name ?? null,
          dueDate: task.dueDate,
          priority: toTenguPriority(task.priority),
          statusRole: toTenguRole(task.status),
        });
        setState((cur) => ({ ...cur, tasks: cur.tasks.map((t) => (t.id === id ? { ...t, source: 'tengu', tengu: { id: created.id, key: created.key } } : t)) }));
        toast({ title: `Shared to Tengu as ${created.key}`, detail: 'The team can see it now.' });
      } catch (e) {
        toast({ title: 'Couldn’t share to Tengu', detail: `${(e as Error).message} It stays private for now.` });
      }
    },
    [toast],
  );

  const createTask = useCallback(
    (n: NewTask): Task => {
      const s = stateRef.current;
      const task: Task = {
        id: uid('t'),
        title: n.title.trim(),
        projectId: n.projectId,
        source: 'personal',
        status: 'todo',
        assigneeId: n.assigneeId,
        createdBy: s.me,
        dueDate: n.dueDate,
        time: n.time,
        priority: n.priority,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      const tasks = [...s.tasks, task];
      const xp = { ...s.xp, [s.me]: (s.xp[s.me] ?? 0) + XP_PER_CREATE };
      setState({ ...s, tasks, xp, activity: log(s, s.me, 'created', task), projectLevels: checkProjectLevels(s, tasks, [task.projectId], false) });
      setUi((u) => ({ ...u, xpBump: { key: u.xpBump.key + 1, delta: XP_PER_CREATE } }));
      markFresh([task.id]);
      const project = s.projects.find((p) => p.id === task.projectId)!;
      if (n.share && project.tenguSpaceId) shareToTengu(task.id, task);
      return task;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markFresh, shareToTengu],
  );

  const deleteTask = useCallback(
    (id: string) => {
      const s = stateRef.current;
      const idx = s.tasks.findIndex((t) => t.id === id);
      if (idx < 0) return;
      const task = s.tasks[idx];
      setState({ ...s, tasks: s.tasks.filter((t) => t.id !== id), hiddenTenguIds: task.tengu ? [...s.hiddenTenguIds, task.tengu.id] : s.hiddenTenguIds });
      setUi((u) => ({ ...u, openTaskId: null }));
      toast({
        title: task.tengu ? 'Removed from Mochi' : 'Task deleted',
        detail: task.tengu ? `${task.tengu.key} is still in Tengu.` : task.title,
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
    [toast],
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
      const m = mergePull(cur.tasks, pull, cur.projects, cur.members, cur.hiddenTenguIds);
      if (m.added.length) markFresh(m.added.map((t) => t.id));
      const newActs: Activity[] = m.added.map((t) => {
        const assigner = memberByName(cur.members, 'Bryan')?.id ?? t.assigneeId;
        return { id: uid('a'), actorId: assigner, verb: 'assigned', taskId: t.id, taskTitle: t.title, projectId: t.projectId, detail: `→ ${cur.members.find((x) => x.id === t.assigneeId)?.name}`, at: pull.syncedAt };
      });
      for (const c of m.changed) {
        if (c.before.status !== c.after.status) {
          newActs.push({ id: uid('a'), actorId: c.after.assigneeId, verb: c.after.status === 'done' ? 'completed' : 'moved', taskId: c.after.id, taskTitle: c.after.title, projectId: c.after.projectId, detail: c.after.status === 'done' ? undefined : `→ ${STATUS_LABEL[c.after.status]}`, at: pull.syncedAt });
        }
      }
      if (newActs.length) markFresh(newActs.map((a) => a.id));
      setState({ ...cur, tasks: m.tasks, activity: [...newActs, ...cur.activity], pendingTengu: {}, tengu: { connected: true, syncing: false, lastSyncedAt: pull.syncedAt } });
      toast({ title: 'Synced with Tengu', detail: pull.notes?.[0] ?? 'Everything is up to date.' });
    } catch (e) {
      setState((cur) => ({ ...cur, tengu: { ...cur.tengu, syncing: false } }));
      toast({ title: 'Sync didn’t work', detail: (e as Error).message });
    }
  }, [toast, markFresh]);
  const syncRef = useRef(syncNow);
  syncRef.current = syncNow;

  const connectTengu = useCallback(async () => {
    setState((cur) => ({ ...cur, tengu: { ...cur.tengu, syncing: true } }));
    await tengu.connect();
    setState((cur) => ({ ...cur, tengu: { ...cur.tengu, connected: true, syncing: false } }));
    window.setTimeout(() => syncRef.current(), 80);
  }, []);

  const disconnectTengu = useCallback(async () => {
    await tengu.disconnect();
    setState((cur) => ({ ...cur, tengu: { ...cur.tengu, connected: false, syncing: false } }));
    toast({ title: 'Tengu disconnected', detail: 'Your tasks stay in Mochi. Changes are sent when you reconnect.' });
  }, [toast]);

  // Quiet background sync every 5 minutes.
  useEffect(() => {
    const t = window.setInterval(() => syncRef.current(), 5 * 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Teammates at work: scripted, one change every ~40s while the page is visible.
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.hidden) return;
      const s = stateRef.current;
      const step = SCRIPT[s.scriptPlayed];
      if (!step) return;
      const task = s.tasks.find((x) => x.id === step.taskId);
      if (!task || task.assigneeId === s.me || task.status === step.to || task.status === 'done') {
        setState({ ...s, scriptPlayed: s.scriptPlayed + 1 });
        return;
      }
      const updated: Task = { ...task, status: step.to, completedAt: step.to === 'done' ? new Date().toISOString() : null };
      const tasks = s.tasks.map((x) => (x.id === task.id ? updated : x));
      const verb: ActivityVerb = step.to === 'done' ? 'completed' : 'moved';
      const a: Activity = { id: uid('a'), actorId: step.actorId, verb, taskId: task.id, taskTitle: task.title, projectId: task.projectId, detail: verb === 'moved' ? `→ ${STATUS_LABEL[step.to]}` : undefined, at: new Date().toISOString() };
      markFresh([a.id]);
      setState({
        ...s,
        tasks,
        activity: [a, ...s.activity],
        xp: verb === 'completed' ? { ...s.xp, [step.actorId]: (s.xp[step.actorId] ?? 0) + XP_PER_TASK } : s.xp,
        projectLevels: checkProjectLevels(s, tasks, [task.projectId], false),
        scriptPlayed: s.scriptPlayed + 1,
      });
    }, 40_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────────── Workspace, people, focus ─────────────

  const setMe = useCallback((id: string) => {
    setState((cur) => ({ ...cur, me: id }));
    setUi((u) => ({ ...u, openTaskId: null, settingsOpen: false }));
    const m = stateRef.current.members.find((x) => x.id === id);
    toast({ title: `Signed in as ${m?.name}`, detail: 'Today and My Work now show their work.' });
  }, [toast]);

  const setTeam = useCallback((teamId: string) => setState((cur) => ({ ...cur, teamId })), []);

  const startFocus = useCallback((ids: string[]) => ids.length && setUi((u) => ({ ...u, focus: { ids, index: 0 }, openTaskId: null })), []);
  const nextFocus = useCallback(() => setUi((u) => (u.focus ? { ...u, focus: u.focus.index + 1 < u.focus.ids.length ? { ...u.focus, index: u.focus.index + 1 } : null } : u)), []);
  const exitFocus = useCallback(() => setUi((u) => ({ ...u, focus: null })), []);

  const resetDemo = useCallback(() => {
    if ('reset' in tengu) (tengu as { reset(): void }).reset();
    setState(seedState());
    setUi((u) => ({ ...u, toasts: [], openTaskId: null, settingsOpen: false, focus: null }));
    navigate({ name: 'today' });
    toast({ title: 'Workspace reset', detail: 'Back to the sample tasks.' });
  }, [navigate, toast]);

  const openTask = useCallback((id: string | null) => setUi((u) => ({ ...u, openTaskId: id })), []);
  const openComposer = useCallback((preset?: UiState['composer']['preset']) => setUi((u) => ({ ...u, composer: { open: true, preset }, openTaskId: null })), []);
  const closeComposer = useCallback(() => setUi((u) => ({ ...u, composer: { open: false } })), []);
  const setSettings = useCallback((settingsOpen: boolean) => setUi((u) => ({ ...u, settingsOpen })), []);
  const setDrag = useCallback((dragTaskId: string | null) => setUi((u) => ({ ...u, dragTaskId })), []);

  const actions = useMemo(
    () => ({
      navigate, toast, dismissToast, setStatus, toggleDone, updateTask, createTask, deleteTask, shareToTengu,
      syncNow, connectTengu, disconnectTengu, setMe, setTeam, startFocus, nextFocus, exitFocus, resetDemo,
      openTask, openComposer, closeComposer, setSettings, setDrag,
    }),
    [navigate, toast, dismissToast, setStatus, toggleDone, updateTask, createTask, deleteTask, shareToTengu, syncNow, connectTengu, disconnectTengu, setMe, setTeam, startFocus, nextFocus, exitFocus, resetDemo, openTask, openComposer, closeComposer, setSettings, setDrag],
  );

  const memberOf = useCallback((id: string) => state.members.find((m) => m.id === id) ?? state.members[0], [state.members]);
  const projectOf = useCallback((id: string) => state.projects.find((p) => p.id === id) ?? state.projects[0], [state.projects]);

  return {
    state, ui, actions, team, projects, tasks, members, activity, me, memberOf, projectOf,
    providerLabel: tengu.label, providerKind: tengu.kind, today: today(),
  };
}
