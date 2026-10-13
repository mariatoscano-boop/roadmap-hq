/** Minimal typing for the claude.ai Artifact runtime (present only when published as an Artifact). */
export {};

declare global {
  interface Window {
    claude?: { use(name: string): Promise<any | null> };
  }
}
