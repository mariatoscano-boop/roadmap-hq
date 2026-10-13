import { useInitiativeViews } from '../../app/selectors';
import { useStore } from '../../app/store';
import { SyncIndicator } from '../sync/SyncIndicator';

export function TopBar() {
  const { state, actions } = useStore();
  const views = Object.values(useInitiativeViews(state));
  const active = views.filter((v) => v.initiative.status !== 'Shipped').length;
  const tickets = new Set(Object.values(state.roadmap.links).flat()).size;
  const atRisk = views.filter((v) => v.stats.health === 'at-risk').length;
  const blocked = views.filter((v) => v.stats.health === 'blocked').length;

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>◆</span>
        <span className="brand-name">PRODUCT HQ</span>
      </div>
      <div className="mode-switch" role="tablist" aria-label="View">
        <button role="tab" aria-selected={state.mode === 'world'} className={state.mode === 'world' ? 'on' : ''} onClick={() => actions.setMode('world')}>
          World
        </button>
        <button role="tab" aria-selected={state.mode === 'timeline'} className={state.mode === 'timeline' ? 'on' : ''} onClick={() => { actions.enterInitiative(null); actions.setMode('timeline'); }}>
          Timeline
        </button>
      </div>
      <div className="summary" aria-label="Roadmap summary">
        <span><b>{active}</b> Active Initiatives</span>
        <span><b>{tickets}</b> Tickets</span>
        <span className="sum-amber"><b>{atRisk}</b> At Risk</span>
        <span className="sum-red"><b>{blocked}</b> Blocked</span>
      </div>
      <div className="topbar-right">
        <SyncIndicator />
        <button className="search-btn" onClick={() => actions.openModal('search')}>
          <span>Search</span>
          <kbd>/</kbd>
        </button>
        <button className="icon-btn" onClick={() => actions.openModal('shortcuts')} aria-label="Keyboard shortcuts">?</button>
      </div>
    </header>
  );
}
