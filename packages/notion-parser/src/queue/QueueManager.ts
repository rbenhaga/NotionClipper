// packages/notion-parser/src/queue/QueueManager.ts
import { EventEmitter } from 'events';
import type { FileUploadResult, ExtendedFileUploadOptions } from '../utils/FileUploadHandler';
import { FileUploadHandler } from '../utils/FileUploadHandler';

export interface QueueItem {
  id: string;
  file: File;
  filename: string;
  options: ExtendedFileUploadOptions;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: FileUploadResult;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
}

export interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface QueueManagerOptions {
  maxConcurrent?: number;
  maxRetries?: number;
  retryDelay?: number;
  autoStart?: boolean;
}

/**
 * Gestionnaire de file d'attente pour les uploads de fichiers
 */
export class QueueManager extends EventEmitter {
  private items: Map<string, QueueItem> = new Map();
  private processing: Set<string> = new Set();
  private options: Required<QueueManagerOptions>;
  private isRunning = false;

  constructor(options: QueueManagerOptions = {}) {
    super();
    
    this.options = {
      maxConcurrent: 3,
      maxRetries: 3,
      retryDelay: 2000,
      autoStart: true,
      ...options
    };
  }

  /**
   * Ajouter un fichier à la file d'attente
   */
  add(
    file: File,
    filename: string,
    options: ExtendedFileUploadOptions
  ): string {
    const id = this.generateId();
    
    const item: QueueItem = {
      id,
      file,
      filename,
      options,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: this.options.maxRetries
    };

    this.items.set(id, item);
    this.emit('itemAdded', item);
    
    if (this.options.autoStart && !this.isRunning) {
      this.start();
    }

    return id;
  }

  /**
   * Démarrer le traitement de la file d'attente
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.emit('started');
    this.processQueue();
  }

  /**
   * Arrêter le traitement de la file d'attente
   */
  stop(): void {
    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * Obtenir les statistiques de la file d'attente
   */
  getStats(): QueueStats {
    const items = Array.from(this.items.values());
    
    return {
      total: items.length,
      queued: items.filter(item => item.status === 'queued').length,
      processing: items.filter(item => item.status === 'processing').length,
      completed: items.filter(item => item.status === 'completed').length,
      failed: items.filter(item => item.status === 'failed').length
    };
  }

  /**
   * Obtenir tous les éléments de la file d'attente
   */
  getItems(): QueueItem[] {
    return Array.from(this.items.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Obtenir un élément par ID
   */
  getItem(id: string): QueueItem | undefined {
    return this.items.get(id);
  }

  /**
   * Supprimer un élément de la file d'attente
   */
  remove(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    // Ne pas supprimer si en cours de traitement
    if (item.status === 'processing') {
      return false;
    }

    this.items.delete(id);
    this.emit('itemRemoved', item);
    return true;
  }

  /**
   * Réessayer un élément échoué
   */
  retry(id: string): boolean {
    const item = this.items.get(id);
    if (!item || item.status !== 'failed') return false;

    item.status = 'queued';
    item.progress = 0;
    item.error = undefined;
    item.retryCount++;
    
    this.emit('itemRetried', item);
    
    if (this.isRunning) {
      this.processQueue();
    }

    return true;
  }

  /**
   * Réessayer tous les éléments échoués
   */
  retryAll(): number {
    const failedItems = Array.from(this.items.values())
      .filter(item => item.status === 'failed');

    let retriedCount = 0;
    
    for (const item of failedItems) {
      if (this.retry(item.id)) {
        retriedCount++;
      }
    }

    return retriedCount;
  }

  /**
   * Vider la file d'attente
   */
  clear(): void {
    // Garder seulement les éléments en cours de traitement
    const processingItems = Array.from(this.items.values())
      .filter(item => item.status === 'processing');

    this.items.clear();
    
    for (const item of processingItems) {
      this.items.set(item.id, item);
    }

    this.emit('cleared');
  }

  /**
   * Traiter la file d'attente
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning) return;

    // Obtenir les éléments en attente
    const queuedItems = Array.from(this.items.values())
      .filter(item => item.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt);

    // Traiter jusqu'à la limite de concurrence
    const availableSlots = this.options.maxConcurrent - this.processing.size;
    const itemsToProcess = queuedItems.slice(0, availableSlots);

    for (const item of itemsToProcess) {
      this.processItem(item);
    }

    // Continuer le traitement si nécessaire
    if (this.processing.size > 0 || queuedItems.length > itemsToProcess.length) {
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  /**
   * Traiter un élément individuel
   */
  private async processItem(item: QueueItem): Promise<void> {
    this.processing.add(item.id);
    item.status = 'processing';
    item.startedAt = Date.now();
    item.progress = 0;

    this.emit('itemStarted', item);

    try {
      const uploader = new FileUploadHandler(item.options);
      
      // Simuler le progrès
      const progressInterval = setInterval(() => {
        if (item.progress < 90) {
          item.progress += Math.random() * 20;
          this.emit('itemProgress', item);
        }
      }, 500);

      const result = await uploader.uploadFile(item.file, item.filename);
      
      clearInterval(progressInterval);
      item.progress = 100;
      
      if (result.success) {
        item.status = 'completed';
        item.result = result;
        item.completedAt = Date.now();
        this.emit('itemCompleted', item);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : 'Unknown error';
      item.completedAt = Date.now();
      
      this.emit('itemFailed', item);

      // Programmer un retry si possible
      if (item.retryCount < item.maxRetries) {
        setTimeout(() => {
          if (this.items.has(item.id)) {
            this.retry(item.id);
          }
        }, this.options.retryDelay);
      }
    } finally {
      this.processing.delete(item.id);
    }
  }

  /**
   * Générer un ID unique
   */
  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Instance globale du gestionnaire de file d'attente
 */
export const globalQueueManager = new QueueManager();