// packages/adapters/electron/src/queue.adapter.ts

import {
  IQueueAdapter,
  QueueItem,
  QueueStats,
  QueueFilter,
  QueueStatus,
  QueuePriority
} from '@notion-clipper/core-shared';
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Electron Queue Adapter - Persiste dans un fichier JSON
 * Garantit la persistance même si l'app crash
 */
export class ElectronQueueAdapter implements IQueueAdapter {
  private queuePath: string;
  private queueFile: string;
  private queue: QueueItem[] = [];
  private initialized = false;
  private persistTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.queuePath = path.join(app.getPath('userData'), 'queue');
    this.queueFile = path.join(this.queuePath, 'queue.json');
  }

  /**
   * Initialiser l'adapter
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Créer le dossier
      await fs.mkdir(this.queuePath, { recursive: true });

      // Charger la queue depuis le fichier
      try {
        const data = await fs.readFile(this.queueFile, 'utf8');
        this.queue = JSON.parse(data) as QueueItem[];

        console.log(`[QUEUE] Loaded ${this.queue.length} items`);

        // Reset les items "processing" à "queued" au démarrage
        // (au cas où l'app aurait crash pendant le processing)
        let resetCount = 0;
        for (const item of this.queue) {
          if (item.status === 'processing') {
            item.status = 'queued';
            resetCount++;
          }
        }

        if (resetCount > 0) {
          console.log(`[QUEUE] Reset ${resetCount} processing items to queued`);
          await this.persist();
        }
      } catch (error) {
        // Fichier n'existe pas, initialiser vide
        console.log('[QUEUE] Initializing empty queue');
        await this.persist();
      }

      this.initialized = true;
    } catch (error) {
      console.error('[QUEUE] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Ajouter un item à la queue
   */
  async enqueue(item: QueueItem): Promise<void> {
    if (!this.initialized) await this.initialize();

    if (!this.validateItem(item)) {
      throw new Error('Invalid queue item');
    }

    this.queue.push(item);

    // Trier par priorité (desc) puis par createdAt (asc)
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.createdAt - b.createdAt; // FIFO pour même priorité
    });

    await this.debouncedPersist();
  }

  /**
   * Récupérer le prochain item à traiter (sans le supprimer)
   */
  async dequeue(): Promise<QueueItem | null> {
    if (!this.initialized) await this.initialize();

    // Trouver le premier item queued (déjà trié par priorité)
    const index = this.queue.findIndex(
      item => item.status === 'queued' && (!item.nextRetry || Date.now() >= item.nextRetry)
    );

    if (index === -1) return null;

    // Ne pas le retirer, juste le retourner
    // (sera retiré après processing success ou marqué failed)
    return this.queue[index];
  }

  /**
   * Regarder le prochain item sans le récupérer
   */
  async peek(): Promise<QueueItem | null> {
    if (!this.initialized) await this.initialize();

    const index = this.queue.findIndex(item => item.status === 'queued');
    return index !== -1 ? this.queue[index] : null;
  }

  /**
   * Récupérer tous les items
   */
  async getAll(filter?: QueueFilter): Promise<QueueItem[]> {
    if (!this.initialized) await this.initialize();

    let items = [...this.queue];

    // Appliquer les filtres
    if (filter) {
      items = this.applyFilter(items, filter);
    }

    return items;
  }

  /**
   * Mettre à jour un item
   */
  async update(id: string, updates: Partial<QueueItem>): Promise<void> {
    if (!this.initialized) await this.initialize();

    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue[index] = { ...this.queue[index], ...updates };
      await this.debouncedPersist();
    }
  }

  /**
   * Supprimer un item
   */
  async remove(id: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    this.queue = this.queue.filter(item => item.id !== id);
    await this.debouncedPersist();
  }

  /**
   * Vider la queue
   */
  async clear(): Promise<void> {
    if (!this.initialized) await this.initialize();

    this.queue = [];
    await this.persist();
  }

  /**
   * Obtenir la taille de la queue
   */
  async size(): Promise<number> {
    if (!this.initialized) await this.initialize();

    return this.queue.length;
  }

  /**
   * Obtenir les statistiques
   */
  async getStats(): Promise<QueueStats> {
    if (!this.initialized) await this.initialize();

    const statusCounts = {
      queued: 0,
      processing: 0,
      failed: 0
    };

    let totalProcessingTime = 0;
    let processedCount = 0;
    let totalRetries = 0;
    let itemsWithRetries = 0;

    for (const item of this.queue) {
      statusCounts[item.status]++;

      if (item.actualProcessingTime) {
        totalProcessingTime += item.actualProcessingTime;
        processedCount++;
      }

      totalRetries += item.attempts;
      if (item.attempts > 1) {
        itemsWithRetries++;
      }
    }

    const averageProcessingTime = processedCount > 0 
      ? totalProcessingTime / processedCount 
      : 0;

    // Calculer le taux de succès (items qui ne sont plus dans la queue = succès)
    // Note: Dans une vraie implémentation, on garderait un historique des succès
    const successRate = 0; // Placeholder

    // Throughput (items traités dans les dernières 24h)
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentItems = this.queue.filter(i => i.lastAttempt && i.lastAttempt >= last24h);
    const throughputPerHour = recentItems.length / 24;

    // Queue health
    const queuedItems = this.queue.filter(i => i.status === 'queued');
    const oldestQueuedItem = queuedItems.length > 0 
      ? Math.min(...queuedItems.map(i => i.createdAt))
      : undefined;

    const processingItems = this.queue.filter(i => i.status === 'processing');
    const longestProcessingItem = processingItems.length > 0
      ? Math.max(...processingItems.map(i => Date.now() - (i.lastAttempt || i.createdAt)))
      : undefined;

    return {
      queued: statusCounts.queued,
      processing: statusCounts.processing,
      failed: statusCounts.failed,
      total: this.queue.length,
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
   * Optimiser le stockage
   */
  async optimize(): Promise<void> {
    if (!this.initialized) await this.initialize();

    // Nettoyer les items invalides
    const originalLength = this.queue.length;
    this.queue = this.queue.filter(item => this.validateItem(item));
    
    const cleaned = originalLength - this.queue.length;
    
    if (cleaned > 0) {
      await this.persist();
      console.log(`[QUEUE] Optimized: cleaned ${cleaned} invalid items`);
    }
  }

  /**
   * Récupérer les items par statut
   */
  async getByStatus(status: QueueStatus): Promise<QueueItem[]> {
    if (!this.initialized) await this.initialize();

    return this.queue.filter(item => item.status === status);
  }

  /**
   * Récupérer les items par priorité
   */
  async getByPriority(priority: QueuePriority): Promise<QueueItem[]> {
    if (!this.initialized) await this.initialize();

    return this.queue.filter(item => item.priority === priority);
  }

  /**
   * Compter les items par statut
   */
  async countByStatus(): Promise<Record<QueueStatus, number>> {
    if (!this.initialized) await this.initialize();

    const counts: Record<QueueStatus, number> = {
      queued: 0,
      processing: 0,
      failed: 0
    };

    for (const item of this.queue) {
      counts[item.status]++;
    }

    return counts;
  }

  /**
   * Persister les données sur disque
   */
  private async persist(): Promise<void> {
    try {
      await fs.writeFile(this.queueFile, JSON.stringify(this.queue, null, 2));
    } catch (error) {
      console.error('[QUEUE] Persist error:', error);
      throw error;
    }
  }

  /**
   * Persistance avec debounce pour éviter trop d'écritures
   */
  private async debouncedPersist(): Promise<void> {
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }

    this.persistTimeout = setTimeout(async () => {
      await this.persist();
      this.persistTimeout = null;
    }, 500); // 500ms de debounce (plus rapide que l'historique)
  }

  /**
   * Appliquer un filtre aux items
   */
  private applyFilter(items: QueueItem[], filter: QueueFilter): QueueItem[] {
    return items.filter(item => {
      if (filter.status && item.status !== filter.status) return false;
      if (filter.priority !== undefined && item.priority !== filter.priority) return false;
      if (filter.pageId && item.payload.pageId !== filter.pageId) return false;
      if (filter.createdAfter && item.createdAt < filter.createdAfter) return false;
      if (filter.createdBefore && item.createdAt > filter.createdBefore) return false;
      if (filter.hasErrors !== undefined) {
        const hasErrors = !!item.error;
        if (filter.hasErrors !== hasErrors) return false;
      }

      return true;
    });
  }

  /**
   * Valider un item de queue
   */
  private validateItem(item: any): item is QueueItem {
    return (
      item &&
      typeof item.id === 'string' &&
      typeof item.historyId === 'string' &&
      typeof item.priority === 'number' &&
      [0, 1, 2].includes(item.priority) &&
      item.payload &&
      typeof item.payload.pageId === 'string' &&
      typeof item.createdAt === 'number' &&
      typeof item.attempts === 'number' &&
      typeof item.maxAttempts === 'number' &&
      typeof item.status === 'string' &&
      ['queued', 'processing', 'failed'].includes(item.status)
    );
  }
}