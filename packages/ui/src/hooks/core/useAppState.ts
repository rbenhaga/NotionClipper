// packages/ui/src/hooks/useAppState.ts
// Hook composite qui combine tous les hooks de l'application
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotifications } from '../ui/useNotifications';
import { useConfig } from '../data/useConfig';
import { usePages } from '../data/usePages';
import { useClipboard } from '../data/useClipboard';
import { useSuggestions } from '../data/useSuggestions';
import { useWindowPreferences } from '../ui/useWindowPreferences';
import { useTheme } from '../ui/useTheme';
import { useFileUpload } from '../interactions/useFileUpload';
import { useHistory } from '../data/useHistory';
import { useQueue } from '../data/useQueue';
import { useNetworkStatus } from '../utils/useNetworkStatus';
import { useKeyboardShortcuts, DEFAULT_SHORTCUTS } from '../ui/useKeyboardShortcuts';
import { useAppInitialization } from './useAppInitialization';
import { useContentHandlers } from '../interactions/useContentHandlers';
import { usePageHandlers } from '../interactions/usePageHandlers';

// Pas besoin de redéclarer ElectronAPI, il est déjà défini globalement

export function useAppState() {
  // ============================================
  // ÉTATS UI PRINCIPAUX
  // ============================================
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [contentProperties, setContentProperties] = useState({
    contentType: 'paragraph',
    parseAsMarkdown: true
  });
  const [hasUserEditedContent, setHasUserEditedContent] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Références
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasUserEditedContentRef = useRef(false);
  const ignoreNextEditRef = useRef(false);

  // ============================================
  // HOOKS PRINCIPAUX
  // ============================================
  
  // Window Preferences
  const windowPreferences = useWindowPreferences();
  
  // Notifications
  const notifications = useNotifications();

  // Configuration
  const config = useConfig(
    useCallback(async (updates: any): Promise<void> => {
      if (window.electronAPI?.invoke) {
        await window.electronAPI.invoke('config:save', updates);
      }
    }, []),
    useCallback(async () => {
      if (window.electronAPI?.invoke) {
        const result = await window.electronAPI.invoke('config:get');
        return result.success ? result.config : {
          notionToken: '',
          onboardingCompleted: false,
          theme: 'light'
        };
      }
      return {
        notionToken: '',
        onboardingCompleted: false,
        theme: 'light'
      };
    }, []),
    useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
      if (window.electronAPI?.invoke) {
        const result = await window.electronAPI.invoke('notion:verify-token', token);
        return { success: result.success, error: result.error };
      }
      return { success: false, error: 'API non disponible' };
    }, [])
  );

  // Pages
  const pages = usePages(
    useCallback(async (forceRefresh = false) => {
      if (window.electronAPI?.getPages) {
        const result = await window.electronAPI.getPages(forceRefresh);
        return result.success ? result.pages : [];
      }
      return [];
    }, []),
    useCallback(async () => {
      if (window.electronAPI?.getFavorites) {
        const result = await window.electronAPI.getFavorites();
        return result.success ? result.favorites : [];
      }
      return [];
    }, []),
    useCallback(async (pageId: string) => {
      if (window.electronAPI?.toggleFavorite) {
        const result = await window.electronAPI.toggleFavorite(pageId);
        return result.success;
      }
      return false;
    }, [])
  );

  // Clipboard
  const clipboard = useClipboard(
    useCallback(async () => {
      if (window.electronAPI?.getClipboard) {
        const result = await window.electronAPI.getClipboard();
        return result.success ? result.clipboard : null;
      }
      return null;
    }, []),
    useCallback(async (data: any) => {
      if (window.electronAPI?.invoke) {
        await window.electronAPI.invoke('clipboard:set', data);
      }
    }, []),
    useCallback(async () => {
      if (window.electronAPI?.invoke) {
        await window.electronAPI.invoke('clipboard:clear');
      }
    }, [])
  );

  // Autres hooks
  const suggestions = useSuggestions(
    useCallback(async (data: any) => {
      if (window.electronAPI?.getHybridSuggestions) {
        const result = await window.electronAPI.getHybridSuggestions(data);
        return result.success ? result.suggestions : [];
      }
      return [];
    }, [])
  );

  const history = useHistory();
  const queue = useQueue();
  const networkStatus = useNetworkStatus();
  const theme = useTheme();
  const fileUpload = useFileUpload({});

  // ============================================
  // HOOKS PERSONNALISÉS
  // ============================================
  
  // Initialisation de l'app
  const appInitialization = useAppInitialization({
    setLoading,
    setShowOnboarding,
    setOnboardingCompleted,
    setConfigLoaded,
    loadConfig: config.loadConfig,
    loadPages: pages.loadPages,
    updateConfig: async (updates: any): Promise<boolean> => {
      try {
        await config.updateConfig(updates);
        return true;
      } catch (error) {
        console.error('Error updating config:', error);
        return false;
      }
    },
    showNotification: notifications.showNotification
  });

  // Gestion du contenu
  const contentHandlers = useContentHandlers({
    setEditedClipboard: clipboard.setEditedClipboard,
    setHasUserEditedContent,
    hasUserEditedContentRef,
    ignoreNextEditRef,
    loadClipboard: clipboard.loadClipboard,
    clearClipboard: clipboard.clearClipboard
  });

  // Gestion des pages
  const pageHandlers = usePageHandlers({
    selectedPages,
    setSelectedPages,
    selectedPage,
    setSelectedPage,
    multiSelectMode,
    setMultiSelectMode,
    pages: pages.pages
  });

  // ============================================
  // HANDLERS SUPPLÉMENTAIRES
  // ============================================

  const handleUpdateProperties = useCallback((properties: any) => {
    setContentProperties(prev => ({ ...prev, ...properties }));
  }, []);

  const handleAttachedFilesChange = useCallback((files: any[]) => {
    setAttachedFiles(files);
  }, []);

  // Handler d'envoi simplifié
  const handleSend = useCallback(async () => {
    if (sending) return;
    
    setSendingStatus('processing');
    setSending(true);
    
    try {
      const targets = multiSelectMode ? selectedPages : (selectedPage ? [selectedPage] : []);
      const content = clipboard.editedClipboard || clipboard.clipboard;

      if (!targets.length || !content) {
        notifications.showNotification('Sélectionnez une page et ajoutez du contenu', 'error');
        setSendingStatus('error');
        setTimeout(() => setSendingStatus('idle'), 3000);
        return;
      }

      // Simulation d'envoi - à remplacer par la vraie logique
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSendingStatus('success');
      notifications.showNotification('Contenu envoyé avec succès', 'success');
      
      // Reset
      clipboard.setEditedClipboard(null);
      setHasUserEditedContent(false);
      hasUserEditedContentRef.current = false;
      setAttachedFiles([]);
      
      if (multiSelectMode) {
        setSelectedPages([]);
        setMultiSelectMode(false);
      }
      
      setTimeout(() => setSendingStatus('idle'), 2000);
    } catch (error: any) {
      setSendingStatus('error');
      notifications.showNotification(`Erreur: ${error.message}`, 'error');
      setTimeout(() => setSendingStatus('idle'), 3000);
    } finally {
      setSending(false);
    }
  }, [
    sending, multiSelectMode, selectedPages, selectedPage, 
    clipboard.editedClipboard, clipboard.clipboard, notifications.showNotification
  ]);

  // Configuration des raccourcis clavier
  const shortcuts = [
    {
      ...DEFAULT_SHORTCUTS.SEND_CONTENT,
      action: handleSend
    },
    {
      ...DEFAULT_SHORTCUTS.TOGGLE_MINIMALIST,
      action: windowPreferences.toggleMinimalist
    },
    {
      ...DEFAULT_SHORTCUTS.CLEAR_CLIPBOARD,
      action: () => {
        if (window.confirm('Vider le presse-papiers ?')) {
          clipboard.clearClipboard();
        }
      }
    },
    {
      ...DEFAULT_SHORTCUTS.ATTACH_FILE,
      action: () => fileInputRef.current?.click()
    },
    {
      ...DEFAULT_SHORTCUTS.TOGGLE_SIDEBAR,
      action: () => setSidebarCollapsed(prev => !prev)
    },
    {
      ...DEFAULT_SHORTCUTS.SHOW_SHORTCUTS,
      action: () => setShowShortcuts(true)
    },
    {
      ...DEFAULT_SHORTCUTS.TOGGLE_PIN,
      action: windowPreferences.togglePin
    }
  ];

  // Activer les raccourcis clavier
  useKeyboardShortcuts({
    shortcuts,
    enabled: true,
    preventDefault: true
  });

  // ============================================
  // EFFETS
  // ============================================

  // Charger le clipboard au démarrage
  useEffect(() => {
    clipboard.loadClipboard();
  }, [clipboard.loadClipboard]);

  // Vérifier si on est sur la route OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('error')) {
      setIsOAuthCallback(true);
    }
  }, []);

  // Écouter les changements du clipboard
  useEffect(() => {
    if (!window.electronAPI?.on) return;

    const handleClipboardChange = (event: any, data: any) => {
      console.log('[CLIPBOARD] 📋 Changed:', data);
      if (clipboard.loadClipboard) {
        clipboard.loadClipboard();
      }
    };

    window.electronAPI.on('clipboard:changed', handleClipboardChange);
    return () => {
      if (window.electronAPI?.removeListener) {
        window.electronAPI.removeListener('clipboard:changed', handleClipboardChange);
      }
    };
  }, [clipboard.loadClipboard]);

  // ============================================
  // RETOUR DE L'ÉTAT COMPLET
  // ============================================
  
  return {
    // États UI
    showOnboarding,
    setShowOnboarding,
    onboardingCompleted,
    isOAuthCallback,
    setIsOAuthCallback,
    showConfig,
    setShowConfig,
    sidebarCollapsed,
    setSidebarCollapsed,
    multiSelectMode,
    selectedPages,
    selectedPage,
    loading,
    showPreview,
    setShowPreview,
    sending,
    sendingStatus,
    contentProperties,
    hasUserEditedContent,
    showFileUpload,
    setShowFileUpload,
    showHistoryPanel,
    setShowHistoryPanel,
    showQueuePanel,
    setShowQueuePanel,
    attachedFiles,
    showShortcuts,
    setShowShortcuts,
    
    // Références
    fileInputRef,
    
    // Hooks
    windowPreferences,
    notifications,
    config,
    pages,
    clipboard,
    suggestions,
    history,
    queue,
    networkStatus,
    theme,
    fileUpload,
    
    // Handlers
    ...appInitialization,
    ...contentHandlers,
    ...pageHandlers,
    handleUpdateProperties,
    handleAttachedFilesChange,
    handleSend,
    
    // Raccourcis
    shortcuts,
    
    // Utilitaires
    canSend: !sending && (clipboard.clipboard || clipboard.editedClipboard) && (selectedPage || selectedPages.length > 0)
  };
}