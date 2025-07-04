// src/react/src/hooks/useClipboard.js
/**
 * Hook pour la gestion du presse-papiers
 */

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export function useClipboard() {
  const [clipboard, setClipboard] = useState(null);
  const [editedClipboard, setEditedClipboard] = useState(null);

  const loadClipboard = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/clipboard`);
      if (response.data?.content) {
        // Ne pas écraser si on a une version éditée
        if (!editedClipboard) {
          setClipboard(response.data);
        }
      }
    } catch (error) {
      console.error('Erreur lecture presse-papiers:', error);
    }
  }, [editedClipboard]);

  const clearClipboard = useCallback(() => {
    setClipboard(null);
    setEditedClipboard(null);
  }, []);

  return {
    clipboard,
    editedClipboard,
    setEditedClipboard,
    loadClipboard,
    clearClipboard
  };
}

/**
 * Hook pour gérer l'historique du presse-papiers
 */
export function useClipboardHistory(maxItems = 10) {
  const [history, setHistory] = useState([]);
  
  // Charger l'historique depuis le localStorage
  useEffect(() => {
    const saved = localStorage.getItem('clipboard_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
      }
    }
  }, []);

  // Ajouter un élément à l'historique
  const addToHistory = useCallback((item) => {
    setHistory(prev => {
      const newHistory = [item, ...prev.filter(h => h.content !== item.content)];
      const limited = newHistory.slice(0, maxItems);
      
      // Sauvegarder dans localStorage
      localStorage.setItem('clipboard_history', JSON.stringify(limited));
      
      return limited;
    });
  }, [maxItems]);

  // Supprimer un élément de l'historique
  const removeFromHistory = useCallback((index) => {
    setHistory(prev => {
      const newHistory = prev.filter((_, i) => i !== index);
      localStorage.setItem('clipboard_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  // Vider l'historique
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('clipboard_history');
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}