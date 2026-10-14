import { useState } from 'react';
import { TaskRow } from '../components/TaskRow';
import { parseQuickAdd } from '../lib/parse';
import { sortTasks } from '../lib/selectors';
import { useStore } from '../store/store';

export function MyTasks() {
  const { state, actions } = useStore();
  const [show, setShow] = useState<'open' | 'done'>('open');
  const [text, setText] = useState('');
  const mine = state.tasks.filter((t) => t.source === 'personal').sort(sortTasks);
  const openCount = mine.filter((t) => !t.completed).length;
  const list = mine.filter((t) => (show === 'open' ? !t.completed : t.completed));

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseQuickAdd(text, state.projects);
    const title = p.title || text.trim();
    if (!title) return;
    actions.addTask({ title, projectId: p.projectId ?? 'personal', dueDate: p.dueDate ?? null, priority: p.priority ?? 'medium', toTengu: false });
    setText('');
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>My little to-dos <span className="hello-heart">♡</span></h1>
        <p className="lede">Things that are just yours. They stay in Mochi unless you send one to Tengu.</p>
      </header>

      <form className="inline-add" onSubmit={add}>
        <label className="sr-only" htmlFor="mine-add">Add a little to-do</label>
        <span className="inline-add-heart" aria-hidden="true">♡</span>
        <input id="mine-add" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a little to-do... (try “call mom friday”)" autoComplete="off" />
        <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim()}>Add</button>
      </form>

      <div className="chips" role="tablist" aria-label="Show">
        <button type="button" role="tab" aria-selected={show === 'open'} className={show === 'open' ? 'on' : ''} onClick={() => setShow('open')}>To do · {openCount}</button>
        <button type="button" role="tab" aria-selected={show === 'done'} className={show === 'done' ? 'on' : ''} onClick={() => setShow('done')}>Done · {mine.length - openCount}</button>
      </div>

      {list.length ? (
        <ul className="tasks card-list">{list.map((t) => <TaskRow key={t.id} task={t} showProject />)}</ul>
      ) : (
        <div className="empty"><p>{show === 'open' ? 'All your little to-dos are done. Cute.' : 'Nothing finished yet. Soon!'}</p></div>
      )}
    </div>
  );
}
