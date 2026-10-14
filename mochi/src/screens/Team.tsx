/** Team: who's moving what. Pulse per person, then active / blocked / upcoming work. */
import { useState } from 'react';
import { TaskRow } from '../components/TaskRow';
import { accentStyle, Avatar, Bar, Num } from '../components/ui';
import { daysFromToday } from '../lib/dates';
import { isDone, levelOf, memberPulse, sortTasks } from '../lib/selectors';
import { useStore } from '../store/store';

export function Team() {
  const { state, team, tasks, members } = useStore();
  const [who, setWho] = useState<string | null>(null);
  const pulse = memberPulse(members, tasks);
  const scoped = tasks.filter((t) => !who || t.assigneeId === who);
  const active = scoped.filter((t) => t.status === 'progress' || t.status === 'review').sort(sortTasks);
  const blocked = scoped.filter((t) => t.status === 'blocked').sort(sortTasks);
  const upcoming = scoped.filter((t) => t.status === 'todo' && t.dueDate && daysFromToday(t.dueDate) >= 0 && daysFromToday(t.dueDate) <= 7).sort(sortTasks);
  const weekAll = pulse.reduce((a, p) => ({ done: a.done + p.done, total: a.total + p.total }), { done: 0, total: 0 });

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow">{team.name}</span>
        <h1>Team pulse</h1>
        <p className="sub">{weekAll.done} of {weekAll.total} tasks this week are done · {tasks.filter((t) => t.status === 'blocked').length} blocked</p>
      </header>

      <section className="card team-pulse" aria-label="Team pulse">
        {pulse.map((p) => (
          <button key={p.member.id} type="button" className={`tp-row${who === p.member.id ? ' on' : ''}`} style={accentStyle(p.member.color)} onClick={() => setWho((w) => (w === p.member.id ? null : p.member.id))} aria-pressed={who === p.member.id}>
            <Avatar m={p.member} size={34} />
            <span className="tp-name"><b>{p.member.name}{p.member.id === state.me ? ' (you)' : ''}</b><small>{p.member.role} · LV {levelOf(state.xp[p.member.id] ?? 0)}</small></span>
            <span className="tp-bar"><Bar value={p.pct} accent="var(--accent)" height={8} label={`${p.member.name} this week`} /></span>
            <span className="tp-pct"><Num value={p.pct * 100} format={(n) => `${Math.round(n)}%`} /></span>
            <span className="tp-counts">
              <span><b>{p.active}</b> active</span>
              <span className={p.blocked ? 'warn' : ''}><b>{p.blocked}</b> blocked</span>
            </span>
          </button>
        ))}
      </section>
      {who && <p className="sub">Showing {members.find((m) => m.id === who)?.name}’s work. <button type="button" className="link" onClick={() => setWho(null)}>Show everyone</button></p>}

      <div className="lanes">
        {[
          { key: 'active', label: 'Active', items: active, empty: 'Nothing in progress.' },
          { key: 'blocked', label: 'Blocked', items: blocked, empty: 'Nothing blocked. Nice.' },
          { key: 'upcoming', label: 'Upcoming', items: upcoming, empty: 'Nothing due in the next 7 days.' },
        ].map((l) => (
          <section key={l.key} className={`lane lane-${l.key}`} aria-label={l.label}>
            <h2 className="eyebrow">{l.label} <span className="muted-sm">{l.items.length}</span></h2>
            {l.items.length ? <ul className="rows">{l.items.map((t) => <TaskRow key={t.id} task={t} />)}</ul> : <p className="muted-sm lane-empty">{l.empty}</p>}
          </section>
        ))}
      </div>
      <p className="muted-sm">{tasks.filter((t) => isDone(t)).length} tasks done in total across {team.name}.</p>
    </div>
  );
}
