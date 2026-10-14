import { useState } from 'react';
import { useNow } from '../components/Chrome';
import { IconCloud, IconPlate, IconSync } from '../components/Icons';
import { relativeTime } from '../lib/dates';
import { useStore } from '../store/store';

export function LittleThings() {
  const { state, actions, providerLabel, providerKind } = useStore();
  const now = useNow(15_000);
  const [confirmReset, setConfirmReset] = useState(false);
  const open = state.tasks.filter((t) => !t.completed).length;
  const tg = state.tengu;
  const pending = Object.keys(state.pendingTengu).length;
  const tenguCount = state.tasks.filter((t) => t.source === 'tengu').length;
  const mineCount = state.tasks.length - tenguCount;

  return (
    <div className="page">
      <header className="page-head">
        <h1>Little things</h1>
        <p className="lede">The cozy extras: your plate, your Tengu connection, and you.</p>
      </header>

      <div className="little-grid">
        <section className="card plate-card" aria-labelledby="lt-plate">
          <div className="card-ico"><IconPlate size={22} /></div>
          <h2 id="lt-plate">What’s on my plate?</h2>
          <p>{open} open thing{open === 1 ? '' : 's'} across {state.projects.length} projects. Let Mochi pick your top three.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.setPlateOpen(true)}>Open my plate ✨</button>
        </section>

        <section className="card tengu-card" aria-labelledby="lt-tengu">
          <div className="card-ico"><IconCloud size={22} /></div>
          <h2 id="lt-tengu">Tengu connection</h2>
          <p className={`conn ${tg.connected ? 'ok' : 'off'}`}>
            <span className={`dot ${tg.connected ? 'ok' : 'off'}${tg.syncing ? ' busy' : ''}`} /> {tg.syncing ? 'Syncing...' : tg.connected ? 'Connected' : 'Not connected'}
          </p>
          <dl className="conn-facts">
            <div><dt>Last synced</dt><dd>{relativeTime(tg.lastSyncedAt, now)}</dd></div>
            <div><dt>From Tengu</dt><dd>{tenguCount} tasks</dd></div>
            <div><dt>Just yours</dt><dd>{mineCount} tasks</dd></div>
            {pending > 0 && <div><dt>Waiting to send</dt><dd>{pending} change{pending === 1 ? '' : 's'}</dd></div>}
          </dl>
          <div className="btn-row">
            {tg.connected ? (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={actions.syncNow} disabled={tg.syncing}>
                  <IconSync size={16} className={tg.syncing ? 'spin' : ''} /> {tg.syncing ? 'Syncing...' : 'Sync now'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={actions.disconnectTengu} disabled={tg.syncing}>Disconnect</button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={actions.connectTengu} disabled={tg.syncing}>
                {tg.syncing ? 'Connecting...' : 'Connect Tengu'}
              </button>
            )}
          </div>
          <div className="flow" aria-label="How tasks flow">
            <span>Tengu</span><i>↓</i><span>Integration layer</span><i>↓</i><span>Projects &amp; tasks</span><i>↓</i><span className="flow-me">Mochi ♡</span>
          </div>
          <p className="fineprint">
            Your own tasks stay here unless you choose “Add to Tengu”. Removing a Tengu task from Mochi never deletes it in Tengu.
            {providerKind === 'mock' && <><br /><b>Prototype:</b> connected to {providerLabel}, which lives in this browser. No real Tengu account is used yet.</>}
          </p>
        </section>

        <section className="card" aria-labelledby="lt-you">
          <h2 id="lt-you">About you</h2>
          <div className="field">
            <label htmlFor="lt-name">What should Mochi call you?</label>
            <input id="lt-name" value={state.character.name} maxLength={24} onChange={(e) => actions.setName(e.target.value)} />
          </div>
        </section>

        <section className="card" aria-labelledby="lt-reset">
          <h2 id="lt-reset">Start over</h2>
          <p>Bring back the sample tasks, stars and room. Handy for showing Mochi to someone.</p>
          {confirmReset ? (
            <div className="confirm-row">
              <span>Reset everything?</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmReset(false)}>Keep</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={actions.resetDemo}>Reset</button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(true)}>Reset sample data</button>
          )}
        </section>
      </div>
    </div>
  );
}
