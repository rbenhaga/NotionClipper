// packages/core-electron/src/index.ts

// ============================================
// SERVICES ELECTRON (Node.js only)
// ============================================

// NLP Service (using 'natural' package - Node.js only)
export { NLPService } from './services/nlp.service';

// Business Services
export { ElectronClipboardService } from './services/clipboard.service';
export { ElectronNotionService } from './services/notion.service';

// Stats Service
export { 
  ElectronStatsService,
  type Stats,
  type PageStats,
  type DailyStats,
  type StatsSummary,
  type IStatsAdapter
} from './services/stats.service';

// Polling Service
export { 
  ElectronPollingService,
  type PollingConfig,
  type PollingStatus,
  type PollingResult
} from './services/polling.service';

// Suggestion Service
export {
  ElectronSuggestionService,
  type SuggestionOptions,
  type SuggestionResult
} from './services/suggestion.service';

// Parser Service
export {
  ElectronParserService,
  type ContentType,
  type ParseResult
} from './services/parser.service';