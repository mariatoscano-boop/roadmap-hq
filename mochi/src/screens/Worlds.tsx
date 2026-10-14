/** Your worlds, and the inside of one world. */
import { useState } from 'react';
import { TerrainPattern, WorldObjects } from '../components/Environment';
import { QuestRow } from '../components/QuestRow';
import { IconArrow, IconBack, IconClock, IconExternal, IconNote, IconPlus, IconSync } from '../components/Icons';
import { Bar, MochiMark, Num, WorldCreature, worldStyle } from '../components/ui';
import { integrationLabel } from '../integrations';
import { rankQuests } from '../lib/focus';
import { parseQuest } from '../lib/parse';
import { dateForPreset } from '../lib/due';
import { ACCESSORIES, hatched, isLate, objectsIn, onPlate, sortQuests, worldLevel, worldLevelProgress, worldStats, WORLD_LEVEL_XP } from '../lib/world';
import { useStore } from '../store/store';
import type { World } from '../types';

function LinkChip({ w }: { w: World }) {
  return w.link
    ? <span className="link-chip"><IconExternal size={11} /> Connected to {integrationLabel(w.link.integrationId)}</span>
    : <span className="link-chip"><MochiMark size={11} /> Mochi only</span>;
}

export function Worlds() {
  const { state, ui, actions } = useStore();
  return (
    <div className="page">
      <header className="hello">
        <span className="eyebrow">My worlds</span>
        <h1>{state.worlds.length} worlds</h1>
        <p className="sub">Clients, projects, life and ideas. Each one has its own creature.</p>
      </header>
      <div className="wgrid">
        {state.worlds.map((w) => {
          const st = worldStats(w.id, state.quests);
          const xp = state.worldXp[w.id] ?? 0;
          const open = state.quests.filter((q) => q.worldId === w.id && !q.done);
          const p = ui.pulse?.worldId === w.id ? ui.pulse : null;
          return (
            <button key={w.id} type="button" className="wtile" style={worldStyle(w)} onClick={() => actions.navigate({ name: 'world', id: w.id })} aria-label={`Enter ${w.name}`}>
              <span className="wtile-scene">
                <TerrainPattern terrain={w.terrain} />
                <WorldObjects count={objectsIn(xp)} />
                <span className="wtile-creature"><WorldCreature world={w} size={68} showSpeech /></span>
                {p && <span key={p.key} className="node-pop">{p.text}</span>}
                <span className="wtile-lvl">{hatched(w, state.worldXp) ? `LV ${worldLevel(xp)}` : 'EGG'}</span>
              </span>
              <span className="wtile-body">
                <span className="wtile-top"><b>{w.name}</b><LinkChip w={w} /></span>
                <span className="wtile-stats"><span><b>{st.open}</b> quests</span><span><b>{st.today}</b> today</span><span>{Math.round(st.pct * 100)}%</span></span>
                <Bar value={st.pct} color="var(--c)" label={`${w.name} progress`} />
                <span className="dots">{open.slice(0, 10).map((q) => <i key={q.id} className={onPlate(q) ? 'today' : q.waitingOn ? 'waiting' : ''} />)}</span>
              </span>
            </button>
          );
        })}
        <button type="button" className="wtile wtile-new" onClick={() => actions.setNewWorld(true)}>
          <span className="wtile-new-in"><IconPlus size={18} /><b>New world</b><small>A client, a project, a part of life</small></span>
        </button>
      </div>
    </div>
  );
}

