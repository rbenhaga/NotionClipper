// src/react/src/hooks/useClipboard.js
import { useState, useCallback, useEffect } from 'react';
import clipboardService from '../services/clipboard';

export function useClipboard() {
  const [clipboard, setClipboard] = useState(null);
  const [editedClipboard, setEditedClipboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(0);

  // Charger le contenu du presse-papiers
  const loadClipboard = useCallback(async () => {
    // Éviter les appels trop fréquents
    const now = Date.now();
    if (now - lastCheck < 500) return; // Max 2 fois par seconde
    
    setLastCheck(now);
    setLoading(true);
    
    try {
      const response = await clipboardService.getContent();
      
      if (response.clipboard && response.clipboard.content) {
        // Vérifier si le contenu a changé
        const currentContent = clipboard?.content;
        const newContent = response.clipboard.content;
        
        if (currentContent !== newContent) {
          setClipboard(response.clipboard);
          // Réinitialiser le contenu édité si le presse-papiers change
          setEditedClipboard(null);
        }
      } else {
        // Presse-papiers vide
        if (clipboard !== null) {
          setClipboard(null);
          setEditedClipboard(null);
        }
      }
    } catch (error) {
      console.error('Erreur chargement presse-papiers:', error);
      // Ne pas réinitialiser en cas d'erreur pour éviter de perdre le contenu
    } finally {
      setLoading(false);
    }
  }, [clipboard, lastCheck]);

  // Vider le presse-papiers
  const clearClipboard = useCallback(async () => {
    try {
      await clipboardService.clearClipboard();
      setClipboard(null);
      setEditedClipboard(null);
    } catch (error) {
      console.error('Erreur vidage presse-papiers:', error);
    }
  }, []);

  // Obtenir le contenu actuel (édité ou original)
  const getCurrentContent = useCallback(() => {
    return editedClipboard || clipboard;
  }, [clipboard, editedClipboard]);

  // Upload d'image si présente
  const uploadClipboardImage = useCallback(async () => {
    if (!clipboard || clipboard.type !== 'image') {
      throw new Error('Pas d\'image dans le presse-papiers');
    }
    
    try {
      const response = await clipboardService.uploadImage();
      return response.url;
    } catch (error) {
      console.error('Erreur upload image:', error);
      throw error;
    }
  }, [clipboard]);

  // Détection automatique du type de contenu
  const detectContentType = useCallback((content) => {
    if (!content || typeof content !== 'string') return 'text';
    
    // Détecter tableau (TSV/CSV)
    if (content.includes('\t') && content.includes('\n')) {
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length > 1) {
        const firstRowCells = lines[0].split('\t').length;
        const isTable = lines.every(line => line.split('\t').length === firstRowCells);
        if (isTable) return 'table';
      }
    }
    
    // Détecter JSON
    const trimmed = content.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch {}
    }
    
    // Détecter code
    const codePatterns = [
      /function\s+\w+\s*\(/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /class\s+\w+/,
      /import\s+.+\s+from/,
      /export\s+(default\s+)?/,
      /def\s+\w+\s*\(/,
      /if\s*\(.+\)\s*{/,
      /for\s*\(.+\)\s*{/
    ];
    
    if (codePatterns.some(pattern => pattern.test(content))) {
      return 'code';
    }
    
    // Détecter Markdown
    const markdownPatterns = [
      /^#{1,6}\s+/m,     // Headers
      /\*\*[^*]+\*\*/,   // Bold
      /\[[^\]]+\]\([^)]+\)/, // Links
      /^[-*+]\s+/m,      // Lists
      /^>\s+/m,          // Blockquotes
      /```[\s\S]*```/    // Code blocks
    ];
    
    if (markdownPatterns.some(pattern => pattern.test(content))) {
      return 'markdown';
    }
    
    return 'text';
  }, []);

  // Mettre à jour le type détecté quand le contenu change
  useEffect(() => {
    if (clipboard && clipboard.content && clipboard.type === 'text') {
      const detectedType = detectContentType(clipboard.content);
      if (detectedType !== 'text') {
        setClipboard(prev => ({
          ...prev,
          detectedType: detectedType
        }));
      }
    }
  }, [clipboard, detectContentType]);

  return {
    clipboard,
    editedClipboard,
    setEditedClipboard,
    loading,
    loadClipboard,
    clearClipboard,
    getCurrentContent,
    uploadClipboardImage,
    detectContentType
  };
}