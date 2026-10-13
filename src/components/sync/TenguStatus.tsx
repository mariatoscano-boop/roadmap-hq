import { useState } from 'react';
import { formatCopyTime, snapshotInfo, useStore } from '../../app/store';
import type { TenguState } from '../../services/tengu';

const COPY: Partial<Record<TenguState, { title: string; body: string; action: 'allow' | 'reload' | 'retry' }>> = {
  'needs-allow': {
    title: 'Allow Tengu for this page',
    body: 'This page uses your own Tengu connection to find and show tickets. Nothing is changed in Tengu.',
    action: 'allow',
  },
  'not-connected': {
    title: 'Tengu isn’t connected to your claude.ai account',
    body: 'Add the Tengu connector in claude.ai → Settings → Connectors, then reload this page.',
    action: 'reload',
  },
  reconnect: {
    title: 'Your Tengu connection expired',
    body: 'Reconnect Tengu in claude.ai → Settings → Connectors, then reload this page.',
    action: 'reload',
  },
  unavailable: {
    title: 'Tengu can’t be reached from this view',
    body: 'Open the page on claude.ai, signed in to your organization’s account. Roadmap items still work.',
    action: 'reload',
  },
  error: {
    title: 'Tengu didn’t answer',
    body: '',
    action: 'retry',
  },
};

export const tenguReady = (s: TenguState) => s === 'connected' || s === 'sample' || s === 'checking';

/** Explains why tickets aren't showing, with the one action that fixes it. */
export function TenguStatusCard({ compact = false, onDismiss }: { compact?: boolean; onDismiss?: () => void }) {
  const { state, actions } = useStore();
  const [busy, setBusy] = useState(false);
  const snap = snapshotInfo(state);
  const c = COPY[state.tengu.state];
  if (!c) return null;
  if (snap.inUse) {
    // Teammates' copy is filling in: say so calmly, and keep the fix for states the viewer can fix.
    const fixable = state.tengu.state === 'needs-allow' || state.tengu.state === 'reconnect' || state.tengu.state === 'error';
    return (
      <div className={`tengu-card is-info ${compact ? 'is-compact' : ''}`} role="status">
        <span className="tengu-card-icon" aria-hidden>↻</span>
        <div className="tengu-card-text">
          <b>Showing Tengu tickets shared by teammates · as of {formatCopyTime(snap.at)}</b>
          {!compact && (
            <span>
              {state.tengu.state === 'unavailable'
                ? 'Your view can’t reach Tengu directly, which usually means you’re signed in to a different claude.ai organization. You can still find and link tickets; open them in Tengu for details.'
                : `${c.title}. You can still find and link tickets from the shared copy.`}
            </span>
          )}
        </div>
        {fixable && (
          <button className="btn btn-sm" disabled={busy} onClick={run}>
            {busy ? 'Checking…' : c.action === 'allow' ? 'Allow Tengu' : c.action === 'retry' ? 'Try again' : 'Reload'}
          </button>
        )}
        {onDismiss && <button className="icon-btn tengu-card-x" onClick={onDismiss} aria-label="Hide">✕</button>}
      </div>
    );
  }
  async function run() {
    if (!c) return;
    setBusy(true);
    try {
      if (c.action === 'allow') await actions.allowTengu();
      else if (c.action === 'retry') await actions.retryTengu();
      else actions.reloadPage();
    } finally {
      setBusy(false);
    }
  }
  const body = c.body || state.tengu.message || '';
  return (
    <div className={`tengu-card ${compact ? 'is-compact' : ''}`} role="status">
      <span className="tengu-card-icon" aria-hidden>⚠</span>
      <div className="tengu-card-text">
        <b>{c.title}</b>
        {!compact && <span>{body}</span>}
      </div>
      <button className="btn btn-sm btn-primary" disabled={busy} onClick={run}>
        {busy ? 'Checking…' : c.action === 'allow' ? 'Allow Tengu' : c.action === 'retry' ? 'Try again' : 'Reload'}
      </button>
      {onDismiss && <button className="icon-btn tengu-card-x" onClick={onDismiss} aria-label="Hide">✕</button>}
    </div>
  );
}

/** Compact banner under the top bar while Tengu needs attention. */
export function TenguBanner() {
  const { state } = useStore();
  const [hidden, setHidden] = useState<string | null>(null);
  if (tenguReady(state.tengu.state) || hidden === state.tengu.state || state.activeItem || state.modal) return null;
  return (
    <div className="tengu-banner">
      <TenguStatusCard compact onDismiss={() => setHidden(state.tengu.state)} />
    </div>
  );
}
