import { useInitiativeViews } from '../../app/selectors';
import { useStore, type Mode } from '../../app/store';
import { SyncIndicator } from '../sync/SyncIndicator';
import { ProjectSwitcher } from './ProjectSwitcher';

const MODES: { id: Mode; label: string }[] = [
  { id: 'world', label: 'World' },
  { id: 'list', label: 'List' },
  { id: 'timeline', label: 'Timeline' },
];

export function TopBar() {
  const { state, actions } = useStore();
  const views = Object.values(useInitiativeViews(state));
  const now = views.filter((v) => v.initiative.zone === 'now').length;
  const items = views.reduce((n, v) => n + v.stats.total, 0);
  const atRisk = views.filter((v) => v.stats.health === 'at-risk').length;
  const blocked = views.filter((v) => v.stats.health === 'blocked').length;

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden>◆</span>
        <span className="brand-name">PRODUCT HQ</span>
      </div>
      <ProjectSwitcher />
      <div className="mode-switch" role="tablist" aria-label="View">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={state.mode === m.id} className={state.mode === m.id ? 'on' : ''} onClick={() => { actions.enterInitiative(null); actions.setMode(m.id); }}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="summary" aria-label="Roadmap summary">
        <span><b>{now}</b> in NOW</span>
        <span><b>{items}</b> items</span>
        <span className="sum-amber"><b>{atRisk}</b> At Risk</span>
        <span className="sum-red"><b>{blocked}</b> Blocked</span>
      </div>
      <div className="topbar-right">
        {!state.canEdit && <span className="badge-readonly" title="Ask the owner for Contributor access to make changes">View only</span>}
        <SyncIndicator />
        <button className="search-btn" onClick={() => actions.openModal('search')}>
          <span>Search</span>
          <kbd>/</kbd>
        </button>
        <button className="icon-btn" onClick={() => actions.openModal('settings')} aria-label="Settings">⚙</button>
        <button className="icon-btn hide-sm" onClick={() => actions.openModal('shortcuts')} aria-label="Keyboard shortcuts">?</button>
      </div>
    </header>
  );
}
