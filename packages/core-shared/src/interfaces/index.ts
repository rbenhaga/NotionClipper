// packages/core-shared/src/interfaces/index.ts
export { IClipboard } from './clipboard.interface';
export { IStorage } from './storage.interface';
export { INotionAPI } from './notion-api.interface';
export { IConfig } from './config.interface';
export { ICacheAdapter, type CacheStats, type CacheEntry } from './cache.interface';

// 🆕 Nouvelles interfaces pour les fonctionnalités
export * from './history.interface';
export * from './queue.interface';
export * from './file-upload.interface';