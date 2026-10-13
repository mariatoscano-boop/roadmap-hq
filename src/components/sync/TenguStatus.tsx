import { useState } from 'react';
import { useStore } from '../../app/store';
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
  const c = COPY[state.tengu.state];
  if (!c) return null;
  const run = async () => {
    setBusy(true);
    try {
      if (c.action === 'allow') await actions.allowTengu();
      else if (c.action === 'retry') await actions.retryTengu();
      else actions.reloadPage();
    } finally {
      setBusy(false);
    }
  };
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
