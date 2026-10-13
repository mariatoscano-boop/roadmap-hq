import { useMemo } from 'react';
import { useInitiativeViews } from '../../app/selectors';
import { useStore } from '../../app/store';
import { useMedia } from '../../app/useMedia';
import { HEALTH_LABEL } from '../../lib/progress';
import { addMonths, monthLabel, ZONE_META, ZONES } from '../../lib/roadmap';
import type { InitiativeStatus, StrategicPriority } from '../../types/roadmap';
import type { StatusRole, TenguTicket } from '../../types/tengu';
import { MissionCard } from '../tickets/MissionCard';
import { HEALTH_COLOR } from '../world/Building';

const RING_ORDER: StatusRole[] = ['blocked', 'sentback', 'started', 'review', 'available', 'planning', 'shipping', 'done', 'live'];
const PRIORITIES: StrategicPriority[] = ['P0', 'P1', 'P2', 'P3'];
const STATUSES: InitiativeStatus[] = ['Discovery', 'Planning', 'In Progress', 'Paused', 'Shipped'];

function lineClass(t: TenguTicket) {
  if (['done', 'shipping', 'live'].includes(t.statusRole)) return 'link-done';
  if (t.statusRole === 'blocked') return 'link-blocked';
  if (['started', 'review', 'sentback'].includes(t.statusRole)) return 'link-active';
  return 'link-idle';
}

export function InitiativeView() {
  const { state, actions } = useStore();
  const views = useInitiativeViews(state);
  const view = state.activeInitiative ? views[state.activeInitiative] : null;
  const asList = useMedia('(max-width: 820px)');

  const months = useMemo(() => Array.from({ length: 9 }, (_, i) => addMonths('2026-09', i)), []);

  if (!view) return null;
  const { initiative: ini, stats } = view;
  const tickets = [...view.tickets].sort((a, b) => RING_ORDER.indexOf(a.statusRole) - RING_ORDER.indexOf(b.statusRole));
  const n = tickets.length;
  const now = Date.now();

  // Constellation geometry (percent of the stage). Past 12 missions the tree reads better.
  const dense = n > 8;
  const positions = tickets.map((_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * (dense ? 40 : 39), y: 50 + Math.sin(a) * (dense ? 41 : 38) };
  });

  const R = 62;
  const C = 2 * Math.PI * R;
  const update = actions.updateInitiative.bind(null, ini.id);

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
        </nav>

        <div className="ini-title-row">
          <span className="ini-icon">{ini.icon}</span>
          <div className="ini-title">
            <h1>{ini.name}</h1>
            <p>{ini.summary}</p>
          </div>
          <div className="ini-health" style={{ ['--hc' as string]: HEALTH_COLOR[stats.health] }}>
            <i />
            {HEALTH_LABEL[stats.health]}
          </div>
        </div>

        <div className="ini-controls">
          <label className="ctl">
            <span>Priority</span>
            <select value={ini.priority} onChange={(e) => update({ priority: e.target.value as StrategicPriority })}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="ctl">
            <span>Status</span>
            <select value={ini.status} onChange={(e) => update({ status: e.target.value as InitiativeStatus })}>
              {STATUSES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </label>
          <label className="ctl">
            <span>Target</span>
            <select value={ini.target} onChange={(e) => update({ target: e.target.value })}>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m, true)} {m.slice(0, 4)}</option>)}
            </select>
          </label>
          <div className="ctl ctl-static"><span>Owner</span><b>{ini.owner}</b></div>
          <div className="zone-switch" role="radiogroup" aria-label="Roadmap zone">
            {ZONES.map((z) => (
              <button
                key={z}
                role="radio"
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
            <b>{stats.completed} / {stats.total}</b> completed
            <span className="pct">{stats.progress}%</span>
            {stats.blocked > 0 && <span className="flag flag-red">{stats.blocked} blocked</span>}
            {stats.overdue > 0 && <span className="flag flag-amber">{stats.overdue} overdue</span>}
            {stats.unassigned > 0 && <span className="flag">{stats.unassigned} unassigned</span>}
            <span className="grow" />
            <button className="btn btn-ghost" onClick={() => actions.openModal('create', ini.id)}>+ Create Tengu ticket</button>
            <button className="btn btn-primary" onClick={() => actions.openModal('link', ini.id)}>🔗 Link Tengu ticket</button>
          </div>
        </div>
      </header>

      {n === 0 ? (
        <div className="empty-building">
          <div className="empty-crane" aria-hidden>🏗</div>
          <h3>This building has no floors yet</h3>
          <p>Link Tengu tickets and each one becomes a floor of {ini.name}.</p>
          <button className="btn btn-primary" onClick={() => actions.openModal('link', ini.id)}>🔗 Link Tengu tickets</button>
        </div>
      ) : asList || n > 12 ? (
        <div className="tree">
          <div className="tree-root">{ini.icon} {ini.name.toUpperCase()} · {stats.progress}%</div>
          {tickets.map((t, i) => (
            <div key={t.id} className={`tree-branch ${lineClass(t)}`}>
              <MissionCard
                ticket={t}
                index={i}
                selected={state.activeTicket === t.id}
                justCompleted={now - (state.justCompleted[t.id] ?? 0) < 2600}
                remote={now - (state.remotePulse[t.id] ?? 0) < 6000}
                onOpen={actions.openTicket}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={`constellation ${dense ? 'is-dense' : ''}`}>
          <svg className="links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {tickets.map((t, i) => {
              const p = positions[i];
              const mx = (50 + p.x) / 2 + (p.y - 50) * 0.12;
              const my = (50 + p.y) / 2 - (p.x - 50) * 0.12;
              return (
                <path
                  key={t.id}
                  className={`link ${lineClass(t)} ${state.activeTicket === t.id ? 'is-on' : ''}`}
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
              <circle
                cx="80"
                cy="80"
                r={R}
                className="core-ring"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - stats.progress / 100)}
              />
            </svg>
            <div className="core-inner">
              <span className="core-icon">{ini.icon}</span>
              <b>{stats.progress}%</b>
              <span>{stats.completed} / {stats.total} done</span>
            </div>
          </div>
          {tickets.map((t, i) => (
            <MissionCard
              key={t.id}
              ticket={t}
              index={i}
              selected={state.activeTicket === t.id}
              justCompleted={now - (state.justCompleted[t.id] ?? 0) < 2600}
              remote={now - (state.remotePulse[t.id] ?? 0) < 6000}
              style={{ left: `${positions[i].x}%`, top: `${positions[i].y}%` }}
              onOpen={actions.openTicket}
            />
          ))}
        </div>
      )}
    </div>
  );
}
