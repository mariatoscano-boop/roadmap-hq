/**
 * The integration layer. Mochi speaks to every external tool (Tengu, a client's tool, …) through
 * one IntegrationProvider interface, so adding a tool means adding a provider, not changing the UI.
 */
export interface ExternalTask {
  /** The tool's own key, e.g. FIJI-142. */
  key: string;
  title: string;
  /** Which space/board/project in the tool (matches World.link.ref). */
  ref: string;
  done: boolean;
  dueDate: string | null;
  priority: 'normal' | 'high';
  updatedAt: string;
}

export interface PullResult {
  tasks: ExternalTask[];
  syncedAt: string;
  /** Human notes about what changed (mock only). */
  notes: string[];
}

export interface IntegrationProvider {
  readonly id: string;
  /** Shown in the UI: "Tengu", "Client tool". */
  readonly label: string;
  /** 'mock' providers are labelled as sample data. */
  readonly kind: 'mock' | 'live';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Tasks assigned to me in this tool. */
  pull(): Promise<PullResult>;
  /** Only called when I explicitly send a private quest to the tool. */
  create(draft: { ref: string; title: string; dueDate: string | null; priority: 'normal' | 'high' }): Promise<ExternalTask>;
  /** Write back a change to a task that came from the tool (done, title, date). */
  update(key: string, patch: Partial<Pick<ExternalTask, 'done' | 'title' | 'dueDate' | 'priority'>>): Promise<ExternalTask>;
}

export class IntegrationError extends Error {
  constructor(message: string, readonly code: 'not_connected' | 'not_found' | 'unavailable' = 'unavailable') {
    super(message);
  }
}
