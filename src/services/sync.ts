/**
 * SyncEngine — keeps a local cache of Tengu tickets fresh and pushes Tengu-owned edits back.
 *
 * - Pull: Tengu has no webhooks/realtime, so we poll `getTickets({ since })` on an interval.
 * - Push: edits are applied optimistically; on failure they roll back and stay queued for Retry.
 */
import type { TenguAdapter } from './tengu';
import type { TenguTicket, TenguTicketUpdate } from '../types/tengu';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncSnapshot {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  failedOps: number;
}

interface PendingUpdate {
  ticketId: string;
  updates: TenguTicketUpdate;
  previous: TenguTicket;
}

export interface SyncCallbacks {
  /** Tickets fetched from Tengu (full or incremental). */
  onTickets(tickets: TenguTicket[], opts: { full: boolean }): void;
  /** Tickets changed remotely by someone else since the last pull. */
  onRemoteChanges(tickets: TenguTicket[]): void;
  onState(snapshot: SyncSnapshot): void;
}

export class SyncEngine {
  private snapshot: SyncSnapshot = { status: 'idle', lastSyncedAt: null, error: null, failedOps: 0 };
  private cursor: string | null = null;
  private failed: PendingUpdate[] = [];
  private inflight = 0;
  private timer: number | null = null;
  /** Tickets we just wrote — don't announce our own changes as remote ones. */
  private recentlyPushed = new Set<string>();

  constructor(private adapter: TenguAdapter, private cb: SyncCallbacks, private intervalMs = 30_000) {}

  start() {
    void this.pull(true);
    this.timer = window.setInterval(() => void this.pull(false), this.intervalMs);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
  }

  private set(p: Partial<SyncSnapshot>) {
    this.snapshot = { ...this.snapshot, ...p, failedOps: this.failed.length };
    this.cb.onState(this.snapshot);
  }

  private begin() {
    this.inflight++;
    this.set({ status: 'syncing' });
  }

  private end(error?: string) {
    this.inflight = Math.max(0, this.inflight - 1);
    if (error) return this.set({ status: 'error', error });
    if (this.inflight === 0) this.set({ status: this.failed.length ? 'error' : 'synced', lastSyncedAt: Date.now(), error: this.failed.length ? this.snapshot.error : null });
  }

  async pull(full = false) {
    this.begin();
    try {
      const startedAt = new Date().toISOString();
      const tickets = await this.adapter.getTickets(full || !this.cursor ? {} : { since: this.cursor });
      this.cursor = startedAt;
      this.cb.onTickets(tickets, { full });
      const remote = full ? [] : tickets.filter((t) => !this.recentlyPushed.has(t.id));
      if (remote.length) this.cb.onRemoteChanges(remote);
      this.recentlyPushed.clear();
      this.end();
    } catch (e) {
      this.end((e as Error).message || 'Sync failed');
    }
  }

  /** Push an update to Tengu. The caller has already applied it optimistically. */
  async push(ticketId: string, updates: TenguTicketUpdate, previous: TenguTicket): Promise<TenguTicket | null> {
    this.begin();
    try {
      const fresh = await this.adapter.updateTicket(ticketId, updates);
      this.recentlyPushed.add(ticketId);
      this.cb.onTickets([fresh], { full: false });
      this.end();
      return fresh;
    } catch (e) {
      // Roll back, keep for retry.
      this.failed.push({ ticketId, updates, previous });
      this.cb.onTickets([previous], { full: false });
      this.end((e as Error).message || 'Sync failed');
      return null;
    }
  }

  async retry() {
    const ops = this.failed.splice(0);
    this.set({ error: null });
    if (!ops.length) return this.pull(false);
    for (const op of ops) await this.push(op.ticketId, op.updates, op.previous);
  }
}
