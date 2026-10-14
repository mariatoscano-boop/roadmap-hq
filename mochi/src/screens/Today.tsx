/** Home: your world map, your next move, and today's quests. */
import { useRef } from 'react';
import { QuestRow } from '../components/QuestRow';
import { WorldMap } from '../components/WorldMap';
import { IconArrow, IconClock } from '../components/Icons';
import { SourceBadge, WorldCreature, worldStyle } from '../components/ui';
import { greeting, longDate } from '../lib/dates';
import { rankQuests } from '../lib/focus';
import { doneToday, onPlate, sortQuests } from '../lib/world';
import { useStore } from '../store/store';

export function Today() {
  const { state, actions, worldOf } = useStore();
  const listRef = useRef<HTMLElement>(null);
  const plate = state.quests.filter(onPlate).sort(sortQuests);
  const finished = state.quests.filter(doneToday);
  const waiting = state.quests.filter((q) => !q.done && q.waitingOn).sort(sortQuests);
  const picks = rankQuests(state.quests, 3);
  const next = picks[0];
  const worldsToday = new Set(plate.map((q) => q.worldId)).size;
  const nw = next ? worldOf(next.quest.worldId) : null;

  return (
    <div className="page home">
      <header className="hello">
        <span className="eyebrow">{longDate()}</span>
        <h1>{greeting()}, {state.name}.</h1>
        <p className="sub">
          {plate.length === 0 ? (finished.length ? 'Everything for today is done. Explore, or rest.' : 'Nothing is due today.') : (
            <><b>{plate.length}</b> {plate.length === 1 ? 'thing is' : 'things are'} waiting for you, across {worldsToday} {worldsToday === 1 ? 'world' : 'worlds'}.</>
          )}
        </p>
      </header>

      <div className="home-grid">
        <WorldMap onHub={() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />

        <aside className="home-side">
          {next && nw ? (
            <section className="next" style={worldStyle(nw)} aria-labelledby="next-h">
              <h2 id="next-h" className="eyebrow">Your next move</h2>
              <div className="next-row">
                <WorldCreature world={nw} size={52} />
                <div className="next-text">
                  <b>{next.quest.title}</b>
                  <span className="next-meta">{nw.name} · <SourceBadge q={next.quest} /></span>
                  <span className="next-reason">{next.reason}</span>
                </div>
              </div>
              <div className="next-actions">
                <button type="button" className="btn btn-accent" onClick={() => actions.startFocus(picks.map((p) => p.quest.id))}>Enter focus <IconArrow size={13} /></button>
                <button type="button" className="btn btn-ghost" onClick={() => actions.navigate({ name: 'world', id: nw.id })}>Enter {nw.name}</button>
              </div>
            </section>
          ) : (
            <section className="next empty-next"><h2 className="eyebrow">Your next move</h2><p>Nothing urgent. Pick a world and explore.</p></section>
          )}

          <section ref={listRef} className="side-block" aria-labelledby="tq-h">
            <div className="block-head"><h2 id="tq-h" className="eyebrow">Today’s quests</h2><span className="muted">{finished.length} done</span></div>
            {plate.length ? <ol className="quests">{plate.map((q, i) => <QuestRow key={q.id} q={q} index={i + 1} />)}</ol> : <p className="muted pad">All clear.</p>}
            {finished.length > 0 && (
              <details className="done-today">
                <summary>Done today · {finished.length}</summary>
                <ul className="quests">{finished.map((q) => <QuestRow key={q.id} q={q} />)}</ul>
              </details>
            )}
          </section>

          {waiting.length > 0 && (
            <section className="side-block" aria-labelledby="wait-h">
              <div className="block-head"><h2 id="wait-h" className="eyebrow"><IconClock size={11} /> Waiting for</h2><span className="muted">{waiting.length}</span></div>
              <ul className="quests">{waiting.slice(0, 4).map((q) => <QuestRow key={q.id} q={q} />)}</ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
