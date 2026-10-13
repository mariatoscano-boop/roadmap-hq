import { useState } from 'react';
import { useStore } from '../../app/store';
import { TenguStatusCard } from '../sync/TenguStatus';

export function SettingsModal() {
  const { state, actions } = useStore();
  const [base, setBase] = useState(state.settings.tenguBaseUrl);
  const shared = state.storeKind === 'shared';

  return (
    <div className="modal-scrim" onMouseDown={actions.closeModal}>
      <form
        className="modal modal-sm modal-form"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          const v = base.trim().replace(/\/+$/, '');
          if (v !== state.settings.tenguBaseUrl) actions.saveSettings({ ...state.settings, tenguBaseUrl: v });
          actions.closeModal();
        }}
        aria-label="Settings"
      >
        <header className="modal-head"><h3>Settings</h3></header>

        <div className="settings-block">
          <h4>Where changes are saved</h4>
          {shared ? (
            <p>Saved for everyone who has this page. Changes show up for others within a few seconds.{' '}
              {state.canEdit ? 'You can edit.' : 'You have view-only access. Ask the owner for Contributor access to make changes.'}
            </p>
          ) : (
            <p>Saved in this browser only (sample mode). Publish the page as an Artifact to share it.</p>
          )}
        </div>

        <div className="settings-block">
          <h4>Tengu</h4>
          <p>
            {state.tengu.state === 'connected'
              ? '✓ Connected through your own Tengu account. Linked tickets refresh every couple of minutes.'
              : state.tengu.state === 'sample'
                ? 'Using sample tickets. In the published page, Tengu connects through each viewer’s own account.'
                : state.tengu.state === 'checking'
                  ? 'Connecting to Tengu with your own account…'
                  : 'Each person connects with their own Tengu account.'}
          </p>
          <TenguStatusCard />
          <label className="field">
            <span>Tengu web address</span>
            <input id="tengu-base" placeholder="https://your-tengu-address" value={base} onChange={(e) => setBase(e.target.value)} disabled={!state.canEdit} />
          </label>
          <p className="fine">Used for “Open in Tengu” on tickets that don’t include a full link.</p>
        </div>

        <footer className="modal-foot">
          {state.storeKind === 'local' && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { actions.resetLocal(); actions.closeModal(); }}>Reset sample data</button>
          )}
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={actions.closeModal}>Cancel</button>
          <button className="btn btn-primary">Save</button>
        </footer>
      </form>
    </div>
  );
}
