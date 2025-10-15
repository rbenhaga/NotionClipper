// packages/core-shared/src/services/queue.service.ts

import {
  QueueItem,
  QueueStats,
  QueueFilter,
  QueuePerformanceMetrics,
  QueueProcessResult,
  QueueConfig,
  QueuePriority,
  QueueStatus
} from '../types/queue.types';
import { IQueueAdapter, IQueueService, IQueueProcessor } from '../interfaces/queue.interface';
import { IHistoryService } from '../interfaces/history.interface';

/**
 * Service de file d'attente
 */
export class QueueService implements IQueueService {
  private processing = false;
  private paused = false;
  private processInterval: NodeJS.Timeout | null = null;
  private config: QueueConfig;

  constructor(
    public readonly adapter: IQueueAdapter,
    private historyService: IHistoryService,
    private processor: IQueueProcessor,
    options: QueueConfig = {}
  ) {
    this.config = {
      autoProcess: true,
      processIntervalMs: 5000,
      maxRetries: 3,
      retryDelayMs: 60000,
      maxConcurrentProcessing: 1,
      enableBackoff: true,
      backoffMultiplier: 2,
      maxBackoffMs: 30 * 60 * 1000, // 30 minutes max
      ...options
    };

    if (this.config.autoProcess) {
      this.startAutoProcess();
    }
  }

  /**
   * Initialiser le service
   */
  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  /**
   * Ajouter un item à la queue
   */
  async add(
    content: any,
    target: { pageId: string; pageTitle: string },
    priority: QueuePriority = 1,
    options?: any
  ): Promise<string> {
    // 1. Créer l'entrée dans l'historique
    const historyId = await this.historyService.addEntry(content, target, options);

    // 2. Créer l'item de queue
    const item: QueueItem = {
      id: this.generateId(),
      historyId,
      priority,
      payload: {
        pageId: target.pageId,
        content,
        options: options || {}
      },
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: this.config.maxRetries!,
      status: 'queued'
    };

    // 3. Ajouter à la queue
    await this.adapter.enqueue(item);

    console.log(`[QUEUE] Added item ${item.id} (priority ${priority})`);

    // 4. Déclencher le processing si non déjà en cours
    if (!this.processing && !this.paused && this.config.autoProcess) {
      // Délai court pour éviter la concurrence
      setTimeout(() => this.processNext(), 100);
    }

    return item.id;
  }

  /**
   * Démarrer le traitement automatique
   */
  startAutoProcess(): void {
    if (this.processInterval) return;

    this.processInterval = setInterval(() => {
      if (!this.processing && !this.paused) {
        this.processNext().catch(error => {
          console.error('[QUEUE] Auto-process error:', error);
        });
      }
    }, this.config.processIntervalMs);

    console.log('[QUEUE] Auto-processing started');
  }

