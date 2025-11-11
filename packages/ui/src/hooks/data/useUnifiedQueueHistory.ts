// packages/ui/src/hooks/data/useUnifiedQueueHistory.ts
// 🎯 Hook unifié pour gérer queue et historique avec support offline

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { useTranslation } from '@notion-clipper/i18n';
import type { UnifiedEntry } from '../../components/unified/UnifiedQueueHistory';

interface QueueItem {
  id: string;
  content: any;
  pageId: string;
  timestamp: number;
  retryCount?: number;
  error?: string;
  status: 'pending' | 'sending' | 'error';
}

interface HistoryItem {
  id: string;
  content: any;
  pageId: string;
  timestamp: number;
  status: 'success' | 'error';
  error?: string;
}

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

    // Si c'est un objet complexe, essayer de le sérialiser de manière lisible
    try {
      const serialized = JSON.stringify(content);
      return serialized.length > 100 ? serialized.slice(0, 100) + '...' : serialized;
    } catch {
      return t('common.unreadableContent');
    }
  }

  return t('common.contentWithoutText');
}

export function useUnifiedQueueHistory() {
  const { t } = useTranslation();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const networkStatus = useNetworkStatus();

  // Charger les données depuis le backend
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Charger depuis localStorage comme fallback principal
      const localQueue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
      const localHistory = JSON.parse(localStorage.getItem('offline-history') || '[]');
      
      setQueueItems(localQueue);
      setHistoryItems(localHistory);
      
      console.log(`[UnifiedQueueHistory] Loaded from localStorage: ${localQueue.length} queue items, ${localHistory.length} history items`);
      
      // Note: Les canaux IPC queue:get-all et history:get-all ne sont pas encore implémentés
      // Pour l'instant, on utilise uniquement localStorage
      
    } catch (error) {
      console.error('[UnifiedQueueHistory] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Ajouter un élément à la queue (utilisé quand offline)
  const addToQueue = useCallback(async (content: any, pageId: string, sectionId?: string) => {
    const item: QueueItem = {
      id: `queue-${Date.now()}-${Math.random()}`,
      content,
      pageId,
      timestamp: Date.now(),
      status: 'pending'
    };

    try {
      // Ajouter à l'état local immédiatement
      setQueueItems(prev => {
        const newQueue = [...prev, item];
        // Sauvegarder dans localStorage
        localStorage.setItem('offline-queue', JSON.stringify(newQueue));
        return newQueue;
      });
      
      console.log('[UnifiedQueueHistory] ✅ Added to queue:', item.id);
      return item.id;
    } catch (error) {
      console.error('[UnifiedQueueHistory] Error adding to queue:', error);
      return null;
    }
  }, []);

  // Ajouter un élément à l'historique
  const addToHistory = useCallback(async (content: any, pageId: string, status: 'success' | 'error', error?: string, sectionId?: string) => {
    const item: HistoryItem = {
      id: `history-${Date.now()}-${Math.random()}`,
      content,
      pageId,
      timestamp: Date.now(),
      status,
      error
    };

    try {
      // Ajouter à l'état local immédiatement
      setHistoryItems(prev => {
        const newHistory = [item, ...prev.slice(0, 99)]; // Garder max 100 items
        // Sauvegarder dans localStorage
        localStorage.setItem('offline-history', JSON.stringify(newHistory));
        return newHistory;
      });
      
      console.log('[UnifiedQueueHistory] ✅ Added to history:', item.id, status);
      return item.id;
    } catch (error) {
      console.error('[UnifiedQueueHistory] Error adding to history:', error);
      return null;
    }
  }, []);

  // Réessayer un élément de la queue
  const retryQueueItem = useCallback(async (id: string) => {
    const item = queueItems.find(q => q.id === id);
    if (!item) return false;

    try {
      // Marquer comme en cours d'envoi
      setQueueItems(prev => prev.map(q => 
        q.id === id ? { ...q, status: 'sending' as const } : q
      ));

      if (window.electronAPI?.invoke) {
        const result = await window.electronAPI.invoke('queue:retry', id);
        
        if (result.success) {
          // Déplacer vers l'historique
          await addToHistory(item.content, item.pageId, 'success');
          
          // Supprimer de la queue
          setQueueItems(prev => prev.filter(q => q.id !== id));
          
          if (window.electronAPI.invoke) {
            await window.electronAPI.invoke('queue:remove', id);
          }
          
          return true;
        } else {
          // Marquer comme erreur
          const updatedItem = {
            ...item,
            status: 'error' as const,
            error: result.error,
            retryCount: (item.retryCount || 0) + 1
          };
          
          setQueueItems(prev => prev.map(q => 
            q.id === id ? updatedItem : q
          ));
          
          // Sauvegarder dans localStorage
          const updatedQueue = queueItems.map(q => q.id === id ? updatedItem : q);
          localStorage.setItem('offline-queue', JSON.stringify(updatedQueue));
          
          return false;
        }
      }
    } catch (error: any) {
      console.error('[UnifiedQueueHistory] Error retrying queue item:', error);
      
      // Marquer comme erreur
      setQueueItems(prev => prev.map(q => 
        q.id === id ? { 
          ...q, 
          status: 'error' as const, 
          error: error.message,
          retryCount: (q.retryCount || 0) + 1
        } : q
      ));
      
      return false;
    }
  }, [queueItems, addToHistory]);

  // Supprimer un élément de la queue
  const removeFromQueue = useCallback(async (id: string) => {
    try {
      if (window.electronAPI?.invoke) {
        const result = await window.electronAPI.invoke('queue:remove', id);
        if (result.success) {
          setQueueItems(prev => prev.filter(q => q.id !== id));
          return true;
        }
      }
    } catch (error) {
      console.error('[UnifiedQueueHistory] Error removing from queue:', error);
    }
    return false;
  }, []);

  // Supprimer un élément de l'historique
  const removeFromHistory = useCallback(async (id: string) => {
    try {
      if (window.electronAPI?.invoke) {
        const result = await window.electronAPI.invoke('history:remove', id);
        if (result.success) {
          setHistoryItems(prev => prev.filter(h => h.id !== id));
          return true;
        }
      }
    } catch (error) {
      console.error('[UnifiedQueueHistory] Error removing from history:', error);
    }
    return false;
  }, []);

  // Vider toute la queue
  const clearQueue = useCallback(async () => {
    try {
      if (window.electronAPI?.invoke) {
        const result = await window.electronAPI.invoke('queue:clear');
        if (result.success) {
          setQueueItems([]);
          return true;
        }
      }
    } catch (error) {
      console.error('[UnifiedQueueHistory] Error clearing queue:', error);
    }
    return false;
  }, []);

  // Vider tout l'historique
  const clearHistory = useCallback(async () => {
    try {
      if (window.electronAPI?.invoke) {
        const result = await window.electronAPI.invoke('history:clear');
        if (result.success) {
          setHistoryItems([]);
          return true;
        }
      }
    } catch (error) {
      console.error('[UnifiedQueueHistory] Error clearing history:', error);
    }
    return false;
  }, []);

  // Traitement automatique de la queue quand on revient online
  useEffect(() => {
    if (networkStatus.isOnline && queueItems.length > 0) {
      console.log('[UnifiedQueueHistory] Back online, processing queue...');
      
      // Traiter les éléments en attente
      const pendingItems = queueItems.filter(item => item.status === 'pending');
      
      pendingItems.forEach(async (item) => {
        await retryQueueItem(item.id);
      });
    }
  }, [networkStatus.isOnline, queueItems, retryQueueItem]);

  // Convertir vers le format unifié
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
          pageTitle: 'Page', // TODO: Récupérer le vrai titre
          sectionId: undefined, // TODO: Support des sections
          sectionTitle: undefined
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
          pageTitle: 'Page', // TODO: Récupérer le vrai titre
          sectionId: undefined, // TODO: Support des sections
          sectionTitle: undefined
        },
        error: item.error,
        isOffline: false
      });
    });

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }, [queueItems, historyItems, networkStatus.isOnline, t]);

  // Charger les données au démarrage
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // Données unifiées
    entries: unifiedEntries,
    loading,

    // Actions unifiées
    retry: async (id: string) => {
      const entry = unifiedEntries.find(e => e.id === id);
      if (entry?.type === 'queue') {
        return await retryQueueItem(id);
      }
      return false;
    },

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
      console.log('[UnifiedQueueHistory] 🧹 Starting complete clear...');
      
      // 1. Clear services
      await clearQueue();
      await clearHistory();
      
      // 2. Clear localStorage (double sécurité)
      localStorage.removeItem('offline-queue');
      localStorage.removeItem('offline-history');
      
      // 3. Reset local state
      setQueueItems([]);
      setHistoryItems([]);
      
      console.log('[UnifiedQueueHistory] ✅ Complete clear finished');
    },

    // Actions spécifiques
    addToQueue,
    addToHistory,
    
    // Statistiques
    stats: {
      queueCount: queueItems.length,
      historyCount: historyItems.length,
      pendingCount: queueItems.filter(q => q.status === 'pending').length,
      errorCount: queueItems.filter(q => q.status === 'error').length + historyItems.filter(h => h.status === 'error').length
    },

    // État réseau
    isOnline: networkStatus.isOnline,

    // Rechargement
    reload: loadData
  };
}