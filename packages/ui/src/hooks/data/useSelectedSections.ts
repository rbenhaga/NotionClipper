// packages/ui/src/hooks/data/useSelectedSections.ts
// 🎯 Hook pour gérer les sections sélectionnées dans le TOC multi-pages avec persistence

import { useState, useCallback, useEffect, useRef } from 'react';
import { getStorageKey, getNotionScope, isNotionScopeReady } from '../../utils/scopedStorage';

export interface SelectedSection {
  pageId: string;
  blockId: string;
  headingText: string;
}

const BASE_STORAGE_KEY = 'selectedSections';

export function useSelectedSections() {
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isInitialMount = useRef(true);
  const lastPersistedRef = useRef<string>('[]');
  const persistCallCounter = useRef(0);
  // 🔧 FIX: Track the scope at load time to detect scope changes
  const loadedScopeRef = useRef<string>('');

  // 🔧 FIX: Get scoped storage key
  const getKey = useCallback(() => getStorageKey(BASE_STORAGE_KEY), []);

  // 🔥 NOUVEAU: Charger les sections depuis electron-store au démarrage
  useEffect(() => {
    const loadSections = async () => {
      try {
        if (!window.electronAPI?.invoke) {
          console.warn('[useSelectedSections] ⚠️ electronAPI not available');
          setIsLoaded(true);
          return;
        }

        const scopedKey = getKey();
        loadedScopeRef.current = getNotionScope(); // Use Notion scope for TOC selections
        
        const result = await window.electronAPI.invoke('store:get', scopedKey);
        if (result && Array.isArray(result)) {
          console.log(`[useSelectedSections] 📂 Loaded from ${scopedKey}:`, result.length, 'sections');
          setSelectedSections(result);
          lastPersistedRef.current = JSON.stringify(result);
        } else {
          console.log(`[useSelectedSections] 📂 No data for ${scopedKey}`);
        }
      } catch (error) {
        console.error('[useSelectedSections] ❌ Error loading:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSections();
  }, [getKey]);

  // 🔧 FIX: Listen to scope changes and clear data
  useEffect(() => {
    const handleAuthChanged = () => {
      const currentScope = getNotionScope(); // Use Notion scope
      if (currentScope !== loadedScopeRef.current) {
        console.log(`[useSelectedSections] 🔄 Notion scope changed, clearing sections`);
        setSelectedSections([]);
        lastPersistedRef.current = '[]';
        loadedScopeRef.current = currentScope;
        setIsLoaded(false);
        // Reload for new scope
        setTimeout(() => setIsLoaded(true), 0);
      }
    };

    window.addEventListener('auth-data-changed', handleAuthChanged);
    return () => window.removeEventListener('auth-data-changed', handleAuthChanged);
  }, []);

  // 🔥 FIX: Auto-persist quand selectedSections change (avec comparaison pour éviter les duplications)
  useEffect(() => {
    // Skip le premier render (c'est le chargement initial)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.log('[useSelectedSections] 🔄 Initial mount - skipping persist');
      return;
    }

    // Skip si pas encore chargé
    if (!isLoaded) {
      console.log('[useSelectedSections] ⏳ Not loaded yet - skipping persist');
      return;
    }

    const persistSections = async () => {
      const callId = ++persistCallCounter.current;

      try {
        // 🔧 PIÈGE 1: Block ALL writes if NotionScope not ready
        if (!isNotionScopeReady()) {
          console.log(`[useSelectedSections] ⏭️ Skip persist - NotionScope not ready`);
          return;
        }
        
        // 🔧 FIX: Guard against persisting to wrong scope during logout/login transition
        const currentScope = getNotionScope(); // Use Notion scope
        if (currentScope !== loadedScopeRef.current) {
          console.log(`[useSelectedSections] ⏭️ Skip persist - scope mismatch (loaded: ${loadedScopeRef.current}, current: ${currentScope})`);
          return;
        }
        
        // 🔧 FIX: Don't persist empty array if we just cleared due to scope change
        // This prevents overwriting new user's data with empty array
        if (selectedSections.length === 0 && lastPersistedRef.current !== '[]') {
          // Only persist empty if we explicitly cleared (not due to scope change)
          console.log(`[useSelectedSections] ⚠️ Persisting empty array (explicit clear)`);
        }

        console.log(`[useSelectedSections] 🔄 useEffect triggered (call #${callId})`, {
          selectedSectionsLength: selectedSections.length,
          scope: currentScope,
          isLoaded,
          lastPersisted: lastPersistedRef.current
        });

        if (!window.electronAPI?.invoke) {
          console.error(`[useSelectedSections] ❌ electronAPI.invoke not available (call #${callId})`);
          return;
        }

        // Comparer avec la dernière valeur persistée pour éviter les duplications
        const currentValue = JSON.stringify(selectedSections);
        if (currentValue === lastPersistedRef.current) {
          console.log(`[useSelectedSections] ⏭️ Skip persist - no change (call #${callId})`);
          return;
        }

        // 🔧 FIX: Use scoped key
        const scopedKey = getKey();
        console.log(`[useSelectedSections] 💾 Persisting to ${scopedKey} (${selectedSections.length} sections)`);

        const result = await window.electronAPI.invoke('store:set', scopedKey, selectedSections);

        console.log(`[useSelectedSections] 💾 IPC RESPONSE (call #${callId}):`, JSON.stringify(result));

        if (result?.success) {
          lastPersistedRef.current = currentValue;
          console.log(`[useSelectedSections] ✅ Persist successful (call #${callId})`);
        } else {
          console.error(`[useSelectedSections] ❌ Persist failed (call #${callId}):`, result);
        }
      } catch (error) {
        console.error(`[useSelectedSections] ❌ Exception during persist (call #${callId}):`, error);
      }
    };

    persistSections();
  }, [selectedSections, isLoaded, getKey]);

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