import { useState } from 'react';
import { pickFocus, type FocusPick } from '../lib/focus';
import { useStore } from '../store/store';
import { Sheet } from './Sheet';

/** "What's on my plate?" A summary of open work, then a focus pick. */
export function Plate() {
  const { state, ui, actions } = useStore();
  const [picks, setPicks] = useState<FocusPick[] | null>(null);
  const open = state.tasks.filter((t) => !t.completed);
  const rows = state.projects
    .map((p) => ({ p, n: open.filter((t) => t.projectId === p.id).length }))
    .filter((r) => r.n > 0);
  const total = open.length;
  const pep =
    total === 0 ? 'An empty plate. Treat yourself. 🍰'
      : total <= 5 ? 'Light and lovely. You can absolutely do this.'
      : total <= 10 ? 'You can absolutely do this.'
      : 'A full plate, babe. Let’s pick just three.';

  const close = () => {
    actions.setPlateOpen(false);
    setPicks(null);
  };

  return (
    <Sheet open={ui.plateOpen} onClose={close} title={picks ? 'Your focus today' : '♡ What’s on my plate?'} titleId="plate-h" className="sheet-plate">
      {!picks ? (
        <div className="plate">
          <div className="plate-dish" aria-hidden="true">
            <div className="plate-food">
              {rows.map((r) => (
                <span key={r.p.id} className="plate-bite" style={{ fontSize: `${Math.min(2.2, 1.2 + r.n * 0.16)}rem` }}>{r.p.icon}</span>
              ))}
            </div>
          </div>
          <ul className="plate-list">
            {rows.map((r) => (
              <li key={r.p.id} className={`theme-${r.p.color}`}>
                <span className="plate-ico">{r.p.icon}</span>
                <span className="plate-name">{r.p.name}</span>
                <span className="plate-count">{r.n} thing{r.n === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
          <div className="plate-total">
            <span>{total} thing{total === 1 ? '' : 's'} total</span>
          </div>
          <p className="plate-pep">“{pep}”</p>
          <button type="button" className="btn btn-primary btn-block" disabled={!total} onClick={() => setPicks(pickFocus(state.tasks))} data-autofocus>
            Pick my focus ✨
          </button>
        </div>
      ) : (
        <div className="focus-pick">
          <p className="focus-why">Picked by what’s late, what’s due soon and what matters most, with a bit of balance across projects.</p>
          <ol className="focus-list">
            {picks.map((f, i) => {
              const p = state.projects.find((x) => x.id === f.task.projectId)!;
              return (
                <li key={f.task.id} className={`theme-${p.color}`} style={{ animationDelay: `${i * 110}ms` }}>
                  <span className="focus-num">{i + 1}</span>
                  <span className="focus-body">
                    <b>{f.task.title}</b>
                    <small>{p.icon} {p.name} · {f.reason}</small>
                  </span>
                </li>
              );
            })}
          </ol>
          {picks.length === 0 && <p className="plate-pep">Nothing urgent at all. Pick anything that sounds fun ♡</p>}
          <div className="focus-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setPicks(null)}>Back to my plate</button>
            <button type="button" className="btn btn-primary" disabled={!picks.length} onClick={() => { actions.setFocus(picks.map((x) => x.task.id)); setPicks(null); }} data-autofocus>
              Let’s do this 💗
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
