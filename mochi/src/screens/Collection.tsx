/** Your creatures: one per world. Hatch them, level them up, dress them. */
import { TerrainPattern } from '../components/Environment';
import { Bar, WorldCreature, worldStyle } from '../components/ui';
import { ACCESSORIES, hatched, worldLevel, worldLevelProgress, worldStats, WORLD_LEVEL_XP } from '../lib/world';
import { useStore } from '../store/store';

const LINES = ['Hi.', 'Working on it.', 'What’s next?', 'I like it here.', 'Beep.', 'Ready when you are.'];

export function Collection() {
  const { state, actions } = useStore();
  const n = state.worlds.filter((w) => hatched(w, state.worldXp)).length;
  return (
    <div className="page">
      <header className="hello">
        <span className="eyebrow">Collection</span>
        <h1>{n} of {state.worlds.length} creatures</h1>
        <p className="sub">Each world hatches its creature with your first finished quest there. They level up and unlock things as you go.</p>
      </header>
      <div className="cgrid">
        {state.worlds.map((w) => {
          const xp = state.worldXp[w.id] ?? 0;
          const lvl = worldLevel(xp);
          const isH = hatched(w, state.worldXp);
          const eq = state.equipped[w.id] ?? [];
          const st = worldStats(w.id, state.quests);
          return (
            <article key={w.id} className={`ccard${isH ? '' : ' locked'}`} style={worldStyle(w)}>
              <button type="button" className="ccard-scene" onClick={() => (isH ? actions.say(w.id, LINES[Math.floor(Math.random() * LINES.length)], 'happy') : actions.navigate({ name: 'world', id: w.id }))} aria-label={isH ? `Say hi to ${w.creature.name}` : `Enter ${w.name} to hatch ${w.creature.name}`}>
                <TerrainPattern terrain={w.terrain} opacity={0.28} />
                <WorldCreature world={w} size={92} showSpeech />
              </button>
              <div className="ccard-body">
                <div className="ccard-top">
                  <b>{isH ? w.creature.name : '???'}</b>
                  <span className="lvl">{isH ? `LV ${lvl}` : 'EGG'}</span>
                </div>
                <span className="muted">{w.name} · {isH ? `${xp} ✦` : `finish a quest here to hatch`}</span>
                {isH ? (
                  <>
                    <Bar value={worldLevelProgress(xp)} color="var(--c)" label="Level progress" />
                    <span className="fine">{WORLD_LEVEL_XP - (xp % WORLD_LEVEL_XP)} ✦ to LV {lvl + 1}</span>
                    <div className="acc" aria-label="Accessories">
                      {ACCESSORIES.map((a) => {
                        const unlocked = lvl >= a.level;
                        return (
                          <button key={a.id} type="button" disabled={!unlocked} className={`acc-btn${eq.includes(a.id) ? ' on' : ''}`} aria-pressed={unlocked ? eq.includes(a.id) : undefined} onClick={() => actions.toggleAccessory(w.id, a.id)} title={unlocked ? a.name : `Unlocks at LV ${a.level}`}>
                            {unlocked ? a.name : `LV ${a.level}`}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => actions.navigate({ name: 'world', id: w.id })}>Enter {w.name} · {st.open} quests</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
