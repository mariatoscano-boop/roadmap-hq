/** Every quest across your worlds: a spatial overview first, then the list. */
import { useState } from 'react';
import { QuestRow } from '../components/QuestRow';
import { IconClock } from '../components/Icons';
import { WorldCreature, worldStyle } from '../components/ui';
import { daysFromToday } from '../lib/dates';
import { doneToday, onPlate, sortQuests } from '../lib/world';
import { useStore } from '../store/store';

export function Quests() {
  const { state, actions } = useStore();
  const [only, setOnly] = useState<string | null>(null);
  const [src, setSrc] = useState<'all' | 'private' | 'external'>('all');
  const qs = state.quests.filter((q) => (!only || q.worldId === only) && (src === 'all' || q.source === src)).sort(sortQuests);
  const groups = [
    { key: 'today', label: 'Today', items: qs.filter(onPlate) },
    { key: 'next', label: 'Next', items: qs.filter((q) => !q.done && !q.waitingOn && q.dueDate && daysFromToday(q.dueDate) > 0) },
    { key: 'waiting', label: 'Waiting for', items: qs.filter((q) => !q.done && q.waitingOn) },
    { key: 'someday', label: 'Someday', items: qs.filter((q) => !q.done && !q.waitingOn && !q.dueDate) },
    { key: 'done', label: 'Done today', items: qs.filter(doneToday) },
  ];
  const open = state.quests.filter((q) => !q.done);

  return (
    <div className="page">
      <header className="hello">
        <span className="eyebrow">Quests</span>
        <h1>{open.length} open quests</h1>
        <p className="sub">{open.filter((q) => q.source === 'private').length} private · {open.filter((q) => q.source === 'external').length} from your tools · {open.filter((q) => q.waitingOn).length} waiting on someone</p>
      </header>

      <section className="clusters" aria-label="Quests by world">
        {state.worlds.map((w) => {
          const mine = open.filter((q) => q.worldId === w.id);
          return (
            <button key={w.id} type="button" className={`cluster${only === w.id ? ' on' : ''}${only && only !== w.id ? ' dim' : ''}`} style={worldStyle(w)} onClick={() => setOnly((o) => (o === w.id ? null : w.id))} aria-pressed={only === w.id}>
              <span className="cluster-dots">{mine.map((q) => <i key={q.id} className={onPlate(q) ? 'today' : q.waitingOn ? 'waiting' : ''} title={q.title} />)}</span>
              <WorldCreature world={w} size={30} showSpeech />
              <b>{w.name}</b>
              <small>{mine.length}</small>
            </button>
          );
        })}
      </section>

      <div className="filters">
        <div className="seg" role="tablist" aria-label="Source">
          {(['all', 'private', 'external'] as const).map((s) => <button key={s} type="button" role="tab" aria-selected={src === s} className={src === s ? 'on' : ''} onClick={() => setSrc(s)}>{s === 'all' ? 'All' : s === 'private' ? 'Private' : 'From tools'}</button>)}
        </div>
        {only && <button type="button" className="link" onClick={() => setOnly(null)}>Show every world</button>}
      </div>

      <div className="qgroups">
        {groups.filter((g) => g.items.length).map((g) => (
          <section key={g.key} aria-label={g.label}>
            <h2 className="col-h">{g.key === 'waiting' && <IconClock size={12} />}{g.label} <span className="muted">{g.items.length}</span></h2>
            <ul className="quests">{g.items.map((q) => <QuestRow key={q.id} q={q} />)}</ul>
          </section>
        ))}
        {groups.every((g) => !g.items.length) && <p className="muted">Nothing here. <button type="button" className="link" onClick={() => actions.openComposer(only ?? undefined)}>Add a quest</button></p>}
      </div>
    </div>
  );
}
