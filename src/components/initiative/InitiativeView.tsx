import { useMemo, useState } from 'react';
import { timeAgo, useInitiativeViews } from '../../app/selectors';
import { useStore } from '../../app/store';
import { useMedia } from '../../app/useMedia';
import { HEALTH_LABEL, type InitiativeStats } from '../../lib/progress';
import { addMonths, currentMonth, monthLabel, ZONE_META, ZONES } from '../../lib/roadmap';
import type { InitiativeStatus, Mission, StrategicPriority } from '../../types/roadmap';
import type { StatusRole } from '../../types/tengu';
import { MissionCard } from '../tickets/MissionCard';
import { HEALTH_COLOR } from '../world/Building';

const RING_ORDER: StatusRole[] = ['blocked', 'sentback', 'started', 'review', 'available', 'planning', 'shipping', 'done', 'live', 'closed'];
const PRIORITIES: StrategicPriority[] = ['P0', 'P1', 'P2', 'P3'];
const STATUSES: InitiativeStatus[] = ['Discovery', 'Planning', 'In Progress', 'Paused', 'Shipped'];

function lineClass(m: Mission) {
  if (['done', 'shipping', 'live'].includes(m.role)) return 'link-done';
  if (m.role === 'blocked') return 'link-blocked';
  if (['started', 'review', 'sentback'].includes(m.role)) return 'link-active';
  return 'link-idle';
}

