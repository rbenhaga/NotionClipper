// packages/core-shared/src/interfaces/queue.interface.ts

import {
  QueueItem,
  QueueStats,
  QueueFilter,
  QueuePerformanceMetrics,
  QueueProcessResult,
  QueueConfig,
  QueueEvents
} from '../types/queue.types';

/**
 * Interface pour l'adapter de file d'attente
 * Abstraction pour différents systèmes de stockage
 */
export interface IQueueAdapter {
  /**
   * Initialiser l'adapter
   */
  initialize(): Promise<void>;

  /**
   * Ajouter un item à la queue
   */
  enqueue(item: QueueItem): Promise<void>;

  /**
   * Récupérer le prochain item à traiter (sans le supprimer)
   */
  dequeue(): Promise<QueueItem | null>;

  /**
   * Regarder le prochain item sans le récupérer
   */
  peek(): Promise<QueueItem | null>;

  /**
   * Récupérer tous les items
   */
  getAll(filter?: QueueFilter): Promise<QueueItem[]>;

  /**
   * Mettre à jour un item
   */
  update(id: string, updates: Partial<QueueItem>): Promise<void>;

  /**
   * Supprimer un item
   */
  remove(id: string): Promise<void>;

  /**
   * Vider la queue
   */
  clear(): Promise<void>;

  /**
   * Obtenir la taille de la queue
   */
  size(): Promise<number>;

  /**
   * Obtenir les statistiques
   */
  getStats(): Promise<QueueStats>;

  /**
   * Optimiser le stockage
   */
  optimize(): Promise<void>;

  /**
   * Récupérer les items par statut
   */
  getByStatus(status: import('../types/queue.types').QueueStatus): Promise<QueueItem[]>;

  /**
   * Récupérer les items par priorité
   */
  getByPriority(priority: import('../types/queue.types').QueuePriority): Promise<QueueItem[]>;

  /**
   * Compter les items par statut
   */
  countByStatus(): Promise<Record<import('../types/queue.types').QueueStatus, number>>;
}

/**
 * Interface pour le service de file d'attente
 */
export interface IQueueService {
  /**
   * Ajouter un item à la queue
   */
  add(
    content: any,
    target: { pageId: string; pageTitle: string },
    priority?: import('../types/queue.types').QueuePriority,
    options?: any
  ): Promise<string>; // Retourne l'ID de l'item

  /**
   * Démarrer le traitement automatique
   */
  startAutoProcess(): void;

  /**
   * Arrêter le traitement automatique
   */
  stopAutoProcess(): void;

  /**
   * Traiter le prochain item manuellement
   */
  processNext(): Promise<void>;

  /**
   * Traiter tous les items en attente
   */
  processAll(): Promise<void>;

  /**
   * Obtenir les statistiques
   */
  getStats(): Promise<QueueStats>;

  /**
   * Obtenir les métriques de performance
   */
  getPerformanceMetrics(): Promise<QueuePerformanceMetrics>;

  /**
   * Réessayer tous les items échoués
   */
  retryFailed(): Promise<number>;

  /**
   * Réessayer un item spécifique
   */
  retryItem(id: string): Promise<boolean>;

  /**
   * Supprimer un item
   */
  removeItem(id: string): Promise<void>;

  /**
   * Vider la queue
   */
  clear(): Promise<void>;

  /**
   * Obtenir tous les items avec filtres
   */
  getItems(filter?: QueueFilter): Promise<QueueItem[]>;

  /**
   * Mettre en pause le traitement
   */
  pause(): void;

  /**
   * Reprendre le traitement
   */
  resume(): void;

  /**
   * Vérifier si le traitement est en cours
   */
  isProcessing(): boolean;

  /**
   * Vérifier si le traitement est en pause
   */
  isPaused(): boolean;

  /**
   * Configurer la queue
   */
  configure(config: Partial<QueueConfig>): void;

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): QueueConfig;
}

/**
 * Interface pour le processeur d'items de queue
 */
export interface IQueueProcessor {
  /**
   * Traiter un item de la queue
   */
  process(item: QueueItem): Promise<QueueProcessResult>;

  /**
   * Valider qu'un item peut être traité
   */
  canProcess(item: QueueItem): Promise<boolean>;

  /**
   * Estimer le temps de traitement
   */
  estimateProcessingTime(item: QueueItem): Promise<number>;

  /**
   * Nettoyer après traitement (optionnel)
   */
  cleanup?(item: QueueItem, result: QueueProcessResult): Promise<void>;
}