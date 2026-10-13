/** Access to claude.ai Artifact capabilities. Outside an Artifact, every capability is null. */
export async function useCapability<T = any>(name: string): Promise<T | null> {
  try {
    if (!window.claude?.use) return null;
    return (await window.claude.use(name)) as T | null;
  } catch {
    return null;
  }
}

export const inArtifact = () => typeof window !== 'undefined' && !!window.claude?.use;
