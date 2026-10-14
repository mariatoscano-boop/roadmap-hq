/** Activity: everything the team did, grouped by day, with a 4-week completion heatmap. */
import { useState } from 'react';
import { ActivityLine } from '../components/ActivityLine';
import { Avatar } from '../components/ui';
import { addDays, daysFromToday, localDayOf, parseISO, startOfWeek, today } from '../lib/dates';
import { useStore } from '../store/store';
import type { ActivityVerb } from '../types';

const FILTERS: { key: 'all' | ActivityVerb; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'created', label: 'Created' },
  { key: 'moved', label: 'Moved' },
  { key: 'assigned', label: 'Assigned' },
];

function dayName(day: string) {
  const n = daysFromToday(day);
  if (n === 0) return 'Today';
  if (n === -1) return 'Yesterday';
  return parseISO(day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function ActivityView() {
  const { activity, members } = useStore();
  const [verb, setVerb] = useState<'all' | ActivityVerb>('all');
  const [who, setWho] = useState<string | null>(null);
  const list = activity.filter((a) => (verb === 'all' || a.verb === verb) && (!who || a.actorId === who));
  const days = [...new Set(list.map((a) => localDayOf(a.at)))];

  // Heatmap: last 4 weeks, Monday-first.
  const start = addDays(startOfWeek(), -21);
  const cells = Array.from({ length: 28 }, (_, i) => {
    const d = addDays(start, i);
    return { d, n: activity.filter((a) => a.verb === 'completed' && (!who || a.actorId === who) && localDayOf(a.at) === d).length, future: d > today() };
  });
  const max = Math.max(1, ...cells.map((c) => c.n));

  return (
    <div className="page">
      <header className="page-head">
        <span className="eyebrow"><span className="live-dot" /> Live</span>
        <h1>Activity</h1>
        <p className="sub">{activity.filter((a) => localDayOf(a.at) === today()).length} updates today across the team</p>
      </header>

      <section className="card heat" aria-label="Completions over the last 4 weeks">
        <div className="section-head">
          <h2 className="eyebrow">Completions · 4 weeks</h2>
          <span className="muted-sm">{cells.reduce((n, c) => n + c.n, 0)} total</span>
        </div>
        <div className="heat-grid">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <span key={i} className="heat-day">{l}</span>)}
          {cells.map((c) => (
            <span key={c.d} className={`heat-cell${c.future ? ' future' : ''}${c.d === today() ? ' today' : ''}`} style={{ ['--k' as string]: c.n / max }} title={`${c.d}: ${c.n} completed`} />
          ))}
        </div>
      </section>

      <div className="filters">
        <div className="chips" role="tablist" aria-label="Type">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={verb === f.key} className={`chip chip-sm${verb === f.key ? ' on' : ''}`} onClick={() => setVerb(f.key)}>{f.label}</button>
          ))}
        </div>
        <div className="people-filter" aria-label="Person">
          {members.map((m) => (
            <button key={m.id} type="button" className={who === m.id ? 'on' : ''} aria-pressed={who === m.id} onClick={() => setWho((w) => (w === m.id ? null : m.id))} title={m.name}>
              <Avatar m={m} size={26} />
            </button>
          ))}
        </div>
      </div>

      {days.length === 0 && <div className="empty"><p>No activity matches.</p></div>}
      {days.map((d) => (
        <section key={d} className="day-group" aria-label={dayName(d)}>
          <h2 className="eyebrow">{dayName(d)}</h2>
          <ul className="feed">{list.filter((a) => localDayOf(a.at) === d).map((a) => <ActivityLine key={a.id} a={a} />)}</ul>
        </section>
      ))}
    </div>
  );
}
