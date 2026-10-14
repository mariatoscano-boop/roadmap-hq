import { useEffect } from 'react';
import { Composer } from './components/Composer';
import { Connections } from './components/Connections';
import { FocusMode } from './components/FocusMode';
import { NewWorld } from './components/NewWorld';
import { QuestPanel } from './components/QuestPanel';
import { BottomBar, NAV, Toasts, TopBar } from './components/Shell';
import { Collection } from './screens/Collection';
import { Quests } from './screens/Quests';
import { Today } from './screens/Today';
import { Worlds, WorldView } from './screens/Worlds';
import { useStore } from './store/store';

export function App() {
  const { ui, actions } = useStore();

  // C or N: new quest. 1–4: switch views.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
      if (ui.composer.open || ui.focus || ui.openQuestId || ui.connectionsOpen || ui.newWorldOpen) return;
      if (e.key === 'c' || e.key === 'n' || e.key === '+') { e.preventDefault(); actions.openComposer(); }
      const i = Number(e.key) - 1;
      if (NAV[i]) actions.navigate({ name: NAV[i].name });
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [actions, ui.composer.open, ui.focus, ui.openQuestId, ui.connectionsOpen, ui.newWorldOpen]);

  const v = ui.view;
  return (
    <div className="shell">
      <TopBar />
      <main className="main">
        <div key={v.name === 'world' ? `w-${v.id}` : v.name} className={`view${v.name === 'world' ? ' view-enter-world' : ''}`}>
          {v.name === 'today' && <Today />}
          {v.name === 'worlds' && <Worlds />}
          {v.name === 'world' && <WorldView id={v.id} />}
          {v.name === 'quests' && <Quests />}
          {v.name === 'collection' && <Collection />}
        </div>
      </main>
      <BottomBar />
      <QuestPanel />
      <Composer />
      <NewWorld />
      <Connections />
      <FocusMode />
      <Toasts />
    </div>
  );
}
