import { Room } from '../components/Room';
import { ItemSticker } from '../components/RoomItems';
import { pokeSpeech, restingSpeech } from '../lib/mochi';
import { LEVEL_SIZE, levelOf, levelProgress, REWARDS, STARS_PER_TASK } from '../lib/rewards';
import { useStore } from '../store/store';
import type { Wallpaper } from '../types';

const WALLS: { key: Wallpaper; label: string }[] = [
  { key: 'blush', label: 'Blush' },
  { key: 'lilac', label: 'Lilac' },
  { key: 'cream', label: 'Cream' },
  { key: 'peach', label: 'Peach' },
];

export function Rewards() {
  const { state, ui, actions } = useStore();
  const c = state.character;
  const speech = ui.speech ?? restingSpeech(state.tasks);
  const toNext = LEVEL_SIZE - (c.stars % LEVEL_SIZE);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Rewards <span className="hello-heart">✿</span></h1>
        <p className="lede">Every finished thing earns +{STARS_PER_TASK} ✦. Stars unlock little treasures for Mochi’s room.</p>
      </header>

      <div className="rewards-top">
        <div className="star-card">
          <span className="star-big">✦ {c.stars}</span>
          <span className="star-sub">Level {levelOf(c.stars)} · {toNext} ✦ to level {levelOf(c.stars) + 1}</span>
          <span className="lvl-bar wide"><i style={{ width: `${levelProgress(c.stars) * 100}%` }} /></span>
        </div>
      </div>

      <section className="decorate" aria-labelledby="rw-room">
        <div className="section-head">
          <h2 id="rw-room" className="caps">Mochi’s room</h2>
          <div className="walls" role="radiogroup" aria-label="Wallpaper">
            {WALLS.map((w) => (
              <button key={w.key} type="button" role="radio" aria-checked={c.wallpaper === w.key} aria-label={`${w.label} wallpaper`} className={`swatch wall-${w.key}${c.wallpaper === w.key ? ' on' : ''}`} onClick={() => actions.setWallpaper(w.key)} />
            ))}
          </div>
        </div>
        <div className="decorate-room">
          <Room character={c} mood={speech.mood} bounceKey={ui.bounce} onPoke={() => actions.say(pokeSpeech(state.tasks))} />
        </div>
      </section>

      <section aria-labelledby="rw-coll">
        <h2 id="rw-coll" className="caps">Your collection</h2>
        <p className="hint">Tap an unlocked treasure to put it in the room or tuck it away.</p>
        <ul className="collection">
          {REWARDS.map((r) => {
            const unlocked = c.unlockedItems.includes(r.id);
            const placed = c.placedItems.includes(r.id);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className={`treasure${unlocked ? ' unlocked' : ' locked'}${placed && unlocked ? ' placed' : ''}`}
                  disabled={!unlocked}
                  aria-pressed={unlocked ? placed : undefined}
                  onClick={() => actions.togglePlaced(r.id)}
                >
                  <span className="treasure-art"><ItemSticker id={r.id} size={52} /></span>
                  <b>{r.name}</b>
                  <small>
                    {unlocked ? (placed ? 'In the room ♡' : 'Tucked away') : r.stars === null ? 'Finish a project' : `${r.stars} ✦`}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
