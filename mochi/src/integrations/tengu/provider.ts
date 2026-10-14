import type { PullResult, TenguTask, TenguTaskDraft, TenguTaskPatch } from './types';

/**
 * The one door between Mochi and Tengu. Screens never talk to Tengu; the store calls a
 * TenguProvider, and mapping.ts translates its data into app tasks.
 *
 * The app ships with MockTenguProvider (sample data, in this browser). A real provider implements
 * this same interface; see mochi/README.md → "Connecting real Tengu".
 */
export interface TenguProvider {
  /** 'mock' providers are labelled as sample data in Settings. */
  readonly kind: 'mock' | 'live';
  readonly label: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  /** Every task in the workspace's Tengu spaces. */
  pull(): Promise<PullResult>;

  /** Share a private task with the team by creating it in Tengu. */
  createTask(draft: TenguTaskDraft): Promise<TenguTask>;

  /** Write back a change made in Mochi (status, owner, title, due date, priority). */
  updateTask(id: string, patch: TenguTaskPatch): Promise<TenguTask>;
}

export class TenguProviderError extends Error {
  constructor(message: string, readonly code: 'not_connected' | 'not_found' | 'unavailable' = 'unavailable') {
    super(message);
  }
}
