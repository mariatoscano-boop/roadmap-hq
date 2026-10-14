/** Sidebar, top bars, bottom nav, HUD, drag dock, toasts and level-up banner. */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { dateForPreset } from '../lib/due';
import { relativeTime } from '../lib/dates';
import { isDone, LEVEL_SIZE, levelOf, levelProgress, projectStats, streak, todayFor } from '../lib/selectors';
import { useStore } from '../store/store';
import type { Member, Project, Status, View } from '../types';
import { useDrop } from './dnd';
import {
  IconActivity, IconBolt, IconChevronDown, IconPlus, IconProjects, IconSettings, IconSync, IconTeam, IconToday, IconWork,
} from './Icons';
import { accentStyle, Avatar, Kbd, MochiOrb, Num, ProjectMark } from './ui';

type NavName = Exclude<View['name'], 'project'>;
export const NAV: { name: NavName; label: string; Icon: (p: { size?: number }) => ReactElement }[] = [
  { name: 'today', label: 'Today', Icon: IconToday },
  { name: 'work', label: 'My Work', Icon: IconWork },
  { name: 'projects', label: 'Projects', Icon: IconProjects },
  { name: 'team', label: 'Team', Icon: IconTeam },
  { name: 'activity', label: 'Activity', Icon: IconActivity },
];
const activeOf = (v: View): NavName => (v.name === 'project' ? 'projects' : v.name);

