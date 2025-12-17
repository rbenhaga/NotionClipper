// packages/ui/src/hooks/data/useUnifiedQueueHistory.ts
// 🎯 Hook unifié pour gérer queue et historique avec support offline COMPLET

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { useTranslation } from '@notion-clipper/i18n';
import type { UnifiedEntry } from '../../components/unified/UnifiedQueueHistory';

/**
 * Structure d'un élément de queue
 * Compatible avec le backend ElectronQueueService
 */
interface QueueItem {
  id: string;
  content: any;
  pageId: string;
  timestamp: number;
  retryCount: number;
  error?: string;
  status: 'pending' | 'sending' | 'error' | 'queued' | 'retrying';
  sectionId?: string;
  sectionTitle?: string;
  // Blocs pré-parsés pour un envoi plus rapide
  parsedBlocks?: any[];
}

interface HistoryItem {
  id: string;
  content: any;
  pageId: string;
  timestamp: number;
  status: 'success' | 'error';
  error?: string;
  sectionId?: string;
  sectionTitle?: string;
}

// Clés localStorage pour persistance
const STORAGE_KEYS = {
  QUEUE: 'clipper-offline-queue',
  HISTORY: 'clipper-offline-history',
  PENDING_QUOTAS: 'clipper-pending-quotas',
};

// Fonction utilitaire pour extraire le texte de manière sécurisée
function extractTextFromContent(content: any, t: (key: any, params?: any) => string): string {
  if (typeof content === 'string') {
    return content;
  }

  if (content && typeof content === 'object') {
    if (typeof content.text === 'string') {
      return content.text;
    }
    if (typeof content.content === 'string') {
      return content.content;
    }

    try {
      const serialized = JSON.stringify(content);
      return serialized.length > 100 ? serialized.slice(0, 100) + '...' : serialized;
    } catch {
      return t('common.unreadableContent');
    }
  }

  return t('common.contentWithoutText');
}

/**
 * Sauvegarder la queue dans localStorage (persistance locale)
 */
function saveQueueToStorage(queue: QueueItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('[OfflineQueue] Error saving to localStorage:', error);
  }
}

/**
 * Charger la queue depuis localStorage
 */
function loadQueueFromStorage(): QueueItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[OfflineQueue] Error loading from localStorage:', error);
    return [];
  }
}

/**
 * Sauvegarder l'historique dans localStorage
 */
function saveHistoryToStorage(history: HistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('[OfflineQueue] Error saving history:', error);
  }
}

/**
 * Charger l'historique depuis localStorage
 */
function loadHistoryFromStorage(): HistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[OfflineQueue] Error loading history:', error);
    return [];
  }
}

