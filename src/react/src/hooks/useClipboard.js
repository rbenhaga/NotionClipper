// src/react/src/hooks/useClipboard.js
import { useState, useCallback, useEffect, useRef } from 'react';

export function useClipboard() {
  const [clipboard, setClipboard] = useState(null);
  const [editedClipboard, setEditedClipboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const lastHashRef = useRef(null);

  // === FUNCTIONS FIRST ===

  // Charger le clipboard
  const loadClipboard = useCallback(async (force = false) => {
    if (!window.electronAPI) return;
    
    if (editedClipboard && !force) {
      return editedClipboard;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.invoke('clipboard:get');
      
      if (result.success && result.clipboard) {
        // Le contenu est déjà formaté et typé par Electron
        if (result.clipboard?.hash !== lastHashRef.current) {
          lastHashRef.current = result.clipboard?.hash;
          setClipboard(result.clipboard);
          setEditedClipboard(null);
        }
        
        return result.clipboard;
      }
    } catch (error) {
      console.error('Failed to load clipboard:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [editedClipboard]);

  // Vider le clipboard
  const clearClipboard = useCallback(async () => {
    if (!window.electronAPI) return;
    
    try {
      await window.electronAPI.invoke('clipboard:clear');
      setClipboard(null);
      setEditedClipboard(null);
      lastHashRef.current = null;
    } catch (error) {
      setError(error.message);
    }
  }, []);

  // Définir le contenu
  const setClipboardContent = useCallback(async (content, type = 'text') => {
    if (!window.electronAPI) return false;

    try {
      const result = await window.electronAPI.invoke('clipboard:set', {
        content,
        type
      });
      
      return result.success;
    } catch (error) {
      console.error('Failed to set clipboard:', error);
      setError(error.message);
      return false;
    }
  }, []);

  // Obtenir l'historique
  const getHistory = useCallback(async () => {
    if (!window.electronAPI) return [];

    try {
      const result = await window.electronAPI.invoke('clipboard:get-history');
      return result.history || [];
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }, []);

  // === EFFECTS USING THE FUNCTIONS ===

  // Démarrer la surveillance au montage
  useEffect(() => {
    const startWatching = async () => {
      if (window.electronAPI) {
        try {
          await window.electronAPI.invoke('clipboard:start-watching');
          setIsWatching(true);
          console.log('👁️ Clipboard watching started');
          // Charger le contenu initial
          loadClipboard();
        } catch (error) {
          console.error('Failed to start watching:', error);
        }
      }
    };

    startWatching();

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (window.electronAPI && isWatching) {
        window.electronAPI.invoke('clipboard:stop-watching').catch(console.error);
      }
    };
  }, []); // Pas de dépendance à loadClipboard pour éviter les boucles

  // Écouter les changements
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleClipboardChange = (event, data) => {
      if (!mountedRef.current) return;
      
      console.log('📋 Clipboard changed:', data.current?.type, data.current?.subtype);
      
      if (data.current?.hash !== lastHashRef.current) {
        lastHashRef.current = data.current?.hash;
        setClipboard(data.current);
        setEditedClipboard(null);
        setError(null);

        // Émettre un événement pour d'autres composants
        window.dispatchEvent(new CustomEvent('clipboard-updated', {
          detail: data.current
        }));
      }
    };

    const handleClipboardCleared = () => {
      if (!mountedRef.current) return;
      
      console.log('🗑️ Clipboard cleared');
      setClipboard(null);
      setEditedClipboard(null);
      lastHashRef.current = null;
    };

    const handleClipboardError = (event, errorMsg) => {
      if (!mountedRef.current) return;
      
      console.error('Clipboard error:', errorMsg);
      setError(errorMsg);
    };

    // S'abonner aux événements
    window.electronAPI.on('clipboard:changed', handleClipboardChange);
    window.electronAPI.on('clipboard:cleared', handleClipboardCleared);
    window.electronAPI.on('clipboard:error', handleClipboardError);

    // Cleanup
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeListener('clipboard:changed', handleClipboardChange);
        window.electronAPI.removeListener('clipboard:cleared', handleClipboardCleared);
        window.electronAPI.removeListener('clipboard:error', handleClipboardError);
      }
    };
  }, []);

  // Recharger périodiquement si pas de watching
  useEffect(() => {
    if (!isWatching) {
      const interval = setInterval(() => {
        loadClipboard();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isWatching, loadClipboard]);

  return {
    // État
    clipboard,
    editedClipboard,
    loading,
    error,
    isWatching,
    
    // Actions
    setEditedClipboard,
    loadClipboard,
    setClipboardContent,
    clearClipboard,
    getHistory,
    
    // Helpers
    getCurrentContent: () => editedClipboard || clipboard,
    hasContent: () => !!(editedClipboard || clipboard),
    contentType: () => clipboard?.type,
    contentSubtype: () => clipboard?.subtype
  };
}