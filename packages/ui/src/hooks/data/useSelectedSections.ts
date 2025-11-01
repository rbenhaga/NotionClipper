// packages/ui/src/hooks/data/useSelectedSections.ts
// 🎯 Hook pour gérer les sections sélectionnées dans le TOC multi-pages

import { useState, useCallback } from 'react';

export interface SelectedSection {
  pageId: string;
  blockId: string;
  headingText: string;
}

export function useSelectedSections() {
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([]);

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
    setSelectedSections(prev => prev.filter(s => s.pageId !== pageId));
  }, []);

  // Obtenir la section sélectionnée pour une page
  const getSectionForPage = useCallback((pageId: string) => {
    return selectedSections.find(s => s.pageId === pageId);
  }, [selectedSections]);

  // Vider toutes les sections
  const clearSections = useCallback(() => {
    setSelectedSections([]);
  }, []);

  // Nettoyer les sections pour les pages qui ne sont plus sélectionnées
  const cleanupSections = useCallback((activePageIds: string[]) => {
    setSelectedSections(prev => 
      prev.filter(s => activePageIds.includes(s.pageId))
    );
  }, []);

  return {
    selectedSections,
    selectSection,
    deselectSection,
    getSectionForPage,
    clearSections,
    cleanupSections
  };
}