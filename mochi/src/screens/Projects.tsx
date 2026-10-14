/** Projects as visual objects: a task mosaic cover, progress, people, milestones and activity. */
import { useState } from 'react';
import { ActivityLine } from '../components/ActivityLine';
import { useDrop } from '../components/dnd';
import { Mosaic } from '../components/Mosaic';
import { TaskRow } from '../components/TaskRow';
import { IconBack, IconBoard, IconCloud, IconList, IconLock, IconPlus } from '../components/Icons';
import { accentStyle, Avatar, AvatarStack, Bar, Due, Num, PriorityIcon, StatusIcon } from '../components/ui';
import { bucketOf } from '../lib/dates';
import { isDone, nextMilestone, projectLevel, projectStats, sortTasks, STATUS_LABEL, STATUS_ORDER } from '../lib/selectors';
import { useStore } from '../store/store';
import type { Project, Status, Task } from '../types';

function Source({ p }: { p: Project }) {
  return p.source === 'tengu'
    ? <span className="src-tag"><IconCloud size={12} /> Synced with Tengu</span>
    : <span className="src-tag"><IconLock size={12} /> Private</span>;
}

export function Projects() {
  const { actions, projects, tasks, memberOf } = useStore();
  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">Projects</span>
        <h1>{projects.length} projects in motion</h1>
        <p className="sub">Each tile is a task. Covers fill in as work gets done.</p>
      </header>
      <div className="pgrid">
        {projects.map((p) => {
          const mine = tasks.filter((t) => t.projectId === p.id);
          const st = projectStats(p.id, tasks);
          const nm = nextMilestone(p, st.pct);
          return (
            <button key={p.id} type="button" className="pcard" style={accentStyle(p.color)} onClick={() => actions.navigate({ name: 'project', id: p.id })}>
              <span className="pcard-cover"><Mosaic tasks={mine} cols={10} size={12} gap={4} /></span>
              <span className="pcard-body">
                <span className="pcard-top">
                  <b className="pcard-name">{p.name}</b>
                  <span className="lvl-pill">L{projectLevel(p, st.pct)}</span>
                </span>
                <span className="pcard-pct"><Num value={st.pct * 100} format={(n) => `${Math.round(n)}%`} /> <small>complete</small></span>
                <Bar value={st.pct} accent="var(--accent)" />
                <span className="pcard-stats">
                  <span><b>{st.total}</b> tasks</span>
                  <span><b>{st.done}</b> done</span>
                  <span><b>{st.progress + st.review}</b> active</span>
                  {st.blocked > 0 && <span className="warn"><b>{st.blocked}</b> blocked</span>}
                </span>
                <span className="pcard-foot">
                  <AvatarStack members={p.memberIds.map(memberOf)} size={22} />
                  <span className="muted-sm">{nm ? `Next: ${nm.name}` : 'All milestones reached'}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BoardColumn({ status, items }: { status: Status; items: Task[] }) {
  const { actions, memberOf } = useStore();
  const drop = useDrop((id) => actions.setStatus(id, status));
  return (
    <div {...drop.props} className={`col${drop.over ? ' drop-over' : ''}`}>
      <div className="col-head"><StatusIcon status={status} size={14} /> {STATUS_LABEL[status]} <span className="muted-sm">{items.length}</span></div>
      <ul className="col-list">
        {items.map((t) => (
          <li
            key={t.id}
            className={`bcard${t.status === 'done' ? ' is-done' : ''}`}
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); actions.setDrag(t.id); }}
            onDragEnd={() => actions.setDrag(null)}
          >
            <button type="button" onClick={() => actions.openTask(t.id)}>
              <span className="bcard-key">{t.tengu?.key ?? 'Private'}</span>
              <span className="bcard-title">{t.title}</span>
              <span className="bcard-meta">
                {(t.priority === 'high' || t.priority === 'urgent') && <PriorityIcon p={t.priority} />}
                <Due t={t} />
                <Avatar m={memberOf(t.assigneeId)} size={20} />
              </span>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="col-empty">Drop here</li>}
      </ul>
    </div>
  );
}

export function ProjectDetail({ id }: { id: string }) {
  const { actions, projects, tasks, activity, memberOf } = useStore();
  const [view, setView] = useState<'board' | 'list'>('board');
  const p = projects.find((x) => x.id === id);
  if (!p) {
    return (
      <div className="page">
        <button type="button" className="back" onClick={() => actions.navigate({ name: 'projects' })}><IconBack /> Projects</button>
        <div className="empty"><p>This project isn’t in this team.</p></div>
      </div>
    );
  }
  const mine = tasks.filter((t) => t.projectId === p.id).sort(sortTasks);
  const st = projectStats(p.id, tasks);
  const lvl = projectLevel(p, st.pct);
  const feed = activity.filter((a) => a.projectId === p.id).slice(0, 8);
  const buckets: { key: string; label: string; items: Task[] }[] = [
    { key: 'overdue', label: 'Overdue', items: mine.filter((t) => !isDone(t) && bucketOf(t.dueDate) === 'overdue') },
    { key: 'week', label: 'This week', items: mine.filter((t) => !isDone(t) && ['today', 'week'].includes(bucketOf(t.dueDate))) },
    { key: 'later', label: 'Later', items: mine.filter((t) => !isDone(t) && ['later', 'someday'].includes(bucketOf(t.dueDate))) },
    { key: 'done', label: 'Done', items: mine.filter(isDone) },
  ];

  return (
    <div className="page project" style={accentStyle(p.color)}>
      <button type="button" className="back" onClick={() => actions.navigate({ name: 'projects' })}><IconBack /> Projects</button>

      <header className="phero">
        <div className="phero-text">
          <span className="phero-tags"><span className="lvl-pill">Level {lvl}</span><Source p={p} /></span>
          <h1>{p.name}</h1>
          <p className="sub">{p.blurb}</p>
          <div className="phero-pct">
            <span className="big-pct"><Num value={st.pct * 100} format={(n) => `${Math.round(n)}%`} /></span>
            <span className="eyebrow">complete</span>
          </div>
          <Bar value={st.pct} accent="var(--accent)" height={8} label={`${p.name} progress`} />
          <div className="phero-team">
            <span className="eyebrow">Team</span>
            {p.memberIds.map((mid) => <span key={mid} className="phero-person"><Avatar m={memberOf(mid)} size={24} /> {memberOf(mid).name}</span>)}
          </div>
        </div>
        <div className="phero-cover"><Mosaic tasks={mine} cols={8} size={18} gap={5} /></div>
      </header>

      <div className="stats-row">
        <div><span className="stat-n"><Num value={st.total} /></span><span className="eyebrow">Tasks</span></div>
        <div><span className="stat-n"><Num value={st.done} /></span><span className="eyebrow">Completed</span></div>
        <div><span className="stat-n"><Num value={st.progress + st.review} /></span><span className="eyebrow">In progress</span></div>
        <div><span className="stat-n"><Num value={st.upcoming} /></span><span className="eyebrow">Upcoming</span></div>
        {st.blocked > 0 && <div className="warn"><span className="stat-n"><Num value={st.blocked} /></span><span className="eyebrow">Blocked</span></div>}
      </div>

      <section className="milestones" aria-label="Milestones">
        <div className="ms-track">
          <i className="ms-fill" style={{ width: `${st.pct * 100}%` }} />
          {p.milestones.map((m) => (
            <span key={m.id} className={`ms${st.pct >= m.at - 1e-9 ? ' reached' : ''}`} style={{ left: `${m.at * 100}%` }}>
              <span className="ms-dot" />
              <span className="ms-label">{m.name}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="section-head">
        <div className="seg seg-sm" role="tablist" aria-label="View">
          <button type="button" role="tab" aria-selected={view === 'board'} className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}><IconBoard size={14} /> Board</button>
          <button type="button" role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><IconList size={14} /> List</button>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.openComposer({ projectId: p.id })}><IconPlus size={14} /> New {p.name} task</button>
      </div>

      <div className="project-body">
        {view === 'board' ? (
          <div className="board">
            {STATUS_ORDER.map((s) => <BoardColumn key={s} status={s} items={mine.filter((t) => t.status === s)} />)}
          </div>
        ) : (
          <div className="plist">
            {buckets.filter((b) => b.items.length).map((b) => (
              <div key={b.key} className="group">
                <h3 className={`group-head${b.key === 'overdue' ? ' late' : ''}`}>{b.label} <span className="muted-sm">{b.items.length}</span></h3>
                <ul className="rows">{b.items.map((t) => <TaskRow key={t.id} task={t} showProject={false} />)}</ul>
              </div>
            ))}
          </div>
        )}
        <aside className="card project-feed">
          <h2 className="eyebrow"><span className="live-dot" /> Activity</h2>
          {feed.length ? <ul className="feed feed-compact">{feed.map((a) => <ActivityLine key={a.id} a={a} />)}</ul> : <p className="muted-sm">No activity yet.</p>}
        </aside>
      </div>
    </div>
  );
}
