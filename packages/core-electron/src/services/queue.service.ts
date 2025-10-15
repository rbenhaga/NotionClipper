// packages/core-electron/src/services/queue.service.ts
import { EventEmitter } from 'events';
import type { IStorage } from '@notion-clipper/core-shared';
import type { QueueEntry, QueueStats, QueueConfig } from '@notion-clipper/core-shared';
import type { ElectronHistoryService } from './history.service';

// Interface pour le service Notion (à adapter selon votre implémentation)
interface INotionService {
  sendToNotion(data: any): Promise<{ success: boolean; error?: string; blocks?: any[] }>;
}

export class ElectronQueueService extends EventEmitter {
  private storage: IStorage;
  private notionService: INotionService;
  private historyService: ElectronHistoryService;
  private config: QueueConfig;
  private processing: boolean = false;
  private isOnline: boolean = true;
  private storageKey = 'queue';
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    storage: IStorage,
    notionService: INotionService,
    historyService: ElectronHistoryService,
    config?: Partial<QueueConfig>
  ) {
    super();
    this.storage = storage;
    this.notionService = notionService;
    this.historyService = historyService;
    
    this.config = {
      maxRetries: 5,
      retryDelay: 5000,
      retryBackoff: 2,
      maxQueueSize: 100,
      processInterval: 10000,
      batchSize: 3,
      ...config
    };
  }

  /**
   * Ajouter à la file d'attente
   */
  async enqueue(
    payload: QueueEntry['payload'],
    priority: QueueEntry['priority'] = 'normal'
  ): Promise<QueueEntry> {
    const queue = await this.getQueue();
    
    // Vérifier la limite
    if (queue.length >= this.config.maxQueueSize) {
      throw new Error('Queue is full');
    }
    
    // Créer l'entrée d'historique
    const historyEntry = await this.historyService.add({
      timestamp: Date.now(),
      type: 'text', // À adapter selon le type
      content: {
        raw: payload.content,
        preview: payload.content.substring(0, 200),
        blocks: []
      },
      page: {
        id: payload.pageId,
        title: 'En attente...',
        icon: '⏳'
      },
      status: 'pending'
    });
    
    // Créer l'entrée de queue
    const entry: QueueEntry = {
      id: this.generateId(),
      historyId: historyEntry.id,
      createdAt: Date.now(),
      priority,
      payload,
      status: 'queued',
      attempts: 0,
      maxAttempts: this.config.maxRetries
    };
    
    // Insérer selon la priorité
    if (priority === 'high') {
      queue.unshift(entry);
    } else if (priority === 'low') {
      queue.push(entry);
    } else {
      // Normal : insérer avant les low
      const firstLowIndex = queue.findIndex(e => e.priority === 'low');
      if (firstLowIndex !== -1) {
        queue.splice(firstLowIndex, 0, entry);
      } else {
        queue.push(entry);
      }
    }
    
    await this.saveQueue(queue);
    
    this.emit('added', entry);
    this.emit('stats-changed', await this.getStats());
    
    // Déclencher le traitement
    this.processQueue();
    
    return entry;
  }

  /**
   * Traiter la file d'attente
   */
  async processQueue(): Promise<void> {
    if (this.processing || !this.isOnline) {
      return;
    }
    
    this.processing = true;
    
    try {
      const queue = await this.getQueue();
      
      // Filtrer les entrées à traiter
      const toProcess = queue
        .filter(e => 
          e.status === 'queued' ||
          (e.status === 'retrying' &&
           (!e.nextRetry || e.nextRetry <= Date.now()))
        )
        .slice(0, this.config.batchSize);
      
      if (toProcess.length === 0) {
        this.processing = false;
        return;
      }
      
      // Traiter en parallèle
      const results = await Promise.allSettled(
        toProcess.map(entry => this.processEntry(entry))
      );
      
      // Émettre les changements
      this.emit('processed', { count: toProcess.length, results });
      this.emit('stats-changed', await this.getStats());
      
    } finally {
      this.processing = false;
    }
  }

  /**
   * Traiter une entrée
   */
  private async processEntry(entry: QueueEntry): Promise<void> {
    try {
      // Mettre à jour le statut
      await this.updateEntry(entry.id, {
        status: 'processing',
        lastAttempt: Date.now(),
        attempts: entry.attempts + 1
      });
      
      // Mettre à jour l'historique
      await this.historyService.update(entry.historyId, {
        status: 'sending'
      });
      
      // Envoyer le contenu
      const result = await this.notionService.sendToNotion({
        pageId: entry.payload.pageId,
        content: entry.payload.content,
        options: entry.payload.options
      });
      
      if (result.success) {
        // Succès
        await this.updateEntry(entry.id, {
          status: 'completed'
        });
        
        await this.historyService.update(entry.historyId, {
          status: 'success',
          sentAt: Date.now()
        });
        
        // Supprimer de la queue après 1 minute
        setTimeout(() => {
          this.removeEntry(entry.id);
        }, 60000);
        
        this.emit('success', entry);
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      // Échec
      const shouldRetry = entry.attempts < entry.maxAttempts;
      
      if (shouldRetry) {
        // Calculer le prochain retry avec backoff exponentiel
        const delay = this.config.retryDelay *
                     Math.pow(this.config.retryBackoff, entry.attempts);
        
        await this.updateEntry(entry.id, {
          status: 'retrying',
          error: error instanceof Error ? error.message : 'Unknown error',
          nextRetry: Date.now() + delay
        });
        
        await this.historyService.update(entry.historyId, {
          status: 'pending',
          retryCount: entry.attempts,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        this.emit('retry', { entry, delay });
      } else {
        // Max retries atteint
        await this.updateEntry(entry.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined
        });
        
        await this.historyService.update(entry.historyId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        this.emit('failed', entry);
      }
    }
  }

  /**
   * Démarrer le traitement automatique
   */
  startAutoProcess(): void {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.config.processInterval);
  }

  /**
   * Arrêter le traitement automatique
   */
  stopAutoProcess(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Mettre à jour l'état de connexion
   */
  setOnlineStatus(isOnline: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = isOnline;
    
    if (!wasOnline && isOnline) {
      // On vient de revenir en ligne
      console.log('[QUEUE] Back online, processing queue...');
      this.processQueue();
    }
    
    this.emit('online-status-changed', isOnline);
  }

  /**
   * Obtenir la file d'attente
   */
  async getQueue(): Promise<QueueEntry[]> {
    return await this.storage.get<QueueEntry[]>(this.storageKey) || [];
  }

  /**
   * Sauvegarder la file d'attente
   */
  private async saveQueue(queue: QueueEntry[]): Promise<void> {
    await this.storage.set(this.storageKey, queue);
  }

  /**
   * Mettre à jour une entrée
   */
  async updateEntry(
    id: string,
    updates: Partial<QueueEntry>
  ): Promise<QueueEntry | null> {
    const queue = await this.getQueue();
    const index = queue.findIndex(e => e.id === id);
    
    if (index === -1) return null;
    
    queue[index] = { ...queue[index], ...updates };
    await this.saveQueue(queue);
    
    return queue[index];
  }

  /**
   * Supprimer une entrée
   */
  async removeEntry(id: string): Promise<boolean> {
    const queue = await this.getQueue();
    const filtered = queue.filter(e => e.id !== id);
    
    if (filtered.length === queue.length) return false;
    
    await this.saveQueue(filtered);
    this.emit('removed', id);
    this.emit('stats-changed', await this.getStats());
    
    return true;
  }

  /**
   * Réessayer une entrée manuellement
   */
  async retry(id: string): Promise<void> {
    await this.updateEntry(id, {
      status: 'queued',
      attempts: 0,
      nextRetry: undefined,
      error: undefined
    });
    
    this.processQueue();
  }

  /**
   * Vider la file d'attente
   */
  async clear(): Promise<void> {
    await this.saveQueue([]);
    this.emit('cleared');
    this.emit('stats-changed', await this.getStats());
  }

  /**
   * Obtenir les statistiques
   */
  async getStats(): Promise<QueueStats> {
    const queue = await this.getQueue();
    
    const stats: QueueStats = {
      total: queue.length,
      queued: 0,
      processing: 0,
      retrying: 0,
      failed: 0,
      completed: 0
    };
    
    for (const entry of queue) {
      switch (entry.status) {
        case 'queued':
          stats.queued++;
          break;
        case 'processing':
          stats.processing++;
          break;
        case 'retrying':
          stats.retrying++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'completed':
          stats.completed++;
          break;
      }
    }
    
    return stats;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}