  /**
   * Arrêter le traitement automatique
   */
  stopAutoProcess(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('[QUEUE] Auto-processing stopped');
    }
  }

  /**
   * Traiter le prochain item manuellement
   */
  async processNext(): Promise<void> {
    if (this.processing || this.paused) return;

    this.processing = true;

    try {
      // 1. Récupérer le prochain item (priorité + FIFO)
      const item = await this.adapter.dequeue();

      if (!item) {
        this.processing = false;
        return;
      }

      console.log(`[QUEUE] Processing item ${item.id}`);

      // 2. Vérifier si on doit attendre avant retry
      if (item.nextRetry && Date.now() < item.nextRetry) {
        // Remettre dans la queue
        await this.adapter.enqueue(item);
        this.processing = false;
        return;
      }

      // 3. Vérifier si le processeur peut traiter cet item
      const canProcess = await this.processor.canProcess(item);
      if (!canProcess) {
        console.log(`[QUEUE] Item ${item.id} cannot be processed, skipping`);
        this.processing = false;
        return;
      }

      // 4. Mettre à jour le statut
      await this.adapter.update(item.id, {
        status: 'processing',
        lastAttempt: Date.now(),
        attempts: item.attempts + 1
      });

      // 5. Mettre à jour l'historique
      await this.historyService.markSending(item.historyId);

      const startTime = Date.now();

      try {
        // 6. Traiter l'item
        const result = await this.processor.process(item);
        const processingTime = Date.now() - startTime;

        if (result.success) {
          // ✅ Succès
          console.log(`[QUEUE] ✅ Item ${item.id} processed successfully in ${processingTime}ms`);

          // Supprimer de la queue
          await this.adapter.remove(item.id);

          // Mettre à jour l'historique
          await this.historyService.markSuccess(item.historyId, {
            blocksCount: result.blocksCreated,
            processingTime
          });

          // Cleanup optionnel
          if (this.processor.cleanup) {
            await this.processor.cleanup(item, result);
          }
        } else {
          throw new Error(result.error || 'Unknown processing error');
        }
      } catch (error: any) {
        // ❌ Échec
        console.error(`[QUEUE] ❌ Item ${item.id} failed:`, error);

        // 7. Gérer le retry
        if (item.attempts < item.maxAttempts) {
          // Calculer le prochain retry avec exponential backoff
          let backoffMs = this.config.retryDelayMs!;
          
          if (this.config.enableBackoff) {
            backoffMs = Math.min(
              this.config.retryDelayMs! * Math.pow(this.config.backoffMultiplier!, item.attempts),
              this.config.maxBackoffMs!
            );
          }

          await this.adapter.update(item.id, {
            status: 'queued',
            nextRetry: Date.now() + backoffMs,
            error: error.message
          });

          console.log(`[QUEUE] ⏳ Item ${item.id} will retry in ${Math.round(backoffMs / 1000)}s (attempt ${item.attempts}/${item.maxAttempts})`);
        } else {
          // Max retries atteint - échec permanent
          await this.adapter.update(item.id, {
            status: 'failed',
            error: error.message
          });

          await this.historyService.markError(
            item.historyId,
            `Échec après ${item.maxAttempts} tentatives: ${error.message}`
          );

          console.log(`[QUEUE] 💀 Item ${item.id} failed permanently`);
        }
      }
    } finally {
      this.processing = false;

      // 8. Continuer le processing si items en attente
      if (this.config.autoProcess && !this.paused) {
        const size = await this.adapter.size();
        if (size > 0) {
          // Reprocess après un court délai
          setTimeout(() => this.processNext(), 1000);
        }
      }
    }
  }

  /**
   * Traiter tous les items en attente
   */
  async processAll(): Promise<void> {
    while (true) {
      const item = await this.adapter.peek();
      if (!item || item.status !== 'queued') break;
      
      await this.processNext();
      
      // Éviter la boucle infinie
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Obtenir les statistiques
   */
  async getStats(): Promise<QueueStats> {
    const baseStats = await this.adapter.getStats();
    const items = await this.adapter.getAll();

    // Calculer les métriques avancées
    const processedItems = items.filter(i => i.actualProcessingTime);
    const averageProcessingTime = processedItems.length > 0
      ? processedItems.reduce((acc, i) => acc + (i.actualProcessingTime || 0), 0) / processedItems.length
      : 0;

    const successfulItems = items.filter(i => i.status === 'queued' && i.attempts > 0); // Items qui ont été traités avec succès
    const successRate = items.length > 0 ? successfulItems.length / items.length : 0;

    // Throughput (dernières 24h)
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentItems = items.filter(i => i.createdAt >= last24h);
    const throughputPerHour = recentItems.length / 24;

    // Queue health
    const queuedItems = items.filter(i => i.status === 'queued');
    const oldestQueuedItem = queuedItems.length > 0 
      ? Math.min(...queuedItems.map(i => i.createdAt))
      : undefined;

    const processingItems = items.filter(i => i.status === 'processing');
    const longestProcessingItem = processingItems.length > 0
      ? Math.max(...processingItems.map(i => Date.now() - (i.lastAttempt || i.createdAt)))
      : undefined;

    // Retry stats
    const totalRetries = items.reduce((acc, i) => acc + i.attempts, 0);
    const itemsWithRetries = items.filter(i => i.attempts > 1).length;

    return {
      ...baseStats,
      averageProcessingTime,
      successRate,
      throughputPerHour,
      oldestQueuedItem,
      longestProcessingItem,
      totalRetries,
      itemsWithRetries
    };
  }

  /**
   * Obtenir les métriques de performance
   */
  async getPerformanceMetrics(): Promise<QueuePerformanceMetrics> {
    const items = await this.adapter.getAll();
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);

    // Items traités dans les dernières 24h
    const itemsProcessedLast24h = items.filter(i => 
      i.lastAttempt && i.lastAttempt >= last24h
    ).length;

    // Temps d'attente moyen
    const queuedItems = items.filter(i => i.status === 'queued');
    const averageWaitTime = queuedItems.length > 0
      ? queuedItems.reduce((acc, i) => acc + (now - i.createdAt), 0) / queuedItems.length
      : 0;

    // Temps de traitement moyen
    const processedItems = items.filter(i => i.actualProcessingTime);
    const averageProcessingTime = processedItems.length > 0
      ? processedItems.reduce((acc, i) => acc + (i.actualProcessingTime || 0), 0) / processedItems.length
      : 0;

    // Taux de succès, erreur, retry
    const total = items.length;
    const successful = items.filter(i => i.attempts > 0 && i.status !== 'failed').length;
    const failed = items.filter(i => i.status === 'failed').length;
    const retried = items.filter(i => i.attempts > 1).length;

    const successRate = total > 0 ? successful / total : 0;
    const errorRate = total > 0 ? failed / total : 0;
    const retryRate = total > 0 ? retried / total : 0;

    // Distribution des priorités
    const priorityDistribution: Record<QueuePriority, number> = { 0: 0, 1: 0, 2: 0 };
    items.forEach(i => {
      priorityDistribution[i.priority]++;
    });

    // Tendances (simulées pour l'exemple - dans une vraie implémentation, 
    // ces données seraient stockées historiquement)
    const trends = {
      throughput: Array(24).fill(0).map(() => Math.random() * 10),
      errorRate: Array(24).fill(0).map(() => Math.random() * 0.1),
      avgProcessingTime: Array(24).fill(0).map(() => Math.random() * 5000)
    };

    return {
      itemsProcessedLast24h,
      averageWaitTime,
      averageProcessingTime,
      successRate,
      errorRate,
      retryRate,
      priorityDistribution,
      trends
    };
  }

  /**
   * Réessayer tous les items échoués
   */
  async retryFailed(): Promise<number> {
    const failedItems = await this.adapter.getByStatus('failed');

    for (const item of failedItems) {
      await this.adapter.update(item.id, {
        status: 'queued',
        attempts: 0,
        error: undefined,
        nextRetry: undefined
      });
    }

    console.log(`[QUEUE] Retrying ${failedItems.length} failed items`);

    return failedItems.length;
  }

  /**
   * Réessayer un item spécifique
   */
  async retryItem(id: string): Promise<boolean> {
    const items = await this.adapter.getAll();
    const item = items.find(i => i.id === id);

    if (!item || item.status !== 'failed') {
      return false;
    }

    await this.adapter.update(id, {
      status: 'queued',
      attempts: 0,
      error: undefined,
      nextRetry: undefined
    });

    console.log(`[QUEUE] Retrying item ${id}`);
    return true;
  }

  /**
   * Supprimer un item
   */
  async removeItem(id: string): Promise<void> {
    await this.adapter.remove(id);
  }

  /**
   * Vider la queue
   */
  async clear(): Promise<void> {
    await this.adapter.clear();
  }

  /**
   * Obtenir tous les items avec filtres
   */
  async getItems(filter?: QueueFilter): Promise<QueueItem[]> {
    return this.adapter.getAll(filter);
  }

  /**
   * Mettre en pause le traitement
   */
  pause(): void {
    this.paused = true;
    console.log('[QUEUE] Processing paused');
  }

  /**
   * Reprendre le traitement
   */
  resume(): void {
    this.paused = false;
    console.log('[QUEUE] Processing resumed');
    
    if (this.config.autoProcess && !this.processing) {
      setTimeout(() => this.processNext(), 100);
    }
  }

  /**
   * Vérifier si le traitement est en cours
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Vérifier si le traitement est en pause
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Configurer la queue
   */
  configure(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Redémarrer l'auto-processing si nécessaire
    if (config.autoProcess !== undefined) {
      this.stopAutoProcess();
      if (config.autoProcess) {
        this.startAutoProcess();
      }
    }
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): QueueConfig {
    return { ...this.config };
  }

  /**
   * Générer un ID unique
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Nettoyer les ressources
   */
  async dispose(): Promise<void> {
    this.stopAutoProcess();
    this.processing = false;
    this.paused = true;
  }
}