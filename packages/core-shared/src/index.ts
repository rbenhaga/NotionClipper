export * from './types';
export * from './interfaces';
export * from './utils';
export * from './config/subscription.config';

// ✅ Export parsers via le nouveau dossier
export * from './parsers';

// ✅ Export converters (HTML/Markdown)
export * from './converters';

// Services - Export explicite pour éviter les conflits
export { ConfigService } from './services/config.service';
export { CacheService } from './services/cache.service';
export { CryptoService } from './services/crypto.service';
export * from './services/logger.service';
export { SubscriptionService } from './services/subscription.service';
export { UsageTrackingService } from './services/usage-tracking.service';
export { OfflineUsageQueueService } from './services/offline-usage-queue.service';
export { QuotaService, type IQuotaService } from './services/quota.service';
export { StripeService } from './services/stripe.service';
export { EdgeFunctionService, EdgeFunctionError, StripeCheckoutHelper } from './services/edge-function.service';
export { backendApiService, BackendApiService } from './services/backend-api.service';
export { SmartMatchingEngine, smartMatchingEngine, SYNONYM_DICTIONARY } from './services/SmartMatchingEngine';
export {
  insertContentMultiPages,
  createInsertionTargets,
  resolveInsertionTarget,
  resolveInsertionTargets,
  createMultiPageInserter,
  RATE_LIMIT_DELAY_MS,
  type InsertionProgress,
  type InsertionProgressCallback,
  type MultiPageInsertionOptions,
  type InsertionSummary,
} from './services/MultiPageInsertion';
export {
  validateSelections,
  applyFallbackForInvalidBlocks,
  createValidatedInsertionTargets,
  type SelectionValidationResult,
  type ValidationSummary,
  type ValidationOptions,
  type FallbackResult,
} from './services/BlockValidation';
export {
  TOCPresetService,
  initializeTOCPresetService,
  getTOCPresetService,
  type ApplyPresetResult,
} from './services/TOCPresetService';
export {
  exportConfig,
  exportConfigToJson,
  importConfig,
  mergeSynonyms,
  createConfigBlob,
  generateExportFilename,
  TOC_CONFIG_VERSION,
  TOC_CONFIG_MIN_VERSION,
  TOC_CONFIG_MAX_VERSION,
  type ImportConfigResult,
  type ExportConfigOptions,
} from './services/TOCConfigExportService';