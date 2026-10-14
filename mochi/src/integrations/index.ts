/**
 * Registry of integrations. Each world may link to one of these. To add a tool, implement
 * IntegrationProvider and register it here; to make Tengu real, replace its MockProvider with a
 * live provider (see mochi/README.md → "Connecting real tools").
 */
import { CLIENT_TOOL_BATCHES, MockProvider, TENGU_BATCHES } from './mockProvider';
import type { IntegrationProvider } from './types';

const tengu = new MockProvider('tengu', 'Tengu', { fiji: 'space-fiji', dosify: 'space-dosify' }, { 'space-fiji': 'FIJI', 'space-dosify': 'DOS' }, TENGU_BATCHES, 160);
const clientTool = new MockProvider('clienttool', 'Client tool', { 'client-a': 'board-campaign' }, { 'board-campaign': 'CMP' }, CLIENT_TOOL_BATCHES, 35);

export const INTEGRATIONS: Record<string, IntegrationProvider & { reset?: () => void }> = {
  tengu,
  clienttool: clientTool,
};

export const integrationLabel = (id: string) => INTEGRATIONS[id]?.label ?? id;
