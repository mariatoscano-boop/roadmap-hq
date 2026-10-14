/** Profile, progress, "switch person" (prototype), Tengu connection and reset. Lives apart from the main nav. */
import { useEffect, useState } from 'react';
import { relativeTime } from '../lib/dates';
import { doneToday, LEVEL_SIZE, levelOf, levelProgress, projectLevel, projectStats, streak, weekProgress } from '../lib/selectors';
import { useStore } from '../store/store';
import { useNow } from './Shell';
import { IconCloud, IconSync, IconX } from './Icons';
import { Avatar, Bar, MochiOrb, Num } from './ui';

export function Settings() {
  const { state, ui, actions, me, tasks, activity, projects, providerKind, providerLabel } = useStore();
  const now = useNow(15_000);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!ui.settingsOpen) return;
    setConfirm(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && actions.setSettings(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ui.settingsOpen, actions]);

  if (!ui.settingsOpen) return null;
  const xp = state.xp[me.id] ?? 0;
  const week = weekProgress(tasks, me.id);
  const s = streak(activity, me.id);
  const doneTodayN = tasks.filter((t) => t.assigneeId === me.id && doneToday(t)).length;
  const completedEver = activity.filter((a) => a.verb === 'completed' && a.actorId === me.id).length;
  const milestones = projects.reduce((n, p) => n + projectLevel(p, projectStats(p.id, tasks).pct), 0);
  const badges = [
    { name: 'First finish', earned: completedEver > 0, how: 'Complete a task' },
    { name: 'On a roll', earned: doneTodayN >= 3, how: '3 tasks in a day' },
    { name: 'Streak', earned: s >= 3, how: '3 days in a row' },
    { name: 'Milestone maker', earned: milestones >= 3, how: 'Reach 3 project milestones' },
    { name: 'Strong week', earned: week.pct >= 0.8, how: '80% of your week done' },
  ];
  const tg = state.tengu;
  const pending = Object.keys(state.pendingTengu).length;

  return (
    <div className="panel-layer">
      <div className="panel-backdrop" onClick={() => actions.setSettings(false)} />
      <aside className="panel settings" role="dialog" aria-modal="true" aria-labelledby="settings-h">
        <div className="panel-head">
          <h2 id="settings-h" className="eyebrow">Profile &amp; settings</h2>
          <button type="button" className="icon-btn" onClick={() => actions.setSettings(false)} aria-label="Close"><IconX /></button>
        </div>

        <section className="profile">
          <Avatar m={me} size={52} />
          <div>
            <b className="profile-name">{me.name}</b>
            <span className="profile-role">{me.role}</span>
          </div>
          <MochiOrb size={30} />
        </section>

        <section className="level-card">
          <div className="level-top">
            <span className="level-big">Level {levelOf(xp)}</span>
            <span className="level-xp"><Num value={xp} format={(n) => Math.round(n).toLocaleString()} /> XP</span>
          </div>
          <Bar value={levelProgress(xp)} accent="var(--ink)" height={8} label="Progress to next level" />
          <span className="level-sub">{LEVEL_SIZE - (xp % LEVEL_SIZE)} XP to level {levelOf(xp) + 1} · +20 per finished task, +5 per new task</span>
          <div className="level-stats">
            <span><b>{Math.round(week.pct * 100)}%</b> of this week</span>
            <span><b>{s}</b> day streak</span>
            <span><b>{doneTodayN}</b> done today</span>
          </div>
        </section>

        <section>
          <h3 className="eyebrow">Badges</h3>
          <ul className="badges">
            {badges.map((b) => (
              <li key={b.name} className={b.earned ? 'earned' : ''}>
                <span className="badge-hex" aria-hidden="true" />
                <b>{b.name}</b>
                <small>{b.earned ? 'Earned' : b.how}</small>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="eyebrow">Using Mochi as</h3>
          <p className="fine">Prototype only: switch person to see the app from a teammate’s side.</p>
          <div className="switch-people">
            {state.members.map((m) => (
              <button key={m.id} type="button" className={m.id === me.id ? 'on' : ''} onClick={() => actions.setMe(m.id)} aria-pressed={m.id === me.id}>
                <Avatar m={m} size={26} />
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="tengu-box">
          <h3 className="eyebrow"><IconCloud size={13} /> Tengu</h3>
          <div className="tengu-row">
            <span className={`dot${tg.connected ? ' ok' : ''}${tg.syncing ? ' busy' : ''}`} />
            <b>{tg.syncing ? 'Syncing…' : tg.connected ? 'Connected' : 'Not connected'}</b>
            <span className="fine">Last synced {relativeTime(tg.lastSyncedAt, now)}</span>
          </div>
          {pending > 0 && <p className="fine">{pending} change{pending === 1 ? '' : 's'} waiting to send.</p>}
          <div className="btn-row">
            {tg.connected ? (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={actions.syncNow} disabled={tg.syncing}><IconSync size={13} className={tg.syncing ? 'spin' : ''} /> Sync now</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={actions.disconnectTengu} disabled={tg.syncing}>Disconnect</button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={actions.connectTengu} disabled={tg.syncing}>{tg.syncing ? 'Connecting…' : 'Connect Tengu'}</button>
            )}
          </div>
          <ol className="flow">
            <li>Tengu</li><li>Integration layer</li><li>Projects &amp; tasks</li><li>Mochi</li>
          </ol>
          <p className="fine">Shared tasks sync both ways. Private tasks stay in Mochi until you share them. Removing a Tengu task from Mochi never deletes it in Tengu.</p>
          {providerKind === 'mock' && <p className="fine"><b>Prototype:</b> connected to {providerLabel}, which lives in this browser. No real Tengu account is used.</p>}
        </section>

        <section>
          <h3 className="eyebrow">Sample data</h3>
          {confirm ? (
            <span className="confirm">
              Reset the workspace?
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
              <button type="button" className="btn btn-sm btn-danger" onClick={actions.resetDemo}>Reset</button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(true)}>Reset workspace</button>
          )}
        </section>
      </aside>
    </div>
  );
}
