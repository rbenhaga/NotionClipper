// packages/ui/src/hooks/data/useSelectedSections.ts
// 🎯 Hook pour gérer les sections sélectionnées dans le TOC multi-pages avec persistence

import { useState, useCallback, useEffect } from 'react';

export interface SelectedSection {
  pageId: string;
  blockId: string;
  headingText: string;
}

const STORAGE_KEY = 'selectedSections';

export function useSelectedSections() {
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 🔥 NOUVEAU: Charger les sections depuis electron-store au démarrage
  useEffect(() => {
    const loadSections = async () => {
      try {
        if (!window.electronAPI?.invoke) {
          console.warn('[useSelectedSections] ⚠️ electronAPI not available, using in-memory state only');
          setIsLoaded(true);
          return;
        }

        const result = await window.electronAPI.invoke('store:get', STORAGE_KEY);
        if (result && Array.isArray(result)) {
          console.log('[useSelectedSections] 📂 Loaded persisted sections:', result);
          setSelectedSections(result);
        } else {
          console.log('[useSelectedSections] 📂 No persisted sections found, starting fresh');
        }
      } catch (error) {
        console.error('[useSelectedSections] ❌ Error loading sections:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSections();
  }, []);

  // 🔥 NOUVEAU: Sauvegarder les sections dans electron-store à chaque changement
  const persistSections = useCallback(async (sections: SelectedSection[]) => {
    try {
      if (!window.electronAPI?.invoke) {
        console.warn('[useSelectedSections] ⚠️ electronAPI not available, cannot persist');
        return;
      }

      await window.electronAPI.invoke('store:set', STORAGE_KEY, sections);
      console.log('[useSelectedSections] 💾 Sections persisted:', sections);
    } catch (error) {
      console.error('[useSelectedSections] ❌ Error persisting sections:', error);
    }
  }, []);

  // Sélectionner une section pour une page
  const selectSection = useCallback((pageId: string, blockId: string, headingText: string) => {
    console.log('[useSelectedSections] 📍 Selecting section:', { pageId, blockId, headingText });
    setSelectedSections(prev => {
      // Remplacer la sélection existante pour cette page
      const filtered = prev.filter(s => s.pageId !== pageId);
      const newSections = [...filtered, { pageId, blockId, headingText }];
      console.log('[useSelectedSections] 📋 Updated sections:', newSections);

      // 🔥 Persister immédiatement
      persistSections(newSections);

      return newSections;
    });
  }, [persistSections]);

  // Désélectionner une section pour une page
  const deselectSection = useCallback((pageId: string) => {
    console.log('[useSelectedSections] ⚠️ DESELECT called for pageId:', pageId);
    console.trace('[useSelectedSections] Stack trace for deselect:');
    setSelectedSections(prev => {
      console.log('[useSelectedSections] Previous sections:', prev);
      const newSections = prev.filter(s => s.pageId !== pageId);
      console.log('[useSelectedSections] After filter:', newSections);

      // 🔥 Persister immédiatement
      persistSections(newSections);

      return newSections;
    });
  }, [persistSections]);

  // Obtenir la section sélectionnée pour une page
  const getSectionForPage = useCallback((pageId: string) => {
    return selectedSections.find(s => s.pageId === pageId);
  }, [selectedSections]);

  // Vider toutes les sections
  const clearSections = useCallback(() => {
    setSelectedSections([]);

    // 🔥 Persister immédiatement
    persistSections([]);
  }, [persistSections]);

  // Nettoyer les sections pour les pages qui ne sont plus sélectionnées
  const cleanupSections = useCallback((activePageIds: string[]) => {
    setSelectedSections(prev => {
      const newSections = prev.filter(s => activePageIds.includes(s.pageId));

      // 🔥 Persister immédiatement
      persistSections(newSections);

      return newSections;
    });
  }, [persistSections]);

  return {
    selectedSections,
    selectSection,
    deselectSection,
    getSectionForPage,
    clearSections,
    cleanupSections,
    isLoaded // 🔥 NOUVEAU: Exposer l'état de chargement
  };
}