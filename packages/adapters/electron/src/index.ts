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
export { ElectronParserAdapter } from './parser.adapter';

// 🆕 Nouveaux adapters pour les fonctionnalités
export { ElectronFileAdapter } from './file.adapter';
export { ElectronHistoryAdapter } from './history.adapter';
export { ElectronQueueAdapter } from './queue.adapter';
