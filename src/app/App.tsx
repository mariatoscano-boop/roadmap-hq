import { useEffect } from 'react';
import { InitiativeView } from '../components/initiative/InitiativeView';
import { NewInitiativeModal } from '../components/initiative/NewInitiativeModal';
import { Intro, ShortcutsOverlay, SpotlightChip, Toasts } from '../components/hud/Overlays';
import { QuickActions } from '../components/hud/QuickActions';
import { TopBar } from '../components/hud/TopBar';
import { SearchPalette } from '../components/search/SearchPalette';
import { CreateTicketModal } from '../components/tickets/CreateTicketModal';
import { LinkTicketsModal } from '../components/tickets/LinkTicketsModal';
import { TicketPanel } from '../components/tickets/TicketPanel';
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
        if (state.activeTicket) return actions.openTicket(null);
        if (state.activeInitiative) return actions.enterInitiative(null);
        if (state.spotlight) return actions.setSpotlight(null);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || state.modal) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); actions.openModal('search'); }
      else if (e.key === '?') actions.openModal('shortcuts');
      else if (k === 'n') { e.preventDefault(); actions.openModal('new-initiative'); }
      else if (k === 'l') actions.openModal('link', state.activeInitiative);
      else if (k === 'c') { e.preventDefault(); actions.openModal('create', state.activeInitiative); }
      else if (k === 's') void actions.syncNow();
      else if (k === 't') { actions.enterInitiative(null); actions.setMode(state.mode === 'world' ? 'timeline' : 'world'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.modal, state.activeTicket, state.activeInitiative, state.spotlight, state.mode, actions]);
}

export function App() {
  const { state } = useStore();
  useShortcuts();
  return (
    <div className="app">
      <TopBar />
      <main className="stage">
        {state.mode === 'world' ? <World /> : <Timeline />}
        {state.activeInitiative && <InitiativeView key={state.activeInitiative} />}
      </main>
      <SpotlightChip />
      <TicketPanel />
      {!state.activeTicket && <QuickActions />}
      <Toasts />
      {state.modal === 'search' && <SearchPalette />}
      {state.modal === 'link' && <LinkTicketsModal />}
      {state.modal === 'create' && <CreateTicketModal />}
      {state.modal === 'new-initiative' && <NewInitiativeModal />}
      {state.modal === 'shortcuts' && <ShortcutsOverlay />}
      <Intro />
    </div>
  );
}
