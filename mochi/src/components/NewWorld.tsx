/** Add a world (a new client, project or area of life) and design its creature. */
import { useEffect, useState } from 'react';
import { useStore } from '../store/store';
import type { Accent, Antenna, BodyShape, Terrain, World } from '../types';
import { Creature } from './Creature';
import { IconX } from './Icons';
import { TerrainPattern } from './Environment';

const COLORS: Accent[] = ['teal', 'violet', 'orange', 'blue', 'pink', 'yellow', 'green'];
const BODIES: BodyShape[] = ['pill', 'cube', 'blob', 'bean', 'drop'];
const ANTENNAS: Antenna[] = ['single', 'double', 'sprout', 'spark', 'none'];
const TERRAINS: Terrain[] = ['waves', 'bubbles', 'circuit', 'blocks', 'garden', 'stars'];
const NAMES = ['Byte', 'Nori', 'Pixel', 'Quill', 'Rune', 'Ziggy', 'Moss', 'Echo'];

export function NewWorld() {
  const { ui, actions } = useStore();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<World['kind']>('client');
  const [color, setColor] = useState<Accent>('green');
  const [terrain, setTerrain] = useState<Terrain>('circuit');
  const [body, setBody] = useState<BodyShape>('pill');
  const [antenna, setAntenna] = useState<Antenna>('single');
  const [creatureName, setCreatureName] = useState(NAMES[0]);

  useEffect(() => {
    if (!ui.newWorldOpen) return;
    setName('');
    setCreatureName(NAMES[Math.floor(Math.random() * NAMES.length)]);
  }, [ui.newWorldOpen]);
  if (!ui.newWorldOpen) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const w = actions.createWorld({ name: name.trim(), color, terrain, body, antenna, creatureName: creatureName.trim() || 'Byte', kind });
    actions.navigate({ name: 'world', id: w.id });
  };

  return (
    <div className="composer-layer" role="dialog" aria-modal="true" aria-labelledby="nw-h" onKeyDown={(e) => e.key === 'Escape' && actions.setNewWorld(false)}>
      <div className="composer-backdrop" onClick={() => actions.setNewWorld(false)} />
      <form className="composer nw" onSubmit={submit} style={{ ['--c' as string]: `var(--${color})` }}>
        <div className="composer-top">
          <span className="eyebrow" id="nw-h">New world</span>
          <button type="button" className="icon-btn" onClick={() => actions.setNewWorld(false)} aria-label="Close"><IconX /></button>
        </div>
        <div className="nw-preview">
          <TerrainPattern terrain={terrain} opacity={0.35} />
          <Creature body={body} antenna={antenna} color={color} size={96} mood="wow" />
          <span className="nw-name">{name.trim().toUpperCase() || 'NEW WORLD'}</span>
        </div>
        <label className="composer-q" htmlFor="nw-name">What do you call it?</label>
        <input id="nw-name" className="composer-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Client C, Learning, Side project…" autoFocus autoComplete="off" />
        <div className="nw-grid">
          <fieldset><legend className="eyebrow">Kind</legend><div className="chips">{(['client', 'project', 'life', 'ideas'] as const).map((k) => <button key={k} type="button" className={`chip chip-sm${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>{k[0].toUpperCase() + k.slice(1)}</button>)}</div></fieldset>
          <fieldset><legend className="eyebrow">Colour</legend><div className="swatches">{COLORS.map((c) => <button key={c} type="button" className={`swatch${color === c ? ' on' : ''}`} style={{ background: `var(--${c})` }} aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)} />)}</div></fieldset>
          <fieldset><legend className="eyebrow">Terrain</legend><div className="chips">{TERRAINS.map((t) => <button key={t} type="button" className={`chip chip-sm${terrain === t ? ' on' : ''}`} onClick={() => setTerrain(t)}>{t}</button>)}</div></fieldset>
          <fieldset><legend className="eyebrow">Creature</legend>
            <div className="shape-pick">{BODIES.map((b) => <button key={b} type="button" className={body === b ? 'on' : ''} aria-label={`${b} body`} aria-pressed={body === b} onClick={() => setBody(b)}><Creature body={b} antenna="none" color={color} size={34} mini /></button>)}</div>
            <div className="shape-pick">{ANTENNAS.map((a) => <button key={a} type="button" className={antenna === a ? 'on' : ''} aria-label={`${a} antenna`} aria-pressed={antenna === a} onClick={() => setAntenna(a)}><Creature body={body} antenna={a} color={color} size={34} mini /></button>)}</div>
            <label className="sr-only" htmlFor="nw-cname">Creature name</label>
            <input id="nw-cname" className="field" value={creatureName} onChange={(e) => setCreatureName(e.target.value)} placeholder="Creature name" />
          </fieldset>
        </div>
        <p className="fine">New worlds start in Mochi only. The creature hatches when you finish your first quest there.</p>
        <div className="composer-foot"><span /><button type="submit" className="btn btn-primary" disabled={!name.trim()}>Create world ✦</button></div>
      </form>
    </div>
  );
}
