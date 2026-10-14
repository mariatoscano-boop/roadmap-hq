/**
 * New quest. Type what's on your mind; the quest assembles itself as objects (world, who,
 * when, private/connected) you can click to change. Enter adds it immediately. On add, the quest
 * flies into its world's creature.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { integrationLabel } from '../integrations';
import { dueLabel } from '../lib/dates';
import { dateForPreset, presetForDate, type DuePreset } from '../lib/due';
import { parseQuest } from '../lib/parse';
import { useStore } from '../store/store';
import { IconCalendar, IconClock, IconExternal, IconX } from './Icons';
import { fly, Kbd, MochiMark, WorldCreature, worldStyle } from './ui';

type Picker = null | 'world' | 'who' | 'when';
const WHEN: { key: DuePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'weekend', label: 'Weekend' },
  { key: 'nextweek', label: 'Next week' },
  { key: 'someday', label: 'Someday' },
];
const PEOPLE = ['Bryan', 'Malika', 'Natalia', 'Client B legal'];

export function Composer() {
  const { state, ui, actions, worldOf } = useStore();
  const open = ui.composer.open;
  const [text, setText] = useState('');
  const [worldId, setWorldId] = useState<string | null>(null);
  const [who, setWho] = useState<string | null | undefined>(undefined); // undefined = not chosen
  const [due, setDue] = useState<{ p: DuePreset; d: string | null } | null>(null);
  const [connect, setConnect] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);
  const [landing, setLanding] = useState(false);
  const [whoText, setWhoText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const objRef = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);

  const preset = ui.composer.worldId ?? (ui.view.name === 'world' ? ui.view.id : undefined);

  useEffect(() => {
    if (!open) return;
    setText(''); setWorldId(null); setWho(undefined); setDue(null); setConnect(false); setPicker(null); setLanding(false); setWhoText('');
    window.setTimeout(() => input.current?.focus(), 40);
  }, [open]);

  const parsed = useMemo(() => parseQuest(text, state.worlds), [text, state.worlds]);
  const wid = worldId ?? parsed.worldId ?? preset ?? 'personal';
  const world = state.worlds.find((w) => w.id === wid) ?? state.worlds[0];
  const waitingOn = who !== undefined ? who : parsed.waitingOn ?? null;
  const dueDate = due ? dateForPreset(due.p, due.d) : parsed.dueWord !== undefined ? parsed.dueDate ?? null : dateForPreset('today', null);
  const title = parsed.title || text.trim();
  const ready = title.length > 0;
  const canConnect = !!world.link && !!state.integrations[world.link.integrationId]?.connected;
  const willConnect = canConnect && connect;

  useEffect(() => { if (!canConnect) setConnect(false); }, [canConnect]);

  // Hop when the world changes while typing.
  const lastWorld = useRef(wid);
  useEffect(() => {
    if (open && ready && lastWorld.current !== wid) actions.say(wid, 'Here.', 'happy');
    lastWorld.current = wid;
  }, [wid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const add = () => {
    if (!ready || landing) return;
    setLanding(true);
    const q = actions.createQuest({ title, worldId: world.id, dueDate, priority: parsed.high ? 'high' : 'normal', waitingOn, connect: willConnect });
    const target = strip.current?.querySelector(`[data-world="${world.id}"]`) ?? null;
    fly(objRef.current, target, title, `var(--${world.color})`, () => {
      actions.say(world.id, 'Got it.', 'happy');
      actions.pulseWorld(world.id, '+1');
      window.setTimeout(() => {
        actions.closeComposer();
        actions.toast({ title: `Added to ${world.name} ✦`, detail: `${title} · ${dueDate ? dueLabel(dueDate) : 'Someday'} · ${willConnect ? `connecting to ${integrationLabel(world.link!.integrationId)}` : 'private'}`, worldId: world.id, action: { label: 'Edit', run: () => actions.openQuest(q.id) } });
      }, 260);
    });
  };

  const token = (k: Picker, children: React.ReactNode, extra = '') => (
    <button type="button" className={`token${picker === k ? ' on' : ''} ${extra}`} onClick={() => setPicker((p) => (p === k ? null : k))} aria-expanded={picker === k}>
      {children}
    </button>
  );

  return (
    <div className="composer-layer" role="dialog" aria-modal="true" aria-label="New quest" onKeyDown={(e) => e.key === 'Escape' && (picker ? setPicker(null) : actions.closeComposer())}>
      <div className="composer-backdrop" onClick={actions.closeComposer} />
      <div className="composer" style={worldStyle(world)}>
        <div className="composer-top">
          <span className="eyebrow">New quest</span>
          <button type="button" className="icon-btn" onClick={actions.closeComposer} aria-label="Close"><IconX /></button>
        </div>

        <label htmlFor="quest-input" className="composer-q">What’s on your mind?</label>
        <input
          id="quest-input"
          ref={input}
          className="composer-input"
          value={text}
          placeholder="Review the Dosify landing page"
          autoComplete="off"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />

        <div ref={objRef} className={`qobject${ready ? ' assembling' : ''}${landing ? ' landing' : ''}`} aria-live="polite">
          <div className="qobject-creature"><WorldCreature world={world} size={54} /></div>
          <div className="qobject-body">
            <span className="qobject-title">{title || 'Your quest takes shape here'}</span>
            {ready && (
              <div className="tokens">
                {token('world', <><span className="token-head"><WorldCreature world={world} size={18} mini /></span>{world.name}</>, 'token-world')}
                {token('who', waitingOn ? <><IconClock size={12} /> Waiting on {waitingOn}</> : <><span className="me-dot">{state.name[0]}</span> For me</>)}
                {token('when', <><IconCalendar size={12} /> {dueDate ? dueLabel(dueDate) : 'Someday'}</>)}
                <button
                  type="button"
                  className={`token token-src${willConnect ? ' connected' : ''}`}
                  disabled={!world.link}
                  onClick={() => canConnect && setConnect((c) => !c)}
                  title={!world.link ? `${world.name} lives only in Mochi` : !canConnect ? `${integrationLabel(world.link.integrationId)} isn’t connected` : willConnect ? `Will also be created in ${integrationLabel(world.link.integrationId)}` : 'Only you will see this'}
                  aria-pressed={willConnect}
                >
                  {willConnect ? <><IconExternal size={12} /> Connected · {integrationLabel(world.link!.integrationId)}</> : <><MochiMark size={12} /> Private</>}
                  {world.link && <span className="token-swap" aria-hidden="true">↕</span>}
                </button>
                {parsed.high && <span className="token token-static">High priority</span>}
              </div>
            )}
          </div>
        </div>

        {picker === 'world' && (
          <div className="picker" role="listbox" aria-label="World">
            {state.worlds.map((w) => (
              <button key={w.id} type="button" role="option" aria-selected={w.id === world.id} className={`pick-world${w.id === world.id ? ' on' : ''}`} style={worldStyle(w)} onClick={() => { setWorldId(w.id); setPicker(null); actions.say(w.id, 'Here.', 'happy'); }}>
                <WorldCreature world={w} size={34} />
                <b>{w.name}</b>
                <small>{w.link ? integrationLabel(w.link.integrationId) : 'Mochi only'}</small>
              </button>
            ))}
          </div>
        )}
        {picker === 'who' && (
          <div className="picker picker-row">
            <button type="button" className={`chip${!waitingOn ? ' on' : ''}`} onClick={() => { setWho(null); setPicker(null); }}>For me</button>
            {PEOPLE.map((p) => <button key={p} type="button" className={`chip${waitingOn === p ? ' on' : ''}`} onClick={() => { setWho(p); setPicker(null); }}>Waiting on {p}</button>)}
            <form className="who-form" onSubmit={(e) => { e.preventDefault(); if (whoText.trim()) { setWho(whoText.trim()); setPicker(null); } }}>
              <label className="sr-only" htmlFor="who-input">Someone else</label>
              <input id="who-input" value={whoText} onChange={(e) => setWhoText(e.target.value)} placeholder="Someone else…" />
            </form>
          </div>
        )}
        {picker === 'when' && (
          <div className="picker picker-row">
            {WHEN.map((o) => <button key={o.key} type="button" className={`chip${presetForDate(dueDate) === o.key || (o.key === 'someday' && !dueDate) ? ' on' : ''}`} onClick={() => { setDue({ p: o.key, d: null }); setPicker(null); }}>{o.label}</button>)}
            <label className="chip chip-date"><IconCalendar size={12} /><span className="sr-only">Pick a date</span><input type="date" onChange={(e) => { if (e.target.value) { setDue({ p: 'custom', d: e.target.value }); setPicker(null); } }} /></label>
          </div>
        )}

        <div className="dest" ref={strip}>
          <span className="eyebrow">Lands in</span>
          <div className="dest-row">
            {state.worlds.map((w) => (
              <button key={w.id} type="button" data-world={w.id} className={`dest-world${w.id === world.id ? ' on' : ''}`} style={worldStyle(w)} onClick={() => setWorldId(w.id)} aria-label={`Put it in ${w.name}`} title={w.name}>
                <WorldCreature world={w} size={30} showSpeech={w.id === world.id} />
              </button>
            ))}
          </div>
        </div>

        <div className="composer-foot">
          <span className="hint">{ready ? <><Kbd>↵</Kbd> adds it now. Change anything later.</> : 'Try “Ask Bryan about FIJI tomorrow” or “Buy flowers Saturday”.'}</span>
          <button type="button" className="btn btn-primary" disabled={!ready || landing} onClick={add}>Add to my world ✦</button>
        </div>
        {parsed.worldId && ready && <p className="fine center">World, date and “waiting on” come from simple word matching, not AI.</p>}
        <span className="sr-only">{worldOf(wid).name}</span>
      </div>
    </div>
  );
}
