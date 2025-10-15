// packages/core-shared/src/types/queue.types.ts

/**
 * Priorités de la file d'attente
 */
export type QueuePriority = 0 | 1 | 2; // 0 = low, 1 = normal, 2 = high

/**
 * Statuts des items de la queue
 */
export type QueueStatus = 'queued' | 'processing' | 'failed';

/**
 * Payload d'un item de queue
 */
export interface QueuePayload {
  pageId: string;
  pageIds?: string[];               // Pour multi-select
  content: any;                     // Contenu à envoyer
  options?: {
    integrationType?: import('./history.types').FileIntegrationType;
    integrationOptions?: {
      caption?: string;
      width?: number;
      height?: number;
    };
    [key: string]: any;
  };
}

/**
 * Item de la file d'attente
 */
export interface QueueItem {
  id: string;
  historyId: string;                // Lien avec l'historique
  priority: QueuePriority;
  
  // Payload
  payload: QueuePayload;
  
  // Metadata
  createdAt: number;
  attempts: number;
  maxAttempts: number;
  lastAttempt?: number;
  nextRetry?: number;               // Timestamp du prochain retry
  
  // État
  status: QueueStatus;
  error?: string;
  
  // Metrics
  estimatedProcessingTime?: number; // Estimation en ms
  actualProcessingTime?: number;    // Temps réel de traitement
}

/**
 * Configuration de la file d'attente
 */
export interface QueueConfig {
  autoProcess?: boolean;
  processIntervalMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  maxConcurrentProcessing?: number;
  enableBackoff?: boolean;
  backoffMultiplier?: number;
  maxBackoffMs?: number;
}

/**
 * Statistiques de la file d'attente
 */
export interface QueueStats {
  queued: number;
  processing: number;
  failed: number;
  total: number;
  
  // Performance metrics
  averageProcessingTime?: number;
  successRate?: number;
  throughputPerHour?: number;
  
  // Queue health
  oldestQueuedItem?: number;        // Timestamp
  longestProcessingItem?: number;   // Durée en ms
  
  // Retry stats
  totalRetries: number;
  itemsWithRetries: number;
}

/**
 * Événements de la file d'attente
 */
export interface QueueEvents {
  'item:added': (item: QueueItem) => void;
  'item:processing': (item: QueueItem) => void;
  'item:success': (item: QueueItem, result: any) => void;
  'item:failed': (item: QueueItem, error: Error) => void;
  'item:retry': (item: QueueItem, attempt: number) => void;
  'queue:empty': () => void;
  'queue:error': (error: Error) => void;
}

/**
 * Résultat du traitement d'un item
 */
export interface QueueProcessResult {
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
  blocksCreated?: number;
}

/**
 * Options de filtrage de la queue
 */
export interface QueueFilter {
  status?: QueueStatus;
  priority?: QueuePriority;
  pageId?: string;
  createdAfter?: number;
  createdBefore?: number;
  hasErrors?: boolean;
}

/**
 * Métriques de performance de la queue
 */
export interface QueuePerformanceMetrics {
  itemsProcessedLast24h: number;
  averageWaitTime: number;          // Temps moyen en queue
  averageProcessingTime: number;    // Temps moyen de traitement
  successRate: number;              // Taux de succès (0-1)
  errorRate: number;                // Taux d'erreur (0-1)
  retryRate: number;                // Taux de retry (0-1)
  
  // Distribution des priorités
  priorityDistribution: Record<QueuePriority, number>;
  
  // Tendances
  trends: {
    throughput: number[];           // Items/heure sur les dernières 24h
    errorRate: number[];            // Taux d'erreur sur les dernières 24h
    avgProcessingTime: number[];    // Temps moyen sur les dernières 24h
  };
}