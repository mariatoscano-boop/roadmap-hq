/**
 * Which Tengu provider the app uses. Swap MockTenguProvider for a real implementation of
 * TenguProvider here; nothing else in the app needs to change.
 */
import { MockTenguProvider } from './mockProvider';

export const tengu = new MockTenguProvider();
export type { TenguProvider } from './provider';
