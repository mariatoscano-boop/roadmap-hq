import { Room, SpeechBubble } from '../components/Room';
import { Garden, TaskRow } from '../components/TaskRow';
import { IconChevron, IconPlate, IconPlus } from '../components/Icons';
import { daysFromToday, greeting, longDate, today } from '../lib/dates';
import { pokeSpeech, restingSpeech } from '../lib/mochi';
import { levelOf, nextReward } from '../lib/rewards';
import { projectStats, sortTasks, todayTasks } from '../lib/selectors';
import { useStore } from '../store/store';

export function Today() {
  const { state, ui, actions } = useStore();
  const list = todayTasks(state.tasks).sort(sortTasks);
  const open = list.filter((t) => !t.completed).length;
  const speech = ui.speech ?? restingSpeech(state.tasks);
  const next = nextReward(state.character.unlockedItems);

  const lede =
    list.length === 0 ? 'Nothing scheduled today. Enjoy the calm.'
      : open === 0 ? 'Everything’s done. Go be iconic. ✨'
      : open === 1 ? 'Just 1 thing to conquer today.'
      : `You have ${open} things to conquer today.`;

  const focusIds = state.focus?.date === today() ? state.focus.ids : [];
  const focus = focusIds.map((id) => state.tasks.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => !!t);
  const focusDone = focus.length > 0 && focus.every((t) => t.completed);

  const groups = state.projects
    .map((p) => ({ p, tasks: list.filter((t) => t.projectId === p.id) }))
    .filter((g) => g.tasks.length > 0);

  const soon = state.tasks
    .filter((t) => !t.completed && t.dueDate && daysFromToday(t.dueDate) > 0 && daysFromToday(t.dueDate) <= 7)
    .sort(sortTasks)
    .slice(0, 4);

  const pointAt = speech.taskId ? state.tasks.find((t) => t.id === speech.taskId) : undefined;

  return (
    <div className="page today">
      <header className="hello">
        <p className="eyebrow">{longDate()}</p>
        <h1>
          {greeting()}, <em>{state.character.name || 'you'}</em>! <span className="hello-heart">♡</span>
        </h1>
        <p className="lede">{lede}</p>
      </header>

      <div className="today-grid">
        <section className="pal-card" aria-label="Mochi">
          <SpeechBubble
            line={speech.line}
            onPoint={pointAt ? () => actions.openTask(pointAt.id) : undefined}
            pointLabel={pointAt ? `Open “${pointAt.title}”` : undefined}
          />
          <Room
            character={state.character}
            mood={speech.mood}
            bounceKey={ui.bounce}
            onPoke={() => actions.say(pokeSpeech(state.tasks))}
          />
          <div className="pal-foot">
            <div className="pal-stats">
              <span className="pal-level">Level {levelOf(state.character.stars)}</span>
              <span className="pal-next">{next ? `${Math.max(0, (next.stars ?? 0) - state.character.stars)} ✦ to ${next.name.toLowerCase()}` : 'Room fully unlocked ✨'}</span>
            </div>
            <button type="button" className="btn btn-soft btn-sm" onClick={() => actions.setPlateOpen(true)}>
              <IconPlate size={16} /> What’s on my plate?
            </button>
          </div>
        </section>

        <div className="today-main">
          {focus.length > 0 && (
            <section className={`focus-card${focusDone ? ' is-done' : ''}`} aria-labelledby="focus-h">
              <div className="section-head">
                <h2 id="focus-h" className="caps">{focusDone ? 'Focus complete ✨' : 'Your focus today'}</h2>
                <button type="button" className="link" onClick={actions.clearFocus}>Clear</button>
              </div>
              <ol className="tasks">
                {focus.map((t) => <TaskRow key={t.id} task={t} showProject />)}
              </ol>
            </section>
          )}

          <section aria-labelledby="today-h">
            <h2 id="today-h" className="caps today-label">Today</h2>
            {groups.length === 0 && (
              <div className="empty">
                <p>No tasks due today.</p>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => actions.openQuickAdd()}><IconPlus size={16} /> Add something</button>
              </div>
            )}
            {groups.map(({ p, tasks }) => {
              const st = projectStats(p, state.tasks);
              const done = tasks.filter((t) => t.completed).length;
              return (
                <div key={p.id} className={`group theme-${p.color}`}>
                  <button type="button" className="group-head" onClick={() => actions.navigate({ name: 'project', id: p.id })} aria-label={`Open ${p.name}`}>
                    <span className="group-name"><span className="group-heart">♡</span> {p.name}</span>
                    <span className="group-count">{tasks.length} task{tasks.length === 1 ? '' : 's'}{done ? ` · ${done} done` : ''}</span>
                    <Garden done={st.done} total={st.total} max={7} />
                    <IconChevron size={16} className="group-chev" />
                  </button>
                  <ul className="tasks">
                    {tasks.map((t) => <TaskRow key={t.id} task={t} project={p} />)}
                  </ul>
                </div>
              );
            })}
            <button type="button" className="add-inline" onClick={() => actions.openQuickAdd()}>
              <IconPlus size={18} /> Add something
            </button>
          </section>

          {soon.length > 0 && (
            <section aria-labelledby="soon-h" className="soon">
              <h2 id="soon-h" className="caps">Coming up this week</h2>
              <ul className="tasks">
                {soon.map((t) => <TaskRow key={t.id} task={t} showProject />)}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
