import { useRef, useState } from 'react';
import { useInitiativeViews } from '../../app/selectors';
import { useStore } from '../../app/store';
import { HEALTH_LABEL } from '../../lib/progress';
import { addMonths, byZone, currentMonth, monthLabel, ZONE_META, ZONES } from '../../lib/roadmap';
import { HEALTH_COLOR } from '../world/Building';

const START = currentMonth();
const COLS = 6;
const months = Array.from({ length: COLS }, (_, i) => addMonths(START, i));

function monthIndex(target: string) {
  const [y, m] = target.split('-').map(Number);
  const [sy, sm] = START.split('-').map(Number);
  return (y - sy) * 12 + (m - sm);
}

const colCenter = (i: number) => ((Math.max(-0.5, Math.min(COLS - 0.5, i)) + 0.5) / COLS) * 100;
const todayPct = ((new Date().getDate() - 1) / 31 / COLS) * 100;

export function Timeline() {
  const { state, actions } = useStore();
  const views = useInitiativeViews(state);
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; startX: number; col: number; moved: boolean } | null>(null);

  const colAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.max(0, Math.min(COLS - 1, Math.floor(((clientX - r.left) / r.width) * COLS)));
  };

  return (
    <div className="timeline">
      <div className="tl-head">
        <h2>Timeline</h2>
        <p>When each initiative is aiming to land. {state.canEdit ? 'Drag one to change its target month, or click it to open.' : 'Click one to open it.'}</p>
      </div>
      <div className="tl-grid">
        <div className="tl-months">
          <div className="tl-lane-label" />
          <div className="tl-track-head">
            {months.map((m, i) => (
              <div key={m} className={`tl-month ${i === 0 ? 'is-current' : ''}`}>
                {monthLabel(m, true)}
                <small>{m.slice(0, 4)}</small>
              </div>
            ))}
          </div>
        </div>
        {ZONES.map((zone) => {
          const list = byZone(state.initiatives, zone);
          return (
            <div key={zone} className={`tl-lane tl-lane-${zone}`}>
              <div className="tl-lane-label">
                <span>{ZONE_META[zone].emoji}</span> {ZONE_META[zone].label}
              </div>
              <div className="tl-track" ref={zone === 'now' ? track : undefined} style={{ height: Math.max(1, list.length) * 64 + 16 }}>
                {months.map((m) => <div key={m} className="tl-col" />)}
                <div className="tl-today" style={{ left: `${todayPct}%` }}>{zone === 'now' && <span>Today</span>}</div>
                {list.map((ini, row) => {
                  const v = views[ini.id];
                  const idx = drag?.id === ini.id ? drag.col : monthIndex(ini.target);
                  const x = colCenter(idx);
                  const late = idx < 0 || (v.stats.lateTarget && drag?.id !== ini.id);
                  const from = Math.min(todayPct, x);
                  const width = Math.abs(x - todayPct);
                  return (
                    <div key={ini.id} className="tl-row" style={{ top: 8 + row * 64, ['--hue' as string]: ini.hue }}>
                      <div className="tl-path" style={{ left: `${from}%`, width: `${width}%` }}>
                        <i style={{ width: `${v.stats.progress}%` }} />
                      </div>
                      <button
                        className={`tl-ship ${drag?.id === ini.id && drag.moved ? 'is-dragging' : ''} ${late ? 'is-late' : ''}`}
                        style={{ left: `${x}%` }}
                        onPointerDown={(e) => {
                          if (!state.canEdit) return;
                          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                          setDrag({ id: ini.id, startX: e.clientX, col: monthIndex(ini.target), moved: false });
                        }}
                        onPointerMove={(e) => {
                          if (!drag || drag.id !== ini.id) return;
                          const moved = drag.moved || Math.abs(e.clientX - drag.startX) > 6;
                          setDrag({ ...drag, moved, col: moved ? colAt(e.clientX) : drag.col });
                        }}
                        onPointerUp={() => {
                          if (!drag) return actions.enterInitiative(ini.id);
                          if (drag.moved) {
                            const target = months[drag.col];
                            if (target !== ini.target) {
                              actions.updateInitiative(ini.id, { target });
                              actions.toast(`${ini.icon} ${ini.name} now targets ${monthLabel(target, true)}`, 'success');
                            }
                          } else actions.enterInitiative(ini.id);
                          setDrag(null);
                        }}
                        onKeyDown={(e) => {
                          if (state.canEdit && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
                            e.preventDefault();
                            actions.updateInitiative(ini.id, { target: addMonths(ini.target, e.key === 'ArrowRight' ? 1 : -1) });
                          }
                        }}
                        aria-label={`${ini.name}, target ${monthLabel(ini.target, true)}. Enter to open, arrow keys to retarget.`}
                      >
                        <span className="tl-ring" style={{ ['--p' as string]: v.stats.progress }}>
                          <span>{ini.icon}</span>
                        </span>
                        <span className="tl-ship-text">
                          <b>{ini.name}</b>
                          <small>
                            {ini.priority} · {v.stats.progress}% ·{' '}
                            <span style={{ color: HEALTH_COLOR[v.stats.health] }}>● {HEALTH_LABEL[v.stats.health]}</span>
                          </small>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