export function InitiativeView() {
  const { state, actions } = useStore();
  const views = useInitiativeViews(state);
  const view = state.activeInitiative ? views[state.activeInitiative] : null;
  const asList = useMedia('(max-width: 820px)');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => addMonths(currentMonth(), i - 2)), []);

  if (!view) return null;
  const { initiative: ini, stats } = view;
  const missions = [...view.missions].sort((a, b) => RING_ORDER.indexOf(a.role) - RING_ORDER.indexOf(b.role));
  const n = missions.length;
  const now = Date.now();
  const edit = state.canEdit;
  const update = actions.updateInitiative.bind(null, ini.id);
  const monthOptions = months.includes(ini.target) ? months : [ini.target, ...months];

  const dense = n > 8;
  const positions = missions.map((_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * (dense ? 40 : 39), y: 50 + Math.sin(a) * (dense ? 41 : 38) };
  });
  const R = 62;
  const C = 2 * Math.PI * R;
  const who = ini.updatedBy ? state.names[ini.updatedBy] : null;

  const card = (m: Mission, i: number, style?: React.CSSProperties) => (
    <MissionCard
      key={m.id}
      mission={m}
      index={i}
      selected={state.activeItem === m.id}
      justCompleted={now - (state.justCompleted[m.id] ?? 0) < 2600}
      remote={now - (state.remotePulse[m.id] ?? 0) < 6000}
      style={style}
      onOpen={actions.openItem}
    />
  );

  return (
    <div className="initiative" style={{ ['--hue' as string]: ini.hue }} role="dialog" aria-label={`${ini.name} — ${ini.place}`}>
      <div className="initiative-bg" aria-hidden />
      <header className="ini-header">
        <nav className="crumbs">
          <button className="back" onClick={() => actions.enterInitiative(null)} aria-label="Back to Product HQ">
            ← <span>PRODUCT HQ</span>
          </button>
          <span className="crumb-sep">/</span>
          <span className="crumb-here">{ini.place.toUpperCase()}</span>
          <kbd className="esc">Esc</kbd>
          {ini.updatedAt && <span className="crumb-updated">Updated {who ? `by ${who} ` : ''}{timeAgo(ini.updatedAt)}</span>}
        </nav>

        <div className="ini-title-row">
          <span className="ini-icon">{ini.icon}</span>
          <div className="ini-title">
            <h1>{ini.name}</h1>
            <p>{ini.summary}</p>
          </div>
          <div className="ini-health" style={{ ['--hc' as string]: HEALTH_COLOR[stats.health] }} title={healthReason(stats)}>
            <i />
            {HEALTH_LABEL[stats.health]}
          </div>
        </div>

        <div className="ini-controls">
          <label className="ctl">
            <span>Priority</span>
            <select disabled={!edit} value={ini.priority} onChange={(e) => update({ priority: e.target.value as StrategicPriority })}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="ctl">
            <span>Status</span>
            <select disabled={!edit} value={ini.status} onChange={(e) => update({ status: e.target.value as InitiativeStatus })}>
              {STATUSES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="ctl">
            <span>Target</span>
            <select disabled={!edit} value={ini.target} onChange={(e) => update({ target: e.target.value })}>
              {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m, true)} {m.slice(0, 4)}</option>)}
            </select>
          </label>
          <label className="ctl">
            <span>Owner</span>
            <input
              key={ini.owner}
              disabled={!edit}
              defaultValue={ini.owner}
              placeholder="Who owns this?"
              onBlur={(e) => e.target.value.trim() !== ini.owner && update({ owner: e.target.value.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </label>
          <div className="zone-switch" role="radiogroup" aria-label="Roadmap zone">
            {ZONES.map((z) => (
              <button
                key={z}
                role="radio"
                disabled={!edit}
                aria-checked={ini.zone === z}
                className={`zone-${z} ${ini.zone === z ? 'on' : ''}`}
                onClick={() => ini.zone !== z && actions.moveInitiative(ini.id, z, 99)}
              >
                {ZONE_META[z].emoji} {ZONE_META[z].label}
              </button>
            ))}
          </div>
        </div>

        <div className="ini-progress">
          <div className="big-bar"><i style={{ width: `${stats.progress}%` }} /></div>
          <div className="ini-progress-meta">
            <b>{stats.completed} / {stats.total}</b> done
            <span className="pct">{stats.progress}%</span>
            {stats.blocked > 0 && <span className="flag flag-red">{stats.blocked} blocked</span>}
            {stats.overdue > 0 && <span className="flag flag-amber">{stats.overdue} overdue</span>}
            {stats.unassigned > 0 && <span className="flag">{stats.unassigned} without owner</span>}
            <span className="grow" />
            {edit && (confirmDelete ? (
              <span className="confirm">
                Remove {ini.name} and its {n} item{n === 1 ? '' : 's'} from the roadmap?
                <button className="btn btn-sm btn-danger" onClick={() => actions.deleteInitiative(ini.id)}>Remove</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>Keep</button>
              </span>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(true)}>Remove initiative</button>
            ))}
            {edit && <button className="btn btn-primary" onClick={() => actions.openModal('add', ini.id)}>+ Add work</button>}
          </div>
        </div>
      </header>

      {n === 0 ? (
        <div className="empty-building">
          <div className="empty-crane" aria-hidden>🏗</div>
          <h3>No work here yet</h3>
          <p>Add the pieces of work that make up {ini.name}. Link them to Tengu tickets, or keep them as simple roadmap items.</p>
          {edit && <button className="btn btn-primary" onClick={() => actions.openModal('add', ini.id)}>+ Add work</button>}
        </div>
      ) : asList || n > 12 ? (
        <div className="tree">
          <div className="tree-root">{ini.icon} {ini.name.toUpperCase()} · {stats.progress}%</div>
          {missions.map((m, i) => (
            <div key={m.id} className={`tree-branch ${lineClass(m)}`}>{card(m, i)}</div>
          ))}
        </div>
      ) : (
        <div className={`constellation ${dense ? 'is-dense' : ''}`}>
          <svg className="links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {missions.map((m, i) => {
              const p = positions[i];
              const mx = (50 + p.x) / 2 + (p.y - 50) * 0.12;
              const my = (50 + p.y) / 2 - (p.x - 50) * 0.12;
              return (
                <path
                  key={m.id}
                  className={`link ${lineClass(m)} ${state.activeItem === m.id ? 'is-on' : ''}`}
                  d={`M ${p.x} ${p.y} Q ${mx} ${my} 50 50`}
                  vectorEffect="non-scaling-stroke"
                  style={{ ['--i' as string]: i }}
                />
              );
            })}
          </svg>
          <div className="core">
            <svg viewBox="0 0 160 160" aria-hidden>
              <circle cx="80" cy="80" r={R} className="core-track" />
              <circle cx="80" cy="80" r={R} className="core-ring" strokeDasharray={C} strokeDashoffset={C * (1 - stats.progress / 100)} />
            </svg>
            <div className="core-inner">
              <span className="core-icon">{ini.icon}</span>
              <b>{stats.progress}%</b>
              <span>{stats.completed} / {stats.total} done</span>
            </div>
          </div>
          {missions.map((m, i) => card(m, i, { left: `${positions[i].x}%`, top: `${positions[i].y}%` }))}
        </div>
      )}
    </div>
  );
}

function healthReason(s: InitiativeStats) {
  const r = [];
  if (s.blocked) r.push(`${s.blocked} blocked`);
  if (s.overdue) r.push(`${s.overdue} overdue`);
  if (s.lateTarget) r.push('past its target month');
  if (s.unassigned >= 2) r.push(`${s.unassigned} without an owner`);
  return r.length ? r.join(' · ') : 'Nothing blocked or overdue';
}