export function WorldView({ id }: { id: string }) {
  const { state, actions } = useStore();
  const w = state.worlds.find((x) => x.id === id);
  const [text, setText] = useState('');
  if (!w) {
    return <div className="page"><button type="button" className="back" onClick={() => actions.navigate({ name: 'worlds' })}><IconBack /> Worlds</button><p className="muted">This world doesn’t exist anymore.</p></div>;
  }
  const xp = state.worldXp[w.id] ?? 0;
  const st = worldStats(w.id, state.quests);
  const mine = state.quests.filter((q) => q.worldId === w.id).sort(sortQuests);
  const open = mine.filter((q) => !q.done && !q.waitingOn);
  const external = open.filter((q) => q.source === 'external');
  const priv = open.filter((q) => q.source === 'private');
  const waiting = mine.filter((q) => !q.done && q.waitingOn);
  const done = mine.filter((q) => q.done);
  const picks = rankQuests(mine, 3);
  const integ = w.link ? state.integrations[w.link.integrationId] : null;
  const isHatched = hatched(w, state.worldXp);
  const nextAcc = ACCESSORIES.find((a) => a.level > worldLevel(xp));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseQuest(text, state.worlds);
    const title = p.title || text.trim();
    if (!title) return;
    actions.createQuest({ title, worldId: w.id, dueDate: p.dueWord !== undefined ? p.dueDate ?? null : dateForPreset('today', null), priority: p.high ? 'high' : 'normal', waitingOn: p.waitingOn ?? null, connect: false });
    actions.say(w.id, 'Got it.', 'happy');
    setText('');
  };

  return (
    <div className="page world" style={worldStyle(w)}>
      <button type="button" className="back" onClick={() => actions.navigate({ name: 'today' })}><IconBack /> Map</button>

      <section className="scene" aria-label={`${w.name} world`}>
        <TerrainPattern terrain={w.terrain} opacity={0.3} scale={1.2} />
        <div className="scene-glow" aria-hidden="true" />
        <WorldObjects count={objectsIn(xp)} />
        <div className="scene-creature">
          <button type="button" className="scene-poke" onClick={() => actions.say(w.id, isHatched ? (st.today ? `${st.today} for today. Let’s go.` : 'All quiet here.') : 'Finish a quest to hatch me.', isHatched ? 'happy' : 'idle')} aria-label={`Poke ${w.creature.name}`}>
            <WorldCreature world={w} size={128} showSpeech mood={!isHatched ? undefined : state.quests.some((q) => q.worldId === w.id && isLate(q)) ? 'worried' : 'idle'} />
          </button>
          <span className="scene-pad" aria-hidden="true" />
        </div>
        <div className="scene-info">
          <span className="eyebrow">{w.kind}</span>
          <h1>{w.name}</h1>
          <LinkChip w={w} />
          <div className="scene-stats">
            <span><b><Num value={st.pct * 100} format={(n) => `${Math.round(n)}%`} /></b> complete</span>
            <span><b>{st.today}</b> today</span>
            <span><b>{st.open}</b> open</span>
          </div>
          <div className="scene-xp">
            <span>{isHatched ? `${w.creature.name} · LV ${worldLevel(xp)}` : `${w.creature.name} · not hatched`}</span>
            <Bar value={worldLevelProgress(xp)} color="var(--c)" label="World level progress" />
            <small>{WORLD_LEVEL_XP - (xp % WORLD_LEVEL_XP)} ✦ to the next object{nextAcc ? ` · ${nextAcc.name} at LV ${nextAcc.level}` : ''}</small>
          </div>
        </div>
        <div className="scene-actions">
          {picks[0] && <button type="button" className="btn btn-accent" onClick={() => actions.startFocus(picks.map((p) => p.quest.id))}>Enter focus <IconArrow size={13} /></button>}
          {w.link && integ && (
            <button type="button" className="btn btn-dark" disabled={!integ.connected || integ.syncing} onClick={() => actions.sync(w.link!.integrationId)}>
              <IconSync size={13} className={integ.syncing ? 'spin' : ''} /> {integ.syncing ? 'Syncing' : `Sync ${integrationLabel(w.link.integrationId)}`}
            </button>
          )}
        </div>
      </section>

      <form className="world-add" onSubmit={add}>
        <label className="sr-only" htmlFor="world-add">Add a private quest to {w.name}</label>
        <MochiMark size={14} />
        <input id="world-add" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Add a private quest to ${w.name}…  (try “tomorrow”, “waiting on Bryan”)`} autoComplete="off" />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim()}>Add</button>
      </form>

      <div className="world-cols">
        <div className="world-main">
          {w.link && (
            <section aria-labelledby="ext-h">
              <h2 id="ext-h" className="col-h"><IconExternal size={12} /> From {integrationLabel(w.link.integrationId)} <span className="muted">{external.length}</span></h2>
              {external.length ? <ul className="quests">{external.map((q) => <QuestRow key={q.id} q={q} showWorld={false} />)}</ul> : <p className="muted pad">Nothing open from {integrationLabel(w.link.integrationId)}.</p>}
            </section>
          )}
          <section aria-labelledby="priv-h">
            <h2 id="priv-h" className="col-h"><MochiMark size={12} /> Private · only you <span className="muted">{priv.length}</span></h2>
            {priv.length ? <ul className="quests">{priv.map((q) => <QuestRow key={q.id} q={q} showWorld={false} />)}</ul> : <p className="muted pad">No private quests here yet.</p>}
          </section>
          {done.length > 0 && (
            <details className="done-today">
              <summary>Done · {done.length}</summary>
              <ul className="quests">{done.map((q) => <QuestRow key={q.id} q={q} showWorld={false} />)}</ul>
            </details>
          )}
        </div>
        <aside className="world-side">
          <section className="side-block" aria-labelledby="w-wait">
            <h2 id="w-wait" className="col-h"><IconClock size={12} /> Waiting for <span className="muted">{waiting.length}</span></h2>
            {waiting.length ? <ul className="quests">{waiting.map((q) => <QuestRow key={q.id} q={q} showWorld={false} />)}</ul> : <p className="muted pad">Not waiting on anyone.</p>}
          </section>
          <section className="side-block notes-block">
            <label htmlFor="w-notes" className="col-h"><IconNote size={12} /> Notes · private</label>
            <textarea id="w-notes" key={w.id} rows={6} defaultValue={w.notes} placeholder={`Anything about ${w.name}. Only you see this.`} onBlur={(e) => actions.setNotes(w.id, e.target.value)} />
          </section>
        </aside>
      </div>
    </div>
  );
}
