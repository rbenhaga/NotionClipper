// packages/core-electron/src/index.ts

// ============================================
// EXISTING SERVICES
// ============================================
export { NLPService } from './services/nlp.service';
// export { SQLiteCacheService } from './services/sqlite-cache.service'; // ❌ COMMENTÉ

// ============================================
// NEW SERVICES
// ============================================
export { ElectronClipboardService } from './services/clipboard.service';
export { ElectronNotionService } from './services/notion.service';
export { 
  ElectronStatsService,
  type Stats,
  type PageStats,
  type DailyStats,
  type StatsSummary,
  type IStatsAdapter
} from './services/stats.service';
export { 
  ElectronPollingService,
  type PollingConfig,
  type PollingStatus,
  type PollingResult
} from './services/polling.service';
export {
  ElectronSuggestionService,
  type SuggestionOptions,
  type SuggestionResult
} from './services/suggestion.service';
export {
  ElectronParserService,
  type ContentType,
  type ParseResult
} from './services/parser.service';