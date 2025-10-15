// packages/core-shared/src/types/history.types.ts

export interface HistoryEntry {
  id: string; // UUID unique
  timestamp: number; // Date.now()
  type: 'text' | 'image' | 'file' | 'markdown' | 'html' | 'code';
  
  // Contenu
  content: {
    raw: string; // Contenu brut
    preview: string; // Preview tronquée (max 200 chars)
    blocks: any[]; // Blocs Notion générés
    metadata?: {
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      source?: string; // URL source si applicable
    };
  };
  
  // Page de destination
  page: {
    id: string;
    title: string;
    icon?: string;
  };
  
  // Statut
  status: 'pending' | 'sending' | 'success' | 'failed' | 'retrying';
  error?: string;
  
  // Métadonnées
  retryCount?: number;
  sentAt?: number; // Timestamp d'envoi réussi
  duration?: number; // Durée en ms
}

export interface HistoryStats {
  total: number;
  success: number;
  failed: number;
  pending: number;
  totalSize: number; // Taille totale en bytes
  byType: Record<string, number>;
  byPage: Record<string, number>;
}

export interface HistoryFilter {
  status?: HistoryEntry['status'][];
  type?: HistoryEntry['type'][];
  pageId?: string;
  dateFrom?: number;
  dateTo?: number;
  search?: string;
}