export function useNow(ms = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

export function Logo({ size = 22 }: { size?: number }) {
  return <span className="logo" style={{ width: size, height: size }} aria-hidden="true" />;
}

function TeamSwitcher({ compact = false }: { compact?: boolean }) {
  const { state, team, actions, projectOf, memberOf } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="switcher" ref={ref}>
      <button type="button" className="switcher-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox">
        <Logo />
        <span className="switcher-text">
          {!compact && <span className="switcher-app">Mochi</span>}
          <span className="switcher-team">{team.name}</span>
        </span>
        <IconChevronDown size={14} />
      </button>
      {open && (
        <div className="menu" role="listbox" aria-label="Team">
          <span className="menu-label">Teams</span>
          {state.teams.map((t) => (
            <button key={t.id} type="button" role="option" aria-selected={t.id === team.id} className={`menu-item${t.id === team.id ? ' on' : ''}`} onClick={() => { actions.setTeam(t.id); setOpen(false); }}>
              <span className="menu-marks">{t.projectIds.filter((id) => !projectOf(id).ownerId).map((id) => <ProjectMark key={id} p={projectOf(id)} size={8} />)}</span>
              <span className="menu-name">{t.name}</span>
              <span className="menu-avatars">{t.memberIds.slice(0, 4).map((id) => <Avatar key={id} m={memberOf(id)} size={16} ring />)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DropProject({ p }: { p: Project }) {
  const { ui, actions, tasks } = useStore();
  const st = projectStats(p.id, tasks);
  const active = ui.view.name === 'project' && ui.view.id === p.id;
  const drop = useDrop((id) => actions.updateTask(id, { projectId: p.id }, { announce: true }));
  return (
    <li>
      <button type="button" {...drop.props} className={`side-link${active ? ' on' : ''}${drop.over ? ' drop-over' : ''}`} style={accentStyle(p.color)} onClick={() => actions.navigate({ name: 'project', id: p.id })}>
        <ProjectMark p={p} size={10} />
        <span className="side-label">{p.name}</span>
        <span className="side-count">{Math.round(st.pct * 100)}%</span>
      </button>
    </li>
  );
}

function DropMember({ m }: { m: Member }) {
  const { actions, state } = useStore();
  const drop = useDrop((id) => actions.updateTask(id, { assigneeId: m.id }, { announce: true }));
  return (
    <button type="button" {...drop.props} className={`side-person${drop.over ? ' drop-over' : ''}`} onClick={() => actions.navigate({ name: 'team' })} title={`${m.name} · ${m.role}${m.id === state.me ? ' (you)' : ''}`}>
      <Avatar m={m} size={26} />
    </button>
  );
}

export function XpHud({ compact = false }: { compact?: boolean }) {
  const { state, ui, activity } = useStore();
  const xp = state.xp[state.me] ?? 0;
  const s = streak(activity, state.me);
  return (
    <div className={`hud${compact ? ' hud-compact' : ''}`} aria-label={`Level ${levelOf(xp)}, ${xp} XP`}>
      <span className="hud-lvl">LV {levelOf(xp)}</span>
      <span className="hud-bar"><i style={{ width: `${levelProgress(xp) * 100}%` }} /></span>
      {!compact && <span className="hud-xp"><Num value={xp % LEVEL_SIZE} />/{LEVEL_SIZE} XP</span>}
      {ui.xpBump.key > 0 && (
        <span key={ui.xpBump.key} className={`hud-float${ui.xpBump.delta < 0 ? ' neg' : ''}`} aria-hidden="true">{ui.xpBump.delta > 0 ? '+' : ''}{ui.xpBump.delta} XP</span>
      )}
      {!compact && s > 1 && <span className="hud-streak" title="Days in a row with something finished"><IconBolt size={12} />{s}d</span>}
    </div>
  );
}

export function Sidebar() {
  const { state, ui, actions, projects, members, tasks, me } = useStore();
  const now = useNow();
  const active = activeOf(ui.view);
  const counts: Partial<Record<NavName, number>> = {
    today: todayFor(tasks, me.id).filter((t) => !isDone(t)).length,
    work: tasks.filter((t) => t.assigneeId === me.id && !isDone(t)).length,
  };
  return (
    <aside className="sidebar" aria-label="Main">
      <TeamSwitcher />
      <button type="button" className="create-btn" onClick={() => actions.openComposer()}>
        <IconPlus /> Create <Kbd>C</Kbd>
      </button>
      <nav>
        <ul className="side-list">
          {NAV.map(({ name, label, Icon }) => (
            <li key={name}>
              <button type="button" className={`side-link${active === name ? ' on' : ''}`} aria-current={active === name ? 'page' : undefined} onClick={() => actions.navigate({ name })}>
                <Icon size={16} />
                <span className="side-label">{label}</span>
                {counts[name] ? <span className="side-count">{counts[name]}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="side-section">
        <span className="side-heading">Projects</span>
        <ul className="side-list">{projects.map((p) => <DropProject key={p.id} p={p} />)}</ul>
      </div>
      <div className="side-section">
        <span className="side-heading">People</span>
        <div className="side-people">{members.map((m) => <DropMember key={m.id} m={m} />)}</div>
      </div>
      <div className="side-spacer" />
      <div className="side-me">
        <button type="button" className="side-me-btn" onClick={() => actions.setSettings(true)} aria-label="Profile and settings">
          <Avatar m={me} size={30} />
          <span className="side-me-text">
            <b>{me.name}</b>
            <XpHud compact />
          </span>
          <IconSettings size={16} />
        </button>
        <button type="button" className="side-sync" onClick={actions.syncNow} disabled={!state.tengu.connected || state.tengu.syncing} title="Sync with Tengu now">
          <span className={`dot${state.tengu.connected ? ' ok' : ''}${state.tengu.syncing ? ' busy' : ''}`} />
          {state.tengu.syncing ? 'Syncing with Tengu…' : state.tengu.connected ? `Tengu · ${relativeTime(state.tengu.lastSyncedAt, now)}` : 'Tengu not connected'}
          <IconSync size={13} className={state.tengu.syncing ? 'spin' : ''} />
        </button>
      </div>
    </aside>
  );
}

export function TopBar({ title }: { title: string }) {
  const { state, actions } = useStore();
  return (
    <header className="topbar">
      <div className="topbar-mobile">
        <TeamSwitcher compact />
      </div>
      <span className="topbar-crumb">{title}</span>
      <div className="topbar-right">
        <XpHud />
        <button type="button" className={`sync-pill${state.tengu.syncing ? ' busy' : ''}`} onClick={state.tengu.connected ? actions.syncNow : () => actions.setSettings(true)} title="Tengu sync">
          <span className={`dot${state.tengu.connected ? ' ok' : ''}${state.tengu.syncing ? ' busy' : ''}`} />
          <span className="sync-pill-text">{state.tengu.syncing ? 'Syncing' : state.tengu.connected ? 'Tengu' : 'Offline'}</span>
          <IconSync size={13} className={state.tengu.syncing ? 'spin' : ''} />
        </button>
        <button type="button" className="me-mobile" onClick={() => actions.setSettings(true)} aria-label="Profile and settings">
          <Avatar m={state.members.find((m) => m.id === state.me)!} size={28} />
        </button>
      </div>
    </header>
  );
}

export function BottomNav() {
  const { ui, actions } = useStore();
  const active = activeOf(ui.view);
  const items = [NAV[0], NAV[1], null, NAV[2], NAV[3], NAV[4]];
  return (
    <nav className="bottomnav" aria-label="Main">
      {items.map((n, i) =>
        n ? (
          <button key={n.name} type="button" className={active === n.name ? 'on' : ''} aria-current={active === n.name ? 'page' : undefined} onClick={() => actions.navigate({ name: n.name })}>
            <n.Icon size={19} />
            <span>{n.label === 'My Work' ? 'Work' : n.label}</span>
          </button>
        ) : (
          <button key={i} type="button" className="bottom-create" onClick={() => actions.openComposer()} aria-label="Create task">
            <IconPlus size={20} />
          </button>
        ),
      )}
    </nav>
  );
}

function DockTarget({ label, onDrop, children, className = '' }: { label: string; onDrop: (id: string) => void; children: React.ReactNode; className?: string }) {
  const d = useDrop(onDrop);
  return (
    <div {...d.props} className={`dock-target ${className}${d.over ? ' drop-over' : ''}`} aria-label={label} title={label}>
      {children}
    </div>
  );
}

/** Appears while a task is being dragged: drop it on a date, a person, a project or a status. */
export function DragDock() {
  const { ui, actions, projects, members, state } = useStore();
  if (!ui.dragTaskId) return null;
  const task = state.tasks.find((t) => t.id === ui.dragTaskId);
  const owners = members.filter((m) => !task || state.projects.find((p) => p.id === task.projectId)?.memberIds.includes(m.id));
  const done = (id: string) => actions.setStatus(id, 'done');
  const status = (s: Status) => (id: string) => actions.setStatus(id, s);
  return (
    <div className="dock" role="region" aria-label="Drop targets">
      <div className="dock-group">
        <span className="dock-label">When</span>
        {(['today', 'tomorrow', 'nextweek'] as const).map((k) => (
          <DockTarget key={k} label={k} onDrop={(id) => actions.updateTask(id, { dueDate: dateForPreset(k, null) }, { announce: true })}>
            {k === 'today' ? 'Today' : k === 'tomorrow' ? 'Tomorrow' : 'Next week'}
          </DockTarget>
        ))}
      </div>
      <div className="dock-group">
        <span className="dock-label">Who</span>
        {owners.map((m) => (
          <DockTarget key={m.id} label={`Assign to ${m.name}`} className="dock-person" onDrop={(id) => actions.updateTask(id, { assigneeId: m.id }, { announce: true })}>
            <Avatar m={m} size={24} />
          </DockTarget>
        ))}
      </div>
      {!task?.tengu && (
        <div className="dock-group">
          <span className="dock-label">Where</span>
          {projects.map((p) => (
            <DockTarget key={p.id} label={`Move to ${p.name}`} onDrop={(id) => actions.updateTask(id, { projectId: p.id }, { announce: true })}>
              <ProjectMark p={p} size={9} /> {p.name}
            </DockTarget>
          ))}
        </div>
      )}
      <div className="dock-group">
        <DockTarget label="In review" onDrop={status('review')}>Review</DockTarget>
        <DockTarget label="Mark done" className="dock-done" onDrop={done}>Done ✓</DockTarget>
      </div>
    </div>
  );
}

export function Toasts() {
  const { ui, actions } = useStore();
  return (
    <div className="toasts" aria-live="polite">
      {ui.toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone ?? 'plain'}`}>
          <span className="toast-text">
            <b>{t.title}</b>
            {t.detail && <span>{t.detail}</span>}
          </span>
          {t.xp ? <span className="toast-xp">+{t.xp} XP</span> : null}
          {t.action && (
            <button type="button" onClick={() => { t.action!.run(); actions.dismissToast(t.id); }}>{t.action.label}</button>
          )}
        </div>
      ))}
    </div>
  );
}

export function LevelUpBanner() {
  const { ui } = useStore();
  const l = ui.levelUp;
  if (!l) return null;
  return (
    <div key={l.key} className={`levelup levelup-${l.kind}`} style={l.color ? accentStyle(l.color as never) : undefined} role="status">
      <MochiOrb size={34} mood="happy" />
      <span className="levelup-text">
        <span className="eyebrow">{l.kind === 'user' ? 'Level up' : 'Project level up'}</span>
        <b>{l.title}</b>
        <span>{l.detail}</span>
      </span>
      <span className="levelup-burst" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ ['--i' as string]: i }} />)}</span>
    </div>
  );
}
