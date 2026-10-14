import { useEffect } from 'react';
import { BottomNav, Confetti, Fab, Rail, Toasts, TopBar } from './components/Chrome';
import { Plate } from './components/Plate';
import { QuickAdd } from './components/QuickAdd';
import { TaskDetail } from './components/TaskDetail';
import { LittleThings } from './screens/LittleThings';
import { MyTasks } from './screens/MyTasks';
import { ProjectDetail, Projects } from './screens/Projects';
import { Rewards } from './screens/Rewards';
import { Today } from './screens/Today';
import { useStore } from './store/store';

export function App() {
  const { ui, actions } = useStore();

  // "n" or "+" opens quick add from anywhere (when not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable) return;
      if (document.querySelector('.sheet-layer')) return;
      if (e.key === 'n' || e.key === '+') {
        e.preventDefault();
        actions.openQuickAdd();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions]);

  const v = ui.view;
  const viewKey = v.name === 'project' ? `project-${v.id}` : v.name;

  return (
    <div className="shell">
      <Rail />
      <TopBar />
      <main className="main" id="main">
        <div key={viewKey} className="view-enter">
          {v.name === 'today' && <Today />}
          {v.name === 'projects' && <Projects />}
          {v.name === 'project' && <ProjectDetail id={v.id} />}
          {v.name === 'mine' && <MyTasks />}
          {v.name === 'little' && <LittleThings />}
          {v.name === 'rewards' && <Rewards />}
        </div>
      </main>
      <BottomNav />
      <Fab />
      <QuickAdd />
      <TaskDetail />
      <Plate />
      <Toasts />
      <Confetti />
    </div>
  );
}
