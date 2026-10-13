/**
 * SyncEngine — keeps the live Tengu data for linked items fresh.
 * Tengu has no webhooks or realtime events, so linked tickets are re-read on an interval.
 */
import type { TenguAdapter } from './tengu';
import type { TenguTicket } from '../types/tengu';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncSnapshot {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  /** Linked tickets that couldn't be read (deleted, or not visible to this viewer). */
  missing: number;
}

export interface SyncCallbacks {
  onTickets(tickets: TenguTicket[]): void;
  /** Tickets whose status changed in Tengu since the previous read. */
  onRemoteChanges(tickets: TenguTicket[]): void;
  onState(snapshot: SyncSnapshot): void;
}

export class SyncEngine {
  private snapshot: SyncSnapshot = { status: 'idle', lastSyncedAt: null, error: null, missing: 0 };
  private timer: number | null = null;
  private known = new Map<string, string>();
  private ids: string[] = [];
  private running: Promise<void> | null = null;

  constructor(private adapter: TenguAdapter, private cb: SyncCallbacks, private intervalMs = 60_000) {}

  start() {
    this.timer = window.setInterval(() => void this.pull(), this.intervalMs);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
  }

  /** Which tickets to keep fresh. New ids are fetched right away. */
  setIds(ids: string[]) {
    const fresh = ids.filter((id) => !this.ids.includes(id));
    this.ids = ids;
    if (fresh.length) void this.pull(fresh);
  }

  private set(p: Partial<SyncSnapshot>) {
    this.snapshot = { ...this.snapshot, ...p };
    this.cb.onState(this.snapshot);
  }

  async pull(only?: string[]): Promise<void> {
    if (this.running && !only) return this.running;
    const ids = only ?? this.ids;
    if (!ids.length) {
      this.set({ status: 'synced', lastSyncedAt: Date.now(), error: null });
      return;
    }
    const run = (async () => {
      this.set({ status: 'syncing' });
      try {
        const { tickets, failed } = await this.adapter.getTicketsByIds(ids);
        this.cb.onTickets(tickets);
        const changed = tickets.filter((t) => this.known.has(t.id) && this.known.get(t.id) !== t.status);
        for (const t of tickets) this.known.set(t.id, t.status);
        if (changed.length) this.cb.onRemoteChanges(changed);
        this.set({ status: 'synced', lastSyncedAt: Date.now(), error: null, missing: only ? this.snapshot.missing : failed.length });
      } catch (e) {
        this.set({ status: 'error', error: (e as Error).message || 'Couldn’t reach Tengu.' });
      }
    })();
    if (!only) this.running = run.finally(() => (this.running = null));
    return run;
  }
}
