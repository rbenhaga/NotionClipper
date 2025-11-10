// packages/ui/src/hooks/useKeyboardShortcuts.ts
// 🎯 Hook pour gérer les raccourcis clavier de l'application

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  descriptionKey?: string;
  category?: string;
}

export interface KeyboardShortcutsConfig {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook pour gérer les raccourcis clavier de manière centralisée
 */
export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const { shortcuts, enabled = true, preventDefault = true } = config;
  const shortcutsRef = useRef(shortcuts);
  
  // Mettre à jour la ref quand les shortcuts changent
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // 🔧 FIX #1: Ignorer les événements répétés (maintien de touche)
    if (e.repeat) return;
    
    // 🔧 FIX CRITIQUE: Ignorer si on est dans un modal ou overlay
    const target = e.target as HTMLElement;
    const isInModal = target.closest('[role="dialog"]') || 
                     target.closest('.fixed.inset-0') || 
                     target.closest('[data-modal]') ||
                     document.querySelector('[role="dialog"]') !== null;
    
    // Si on est dans un modal et que c'est le raccourci d'aide, ignorer pour éviter la boucle
    if (isInModal && e.shiftKey && e.key === '?') {
      return;
    }
    
    // Ignorer si on est dans un input/textarea (sauf raccourcis système)
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true';
    
    // Chercher un raccourci correspondant
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === e.key.toLowerCase();
      
      // 🔧 FIX #2: Vérifier la correspondance EXACTE des modificateurs
      const ctrlRequired = shortcut.ctrl || shortcut.meta;
      const shiftRequired = shortcut.shift;
      const altRequired = shortcut.alt;
      
      const ctrlPressed = e.ctrlKey || e.metaKey;
      const shiftPressed = e.shiftKey;
      const altPressed = e.altKey;
      
      // Correspondance stricte - les modificateurs requis doivent être présents,
      // et les modificateurs non requis doivent être absents
      const exactCtrlMatch = ctrlRequired ? ctrlPressed : !ctrlPressed;
      const exactShiftMatch = shiftRequired ? shiftPressed : !shiftPressed;
      const exactAltMatch = altRequired ? altPressed : !altPressed;
      
      return keyMatch && exactCtrlMatch && exactShiftMatch && exactAltMatch;
    });
    
    if (matchingShortcut) {
      // Permettre certains raccourcis même dans les inputs
      const isSystemShortcut = matchingShortcut.category === 'Système' || 
                              matchingShortcut.category === 'Fenêtre' ||
                              matchingShortcut.category === 'Aide' ||
                              matchingShortcut.key === '?';
      
      if (isInput && !isSystemShortcut) {
        return;
      }
      
      // 🔧 FIX CRITIQUE: Empêcher l'exécution multiple du même raccourci
      if (preventDefault) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      
      // 🔧 FIX #3: Exécuter l'action de manière sécurisée
      try {
        matchingShortcut.action();
      } catch (error) {
        console.error('Error executing shortcut action:', error);
      }
    }
  }, [enabled, preventDefault]);
  
  useEffect(() => {
    if (!enabled) return;
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Formater un raccourci pour l'affichage
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  // Détecter macOS côté client
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  
  // Formater la touche principale
  let keyDisplay = shortcut.key;
  switch (shortcut.key.toLowerCase()) {
    case 'enter':
      keyDisplay = '↵';
      break;
    case 'backspace':
      keyDisplay = '⌫';
      break;
    case 'escape':
      keyDisplay = 'Esc';
      break;
    case ' ':
      keyDisplay = 'Space';
      break;
    case 'arrowup':
      keyDisplay = '↑';
      break;
    case 'arrowdown':
      keyDisplay = '↓';
      break;
    case 'arrowleft':
      keyDisplay = '←';
      break;
    case 'arrowright':
      keyDisplay = '→';
      break;
    default:
      keyDisplay = shortcut.key.toUpperCase();
  }
  
  parts.push(keyDisplay);
  return parts.join(' + ');
}

/**
 * Raccourcis par défaut de l'application
 */
export const DEFAULT_SHORTCUTS = {
  // Navigation
  TOGGLE_SIDEBAR: {
    key: 'b',
    ctrl: true,
    description: 'Afficher/masquer la barre latérale',
    descriptionKey: 'common.toggleSidebarDesc',
    category: 'Navigation'
  },
  TOGGLE_PREVIEW: {
    key: 'p',
    ctrl: true,
    description: 'Afficher/masquer la prévisualisation',
    descriptionKey: 'common.togglePreviewDesc',
    category: 'Navigation'
  },
  FOCUS_SEARCH: {
    key: 'k',
    ctrl: true,
    description: 'Focus sur la recherche',
    descriptionKey: 'common.focusSearchDesc',
    category: 'Navigation'
  },

  // Actions
  SEND_CONTENT: {
    key: 'Enter',
    ctrl: true,
    description: 'Envoyer le contenu',
    descriptionKey: 'common.sendContentDesc',
    category: 'Actions'
  },
  CLEAR_CLIPBOARD: {
    key: 'Backspace',
    ctrl: true,
    description: 'Vider le presse-papiers',
    descriptionKey: 'common.clearClipboard',
    category: 'Actions'
  },
  TOGGLE_MINIMALIST: {
    key: 'm',
    ctrl: true,
    description: 'Basculer mode minimaliste',
    descriptionKey: 'common.toggleMinimalistDesc',
    category: 'Actions'
  },
  ATTACH_FILE: {
    key: 'u',
    ctrl: true,
    description: 'Joindre un fichier',
    descriptionKey: 'common.attachFileDesc',
    category: 'Actions'
  },

  // Fenêtre
  CLOSE_WINDOW: {
    key: 'w',
    ctrl: true,
    description: 'Fermer la fenêtre',
    descriptionKey: 'common.closeWindowDesc',
    category: 'Fenêtre'
  },
  MINIMIZE_WINDOW: {
    key: 'm',
    ctrl: true,
    shift: true,
    description: 'Minimiser',
    descriptionKey: 'common.minimizeWindowDesc',
    category: 'Fenêtre'
  },
  TOGGLE_PIN: {
    key: 'p',
    ctrl: true,
    shift: true,
    description: 'Épingler/Désépingler',
    descriptionKey: 'common.togglePinDesc',
    category: 'Fenêtre'
  },

  // Aide
  SHOW_SHORTCUTS: {
    key: '?',
    shift: true,
    description: 'Afficher les raccourcis',
    descriptionKey: 'common.showShortcutsDesc',
    category: 'Aide'
  }
} as const;