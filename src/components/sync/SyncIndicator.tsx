import { useEffect, useRef, useState } from 'react';
import { formatCopyTime, snapshotInfo, useStore } from '../../app/store';

function ago(ts: number | null) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

/** One pill for both kinds of sync: roadmap changes being saved, and live data from Tengu. */
export function SyncIndicator() {
  const { state, actions } = useStore();
  const { status, lastSyncedAt, error } = state.sync;
  const [, tick] = useState(0);
  const [flash, setFlash] = useState(false);
  const prevSaving = useRef(state.saving);

  useEffect(() => {
    const h = window.setInterval(() => tick((x) => x + 1), 5000);
    return () => window.clearInterval(h);
  }, []);

  useEffect(() => {
    if (prevSaving.current > 0 && state.saving === 0 && !state.saveError) {
      setFlash(true);
      const h = window.setTimeout(() => setFlash(false), 1400);
      prevSaving.current = state.saving;
      return () => window.clearTimeout(h);
    }
    prevSaving.current = state.saving;
  }, [state.saving, state.saveError]);

  const where = state.storeKind === 'shared' ? 'Saved for everyone with access' : 'Saved in this browser';

  if (state.saving > 0) {
    return <span className="sync sync-busy" aria-live="polite"><i className="spin">↻</i> Saving…</span>;
  }
  if (state.saveError && state.saveError !== 'View only') {
    return <span className="sync sync-error" title={state.saveError}>⚠ Not saved</span>;
  }
  const t = state.tengu.state;
  const snap = snapshotInfo(state);
  if (snap.inUse) {
    return (
      <button className="sync sync-ok" onClick={() => actions.openModal('settings')} title="Your view can’t reach Tengu directly, so tickets come from the copy teammates’ pages saved.">
        <i className="sync-dot sync-dot-info" />
        Tengu: shared copy · {formatCopyTime(snap.at)}
      </button>
    );
  }
  if (t === 'needs-allow' || t === 'not-connected' || t === 'reconnect' || t === 'unavailable') {
    const label = t === 'needs-allow' ? 'Tengu: allow access' : t === 'reconnect' ? 'Tengu: reconnect' : 'Tengu: not connected';
    return (
      <button className="sync sync-error" onClick={() => actions.openModal('settings')} title={state.tengu.message ?? undefined}>
        ⚠ {label}
      </button>
    );
  }
  if (status === 'error') {
    return (
      <button className="sync sync-error" onClick={() => void actions.retryTengu()} title={error ?? undefined}>
        ⚠ Tengu didn’t answer — <u>Retry</u>
      </button>
    );
  }
  const linked = state.items.some((i) => i.tengu);
  return (
    <button
      className={`sync sync-ok ${flash ? 'is-flash' : ''}`}
      onClick={() => void actions.syncNow()}
      title={`${where}. ${linked ? `Tengu checked ${ago(lastSyncedAt) || 'soon'}. Click to refresh (S).` : ''}`}
      aria-live="polite"
    >
      {status === 'syncing' ? <i className="spin">↻</i> : <i className="sync-dot" />}
      {flash ? 'Saved ✓' : status === 'syncing' ? 'Checking Tengu…' : linked && lastSyncedAt ? `Saved · Tengu ${ago(lastSyncedAt)}` : 'All changes saved'}
    </button>
  );
}
