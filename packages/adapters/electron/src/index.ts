// packages/adapters/electron/src/index.ts

// ============================================
// EXISTING ADAPTERS
// ============================================
export { ElectronStorageAdapter } from './storage.adapter';
export { ElectronClipboardAdapter } from './clipboard.adapter';
export { ElectronConfigAdapter } from './config.adapter';
export { ElectronNotionAPIAdapter } from './notion-api.adapter';

// ============================================
// NEW ADAPTERS
// ============================================
export { ElectronCacheAdapter } from './cache.adapter';
export { ElectronStatsAdapter } from './stats.adapter';
