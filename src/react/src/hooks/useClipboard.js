// src/react/src/hooks/useClipboard.js
/**
 * Hook pour la gestion du presse-papiers
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import clipboardService from '../services/clipboard';
import contentService from '../services/content';

export function useClipboard(autoStart = true) {
  const [content, setContent] = useState(null);
  const [editedContent, setEditedContent] = useState(null);
  const [contentType, setContentType] = useState('text');
  const [isPolling, setIsPolling] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const removeListenerRef = useRef(null);

  // Démarrer/arrêter le polling
  useEffect(() => {
    if (autoStart) {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [autoStart]);

  // Gérer les changements de contenu édité
  useEffect(() => {
    if (editedContent !== null && content) {
      setHasChanges(editedContent !== content.content);
    }
  }, [editedContent, content]);

  // Démarrer le polling
  const startPolling = useCallback(() => {
    if (isPolling) return;

    // Récupérer le contenu initial
    fetchContent();

    // Démarrer la surveillance
    clipboardService.startPolling();
    
    // Ajouter le listener
    removeListenerRef.current = clipboardService.addListener((newContent) => {
      setContent(newContent);
      
      // Détecter automatiquement le type si pas déjà défini
      if (newContent && newContent.content) {
        const detectedType = contentService.detectContentType(newContent.content);
        setContentType(detectedType);
      }
    });

    setIsPolling(true);
  }, [isPolling]);

  // Arrêter le polling
  const stopPolling = useCallback(() => {
    clipboardService.stopPolling();
    
    if (removeListenerRef.current) {
      removeListenerRef.current();
      removeListenerRef.current = null;
    }
    
    setIsPolling(false);
  }, []);

  // Récupérer le contenu manuellement
  const fetchContent = useCallback(async () => {
    try {
      const newContent = await clipboardService.getContent();
      setContent(newContent);
      
      if (newContent && newContent.content) {
        const detectedType = contentService.detectContentType(newContent.content);
        setContentType(detectedType);
      }
      
      return newContent;
    } catch (error) {
      console.error('Erreur lors de la récupération du presse-papiers:', error);
      return null;
    }
  }, []);

  // Réinitialiser le contenu édité
  const resetEdited = useCallback(() => {
    setEditedContent(content?.content || null);
    setHasChanges(false);
  }, [content]);

  // Copier dans le presse-papiers
  const copyToClipboard = useCallback(async (text) => {
    return await clipboardService.copyToClipboard(text);
  }, []);

  // Obtenir le contenu final (édité ou original)
  const getFinalContent = useCallback(() => {
    return hasChanges && editedContent !== null ? editedContent : content?.content || '';
  }, [hasChanges, editedContent, content]);

  // Formater le contenu pour l'aperçu
  const getPreview = useCallback(() => {
    const finalContent = getFinalContent();
    return clipboardService.formatContentForDisplay(finalContent, contentType);
  }, [getFinalContent, contentType]);

  // Vérifier si le contenu est valide
  const isValid = useCallback(() => {
    const finalContent = getFinalContent();
    const validation = contentService.validateContent(finalContent, contentType);
    return validation.valid;
  }, [getFinalContent, contentType]);

  return {
    // État
    content,
    editedContent,
    contentType,
    hasChanges,
    isPolling,
    
    // Setters
    setEditedContent,
    setContentType,
    
    // Actions
    startPolling,
    stopPolling,
    fetchContent,
    resetEdited,
    copyToClipboard,
    
    // Getters
    getFinalContent,
    getPreview,
    isValid,
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