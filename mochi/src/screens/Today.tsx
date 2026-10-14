/** Today: a command center. Your day as a timeline, what's next, and how everything is moving. */
import { useState } from 'react';
import { ActivityLine } from '../components/ActivityLine';
import { useNow } from '../components/Shell';
import { TaskRow } from '../components/TaskRow';
import { IconArrowRight, IconCheck, IconPlay, IconPlus } from '../components/Icons';
import { accentStyle, Bar, MochiOrb, Num, pct, ProjectTag, Ring } from '../components/ui';
import { greeting, longDate, today } from '../lib/dates';
import { pickFocus } from '../lib/focus';
import { isDone, isOverdue, nextMilestone, projectLevel, projectStats, sortTasks, todayFor, weekProgress, weeklyCompletions } from '../lib/selectors';
import { useStore } from '../store/store';
import type { Task } from '../types';

export function Today() {
  const { actions, tasks, projects, activity, me, projectOf } = useStore();
  const [scope, setScope] = useState<'me' | 'team'>('me');
  const now = useNow(60_000);
  const who = scope === 'me' ? me.id : null;
  const list = todayFor(tasks, who).sort(sortTasks);
  const open = list.filter((t) => !isDone(t));
  const carried = open.filter(isOverdue);
  const scheduled = list.filter((t) => !isOverdue(t) && t.time).sort((a, b) => a.time!.localeCompare(b.time!));
  const anytime = list.filter((t) => !isOverdue(t) && !t.time);
  const projCount = new Set(open.map((t) => t.projectId)).size;

  const mineOpen = tasks.filter((t) => t.assigneeId === me.id);
  const queue = pickFocus(mineOpen, 3);
  const next = queue[0];

  const nowHM = new Date(now).toTimeString().slice(0, 5);
  const nowIndex = scheduled.findIndex((t) => t.time! > nowHM);

  const week = weekProgress(tasks, me.id);
  const chart = weeklyCompletions(activity, me.id);
  const maxBar = Math.max(4, ...chart.map((c) => c.count));
  const doneThisWeek = chart.reduce((n, c) => n + c.count, 0);

  const showWho = scope === 'team';
  const row = (t: Task, lead?: React.ReactNode) => <TaskRow key={t.id} task={t} showAssignee={showWho || t.assigneeId !== me.id} lead={lead} quietToday />;

  return (
    <div className="page today">
      <header className="page-head">
        <span className="eyebrow">{longDate()}</span>
        <h1>{greeting()}, {me.name}</h1>
        <p className="sub">
          {open.length === 0 ? (list.length ? 'Everything for today is done.' : 'Nothing due today.') : (
            <>
              <b><Num value={open.length} /></b> {open.length === 1 ? 'task' : 'tasks'} across {projCount} {projCount === 1 ? 'project' : 'projects'}
              {carried.length > 0 && <> · <span className="late">{carried.length} carried over</span></>}
            </>
          )}
        </p>
      </header>

      <div className="today-grid">
        <section className="day" aria-labelledby="day-h">
          <div className="section-head">
            <h2 id="day-h" className="eyebrow">{scope === 'me' ? 'Your day' : 'Team day'}</h2>
            <div className="seg seg-sm" role="tablist" aria-label="Whose day">
              <button type="button" role="tab" aria-selected={scope === 'me'} className={scope === 'me' ? 'on' : ''} onClick={() => setScope('me')}>Mine</button>
              <button type="button" role="tab" aria-selected={scope === 'team'} className={scope === 'team' ? 'on' : ''} onClick={() => setScope('team')}>Everyone</button>
            </div>
          </div>

          <div className="timeline">
            {carried.length > 0 && (
              <div className="tl-group">
                <span className="tl-label late">Carried over</span>
                <ul className="rows">{carried.map((t) => row(t, <span className="tl-time late">Late</span>))}</ul>
              </div>
            )}
            {scheduled.length > 0 && (
              <div className="tl-group">
                <span className="tl-label">Scheduled</span>
                <ul className="rows">
                  {scheduled.map((t, i) => (
                    <FragmentWithNow key={t.id} showNow={i === nowIndex} now={nowHM}>
                      {row(t, <span className="tl-time">{t.time}</span>)}
                    </FragmentWithNow>
                  ))}
                  {nowIndex === -1 && <NowLine now={nowHM} />}
                </ul>
              </div>
            )}
            {anytime.length > 0 && (
              <div className="tl-group">
                <span className="tl-label">Anytime today</span>
                <ul className="rows">{anytime.map((t) => row(t, <span className="tl-time">—</span>))}</ul>
              </div>
            )}
            {list.length === 0 && (
              <div className="empty">
                <MochiOrb size={36} />
                <p>Nothing due today. Plan something, or enjoy the quiet.</p>
              </div>
            )}
            <button type="button" className="add-row" onClick={() => actions.openComposer({ dueDate: today() })}>
              <IconPlus /> Add to today
            </button>
          </div>
        </section>

        <aside className="side-col">
          <section className="upnext" aria-labelledby="next-h" style={next ? accentStyle(projectOf(next.task.projectId).color) : undefined}>
            <h2 id="next-h" className="eyebrow">Up next</h2>
            {next ? (
              <>
                <p className="upnext-title">{next.task.title}</p>
                <p className="upnext-meta"><ProjectTag p={projectOf(next.task.projectId)} text={next.task.tengu?.key ?? projectOf(next.task.projectId).name} /> <span>{next.reason}</span></p>
                <div className="upnext-actions">
                  <button type="button" className="btn btn-accent" onClick={() => actions.startFocus(queue.map((q) => q.task.id))}>
                    <IconPlay size={13} /> Start focus <IconArrowRight size={14} />
                  </button>
                  <button type="button" className="btn btn-on-dark btn-icon" onClick={() => actions.setStatus(next.task.id, 'done')} aria-label={`Complete “${next.task.title}”`} title="Mark done">
                    <IconCheck />
                  </button>
                </div>
                {queue.length > 1 && (
                  <ol className="upnext-queue">
                    {queue.slice(1).map((q) => (
                      <li key={q.task.id}><button type="button" onClick={() => actions.openTask(q.task.id)}>{q.task.title}</button></li>
                    ))}
                  </ol>
                )}
              </>
            ) : (
              <div className="upnext-empty"><MochiOrb size={32} mood="happy" /><p>You’re clear. Nothing urgent is waiting on you.</p></div>
            )}
          </section>

          <section className="card" aria-labelledby="pulse-h">
            <div className="section-head">
              <h2 id="pulse-h" className="eyebrow">Project pulse</h2>
              <button type="button" className="link" onClick={() => actions.navigate({ name: 'projects' })}>All</button>
            </div>
            <ul className="pulse">
              {projects.map((p) => {
                const st = projectStats(p.id, tasks);
                const nm = nextMilestone(p, st.pct);
                return (
                  <li key={p.id} style={accentStyle(p.color)}>
                    <button type="button" onClick={() => actions.navigate({ name: 'project', id: p.id })}>
                      <span className="pulse-name">{p.name}</span>
                      <Bar value={st.pct} accent="var(--accent)" label={`${p.name} progress`} />
                      <span className="pulse-pct"><Num value={st.pct * 100} format={(n) => `${Math.round(n)}%`} /></span>
                      <span className="pulse-sub">L{projectLevel(p, st.pct)} · {nm ? `next: ${nm.name}` : 'complete'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card week" aria-labelledby="week-h">
            <div className="section-head">
              <h2 id="week-h" className="eyebrow">Your week</h2>
              <span className="muted-sm">{doneThisWeek} done</span>
            </div>
            <div className="week-body">
              <Ring value={week.pct} size={76} stroke={7} accent="var(--ink)">
                <span className="week-pct"><Num value={week.pct * 100} format={(n) => `${Math.round(n)}%`} /></span>
              </Ring>
              <div className="chart" role="img" aria-label={`Tasks completed per day this week: ${chart.map((c) => c.count).join(', ')}`}>
                {chart.map((c) => (
                  <span key={c.day} className={`chart-col${c.isToday ? ' today' : ''}${c.future ? ' future' : ''}`}>
                    <span className="chart-track"><i style={{ height: `${(c.count / maxBar) * 100}%` }} /></span>
                    <span className="chart-n">{c.future ? '' : c.count}</span>
                    <span className="chart-day">{c.label}</span>
                  </span>
                ))}
              </div>
            </div>
            <p className="muted-sm">{week.done} of {week.total} tasks due this week are done ({pct(week.pct)}).</p>
          </section>

          <section className="card" aria-labelledby="live-h">
            <div className="section-head">
              <h2 id="live-h" className="eyebrow"><span className="live-dot" /> Team activity</h2>
              <button type="button" className="link" onClick={() => actions.navigate({ name: 'activity' })}>All</button>
            </div>
            <ul className="feed feed-compact">{activity.slice(0, 5).map((a) => <ActivityLine key={a.id} a={a} />)}</ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function NowLine({ now }: { now: string }) {
  return (
    <li className="now-line" aria-label={`Now, ${now}`}>
      <span className="tl-time">{now}</span>
      <i />
    </li>
  );
}

function FragmentWithNow({ showNow, now, children }: { showNow: boolean; now: string; children: React.ReactNode }) {
  return (
    <>
      {showNow && <NowLine now={now} />}
      {children}
    </>
  );
}
