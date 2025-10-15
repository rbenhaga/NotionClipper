// packages/core-shared/src/services/history.service.ts

import {
  HistoryEntry,
  HistoryFilter,
  HistoryStats,
  HistoryPaginationOptions,
  HistoryPaginatedResult,
  HistoryCleanupOptions,
  HistoryTarget,
  HistoryStatus,
  HistoryContent,
  HistoryContentType,
  FileIntegrationType
} from '../types/history.types';
import { IHistoryAdapter, IHistoryService } from '../interfaces/history.interface';

/**
 * Service d'historique - Couche métier
 */
export class HistoryService implements IHistoryService {
  constructor(private adapter: IHistoryAdapter) {}

  /**
   * Initialiser le service
   */
  async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  /**
   * Ajouter une entrée (avant envoi)
   */
  async addEntry(
    content: any,
    target: HistoryTarget,
    options?: {
      integrationType?: FileIntegrationType;
      integrationOptions?: any;
    }
  ): Promise<string> {
    const entry: HistoryEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      content: this.formatContent(content),
      target,
      status: 'pending',
      retryCount: 0,
      integrationType: options?.integrationType,
      integrationOptions: options?.integrationOptions
    };

    await this.adapter.add(entry);
    return entry.id;
  }

  /**
   * Marquer comme en cours d'envoi
   */
  async markSending(id: string): Promise<void> {
    await this.adapter.updateStatus(id, 'sending');
  }

  /**
   * Marquer comme envoyé avec succès
   */
  async markSuccess(
    id: string,
    metadata?: {
      blocksCount?: number;
      processingTime?: number;
    }
  ): Promise<void> {
    await this.adapter.updateStatus(id, 'success', undefined, metadata);
  }

  /**
   * Marquer comme erreur
   */
  async markError(id: string, error: string): Promise<void> {
    // Incrémenter le compteur de retry
    const entry = await this.adapter.getById(id);
    if (entry) {
      const retryCount = (entry.retryCount || 0) + 1;
      await this.adapter.updateStatus(id, 'error', error, { retryCount });
    } else {
      await this.adapter.updateStatus(id, 'error', error);
    }
  }

  /**
   * Récupérer l'historique filtré
   */
  async getHistory(filter?: HistoryFilter): Promise<HistoryEntry[]> {
    return this.adapter.getAll(filter);
  }

  /**
   * Récupérer l'historique avec pagination
   */
  async getHistoryPaginated(
    filter?: HistoryFilter,
    pagination?: HistoryPaginationOptions
  ): Promise<HistoryPaginatedResult> {
    return this.adapter.getPaginated(filter, pagination);
  }

  /**
   * Récupérer une entrée par ID
   */
  async getById(id: string): Promise<HistoryEntry | null> {
    return this.adapter.getById(id);
  }

  /**
   * Statistiques
   */
  async getStats(): Promise<HistoryStats> {
    return this.adapter.getStats();
  }

  /**
   * Rechercher dans l'historique
   */
  async search(query: string, filter?: HistoryFilter): Promise<HistoryEntry[]> {
    return this.adapter.search(query, filter);
  }

  /**
   * Supprimer une entrée
   */
  async delete(id: string): Promise<void> {
    await this.adapter.delete(id);
  }

  /**
   * Nettoyer l'historique
   */
  async cleanup(options: HistoryCleanupOptions = {}): Promise<number> {
    const defaultOptions: HistoryCleanupOptions = {
      olderThanDays: 30,
      keepSuccessful: true,
      ...options
    };

    return this.adapter.cleanup(defaultOptions);
  }

  /**
   * Exporter l'historique
   */
  async export(filter?: HistoryFilter): Promise<string> {
    return this.adapter.export(filter);
  }

  /**
   * Importer l'historique
   */
  async import(data: string): Promise<number> {
    return this.adapter.import(data);
  }

  /**
   * Obtenir les métriques de performance
   */
  async getPerformanceMetrics(): Promise<{
    averageProcessingTime: number;
    successRate: number;
    errorRate: number;
    throughputPerHour: number;
  }> {
    const stats = await this.getStats();
    const entries = await this.getHistory();

    // Calculer le temps moyen de traitement
    const entriesWithProcessingTime = entries.filter(e => e.processingTime);
    const averageProcessingTime = entriesWithProcessingTime.length > 0
      ? entriesWithProcessingTime.reduce((acc, e) => acc + (e.processingTime || 0), 0) / entriesWithProcessingTime.length
      : 0;

    // Calculer les taux
    const total = stats.total;
    const successRate = total > 0 ? stats.success / total : 0;
    const errorRate = total > 0 ? stats.error / total : 0;

    // Calculer le throughput (dernières 24h)
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentEntries = entries.filter(e => e.timestamp >= last24h);
    const throughputPerHour = recentEntries.length / 24;

    return {
      averageProcessingTime,
      successRate,
      errorRate,
      throughputPerHour
    };
  }

  /**
   * Formater le contenu pour l'historique
   */
  private formatContent(content: any): HistoryContent {
    if (typeof content === 'string') {
      return {
        type: 'text',
        data: content,
        preview: this.generatePreview(content),
        size: new Blob([content]).size
      };
    }

    if (content && typeof content === 'object') {
      // Fichier
      if (content.name && content.size && content.type) {
        return {
          type: this.getContentTypeFromMime(content.type),
          data: content.name,
          preview: `📎 ${content.name} (${this.formatFileSize(content.size)})`,
          size: content.size,
          mimeType: content.type,
          fileName: content.name
        };
      }

      // HTML/Markdown
      if (content.html) {
        return {
          type: 'html',
          data: content.html,
          preview: this.generatePreview(this.stripHtml(content.html)),
          size: new Blob([content.html]).size
        };
      }

      if (content.markdown) {
        return {
          type: 'markdown',
          data: content.markdown,
          preview: this.generatePreview(content.markdown),
          size: new Blob([content.markdown]).size
        };
      }

      // Objet générique
      const jsonString = JSON.stringify(content);
      return {
        type: 'text',
        data: jsonString,
        preview: this.generatePreview(jsonString),
        size: new Blob([jsonString]).size
      };
    }

    // Fallback
    const stringContent = String(content);
    return {
      type: 'text',
      data: stringContent,
      preview: this.generatePreview(stringContent),
      size: new Blob([stringContent]).size
    };
  }

  /**
   * Générer un preview du contenu (100 chars max)
   */
  private generatePreview(content: string): string {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    return cleaned.length > 100 ? cleaned.substring(0, 97) + '...' : cleaned;
  }

  /**
   * Déterminer le type de contenu à partir du MIME type
   */
  private getContentTypeFromMime(mimeType: string): HistoryContentType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'image'; // Traité comme image dans l'historique
    if (mimeType.startsWith('audio/')) return 'image'; // Traité comme image dans l'historique
    return 'file';
  }

  /**
   * Formater la taille d'un fichier
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Supprimer les balises HTML
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Générer un ID unique
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}