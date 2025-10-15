// packages/core-shared/src/interfaces/history.interface.ts

import {
  HistoryEntry,
  HistoryFilter,
  HistoryStats,
  HistoryPaginationOptions,
  HistoryPaginatedResult,
  HistoryCleanupOptions,
  HistoryTarget,
  HistoryStatus
} from '../types/history.types';

/**
 * Interface pour l'adapter d'historique
 * Abstraction pour différents systèmes de stockage (Electron, Web, etc.)
 */
export interface IHistoryAdapter {
  /**
   * Initialiser l'adapter
   */
  initialize(): Promise<void>;

  /**
   * Ajouter une entrée à l'historique
   */
  add(entry: HistoryEntry): Promise<void>;

  /**
   * Récupérer toutes les entrées avec filtres optionnels
   */
  getAll(filter?: HistoryFilter): Promise<HistoryEntry[]>;

  /**
   * Récupérer les entrées avec pagination
   */
  getPaginated(
    filter?: HistoryFilter,
    pagination?: HistoryPaginationOptions
  ): Promise<HistoryPaginatedResult>;

  /**
   * Récupérer une entrée par ID
   */
  getById(id: string): Promise<HistoryEntry | null>;

  /**
   * Mettre à jour le statut d'une entrée
   */
  updateStatus(
    id: string,
    status: HistoryStatus,
    error?: string,
    metadata?: Partial<HistoryEntry>
  ): Promise<void>;

  /**
   * Mettre à jour une entrée complète
   */
  update(id: string, updates: Partial<HistoryEntry>): Promise<void>;

  /**
   * Supprimer une entrée
   */
  delete(id: string): Promise<void>;

  /**
   * Supprimer plusieurs entrées selon un filtre
   */
  deleteMany(filter: HistoryFilter): Promise<number>;

  /**
   * Vider l'historique selon des critères
   */
  clear(filter?: HistoryFilter): Promise<void>;

  /**
   * Obtenir les statistiques
   */
  getStats(): Promise<HistoryStats>;

  /**
   * Nettoyer l'historique selon des options
   */
  cleanup(options: HistoryCleanupOptions): Promise<number>;

  /**
   * Rechercher dans l'historique
   */
  search(query: string, filter?: HistoryFilter): Promise<HistoryEntry[]>;

  /**
   * Exporter l'historique
   */
  export(filter?: HistoryFilter): Promise<string>; // JSON string

  /**
   * Importer l'historique
   */
  import(data: string): Promise<number>; // Nombre d'entrées importées

  /**
   * Obtenir la taille du stockage
   */
  getStorageSize(): Promise<number>; // En bytes

  /**
   * Optimiser le stockage (compactage, réindexation, etc.)
   */
  optimize(): Promise<void>;
}

/**
 * Interface pour le service d'historique
 * Couche métier au-dessus de l'adapter
 */
export interface IHistoryService {
  /**
   * Ajouter une entrée (avant envoi)
   */
  addEntry(
    content: any,
    target: HistoryTarget,
    options?: {
      integrationType?: import('../types/history.types').FileIntegrationType;
      integrationOptions?: any;
    }
  ): Promise<string>; // Retourne l'ID de l'entrée

  /**
   * Marquer comme en cours d'envoi
   */
  markSending(id: string): Promise<void>;

  /**
   * Marquer comme envoyé avec succès
   */
  markSuccess(
    id: string,
    metadata?: {
      blocksCount?: number;
      processingTime?: number;
    }
  ): Promise<void>;

  /**
   * Marquer comme erreur
   */
  markError(id: string, error: string): Promise<void>;

  /**
   * Récupérer l'historique filtré
   */
  getHistory(filter?: HistoryFilter): Promise<HistoryEntry[]>;

  /**
   * Récupérer l'historique avec pagination
   */
  getHistoryPaginated(
    filter?: HistoryFilter,
    pagination?: HistoryPaginationOptions
  ): Promise<HistoryPaginatedResult>;

  /**
   * Récupérer une entrée par ID
   */
  getById(id: string): Promise<HistoryEntry | null>;

  /**
   * Statistiques
   */
  getStats(): Promise<HistoryStats>;

  /**
   * Rechercher dans l'historique
   */
  search(query: string, filter?: HistoryFilter): Promise<HistoryEntry[]>;

  /**
   * Supprimer une entrée
   */
  delete(id: string): Promise<void>;

  /**
   * Nettoyer l'historique
   */
  cleanup(options?: HistoryCleanupOptions): Promise<number>;

  /**
   * Exporter l'historique
   */
  export(filter?: HistoryFilter): Promise<string>;

  /**
   * Importer l'historique
   */
  import(data: string): Promise<number>;

  /**
   * Obtenir les métriques de performance
   */
  getPerformanceMetrics(): Promise<{
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
    throughputPerHour: number;
  }>;
}