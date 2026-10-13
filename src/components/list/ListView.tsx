import { useInitiativeViews } from '../../app/selectors';
import { useStore } from '../../app/store';
import { HEALTH_LABEL } from '../../lib/progress';
import { byZone, monthLabel, ZONE_META, ZONES } from '../../lib/roadmap';
import type { Zone } from '../../types/roadmap';
import { HEALTH_COLOR } from '../world/Building';

/** The simplest view: every initiative, ranked, in NOW / NEXT / LATER. */
export function ListView() {
  const { state, actions } = useStore();
  const views = useInitiativeViews(state);
  const edit = state.canEdit;

  return (
    <div className="listview">
      <div className="lv-head">
        <h2>Priorities</h2>
        <p>Ranked top to bottom. {edit ? 'Use the arrows to reorder, or move an initiative to another column.' : 'Click an initiative to see its work.'}</p>
      </div>
      {ZONES.map((zone) => {
        const list = byZone(state.initiatives, zone);
        return (
          <section key={zone} className={`lv-zone lv-${zone}`} aria-label={ZONE_META[zone].label}>
            <h3>
              <span>{ZONE_META[zone].emoji} {ZONE_META[zone].label}</span>
              <small>{ZONE_META[zone].tagline}</small>
            </h3>
            {list.length === 0 && <p className="lv-empty">Nothing in {ZONE_META[zone].label}.</p>}
            <ol>
              {list.map((ini, idx) => {
                const v = views[ini.id];
                const s = v.stats;
                return (
                  <li key={ini.id} className="lv-row" style={{ ['--hue' as string]: ini.hue }}>
                    <span className="lv-rank">{idx + 1}</span>
                    <button className="lv-main" onClick={() => actions.enterInitiative(ini.id)}>
                      <span className="lv-icon">{ini.icon}</span>
                      <span className="lv-name">
                        <b>{ini.name}</b>
                        <small>{ini.owner || 'No owner'} · target {monthLabel(ini.target, true)}</small>
                      </span>
                      <span className={`prio prio-${ini.priority}`}>{ini.priority}</span>
                      <span className="lv-progress">
                        <span className="lv-bar"><i style={{ width: `${s.progress}%` }} /></span>
                        <small>{s.total ? `${s.completed}/${s.total} done` : 'No work added'}</small>
                      </span>
                      <span className="lv-health" style={{ color: HEALTH_COLOR[s.health] }}>
                        ● {HEALTH_LABEL[s.health]}
                        {s.blocked > 0 && <small> · {s.blocked} blocked</small>}
                      </span>
                    </button>
                    {edit && (
                      <span className="lv-ctl">
                        <button aria-label={`Move ${ini.name} up`} disabled={idx === 0} onClick={() => actions.nudge(ini.id, -1)}>↑</button>
                        <button aria-label={`Move ${ini.name} down`} disabled={idx === list.length - 1} onClick={() => actions.nudge(ini.id, 1)}>↓</button>
                        <select
                          aria-label={`Move ${ini.name} to another column`}
                          value={zone}
                          onChange={(e) => actions.moveInitiative(ini.id, e.target.value as Zone, 99)}
                        >
                          {ZONES.map((z) => <option key={z} value={z}>{ZONE_META[z].label}</option>)}
                        </select>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      {edit && (
        <button className="btn lv-new" onClick={() => actions.openModal('new-initiative')}>+ New initiative</button>
      )}
    </div>
  );
}