export function useUnifiedQueueHistory(options?: { subscriptionTier?: string }) {
  const { t } = useTranslation();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const networkStatus = useNetworkStatus();
  const subscriptionTier = options?.subscriptionTier;
  
  // Ref pour éviter les traitements multiples
  const processingRef = useRef(false);
  const lastProcessTimeRef = useRef(0);

  // ============================================
  // CHARGEMENT INITIAL
  // ============================================
  
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Charger depuis localStorage (source de vérité locale)
      const localQueue = loadQueueFromStorage();
      const localHistory = loadHistoryFromStorage();
      
      setQueueItems(localQueue);
      setHistoryItems(localHistory);
      
      console.log(`[OfflineQueue] ✅ Loaded: ${localQueue.length} queue items, ${localHistory.length} history items`);
      
      // 2. Essayer de synchroniser avec le backend Electron si disponible
      if (window.electronAPI?.invoke) {
        try {
          const backendQueue = await window.electronAPI.invoke('queue:getAll');
          if (backendQueue.success && backendQueue.data?.length > 0) {
            // Fusionner les queues (éviter les doublons)
            const mergedQueue = [...localQueue];
            for (const item of backendQueue.data) {
              if (!mergedQueue.find(q => q.id === item.id)) {
                mergedQueue.push({
                  id: item.id,
                  content: item.payload?.content || item.content,
                  pageId: item.payload?.pageId || item.pageId,
                  timestamp: item.createdAt || item.timestamp || Date.now(),
                  retryCount: item.attempts || 0,
                  status: item.status === 'queued' ? 'pending' : item.status,
                  error: item.error,
                  sectionId: item.payload?.sectionId,
                  sectionTitle: item.payload?.sectionTitle,
                  parsedBlocks: item.payload?.parsedBlocks,
                });
              }
            }
            setQueueItems(mergedQueue);
            saveQueueToStorage(mergedQueue);
          }
        } catch (error) {
          console.warn('[OfflineQueue] Could not sync with backend:', error);
        }
      }
      
    } catch (error) {
      console.error('[OfflineQueue] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // AJOUT À LA QUEUE (MODE OFFLINE)
  // ============================================
  
  const addToQueue = useCallback(async (
    content: any, 
    pageId: string, 
    sectionId?: string,
    sectionTitle?: string,
    parsedBlocks?: any[]
  ): Promise<string | null> => {
    const item: QueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      pageId,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      sectionId,
      sectionTitle,
      parsedBlocks,
    };

    try {
      // 1. Ajouter à l'état local immédiatement
      setQueueItems(prev => {
        const newQueue = [...prev, item];
        saveQueueToStorage(newQueue);
        return newQueue;
      });
      
      // 2. Essayer d'ajouter au backend Electron aussi
      if (window.electronAPI?.invoke) {
        try {
          await window.electronAPI.invoke('queue:add', {
            pageId,
            content,
            options: {
              sectionId,
              sectionTitle,
            },
            parsedBlocks,
            priority: 'normal',
          });
        } catch (error) {
          console.warn('[OfflineQueue] Could not add to backend queue:', error);
        }
      }
      
      console.log(`[OfflineQueue] ✅ Added to queue: ${item.id}`);
      return item.id;
    } catch (error) {
      console.error('[OfflineQueue] Error adding to queue:', error);
      return null;
    }
  }, []);

  // ============================================
  // AJOUT À L'HISTORIQUE
  // ============================================
  
  const addToHistory = useCallback(async (
    content: any, 
    pageId: string, 
    status: 'success' | 'error', 
    error?: string, 
    sectionId?: string,
    sectionTitle?: string
  ): Promise<string | null> => {
    const item: HistoryItem = {
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      pageId,
      timestamp: Date.now(),
      status,
      error,
      sectionId,
      sectionTitle,
    };

    try {
      setHistoryItems(prev => {
        const newHistory = [item, ...prev.slice(0, 99)]; // Max 100 items
        saveHistoryToStorage(newHistory);
        return newHistory;
      });
      
      console.log(`[OfflineQueue] ✅ Added to history: ${item.id} (${status})`);
      return item.id;
    } catch (error) {
      console.error('[OfflineQueue] Error adding to history:', error);
      return null;
    }
  }, []);

  // ============================================
  // TRAITEMENT D'UN ÉLÉMENT DE LA QUEUE
  // ============================================
  
  const processQueueItem = useCallback(async (item: QueueItem): Promise<boolean> => {
    console.log(`[OfflineQueue] 🔄 Processing item: ${item.id}`);
    
    // Marquer comme en cours d'envoi
    setQueueItems(prev => {
      const updated = prev.map(q => 
        q.id === item.id ? { ...q, status: 'sending' as const } : q
      );
      saveQueueToStorage(updated);
      return updated;
    });

    try {
      // Vérifier que l'API Electron est disponible
      if (!window.electronAPI?.sendToNotion) {
        throw new Error('Electron API not available');
      }

      // Préparer les données d'envoi
      const sendData: any = {
        pageId: item.pageId,
        content: item.content,
        options: {
          type: 'paragraph',
          ...(item.sectionId && { afterBlockId: item.sectionId }),
        },
      };

      // Envoyer via Electron
      const result = await window.electronAPI.sendToNotion(sendData);

      if (result.success) {
        console.log(`[OfflineQueue] ✅ Successfully sent: ${item.id}`);
        
        // Ajouter à l'historique avec succès
        await addToHistory(
          item.content, 
          item.pageId, 
          'success', 
          undefined, 
          item.sectionId, 
          item.sectionTitle
        );
        
        // Supprimer de la queue
        setQueueItems(prev => {
          const filtered = prev.filter(q => q.id !== item.id);
          saveQueueToStorage(filtered);
          return filtered;
        });
        
        return true;
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error(`[OfflineQueue] ❌ Failed to send: ${item.id}`, error);
      
      const newRetryCount = item.retryCount + 1;
      const maxRetries = 5;
      
      if (newRetryCount >= maxRetries) {
        // Max retries atteint - marquer comme erreur définitive
        setQueueItems(prev => {
          const updated = prev.map(q => 
            q.id === item.id ? { 
              ...q, 
              status: 'error' as const, 
              error: error.message,
              retryCount: newRetryCount,
            } : q
          );
          saveQueueToStorage(updated);
          return updated;
        });
        
        // Ajouter à l'historique avec erreur
        await addToHistory(
          item.content, 
          item.pageId, 
          'error', 
          error.message, 
          item.sectionId, 
          item.sectionTitle
        );
      } else {
        // Remettre en attente pour retry
        setQueueItems(prev => {
          const updated = prev.map(q => 
            q.id === item.id ? { 
              ...q, 
              status: 'pending' as const, 
              error: error.message,
              retryCount: newRetryCount,
            } : q
          );
          saveQueueToStorage(updated);
          return updated;
        });
      }
      
      return false;
    }
  }, [addToHistory]);

  // ============================================
  // TRAITEMENT DE TOUTE LA QUEUE
  // ============================================
  
  const processQueue = useCallback(async () => {
    // Éviter les traitements multiples simultanés
    if (processingRef.current) {
      console.log('[OfflineQueue] Already processing, skipping...');
      return;
    }
    
    // Éviter de traiter trop souvent (min 5 secondes entre chaque)
    const now = Date.now();
    if (now - lastProcessTimeRef.current < 5000) {
      console.log('[OfflineQueue] Too soon since last process, skipping...');
      return;
    }
    
    // Vérifier qu'on est en ligne
    if (!networkStatus.isOnline) {
      console.log('[OfflineQueue] Offline, cannot process queue');
      return;
    }
    
    // Vérifier le tier (FREE ne peut pas utiliser la queue offline)
    if (subscriptionTier === 'FREE') {
      console.log('[OfflineQueue] ❌ FREE tier - offline queue disabled');
      return;
    }
    
    const pendingItems = queueItems.filter(q => q.status === 'pending');
    if (pendingItems.length === 0) {
      console.log('[OfflineQueue] No pending items to process');
      return;
    }
    
    console.log(`[OfflineQueue] 🚀 Processing ${pendingItems.length} pending items...`);
    
    processingRef.current = true;
    lastProcessTimeRef.current = now;
    setIsProcessing(true);
    
    try {
      // Traiter les éléments un par un (pas en parallèle pour éviter les problèmes)
      for (const item of pendingItems) {
        await processQueueItem(item);
        // Petit délai entre chaque envoi
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
    
    console.log('[OfflineQueue] ✅ Queue processing complete');
  }, [queueItems, networkStatus.isOnline, subscriptionTier, processQueueItem]);

  // ============================================
  // RETRY MANUEL D'UN ÉLÉMENT
  // ============================================
  
  const retryQueueItem = useCallback(async (id: string): Promise<boolean> => {
    const item = queueItems.find(q => q.id === id);
    if (!item) {
      console.warn(`[OfflineQueue] Item not found: ${id}`);
      return false;
    }
    
    if (!networkStatus.isOnline) {
      console.warn('[OfflineQueue] Cannot retry while offline');
      return false;
    }
    
    // Remettre en pending et traiter
    setQueueItems(prev => {
      const updated = prev.map(q => 
        q.id === id ? { ...q, status: 'pending' as const, retryCount: 0 } : q
      );
      saveQueueToStorage(updated);
      return updated;
    });
    
    // Attendre que l'état soit mis à jour
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return await processQueueItem({ ...item, status: 'pending', retryCount: 0 });
  }, [queueItems, networkStatus.isOnline, processQueueItem]);

  // ============================================
  // SUPPRESSION
  // ============================================
  
  const removeFromQueue = useCallback(async (id: string): Promise<boolean> => {
    setQueueItems(prev => {
      const filtered = prev.filter(q => q.id !== id);
      saveQueueToStorage(filtered);
      return filtered;
    });
    console.log(`[OfflineQueue] 🗑️ Removed from queue: ${id}`);
    return true;
  }, []);

  const removeFromHistory = useCallback(async (id: string): Promise<boolean> => {
    setHistoryItems(prev => {
      const filtered = prev.filter(h => h.id !== id);
      saveHistoryToStorage(filtered);
      return filtered;
    });
    console.log(`[OfflineQueue] 🗑️ Removed from history: ${id}`);
    return true;
  }, []);

  // ============================================
  // CLEAR
  // ============================================
  
  const clearQueue = useCallback(async (): Promise<boolean> => {
    setQueueItems([]);
    saveQueueToStorage([]);
    
    // Aussi vider côté backend
    if (window.electronAPI?.invoke) {
      try {
        await window.electronAPI.invoke('queue:clear');
      } catch (error) {
        console.warn('[OfflineQueue] Could not clear backend queue:', error);
      }
    }
    
    console.log('[OfflineQueue] 🧹 Queue cleared');
    return true;
  }, []);

  const clearHistory = useCallback(async (): Promise<boolean> => {
    setHistoryItems([]);
    saveHistoryToStorage([]);
    console.log('[OfflineQueue] 🧹 History cleared');
    return true;
  }, []);

  // ============================================
  // EFFETS
  // ============================================
  
  // Charger les données au démarrage
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Traiter la queue automatiquement quand on revient en ligne
  useEffect(() => {
    if (networkStatus.isOnline && queueItems.length > 0 && !isProcessing) {
      const pendingCount = queueItems.filter(q => q.status === 'pending').length;
      if (pendingCount > 0) {
        console.log(`[OfflineQueue] 🌐 Back online with ${pendingCount} pending items`);
        // Délai pour laisser le temps à la connexion de se stabiliser
        const timer = setTimeout(() => {
          processQueue();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [networkStatus.isOnline, queueItems, isProcessing, processQueue]);

  // ============================================
  // DONNÉES UNIFIÉES POUR L'UI
  // ============================================
  
  const unifiedEntries = useMemo((): UnifiedEntry[] => {
    const entries: UnifiedEntry[] = [];

    // Ajouter les éléments de la queue
    queueItems.forEach(item => {
      entries.push({
        id: item.id,
        type: 'queue',
        status: item.status === 'sending' ? 'sending' :
                item.status === 'error' ? 'error' :
                networkStatus.isOnline ? 'pending' : 'offline',
        timestamp: item.timestamp,
        content: {
          text: extractTextFromContent(item.content, t),
          type: item.content?.type || 'text',
          preview: item.content?.preview
        },
        destination: {
          pageId: item.pageId,
          pageTitle: 'Page',
          sectionId: item.sectionId,
          sectionTitle: item.sectionTitle
        },
        error: item.error,
        retryCount: item.retryCount,
        isOffline: !networkStatus.isOnline
      });
    });

    // Ajouter les éléments de l'historique
    historyItems.forEach(item => {
      entries.push({
        id: item.id,
        type: 'history',
        status: item.status,
        timestamp: item.timestamp,
        content: {
          text: extractTextFromContent(item.content, t),
          type: item.content?.type || 'text',
          preview: item.content?.preview
        },
        destination: {
          pageId: item.pageId,
          pageTitle: 'Page',
          sectionId: item.sectionId,
          sectionTitle: item.sectionTitle
        },
        error: item.error,
        isOffline: false
      });
    });

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }, [queueItems, historyItems, networkStatus.isOnline, t]);

  // ============================================
  // RETOUR
  // ============================================
  
  return {
    // Données unifiées
    entries: unifiedEntries,
    loading,
    isProcessing,

    // Actions unifiées
    retry: retryQueueItem,
    remove: async (id: string) => {
      const entry = unifiedEntries.find(e => e.id === id);
      if (entry?.type === 'queue') {
        return await removeFromQueue(id);
      } else if (entry?.type === 'history') {
        return await removeFromHistory(id);
      }
      return false;
    },
    clear: async () => {
      await clearQueue();
      await clearHistory();
    },

    // Actions spécifiques
    addToQueue,
    addToHistory,
    processQueue,
    
    // Statistiques
    stats: {
      queueCount: queueItems.length,
      historyCount: historyItems.length,
      pendingCount: queueItems.filter(q => q.status === 'pending').length,
      errorCount: queueItems.filter(q => q.status === 'error').length + 
                  historyItems.filter(h => h.status === 'error').length
    },

    // État réseau
    isOnline: networkStatus.isOnline,
    lastChecked: networkStatus.lastChecked,
    forceNetworkCheck: networkStatus.forceCheck,
    reportNetworkError: networkStatus.reportNetworkError,
    reportNetworkRecovery: networkStatus.reportNetworkRecovery,

    // Rechargement
    reload: loadData
  };
}
