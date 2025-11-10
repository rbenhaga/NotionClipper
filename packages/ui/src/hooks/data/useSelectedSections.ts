// packages/ui/src/hooks/data/useSelectedSections.ts
// 🎯 Hook pour gérer les sections sélectionnées dans le TOC multi-pages avec persistence

import { useState, useCallback, useEffect, useRef } from 'react';

export interface SelectedSection {
  pageId: string;
  blockId: string;
  headingText: string;
}

const STORAGE_KEY = 'selectedSections';

export function useSelectedSections() {
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isInitialMount = useRef(true);

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

  // 🔥 FIX: Auto-persist quand selectedSections change (avec comparaison pour éviter les duplications)
  const lastPersistedRef = useRef<string>('[]');

  useEffect(() => {
    // Skip le premier render (c'est le chargement initial)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Skip si pas encore chargé
    if (!isLoaded) {
      return;
    }

    const persistSections = async () => {
      try {
        if (!window.electronAPI?.invoke) {
          return;
        }

        // Comparer avec la dernière valeur persistée pour éviter les duplications
        const currentValue = JSON.stringify(selectedSections);
        if (currentValue === lastPersistedRef.current) {
          console.log('[useSelectedSections] ⏭️ Skip persist - no change');
          return;
        }

        console.log('[useSelectedSections] 💾 Persisting:', selectedSections.length, 'sections');
        await window.electronAPI.invoke('store:set', STORAGE_KEY, selectedSections);
        lastPersistedRef.current = currentValue;
        console.log('[useSelectedSections] ✅ Persisted');
      } catch (error) {
        console.error('[useSelectedSections] ❌ Error persisting:', error);
      }
    };

    persistSections();
  }, [selectedSections, isLoaded]);

  // Sélectionner une section pour une page
  const selectSection = useCallback((pageId: string, blockId: string, headingText: string) => {
    console.log('[useSelectedSections] 📍 Selecting section:', { pageId, blockId, headingText });
    setSelectedSections(prev => {
      // Remplacer la sélection existante pour cette page
      const filtered = prev.filter(s => s.pageId !== pageId);
      const newSections = [...filtered, { pageId, blockId, headingText }];
      console.log('[useSelectedSections] 📋 Updated sections:', newSections);
      return newSections;
    });
  }, []);

  // Désélectionner une section pour une page
  const deselectSection = useCallback((pageId: string) => {
    console.log('[useSelectedSections] ⚠️ Deselecting for pageId:', pageId);
    setSelectedSections(prev => prev.filter(s => s.pageId !== pageId));
  }, []);

  // Obtenir la section sélectionnée pour une page
  const getSectionForPage = useCallback((pageId: string) => {
    return selectedSections.find(s => s.pageId === pageId);
  }, [selectedSections]);

  // Vider toutes les sections
  const clearSections = useCallback(() => {
    console.log('[useSelectedSections] 🗑️ Clearing all sections');
    setSelectedSections([]);
  }, []);

  // Nettoyer les sections pour les pages qui ne sont plus sélectionnées
  const cleanupSections = useCallback((activePageIds: string[]) => {
    console.log('[useSelectedSections] 🧹 Cleanup for activePageIds:', activePageIds);
    setSelectedSections(prev => prev.filter(s => activePageIds.includes(s.pageId)));
  }, []);

  return {
    selectedSections,
    selectSection,
    deselectSection,
    getSectionForPage,
    clearSections,
    cleanupSections,
    isLoaded
  };
}