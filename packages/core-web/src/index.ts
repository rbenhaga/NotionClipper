// packages/core-web/src/index.ts

// Services existants
export { SimpleNLPService } from './services/simple-nlp.service';
export { IndexedDBStorageService } from './services/indexeddb-storage.service';

// Nouveaux services
export { WebClipboardService } from './services/clipboard.service';
export { WebNotionService } from './services/notion.service';
export { WebStatsService } from './services/stats.service';
export type { WebStats } from './services/stats.service';