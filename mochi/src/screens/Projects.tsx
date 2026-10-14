import { Garden, TaskRow } from '../components/TaskRow';
import { IconBack, IconCloud, IconHeart, IconPlus } from '../components/Icons';
import { WorldDecor } from '../components/WorldDecor';
import { bucketOf, type DueBucket } from '../lib/dates';
import { projectStats, sortTasks } from '../lib/selectors';
import { useStore } from '../store/store';
import type { Project } from '../types';

function SourceNote({ p }: { p: Project }) {
  return p.source === 'tengu' ? (
    <span className="world-src"><IconCloud size={13} /> Synced with Tengu</span>
  ) : (
    <span className="world-src"><IconHeart size={12} /> Just you</span>
  );
}

export function Projects() {
  const { state, actions } = useStore();
  return (
    <div className="page">
      <header className="page-head">
        <h1>Your little worlds</h1>
        <p className="lede">Every project gets its own garden. It blooms as you go.</p>
      </header>
      <div className="worlds">
        {state.projects.map((p) => {
          const st = projectStats(p, state.tasks);
          const pct = Math.round(st.progress * 100);
          return (
            <button key={p.id} type="button" className={`world theme-${p.color}`} onClick={() => actions.navigate({ name: 'project', id: p.id })}>
              <WorldDecor theme={p.color} />
              <span className="world-icon" aria-hidden="true">{p.icon}</span>
              <span className="world-name">{p.name} <span className="world-heart">♡</span></span>
              <span className="world-pct">{pct}% complete</span>
              <Garden done={st.done} total={st.total} />
              <span className="world-meta">
                <span>{st.open} to go · {st.done} done</span>
                <SourceNote p={p} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const BUCKETS: { key: DueBucket; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'later', label: 'Later' },
  { key: 'someday', label: 'Someday' },
];

export function ProjectDetail({ id }: { id: string }) {
  const { state, actions } = useStore();
  const p = state.projects.find((x) => x.id === id);
  if (!p) {
    return (
      <div className="page">
        <button type="button" className="back" onClick={() => actions.navigate({ name: 'projects' })}><IconBack size={18} /> Projects</button>
        <p className="empty">That project isn’t here anymore.</p>
      </div>
    );
  }
  const tasks = state.tasks.filter((t) => t.projectId === p.id).sort(sortTasks);
  const st = projectStats(p, state.tasks);
  const pct = Math.round(st.progress * 100);
  const openTasks = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <div className={`page project theme-${p.color}`}>
      <button type="button" className="back" onClick={() => actions.navigate({ name: 'projects' })}><IconBack size={18} /> Projects</button>
      <header className="project-hero">
        <WorldDecor theme={p.color} />
        <span className="world-icon big" aria-hidden="true">{p.icon}</span>
        <div className="project-hero-text">
          <h1>{p.name} <span className="world-heart">♡</span></h1>
          <SourceNote p={p} />
        </div>
        <div className="project-progress">
          <div className="pp-top">
            <span className="pp-pct">{pct}%</span>
            <span className="pp-label">{st.open === 0 && st.total > 0 ? 'all done! 🪩' : 'complete'}</span>
          </div>
          <div className="pp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${p.name} progress`}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <Garden done={st.done} total={st.total} max={12} />
        </div>
      </header>

      <div className="project-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => actions.openQuickAdd(p.id)}><IconPlus size={16} /> Add to {p.name}</button>
      </div>

      {openTasks.length === 0 && (
        <div className="empty">
          <p>{st.total ? `Every ${p.name} task is done. Look at this garden. 🌸` : 'Nothing here yet. Plant the first task.'}</p>
        </div>
      )}

      {BUCKETS.map((b) => {
        const items = openTasks.filter((t) => bucketOf(t.dueDate) === b.key);
        if (!items.length) return null;
        return (
          <section key={b.key} className={`bucket bucket-${b.key}`} aria-label={b.label}>
            <h2 className="caps">{b.label}</h2>
            <ul className="tasks">{items.map((t) => <TaskRow key={t.id} task={t} project={p} />)}</ul>
          </section>
        );
      })}

      {done.length > 0 && (
        <details className="bucket done-bucket" open={done.length <= 3}>
          <summary className="caps">Done · {done.length}</summary>
          <ul className="tasks">{done.map((t) => <TaskRow key={t.id} task={t} project={p} />)}</ul>
        </details>
      )}
    </div>
  );
}
