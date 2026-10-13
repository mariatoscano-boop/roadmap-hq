import { useEffect } from 'react';
import { InitiativeView } from '../components/initiative/InitiativeView';
import { NewInitiativeModal } from '../components/initiative/NewInitiativeModal';
import { Intro, ShortcutsOverlay, SpotlightChip, StatusBanner, Toasts } from '../components/hud/Overlays';
import { QuickActions } from '../components/hud/QuickActions';
import { SettingsModal } from '../components/hud/SettingsModal';
import { TopBar } from '../components/hud/TopBar';
import { TenguBanner } from '../components/sync/TenguStatus';
import { ListView } from '../components/list/ListView';
import { SearchPalette } from '../components/search/SearchPalette';
import { AddWorkModal } from '../components/tickets/AddWorkModal';
import { ItemPanel } from '../components/tickets/ItemPanel';
import { Timeline } from '../components/timeline/Timeline';
import { World } from '../components/world/World';
import { useStore } from './store';

function useShortcuts() {
  const { state, actions } = useStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
      if (e.key === 'Escape') {
        if (state.modal) return actions.closeModal();
        if (state.activeItem) return actions.openItem(null);
        if (state.activeInitiative) return actions.enterInitiative(null);
        if (state.spotlight) return actions.setSpotlight(null);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || state.modal) return;
      const k = e.key.toLowerCase();
      const go = (mode: 'world' | 'list' | 'timeline') => { actions.enterInitiative(null); actions.setMode(mode); };
      if (e.key === '/') { e.preventDefault(); actions.openModal('search'); }
      else if (e.key === '?') actions.openModal('shortcuts');
      else if (k === 'a' && state.canEdit) { e.preventDefault(); actions.openModal('add', state.activeInitiative); }
      else if (k === 'n' && state.canEdit) { e.preventDefault(); actions.openModal('new-initiative'); }
      else if (k === 's') void actions.syncNow();
      else if (k === '1') go('world');
      else if (k === '2') go('list');
      else if (k === '3') go('timeline');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.modal, state.activeItem, state.activeInitiative, state.spotlight, state.canEdit, actions]);
}

export function App() {
  const { state } = useStore();
  useShortcuts();
  return (
    <div className="app">
      <TopBar />
      <main className="stage">
        {!state.ready ? (
          <div className="loading" role="status">Opening Product HQ…</div>
        ) : state.mode === 'world' ? <World key={state.projectId ?? ''} /> : state.activeInitiative ? null : state.mode === 'list' ? <ListView /> : <Timeline />}
        {state.activeInitiative && <InitiativeView key={state.activeInitiative} />}
      </main>
      <StatusBanner />
      <TenguBanner />
      <SpotlightChip />
      <ItemPanel />
      {!state.activeItem && state.canEdit && <QuickActions />}
      <Toasts />
      {state.modal === 'search' && <SearchPalette />}
      {(state.modal === 'add' || state.modal === 'link-item') && <AddWorkModal key={`${state.modal}-${state.modalTarget}`} />}
      {state.modal === 'new-initiative' && <NewInitiativeModal />}
      {state.modal === 'settings' && <SettingsModal />}
      {state.modal === 'shortcuts' && <ShortcutsOverlay />}
      <Intro />
    </div>
  );
}
