/** Connections: the tools your worlds link to. Private quests never go through here unless you send one. */
import { useEffect, useState } from 'react';
import { INTEGRATIONS } from '../integrations';
import { relativeTime } from '../lib/dates';
import { useStore } from '../store/store';
import { useNow } from './Shell';
import { IconSync, IconX } from './Icons';
import { MochiMark, WorldCreature, worldStyle } from './ui';

export function Connections() {
  const { state, ui, actions } = useStore();
  const now = useNow(15_000);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!ui.connectionsOpen) return;
    setConfirm(false);
    const f = (e: KeyboardEvent) => e.key === 'Escape' && actions.setConnections(false);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [ui.connectionsOpen, actions]);
  if (!ui.connectionsOpen) return null;
  const local = state.worlds.filter((w) => !w.link);

  return (
    <div className="panel-layer">
      <div className="panel-backdrop" onClick={() => actions.setConnections(false)} />
      <aside className="panel" role="dialog" aria-modal="true" aria-labelledby="cx-h">
        <div className="panel-top">
          <h2 id="cx-h" className="panel-h">Connections</h2>
          <button type="button" className="icon-btn" onClick={() => actions.setConnections(false)} aria-label="Close"><IconX /></button>
        </div>
        <p className="fine">Mochi reads the quests assigned to you in these tools. Your private quests stay in Mochi. Nothing is sent to a tool unless it came from there, or you choose “Send to…”.</p>

        <div className="flowline" aria-label="How it fits together">
          <span>Tools</span><i>→</i><span>Integration layer</span><i>→</i><span>Worlds</span><i>→</i><span className="me">You</span>
        </div>

        {Object.values(INTEGRATIONS).map((p) => {
          const st = state.integrations[p.id];
          const worlds = state.worlds.filter((w) => w.link?.integrationId === p.id);
          const pend = state.pending.filter((x) => x.integrationId === p.id).length;
          return (
            <section key={p.id} className="cx">
              <div className="cx-head">
                <b>{p.label}</b>
                {p.kind === 'mock' && <span className="tag">Sample data</span>}
                <span className={`cx-state${st.connected ? ' on' : ''}`}><i className={`dot${st.syncing ? ' busy' : ''}`} />{st.syncing ? 'Syncing' : st.connected ? 'Connected' : 'Off'}</span>
              </div>
              <div className="cx-worlds">
                {worlds.map((w) => <span key={w.id} className="cx-world" style={worldStyle(w)}><WorldCreature world={w} size={20} mini />{w.name}</span>)}
              </div>
              <p className="fine">Last synced {relativeTime(st.lastSyncedAt, now)}{pend ? ` · ${pend} change${pend === 1 ? '' : 's'} waiting to send` : ''}</p>
              <div className="btn-row">
                {st.connected ? (
                  <>
                    <button type="button" className="btn btn-primary btn-sm" disabled={st.syncing} onClick={() => actions.sync(p.id)}><IconSync size={13} className={st.syncing ? 'spin' : ''} /> Sync now</button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={st.syncing} onClick={() => actions.setConnected(p.id, false)}>Disconnect</button>
                  </>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" disabled={st.syncing} onClick={() => actions.setConnected(p.id, true)}>{st.syncing ? 'Connecting…' : 'Connect'}</button>
                )}
              </div>
            </section>
          );
        })}

        <section className="cx">
          <div className="cx-head"><b>Mochi only</b><span className="cx-state on"><MochiMark size={11} /> Private</span></div>
          <div className="cx-worlds">{local.map((w) => <span key={w.id} className="cx-world" style={worldStyle(w)}><WorldCreature world={w} size={20} mini />{w.name}</span>)}</div>
          <p className="fine">These worlds aren’t linked to any tool. Everything in them is yours.</p>
        </section>

        <p className="fine"><b>Prototype:</b> Tengu and the client tool are simulated in this browser with sample data. No real accounts or APIs are used.</p>

        <section className="cx">
          <div className="cx-head"><b>Start over</b></div>
          {confirm ? (
            <span className="confirm">Reset all worlds and quests?
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={actions.resetDemo}>Reset</button>
            </span>
          ) : <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(true)}>Reset sample data</button>}
        </section>
      </aside>
    </div>
  );
}
