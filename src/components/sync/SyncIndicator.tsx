import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../app/store';

function ago(ts: number | null) {
  if (!ts) return 'never';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s} seconds ago`;
  const m = Math.round(s / 60);
  return `${m} min${m > 1 ? 's' : ''} ago`;
}

export function SyncIndicator() {
  const { state, actions } = useStore();
  const { status, lastSyncedAt, error } = state.sync;
  const [, tick] = useState(0);
  const [flash, setFlash] = useState(false);
  const prev = useRef(status);

  useEffect(() => {
    const h = window.setInterval(() => tick((x) => x + 1), 1000);
    return () => window.clearInterval(h);
  }, []);

  useEffect(() => {
    if (prev.current === 'syncing' && status === 'synced') {
      setFlash(true);
      const h = window.setTimeout(() => setFlash(false), 1200);
      prev.current = status;
      return () => window.clearTimeout(h);
    }
    prev.current = status;
  }, [status]);

  if (status === 'error') {
    return (
      <button className="sync sync-error" onClick={() => void actions.retrySync()} title={error ?? undefined}>
        ⚠ Sync failed — <u>Retry</u>
      </button>
    );
  }
  if (status === 'syncing' || status === 'idle') {
    return (
      <span className="sync sync-busy" aria-live="polite">
        <i className="spin">↻</i> Syncing…
      </span>
    );
  }
  return (
    <button className={`sync sync-ok ${flash ? 'is-flash' : ''}`} onClick={() => void actions.syncNow()} title="Sync with Tengu (S)" aria-live="polite">
      <i className="sync-dot" />
      {flash ? 'Synced ✓' : `Synced ${ago(lastSyncedAt)}`}
    </button>
  );
}
