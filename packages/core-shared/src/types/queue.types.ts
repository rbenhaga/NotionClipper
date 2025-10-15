// packages/core-shared/src/types/queue.types.ts

export interface QueueEntry {
  id: string;
  historyId: string; // Lien vers l'entrée d'historique
  createdAt: number;
  priority: 'low' | 'normal' | 'high';
  
  // Payload de l'envoi
  payload: {
    pageId: string;
    content: any;
    options?: any;
  };
  
  // État
  status: 'queued' | 'processing' | 'retrying' | 'failed' | 'completed';
  attempts: number;
  maxAttempts: number;
  lastAttempt?: number;
  nextRetry?: number; // Timestamp du prochain retry
  
  // Erreur
  error?: string;
  errorStack?: string;
}

export interface QueueStats {
  total: number;
  queued: number;
  processing: number;
  retrying: number;
  failed: number;
  completed: number;
}

export interface QueueConfig {
  maxRetries: number; // Défaut: 5
  retryDelay: number; // Défaut: 5000ms
  retryBackoff: number; // Multiplier pour chaque retry (2x)
  maxQueueSize: number; // Défaut: 100
  processInterval: number; // Intervalle de traitement (défaut: 10000ms)
  batchSize: number; // Nombre d'éléments à traiter en parallèle (défaut: 3)
}