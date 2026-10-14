import { useEffect } from 'react';
import { Composer } from './components/Composer';
import { FocusMode } from './components/FocusMode';
import { Settings } from './components/Settings';
import { BottomNav, DragDock, LevelUpBanner, NAV, Sidebar, Toasts, TopBar } from './components/Shell';
import { TaskPanel } from './components/TaskPanel';
import { ActivityView } from './screens/Activity';
import { MyWork } from './screens/MyWork';
import { ProjectDetail, Projects } from './screens/Projects';
import { Team } from './screens/Team';
import { Today } from './screens/Today';
import { useStore } from './store/store';

export function App() {
  const { ui, actions, projectOf } = useStore();

  // C or N opens the composer; 1–5 switch views.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable) return;
      if (ui.composer.open || ui.focus || ui.openTaskId || ui.settingsOpen) return;
      if (e.key === 'c' || e.key === 'n') {
        e.preventDefault();
        actions.openComposer();
      }
      const idx = Number(e.key) - 1;
      if (NAV[idx]) actions.navigate({ name: NAV[idx].name });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, ui.composer.open, ui.focus, ui.openTaskId, ui.settingsOpen]);

  // A drop can unmount the dragged row (e.g. reassigning it off "Mine"), so its own dragend
  // may never fire. Clear the drag state from the window instead.
  useEffect(() => {
    const clear = () => window.setTimeout(() => actions.setDrag(null), 0);
    window.addEventListener('drop', clear);
    window.addEventListener('dragend', clear);
    return () => {
      window.removeEventListener('drop', clear);
      window.removeEventListener('dragend', clear);
    };
  }, [actions]);

  const v = ui.view;
  const viewKey = v.name === 'project' ? `project-${v.id}` : v.name;
  const crumb = v.name === 'project' ? `Projects / ${projectOf(v.id).name}` : NAV.find((n) => n.name === v.name)?.label ?? '';

  return (
    <div className={`shell${ui.dragTaskId ? ' is-dragging' : ''}`}>
      <Sidebar />
      <div className="canvas">
        <TopBar title={crumb} />
        <main className="main" id="main">
          <div key={viewKey} className="view">
            {v.name === 'today' && <Today />}
            {v.name === 'work' && <MyWork />}
            {v.name === 'projects' && <Projects />}
            {v.name === 'project' && <ProjectDetail id={v.id} />}
            {v.name === 'team' && <Team />}
            {v.name === 'activity' && <ActivityView />}
          </div>
        </main>
      </div>
      <BottomNav />
      <DragDock />
      <TaskPanel />
      <Composer />
      <Settings />
      <FocusMode />
      <LevelUpBanner />
      <Toasts />
    </div>
  );
}
