/** Focus: one quest, its creature, a 25-minute timer. */
import { useEffect, useState } from 'react';
import { rankQuests } from '../lib/focus';
import { useStore } from '../store/store';
import { IconArrow, IconCheck, IconPause, IconPlay, IconX } from './Icons';
import { Ring, SourceBadge, WorldCreature, worldStyle } from './ui';

const LEN = 25 * 60;

export function FocusMode() {
  const { state, ui, actions, worldOf } = useStore();
  const f = ui.focus;
  const q = f ? state.quests.find((x) => x.id === f.ids[f.index]) ?? null : null;
  const [left, setLeft] = useState(LEN);
  const [run, setRun] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => { setLeft(LEN); setRun(true); setDone(false); }, [q?.id]);
  useEffect(() => {
    if (!q || !run || done) return;
    const t = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(t);
  }, [q, run, done]);
  useEffect(() => {
    if (!f) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') actions.exitFocus();
      if (e.key === ' ' && !done) { e.preventDefault(); setRun((r) => !r); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [f, done, actions]);

  if (!f || !q) return null;
  const w = worldOf(q.worldId);
  const more = f.index + 1 < f.ids.length;
  const next = () => {
    if (more) return actions.nextFocus();
    const n = rankQuests(state.quests.filter((x) => x.id !== q.id), 1)[0];
    if (done && n) actions.startFocus([n.quest.id]);
    else actions.exitFocus();
  };

  return (
    <div className="focus" role="dialog" aria-modal="true" aria-label="Focus" style={worldStyle(w)}>
      <div className="focus-top">
        <span className="eyebrow">Focus · {w.name}{f.ids.length > 1 ? ` · ${f.index + 1}/${f.ids.length}` : ''}</span>
        <button type="button" className="icon-btn" onClick={actions.exitFocus} aria-label="Leave focus"><IconX /></button>
      </div>
      {!done ? (
        <div className="focus-body" key={q.id}>
          <WorldCreature world={w} size={88} mood={run ? 'focus' : 'sleepy'} showSpeech />
          <h1>{q.title}</h1>
          <SourceBadge q={q} long />
          <Ring value={left / LEN} size={200} stroke={4} track="rgba(255,255,255,.08)">
            <span className="focus-time">{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</span>
            <span className="eyebrow">{run ? 'In focus' : 'Paused'}</span>
          </Ring>
          <div className="focus-actions">
            <button type="button" className="btn btn-dark" onClick={() => setRun((r) => !r)}>{run ? <><IconPause size={13} /> Pause</> : <><IconPlay size={13} /> Resume</>}</button>
            <button type="button" className="btn btn-accent" onClick={() => { actions.toggleDone(q.id, { quiet: true }); setDone(true); }}><IconCheck /> Done · +20 ✦</button>
            <button type="button" className="btn btn-dark" onClick={next}>{more ? 'Skip' : 'Not now'} <IconArrow size={13} /></button>
          </div>
          <p className="focus-keys">Space pauses · Esc leaves</p>
        </div>
      ) : (
        <div className="focus-body">
          <WorldCreature world={w} size={96} mood="happy" showSpeech />
          <h1>Nice. That’s done.</h1>
          <p className="focus-sub">{w.name} moved forward. {Math.max(1, Math.round((LEN - left) / 60))} min in focus.</p>
          <div className="focus-actions">
            <button type="button" className="btn btn-dark" onClick={actions.exitFocus}>Back to my world</button>
            <button type="button" className="btn btn-accent" onClick={next}>What’s next? <IconArrow size={13} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
