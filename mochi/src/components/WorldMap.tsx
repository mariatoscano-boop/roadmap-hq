/**
 * The world map: every world as a place, with its creature, a path to Today, and a dot per open
 * quest. Click a world to enter it. Layout adapts to any number of worlds.
 */
import { useEffect, useRef, useState } from 'react';
import { integrationLabel } from '../integrations';
import { hatched, mapPositions, onPlate, worldStats } from '../lib/world';
import { useStore } from '../store/store';
import { IconPlus, IconToday } from './Icons';
import { Num, Ring, WorldCreature, worldStyle } from './ui';

export function WorldMap({ onHub }: { onHub?: () => void }) {
  const { state, ui, actions } = useStore();
  const box = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  const [entering, setEntering] = useState<string | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTall(e.contentRect.width < 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pos = mapPositions(state.worlds.length, tall);
  const plate = state.quests.filter(onPlate).length;

  const enter = (id: string) => {
    setEntering(id);
    window.setTimeout(() => actions.navigate({ name: 'world', id }), 260);
  };

  return (
    <div ref={box} className={`map${tall ? ' tall' : ''}${entering ? ' entering' : ''}`} role="group" aria-label="Your worlds">
      <div className="map-grid" aria-hidden="true" />
      <svg className="map-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {state.worlds.map((w, i) => {
          const live = state.quests.some((q) => q.worldId === w.id && onPlate(q));
          return (
            <path key={w.id} d={`M50 50 Q ${(50 + pos[i].x) / 2 + (i % 2 ? 6 : -6)} ${(50 + pos[i].y) / 2} ${pos[i].x} ${pos[i].y}`} className={`map-path${live ? ' live' : ''}`} style={worldStyle(w)} vectorEffect="non-scaling-stroke" />
          );
        })}
      </svg>

      <button type="button" className="hub" onClick={onHub} aria-label={`Today: ${plate} things waiting`}>
        <span className="hub-ring" aria-hidden="true" />
        <IconToday size={14} />
        <span className="hub-n"><Num value={plate} /></span>
        <span className="hub-label">Today</span>
      </button>

      {state.worlds.map((w, i) => {
        const st = worldStats(w.id, state.quests);
        const open = state.quests.filter((q) => q.worldId === w.id && !q.done);
        const dots = open.slice(0, 8);
        const p = ui.pulse?.worldId === w.id ? ui.pulse : null;
        return (
          <button
            key={w.id}
            type="button"
            className={`node${entering === w.id ? ' is-entering' : ''}${!hatched(w, state.worldXp) ? ' is-egg' : ''}`}
            style={{ ...worldStyle(w), left: `${pos[i].x}%`, top: `${pos[i].y}%` }}
            onClick={() => enter(w.id)}
            aria-label={`Enter ${w.name}: ${st.open} open quests, ${Math.round(st.pct * 100)}% done`}
            data-world={w.id}
          >
            <span className="node-pad" aria-hidden="true" />
            <span className="node-ring" aria-hidden="true"><Ring value={st.pct} size={tall ? 66 : 84} stroke={2} /></span>
            <span className="node-creature"><WorldCreature world={w} size={tall ? 46 : 58} showSpeech /></span>
            <span className="node-label">
              <b>{w.name}</b>
              <small>{w.link ? integrationLabel(w.link.integrationId) : 'Mochi'}</small>
            </span>
            <span className="node-dots" aria-hidden="true">
              {dots.map((q) => <i key={q.id} className={onPlate(q) ? 'today' : q.waitingOn ? 'waiting' : ''} />)}
              {open.length > dots.length && <em>+{open.length - dots.length}</em>}
            </span>
            {p && <span key={p.key} className="node-pop">{p.text}</span>}
          </button>
        );
      })}

      <button type="button" className="map-new" onClick={() => actions.setNewWorld(true)}>
        <IconPlus size={13} /> New world
      </button>
      <span className="map-legend" aria-hidden="true"><i className="today" /> today <i /> later <i className="waiting" /> waiting</span>
    </div>
  );
}
