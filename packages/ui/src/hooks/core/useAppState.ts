// packages/ui/src/hooks/useAppState.ts
// Hook composite qui combine tous les hooks de l'application
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from '@notion-clipper/i18n';
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
import { useSelectedSections, type SelectedSection } from '../data/useSelectedSections';
import { useUnifiedQueueHistory } from '../data/useUnifiedQueueHistory';
import { sendWithOfflineSupport, sendToMultiplePagesWithSections } from '../../utils/sendWithOfflineSupport';

// Pas besoin de redéclarer ElectronAPI, il est déjà défini globalement

interface AppStateReturn {
  // États UI
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  onboardingCompleted: boolean;
  isOAuthCallback: boolean;
  setIsOAuthCallback: (callback: boolean) => void;
  showConfig: boolean;
  setShowConfig: (show: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  multiSelectMode: boolean;
  selectedPages: string[];
  selectedPage: any;
  loading: boolean;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  sending: boolean;
  sendingStatus: 'idle' | 'processing' | 'success' | 'error';
  contentProperties: any;
  hasUserEditedContent: boolean;
  showFileUpload: boolean;
  setShowFileUpload: (show: boolean) => void;
  showHistoryPanel: boolean;
  setShowHistoryPanel: (show: boolean) => void;
  showQueuePanel: boolean;
  setShowQueuePanel: (show: boolean) => void;
  attachedFiles: any[];
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;

  // 🆕 Sections sélectionnées
  selectedSections: SelectedSection[];
  onSectionSelect: (pageId: string, blockId: string, headingText: string) => void;
  onSectionDeselect: (pageId: string) => void;
  clearSelectedSections: () => void;

  // 🆕 Queue et historique unifiés
  unifiedQueueHistory: any;

  // Références
  fileInputRef: React.RefObject<HTMLInputElement>;

  // Hooks
  windowPreferences: any;
  notifications: any;
  config: any;
  pages: any;
  clipboard: any;
  suggestions: any;
  history: any;
  queue: any;
  networkStatus: any;
  theme: any;
  fileUpload: any;

  // Handlers
  handleCompleteOnboarding: (token: string) => Promise<void>;
  handleResetApp: () => void;
  isInitialized: boolean;
  resetInitialization: () => void;
  handleEditContent: (content: any) => void;
  handleClearClipboard: () => void;
  handlePageSelect: (page: any) => void;
  handleToggleMultiSelect: () => void;
  handleDeselectAll: () => void;
  handleDeselectPage: (pageId: string) => void;
  handleUpdateProperties: (properties: any) => void;
  handleAttachedFilesChange: (files: any[]) => void;
  handleSend: () => Promise<void>;

  // Raccourcis
  shortcuts: any[];

  // Utilitaires
  canSend: boolean;
}

export function useAppState(): AppStateReturn {
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

  // i18n
  const { t } = useTranslation();

  // Window Preferences
  const windowPreferences = useWindowPreferences();

  // Notifications
  const notifications = useNotifications();

  // Configuration
  const config = useConfig({
    saveConfigFn: useCallback(async (updates: any): Promise<boolean> => {
      if (window.electronAPI?.invoke) {
        await window.electronAPI.invoke('config:save', updates);
        return true;
      }
      return false;
    }, []),
    loadConfigFn: useCallback(async () => {
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
    validateTokenFn: useCallback(async (token: string): Promise<{ success: boolean; error?: string }> => {
      if (window.electronAPI?.invoke) {
        const result = await window.electronAPI.invoke('notion:verify-token', token);
        return { success: result.success, error: result.error };
      }
      return { success: false, error: 'API non disponible' };
    }, [])
  });

  // Pages avec support du scroll infini
  const pages = usePages(
    // Favoris
    useCallback(async () => {
      if (window.electronAPI?.getFavorites) {
        const result = await window.electronAPI.getFavorites();
        return result.success ? result.favorites : [];
      }
      return [];
    }, []),
    // Toggle favori
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

  // 🆕 Sections sélectionnées pour TOC multi-pages
  const selectedSectionsHook = useSelectedSections();

  // 🆕 Queue et historique unifiés avec support offline
  const unifiedQueueHistory = useUnifiedQueueHistory();

  // 🆕 Handler d'envoi avec support offline et sections
  const handleSend = useCallback(async () => {
    console.log('[handleSend] 🚀 Starting send process with offline support...');
    
    if (sending) return;

    setSendingStatus('processing');
    setSending(true);

    try {
      const content = clipboard.editedClipboard || clipboard.clipboard;

      if (!content) {
        notifications.showNotification(t('notifications.noContent'), 'error');
        setSendingStatus('error');
        setTimeout(() => setSendingStatus('idle'), 3000);
        setSending(false);
        return;
      }

      // Mode multi-page avec sections
      if (multiSelectMode && selectedPages.length > 0) {
        console.log(`[handleSend] 📤 Multi-page mode: ${selectedPages.length} pages`);
        
        // Préparer les destinations avec sections
        const destinations = selectedPages.map(pageId => {
          const selectedSection = selectedSectionsHook.getSectionForPage(pageId);
          return {
            pageId,
            sectionId: selectedSection?.blockId,
            sectionTitle: selectedSection?.headingText
          };
        });

        console.log('[handleSend] 📍 Destinations with sections:', destinations);

        const result = await sendToMultiplePagesWithSections({
          content,
          destinations,
          attachedFiles,
          isOnline: networkStatus.isOnline,
          addToQueue: unifiedQueueHistory.addToQueue,
          addToHistory: unifiedQueueHistory.addToHistory
        });

        if (result.success) {
          setSendingStatus('success');
          const successCount = result.results.filter(r => r.success).length;
          const message = networkStatus.isOnline
            ? t('notifications.sentToCount', { count: successCount, total: selectedPages.length })
            : t('notifications.queuedForCount', { count: selectedPages.length });

          notifications.showNotification(message, 'success');

          // Reset
          clipboard.setEditedClipboard(null);
          setHasUserEditedContent(false);
          hasUserEditedContentRef.current = false;
          setAttachedFiles([]);
          selectedSectionsHook.clearSections();
          setSelectedPages([]);
          setMultiSelectMode(false);
        } else {
          // Afficher les erreurs spécifiques
          const errors = result.results.filter(r => !r.success);
          if (errors.length > 0) {
            notifications.showNotification(t('notifications.errorsOnPages', { count: errors.length }), 'error');
          }
        }
      }
      // Mode single page avec section
      else if (selectedPage) {
        console.log('[handleSend] 📄 Single page mode');
        
        const selectedSection = selectedSectionsHook.getSectionForPage(selectedPage.id);
        console.log('[handleSend] 📍 Selected section:', selectedSection);

        const result = await sendWithOfflineSupport({
          content,
          pageId: selectedPage.id,
          sectionId: selectedSection?.blockId,
          sectionTitle: selectedSection?.headingText,
          attachedFiles,
          isOnline: networkStatus.isOnline,
          addToQueue: unifiedQueueHistory.addToQueue,
          addToHistory: unifiedQueueHistory.addToHistory
        });

        if (result.success) {
          setSendingStatus('success');
          const message = networkStatus.isOnline
            ? t('notifications.contentSent')
            : t('notifications.contentQueued');

          notifications.showNotification(message, 'success');

          // Reset
          clipboard.setEditedClipboard(null);
          setHasUserEditedContent(false);
          hasUserEditedContentRef.current = false;
          setAttachedFiles([]);
          selectedSectionsHook.clearSections();
        } else {
          throw new Error(result.error || t('notifications.sendError'));
        }
      } else {
        notifications.showNotification(t('notifications.noDestination'), 'error');
        setSendingStatus('error');
        setTimeout(() => setSendingStatus('idle'), 3000);
        setSending(false);
        return;
      }

      setTimeout(() => setSendingStatus('idle'), 2000);
    } catch (error: any) {
      console.error('[handleSend] Error:', error);
      setSendingStatus('error');
      notifications.showNotification(error.message || t('notifications.sendError'), 'error');
      setTimeout(() => setSendingStatus('idle'), 3000);
    } finally {
      setSending(false);
    }
  }, [
    sending, multiSelectMode, selectedPages, selectedPage,
    clipboard.editedClipboard, clipboard.clipboard,
    contentProperties.contentType, notifications.showNotification,
    attachedFiles, networkStatus.isOnline,
    selectedSectionsHook, unifiedQueueHistory
  ]);

  // ✅ FIX CRITIQUE: Refs stables pour éviter les re-renders des raccourcis
  const handleSendRef = useRef(handleSend);
  const toggleMinimalistRef = useRef(windowPreferences.toggleMinimalist);
  const togglePinRef = useRef(windowPreferences.togglePin);
  const clearClipboardRef = useRef(clipboard.clearClipboard);

  // ✅ Mettre à jour les refs sans recréer shortcuts
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  useEffect(() => {
    toggleMinimalistRef.current = windowPreferences.toggleMinimalist;
  }, [windowPreferences.toggleMinimalist]);

  useEffect(() => {
    togglePinRef.current = windowPreferences.togglePin;
  }, [windowPreferences.togglePin]);

  useEffect(() => {
    clearClipboardRef.current = clipboard.clearClipboard;
  }, [clipboard.clearClipboard]);

  // ✅ Raccourcis avec wrappers stables - créés UNE SEULE FOIS
  const shortcuts = useMemo(() => [
    {
      ...DEFAULT_SHORTCUTS.SEND_CONTENT,
      action: () => handleSendRef.current() // ✅ Wrapper stable
    },
    {
      ...DEFAULT_SHORTCUTS.TOGGLE_MINIMALIST,
      action: () => toggleMinimalistRef.current() // ✅ Wrapper stable
    },
    {
      ...DEFAULT_SHORTCUTS.CLEAR_CLIPBOARD,
      action: () => {
        if (window.confirm(t('common.clearClipboardConfirm'))) {
          clearClipboardRef.current(); // ✅ Wrapper stable
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
      action: () => togglePinRef.current() // ✅ Wrapper stable
    }
  ], [setSidebarCollapsed, setShowShortcuts]); // ✅ DÉPENDANCES MINIMALES: Seulement les setters React stables

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

    const handleClipboardChange = (_event: any, data: any) => {
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
  // CONFIG PANEL HANDLERS - Gérés dans App.tsx
  // ============================================

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

    // 🆕 Sections sélectionnées
    selectedSections: selectedSectionsHook.selectedSections,
    onSectionSelect: selectedSectionsHook.selectSection,
    onSectionDeselect: selectedSectionsHook.deselectSection,
    clearSelectedSections: selectedSectionsHook.clearSections,

    // 🆕 Queue et historique unifiés
    unifiedQueueHistory,

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
    handleCompleteOnboarding: appInitialization.handleCompleteOnboarding,
    handleResetApp: appInitialization.resetInitialization,
    isInitialized: appInitialization.isInitialized,
    resetInitialization: appInitialization.resetInitialization,
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