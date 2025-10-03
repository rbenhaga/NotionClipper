// src/react/src/hooks/useClipboard.js
import { useState, useCallback, useEffect, useRef } from 'react';

export function useClipboard() {
  const [clipboard, setClipboard] = useState(null);
  const [editedClipboard, setEditedClipboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const lastHashRef = useRef(null);

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

  // Charger au montage
  useEffect(() => {
    loadClipboard();
  }, [loadClipboard]);

  // Polling simple toutes les secondes
  useEffect(() => {
    const interval = setInterval(() => {
      loadClipboard();
    }, 1000);

    return () => clearInterval(interval);
  }, [loadClipboard]);

  return {
    // État
    clipboard,
    editedClipboard,
    loading,
    error,
    
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