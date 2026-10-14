/** My Work: what's on me, what's next, what I'm waiting on, and what I finished. */
import { useState } from 'react';
import { TaskRow } from '../components/TaskRow';
import { MochiOrb, Num, ProjectMark } from '../components/ui';
import { daysFromToday, localDayOf, startOfWeek } from '../lib/dates';
import { isDone, sortTasks, todayFor } from '../lib/selectors';
import { useStore } from '../store/store';
import type { Task } from '../types';

type Tab = 'today' | 'next' | 'waiting' | 'done';

export function MyWork() {
  const { tasks, projects, me } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const mine = tasks.filter((t) => t.assigneeId === me.id);
  const lists: Record<Tab, Task[]> = {
    today: todayFor(tasks, me.id).filter((t) => !isDone(t)),
    next: mine.filter((t) => !isDone(t) && (!t.dueDate || daysFromToday(t.dueDate) > 0)),
    waiting: tasks.filter((t) => t.createdBy === me.id && t.assigneeId !== me.id && !isDone(t)),
    done: mine.filter((t) => isDone(t) && t.completedAt && localDayOf(t.completedAt) >= startOfWeek()),
  };
  const tiles: { key: Tab; label: string; caption: string }[] = [
    { key: 'today', label: 'Today', caption: 'due today or carried over' },
    { key: 'next', label: 'Up next', caption: 'later this week and beyond' },
    { key: 'waiting', label: 'Waiting on', caption: 'handed off to teammates' },
    { key: 'done', label: 'Completed', caption: 'this week' },
  ];
  const list = lists[tab].sort(sortTasks);
  const groups = projects.map((p) => ({ p, items: list.filter((t) => t.projectId === p.id) })).filter((g) => g.items.length);

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">My work</span>
        <h1>Everything on your plate</h1>
        <p className="sub">{mine.filter((t) => !isDone(t)).length} open tasks · {lists.waiting.length} waiting on teammates</p>
      </header>

      <div className="tiles" role="tablist" aria-label="My work">
        {tiles.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={`tile-stat${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
            <span className="eyebrow">{t.label}</span>
            <span className="tile-num"><Num value={lists[t.key].length} /></span>
            <span className="tile-cap">{t.caption}</span>
          </button>
        ))}
      </div>

      <section aria-label={tiles.find((t) => t.key === tab)!.label}>
        {groups.length === 0 ? (
          <div className="empty"><MochiOrb size={36} mood="happy" /><p>{tab === 'waiting' ? 'Nothing handed off right now.' : tab === 'done' ? 'Nothing finished yet this week. Soon.' : 'All clear here.'}</p></div>
        ) : (
          groups.map(({ p, items }) => (
            <div key={p.id} className="group">
              <h3 className="group-head"><ProjectMark p={p} size={9} /> {p.name} <span className="muted-sm">{items.length}</span></h3>
              <ul className="rows">{items.map((t) => <TaskRow key={t.id} task={t} showAssignee={tab === 'waiting'} />)}</ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
