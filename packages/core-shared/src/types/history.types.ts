// packages/core-shared/src/types/history.types.ts

/**
 * Types de contenu supportés dans l'historique
 */
export type HistoryContentType = 'text' | 'image' | 'file' | 'html' | 'markdown';

/**
 * Types d'intégration pour les fichiers
 */
export type FileIntegrationType = 'file_upload' | 'embed' | 'external';

/**
 * Statuts possibles d'une entrée d'historique
 */
export type HistoryStatus = 'pending' | 'sending' | 'success' | 'error';

/**
 * Contenu d'une entrée d'historique
 */
export interface HistoryContent {
  type: HistoryContentType;
  data: string;                      // Contenu ou URL
  preview: string;                   // Preview pour l'UI (100 chars max)
  size?: number;                     // Taille en bytes (pour files)
  mimeType?: string;                 // Type MIME pour les fichiers
  fileName?: string;                 // Nom du fichier original
}

/**
 * Destination d'envoi
 */
export interface HistoryTarget {
  pageId: string;
  pageTitle: string;
  pageIcon?: string;
  parentType?: 'page' | 'database';
  workspaceId?: string;
}

/**
 * Entrée complète de l'historique
 */
export interface HistoryEntry {
  id: string;                        // UUID unique
  timestamp: number;                 // Date.now()
  
  // Contenu
  content: HistoryContent;
  
  // Destination
  target: HistoryTarget;
  
  // État
  status: HistoryStatus;
  error?: string;
  
  // Metadata
  blocksCount?: number;              // Nombre de blocs envoyés
  retryCount?: number;               // Tentatives de retry
  processingTime?: number;           // Temps de traitement en ms
  
  // Options d'intégration (pour les fichiers)
  integrationType?: FileIntegrationType;
  integrationOptions?: {
    caption?: string;
    width?: number;
    height?: number;
  };
}

/**
 * Filtres pour l'historique
 */
export interface HistoryFilter {
  status?: HistoryStatus;
  pageId?: string;
  dateFrom?: number;
  dateTo?: number;
  contentType?: HistoryContentType;
  workspaceId?: string;
  searchQuery?: string;
}

/**
 * Statistiques de l'historique
 */
export interface HistoryStats {
  total: number;
  pending: number;
  sending: number;
  success: number;
  error: number;
  totalSize: number;                 // Taille totale en bytes
  averageProcessingTime?: number;    // Temps moyen de traitement
  successRate?: number;              // Taux de succès (0-1)
  
  // Stats par type de contenu
  byContentType: Record<HistoryContentType, number>;
  
  // Stats par période
  last24h: number;
  last7days: number;
  last30days: number;
}

/**
 * Options de pagination pour l'historique
 */
export interface HistoryPaginationOptions {
  page: number;
  limit: number;
  sortBy?: 'timestamp' | 'status' | 'size';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Résultat paginé de l'historique
 */
export interface HistoryPaginatedResult {
  entries: HistoryEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Options de nettoyage de l'historique
 */
export interface HistoryCleanupOptions {
  olderThanDays?: number;
  status?: HistoryStatus[];
  maxEntries?: number;
  keepSuccessful?: boolean;
}