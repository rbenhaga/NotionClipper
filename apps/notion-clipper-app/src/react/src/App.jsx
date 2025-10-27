// apps/notion-clipper-app/src/react/src/App.jsx - VERSION CORRIGÉE
import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import './App.css';

// Imports depuis packages/ui
import {
  Onboarding,
  Layout,
  Header,
  ContentArea,
  PageList,
  ContentEditor,
  ConfigPanel,
  NotificationManager,
  ErrorBoundary,
  SkeletonPageList,
  ResizableLayout,
  MinimalistView,
  useNotifications,
  useConfig,
  usePages,
  useClipboard,
  useSuggestions,
  useWindowPreferences,
  UnifiedWorkspace,
  useTheme,

} from '@notion-clipper/ui';

// 🆕 Import des nouveaux hooks et types
import {
  useFileUpload,
  useHistory,
  useQueue,
  useNetworkStatus,
  useKeyboardShortcuts,
  DEFAULT_SHORTCUTS,
  ShortcutsModal
} from '@notion-clipper/ui';

// 🆕 Import des types pour l'upload (commenté car JSX ne supporte pas import type)
// import type { FileUploadConfig } from '@notion-clipper/ui';

// Fonction debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Composants mémorisés
const MemoizedPageList = memo(PageList);
const MemoizedMinimalistView = memo(MinimalistView);

function App() {
  // ============================================
  // ÉTATS UI
  // ============================================
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  const loadPagesRef = useRef(null);
  const loadConfigRef = useRef(null); // ✅ Référence stable pour loadConfig
  const initializationDone = useRef(false); // ✅ Flag pour éviter la réinitialisation
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0 });
  const [contentProperties, setContentProperties] = useState({
    contentType: 'paragraph',
    parseAsMarkdown: true
  });
  const [hasUserEditedContent, setHasUserEditedContent] = useState(false); // Flag pour protéger le contenu édité
  const hasUserEditedContentRef = useRef(false); // Ref pour accès immédiat
  const ignoreNextEditRef = useRef(false); // Flag pour ignorer le prochain handleEditContent
  // lastClipboardTextRef supprimé - plus nécessaire sans le useEffect destructeur

  // 🆕 NOUVEAUX ÉTATS POUR LES FONCTIONNALITÉS
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showQueuePanel, setShowQueuePanel] = useState(false);
  const [sendingStatus, setSendingStatus] = useState('idle');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('compose');
  
  // 🎯 ÉTATS POUR LES RACCOURCIS CLAVIER
  const [showShortcuts, setShowShortcuts] = useState(false);
  const fileInputRef = useRef(null);

  // UnifiedWorkspace utilise les données existantes (queue, history)

  // ============================================
  // HOOKS - Window Preferences
  // ============================================
  const {
    isPinned,
    isMinimalist,
    togglePin,
    toggleMinimalist
  } = useWindowPreferences();

  // ============================================
  // HOOKS - packages/ui
  // ============================================

  // Notifications
  const { notifications, showNotification, closeNotification } = useNotifications();

  // Config
  const {
    config,
    updateConfig,
    loadConfig,
    validateNotionToken
  } = useConfig(
    useCallback(async (updates) => {
      if (window.electronAPI?.saveConfig) {
        const result = await window.electronAPI.saveConfig(updates);
        return result.success;
      }
      return false;
    }, []),
    useCallback(async () => {
      if (window.electronAPI?.getConfig) {
        const result = await window.electronAPI.getConfig();
        return result.success ? result.config : null;
      }
      return null;
    }, []),
    useCallback(async (token) => {
      if (window.electronAPI?.verifyToken) {
        const result = await window.electronAPI.verifyToken(token);
        return { success: result.success, error: result.error };
      }
      return { success: false, error: 'API non disponible' };
    }, [])
  );

  // Pages
  const {
    pages,
    favorites,
    loading: pagesLoading,
    loadPages,
    toggleFavorite,
    filteredPages,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab
  } = usePages(
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
    useCallback(async (pageId) => {
      if (window.electronAPI?.toggleFavorite) {
        const result = await window.electronAPI.toggleFavorite(pageId);
        return result.success;
      }
      return false;
    }, [])
  );

  // Clipboard
  const {
    clipboard,
    editedClipboard,
    setEditedClipboard,
    loadClipboard,
    clearClipboard
  } = useClipboard(
    useCallback(async () => {
      if (window.electronAPI?.getClipboard) {
        const result = await window.electronAPI.getClipboard();
        return result.success ? result.clipboard : null;
      }
      return null;
    }, []),
    useCallback(async (data) => {
      if (window.electronAPI?.setClipboard) {
        await window.electronAPI.setClipboard(data);
      }
    }, []),
    useCallback(async () => {
      if (window.electronAPI?.clearClipboard) {
        await window.electronAPI.clearClipboard();
      }
    }, [])
  );

  // ✅ FIX CRITIQUE: useEffect destructeur SUPPRIMÉ
  // Le contenu édité (editedClipboard) ne doit JAMAIS être reset automatiquement
  // quand le clipboard système change. La protection se fait naturellement via
  // la priorité d'affichage : editedClipboard || clipboard

  // ✅ Log pour debug : Afficher l'état du contenu
  useEffect(() => {
    console.log('[CONTENT STATE] Current state:', {
      hasEditedClipboard: !!editedClipboard,
      hasClipboard: !!clipboard,
      activeContent: editedClipboard ? '📝 EDITED (protected)' : '📋 CLIPBOARD',
      editedLength: editedClipboard?.text?.length || 0,
      clipboardLength: clipboard?.text?.length || 0,
      userHasEdited: hasUserEditedContentRef.current
    });
  }, [editedClipboard, clipboard]);

  // Suggestions
  const {
    suggestions,
    loadingSuggestions,
    fetchSuggestions
  } = useSuggestions(
    useCallback(async (data) => {
      if (window.electronAPI?.getHybridSuggestions) {
        const result = await window.electronAPI.getHybridSuggestions(data);
        return result.success ? result.suggestions : [];
      }
      return [];
    }, [])
  );

  // 🆕 Hook d'upload de fichiers
  const {
    uploadFiles,
    isUploading,
    totalProgress,
    getAllUploads,
    clearCompleted,
    cancelAllUploads
  } = useFileUpload({
    maxFileSize: 20 * 1024 * 1024, // 20MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mp3',
      'audio/wav',
      'application/pdf',
      'text/plain'
    ],
    maxConcurrent: 3,
    onProgress: (progress) => {
      console.log('🔄 Upload progress:', progress);
    },
    onComplete: (fileId, result) => {
      console.log('✅ Upload completed:', fileId, result);
      showNotification(`Fichier uploadé avec succès: ${result.fileName}`, 'success');
    },
    onError: (fileId, error) => {
      console.error('❌ Upload failed:', fileId, error);
      showNotification(`Erreur d'upload: ${error}`, 'error');
    }
  });

  // 🆕 Nouveaux hooks pour les fonctionnalités
  const { history, stats: historyStats, loadHistory, retry, deleteEntry, clear: clearHistory } = useHistory();
  
  // 🌙 Hook pour le thème
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme();

  // ✅ Debug log pour l'historique
  useEffect(() => {
    console.log('[App] History data updated:', history?.length || 0, history);
  }, [history]);
  const { queue, stats: queueStats, retry: retryQueue, remove: removeQueue, clear: clearQueue } = useQueue();
  const { isOnline: isConnected } = useNetworkStatus(); // Utiliser isOnline du hook comme isConnected

  // 🆕 Fonction de test pour créer des données d'exemple
  const createTestData = useCallback(async () => {
    if (!window.electronAPI) return;

    try {
      // Créer une entrée d'historique de test
      await window.electronAPI.invoke('history:add', {
        timestamp: Date.now(),
        type: 'clipboard',
        status: 'success',
        content: {
          raw: 'Contenu de test pour l\'historique',
          preview: 'Contenu de test...',
          type: 'text'
        },
        page: {
          id: 'test-page-id',
          title: 'Page de test',
          icon: '📝'
        },
        sentAt: Date.now()
      });

      // Créer une entrée de queue de test
      await window.electronAPI.invoke('queue:enqueue', {
        pageId: 'test-page-id',
        content: 'Contenu en attente',
        options: {}
      }, 'normal');

      // Recharger les données
      await loadHistory();
      await loadStats();

      showNotification('Données de test créées !', 'success');
    } catch (error) {
      console.error('Erreur lors de la création des données de test:', error);
      showNotification('Erreur lors de la création des données de test', 'error');
    }
  }, [loadHistory, showNotification]);

  // 🆕 Raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+T : Créer des données de test
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        createTestData();
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createTestData, showNotification]);

  // ============================================
  // EFFETS
  // ============================================


  // Mettre à jour les références
  useEffect(() => {
    loadPagesRef.current = loadPages;
  }, [loadPages]);

  useEffect(() => {
    loadConfigRef.current = loadConfig;
  }, [loadConfig]);

  // Charger le clipboard au démarrage
  useEffect(() => {
    loadClipboard();
  }, [loadClipboard]);

  // Vérifier si on est sur la route OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('error')) {
      setIsOAuthCallback(true);
    }
  }, []);

  // ✅ FIX: Chargement initial de la configuration - UNE SEULE FOIS
  useEffect(() => {
    // ✅ Éviter la réinitialisation multiple
    if (initializationDone.current) {
      console.log('[INIT] ⚠️ Initialization already done, skipping...');
      return;
    }

    const initializeApp = async () => {
      try {
        console.log('[INIT] Starting app initialization...');
        initializationDone.current = true; // ✅ Marquer comme fait IMMÉDIATEMENT

        // 1. Charger la configuration
        console.log('[INIT] Loading configuration...');
        if (!loadConfigRef.current) {
          console.error('[INIT] loadConfig not available');
          setShowOnboarding(true);
          setLoading(false);
          return;
        }

        const loadedConfig = await loadConfigRef.current();
        console.log('[INIT] Config loaded:', { ...loadedConfig, notionToken: loadedConfig.notionToken ? '***' : 'EMPTY' });

        setConfigLoaded(true);

        // 2. Déterminer si l'onboarding est nécessaire
        const hasToken = !!(loadedConfig.notionToken || loadedConfig.notionToken_encrypted);
        const explicitlyCompleted = loadedConfig?.onboardingCompleted === true;
        const isOnboardingDone = hasToken || explicitlyCompleted;

        console.log('[INIT] Has token:', hasToken);
        console.log('[INIT] Explicitly completed:', explicitlyCompleted);
        console.log('[INIT] Onboarding done:', isOnboardingDone);

        setOnboardingCompleted(isOnboardingDone);
        setShowOnboarding(!isOnboardingDone);

        // 3. Charger les pages si token présent
        if (hasToken && loadPagesRef.current) {
          console.log('[INIT] Token found, loading pages...');
          await loadPagesRef.current();
        }

      } catch (error) {
        console.error('[INIT] Error during initialization:', error);
        // En cas d'erreur, afficher l'onboarding
        setShowOnboarding(true);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []); // ✅ AUCUNE DÉPENDANCE - ne se déclenche qu'au montage



  // ✅ NOUVELLE APPROCHE: Écouter les changements du clipboard sans condition
  useEffect(() => {
    if (!window.electronAPI?.on) return;

    const handleClipboardChange = (event, data) => {
      console.log('[CLIPBOARD] 📋 Changed:', data);
      console.log('[CLIPBOARD] 🔍 Current hasUserEditedContent ref:', hasUserEditedContentRef.current);

      // ✅ TOUJOURS traiter les changements du clipboard
      // La protection se fait au niveau de l'affichage, pas ici
      console.log('[CLIPBOARD] ✅ Processing clipboard change (protection handled in UI)');

      // ✅ FIX: Recharger le clipboard pour mettre à jour l'interface
      if (loadClipboard) {
        loadClipboard();
      }
    };

    window.electronAPI.on('clipboard:changed', handleClipboardChange);

    return () => {
      if (window.electronAPI?.removeListener) {
        window.electronAPI.removeListener('clipboard:changed', handleClipboardChange);
      }
    };
  }, []); // ✅ Pas de dépendance

  // Note: isConnected est maintenant géré par useNetworkStatus hook



  // ============================================
  // HANDLERS
  // ============================================

  // ✅ PROTECTION: Handler d'édition de contenu avec protection système
  const handleEditContent = useCallback((newContent) => {
    // Ignorer si on est en train de reset explicitement
    if (ignoreNextEditRef.current) {
      console.log('[EDIT] Ignoring edit during explicit reset');
      return;
    }

    if (newContent === null) {
      // ✅ Annulation explicite des modifications
      console.log('[EDIT] 🔄 User explicitly cancelled modifications');
      ignoreNextEditRef.current = true;
      setEditedClipboard(null);
      setHasUserEditedContent(false);
      hasUserEditedContentRef.current = false;

      setTimeout(() => {
        ignoreNextEditRef.current = false;
      }, 100);
      return;
    }

    console.log('[EDIT] ✏️ Content edited by user:', {
      textLength: newContent?.text?.length || 0,
      preview: (newContent?.text || '').substring(0, 50) + '...'
    });

    // ✅ Marquer que l'utilisateur a édité
    hasUserEditedContentRef.current = true;
    setHasUserEditedContent(true);

    // ✅ Sauvegarder le contenu édité (sera protégé contre les changements de clipboard)
    setEditedClipboard(newContent);
  }, []);

  // ✅ PROTECTION SYSTÈME: Fonction pour reprendre la surveillance du clipboard
  const resumeClipboardWatching = useCallback(async () => {
    console.log('[CLIPBOARD] 🔄 Resuming clipboard watching');

    // ✅ 1. Activer la protection contre les événements système
    ignoreNextEditRef.current = true;

    // ✅ 2. Remettre les flags à false
    setHasUserEditedContent(false);
    hasUserEditedContentRef.current = false;

    // ✅ 3. Effacer le contenu édité
    setEditedClipboard(null);

    // ✅ 4. Forcer le rechargement du clipboard
    if (loadClipboard) {
      await loadClipboard();
    }

    // ✅ 6. Sécurité: remettre le flag à false après un délai
    setTimeout(() => {
      ignoreNextEditRef.current = false;
    }, 200);

    console.log('[CLIPBOARD] ✅ Clipboard watching resumed and content refreshed');
  }, []); // ✅ AUCUNE DÉPENDANCE pour éviter les boucles

  // Réinitialiser aussi lors du clear
  const handleClearClipboard = useCallback(async () => {
    if (clearClipboard) {
      await clearClipboard();
    }
    await resumeClipboardWatching(); // ✅ Reprendre la surveillance après clear
  }, []); // ✅ AUCUNE DÉPENDANCE pour éviter les boucles

  const handlePageSelect = useCallback((page, event) => {
    // ✅ Support multi-sélection depuis MinimalistView
    if (Array.isArray(page)) {
      // Tableau de pages depuis MinimalistView
      console.log('[App] 📥 Received multiple pages:', page.length);
      setSelectedPages(page.map(p => p.id));
      setSelectedPage(page[0]); // Première page comme page principale
      setMultiSelectMode(page.length > 1); // Activer le mode multi si plusieurs pages
      return;
    }
    
    // ✅ Mode normal : Toujours permettre la multi-sélection avec simple clic
    // Si la page est déjà sélectionnée, la désélectionner
    if (selectedPages.includes(page.id)) {
      const newSelection = selectedPages.filter(id => id !== page.id);
      setSelectedPages(newSelection);
      
      // Si plus aucune page sélectionnée, désactiver le mode multi
      if (newSelection.length === 0) {
        setSelectedPage(null);
        setMultiSelectMode(false);
      } else if (newSelection.length === 1) {
        // Si une seule page reste, la définir comme selectedPage
        const remainingPage = pages.find(p => p.id === newSelection[0]);
        setSelectedPage(remainingPage);
        setMultiSelectMode(false);
      }
      return;
    }
    
    // Si aucune page n'est sélectionnée, sélectionner celle-ci
    if (selectedPages.length === 0 && !selectedPage) {
      setSelectedPage(page);
      setSelectedPages([]);
      setMultiSelectMode(false);
      return;
    }
    
    // Sinon, ajouter à la sélection multiple
    const currentSelection = selectedPages.length > 0 
      ? selectedPages 
      : (selectedPage ? [selectedPage.id] : []);
    
    setSelectedPages([...currentSelection, page.id]);
    setMultiSelectMode(true);
    
    // Garder la première page comme selectedPage principal
    if (!selectedPage) {
      setSelectedPage(page);
    }
  }, [multiSelectMode, selectedPages, selectedPage, pages]);

  const handleToggleMultiSelect = useCallback(() => {
    setMultiSelectMode(prev => !prev);
    if (!multiSelectMode) {
      setSelectedPage(null);
    } else {
      setSelectedPages([]);
    }
  }, [multiSelectMode]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPages([]);
    setSelectedPage(null);
    setMultiSelectMode(false); // ✅ Revenir en mode simple
  }, []);

  const handleDeselectPage = useCallback((pageId) => {
    setSelectedPages(prev => prev.filter(id => id !== pageId));
  }, []);



  const canSend = useMemo(() => {
    const hasContent = clipboard && (
      clipboard.text || 
      clipboard.html || 
      clipboard.content ||
      clipboard.type === 'image' ||
      clipboard.images?.length > 0
    );
    const hasDestination = multiSelectMode ? selectedPages.length > 0 : selectedPage !== null;
    return hasContent && hasDestination && !sending;
  }, [clipboard, selectedPage, selectedPages, multiSelectMode, sending]);



  // ✅ FIX CRITIQUE: Recevoir le token en paramètre depuis Onboarding
  const handleCompleteOnboarding = useCallback(async (token) => {
    try {
      console.log('[ONBOARDING] ✨ Completing onboarding with token:', token ? '***' : 'NO TOKEN');

      // ❌ VALIDATION: Vérifier qu'on a bien un token
      if (!token || !token.trim()) {
        console.error('[ONBOARDING] ❌ No token provided!');
        showNotification('Erreur: Token manquant', 'error');
        return;
      }

      // 1️⃣ SAUVEGARDER LE TOKEN IMMÉDIATEMENT
      console.log('[ONBOARDING] 💾 Saving token to config...');
      await updateConfig({
        notionToken: token.trim(),
        onboardingCompleted: true
      });
      console.log('[ONBOARDING] ✅ Token and onboardingCompleted flag saved');

      // 2️⃣ ATTENDRE que la sauvegarde soit bien propagée (important!)
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3️⃣ RECHARGER la config pour confirmer
      console.log('[ONBOARDING] 🔄 Reloading config to confirm token...');
      const updatedConfig = await loadConfigRef.current();
      console.log('[ONBOARDING] Updated config:', {
        ...updatedConfig,
        notionToken: updatedConfig.notionToken ? '***' : 'EMPTY',
        notionToken_encrypted: updatedConfig.notionToken_encrypted ? '***' : 'EMPTY'
      });

      // 4️⃣ VÉRIFIER que le token a bien été sauvegardé
      const hasNewToken = !!(updatedConfig.notionToken || updatedConfig.notionToken_encrypted);
      console.log('[ONBOARDING] Has new token after save:', hasNewToken);

      if (!hasNewToken) {
        console.error('[ONBOARDING] ❌ Token was not saved correctly!');
        showNotification('Erreur: Le token n\'a pas été sauvegardé', 'error');
        return;
      }

      // 5️⃣ FORCER la réinitialisation du NotionService côté Electron
      console.log('[ONBOARDING] 🔄 Forcing NotionService reinitialization...');
      if (window.electronAPI?.invoke) {
        try {
          const reinitResult = await window.electronAPI.invoke('notion:reinitialize-service');
          console.log('[ONBOARDING] NotionService reinitialization result:', reinitResult);

          if (!reinitResult.success) {
            console.error('[ONBOARDING] ❌ NotionService reinit failed:', reinitResult.error);
            showNotification(`Erreur d'initialisation: ${reinitResult.error}`, 'error');
            return;
          }

          console.log('[ONBOARDING] ✅ NotionService successfully reinitialized');
        } catch (error) {
          console.error('[ONBOARDING] ❌ Failed to reinitialize NotionService:', error);
          showNotification('Erreur lors de l\'initialisation du service', 'error');
          return;
        }
      }

      // 6️⃣ CHARGER les pages
      console.log('[ONBOARDING] 📄 Loading pages...');
      if (loadPagesRef.current) {
        await loadPagesRef.current();
        console.log('[ONBOARDING] ✅ Pages loaded successfully');
      } else {
        console.warn('[ONBOARDING] ⚠️ loadPages function not available');
      }

      // 7️⃣ SUCCÈS: Masquer l'onboarding et afficher la notification
      setShowOnboarding(false);
      setOnboardingCompleted(true);
      initializationDone.current = false; // Reset pour forcer un reload complet

      showNotification('🎉 Configuration terminée avec succès!', 'success');

    } catch (error) {
      console.error('[ONBOARDING] ❌ Critical error during onboarding:', error);
      showNotification('Erreur critique lors de la configuration', 'error');
    }
  }, [updateConfig, showNotification]);



  const handleUpdateProperties = useCallback((properties) => {
    setContentProperties(prev => ({ ...prev, ...properties }));
  }, []);

  // 🆕 HANDLERS POUR LES NOUVELLES FONCTIONNALITÉS

  // Handler pour l'envoi avec statut
  const handleSend = useCallback(async () => {
    if (sending) return;

    setSendingStatus('processing');

    try {
      const targets = multiSelectMode ? selectedPages : (selectedPage ? [selectedPage] : []);
      const content = editedClipboard || clipboard;

      if (!targets.length) {
        showNotification('Sélectionnez au moins une page', 'error');
        setSendingStatus('error');
        setTimeout(() => setSendingStatus('idle'), 3000);
        return;
      }

      if (!content) {
        showNotification('Aucun contenu à envoyer', 'error');
        setSendingStatus('error');
        setTimeout(() => setSendingStatus('idle'), 3000);
        return;
      }

      // Extraire le texte
      let textContent = '';
      if (typeof content === 'string') {
        textContent = content;
      } else if (content.text) {
        textContent = content.text;
      } else if (content.data) {
        textContent = content.data;
      } else if (content.content) {
        textContent = content.content;
      }

      // Vérifier qu'il y a du contenu ou des fichiers à envoyer
      const hasTextContent = textContent && typeof textContent === 'string' && textContent.trim() !== '';
      const hasImageContent = content && content.type === 'image';
      const hasFiles = attachedFiles.length > 0;
      
      if (!hasTextContent && !hasImageContent && !hasFiles) {
        showNotification('Ajoutez du contenu ou des fichiers à envoyer', 'error');
        setSendingStatus('error');
        setTimeout(() => setSendingStatus('idle'), 3000);
        return;
      }

      // ✅ Valider les fichiers attachés
      if (attachedFiles.length > 0) {
        const validationErrors = validateAttachedFiles(attachedFiles);
        if (validationErrors.length > 0) {
          showNotification(`Erreurs de validation:\n${validationErrors.join('\n')}`, 'error');
          setSendingStatus('error');
          setTimeout(() => setSendingStatus('idle'), 3000);
          return;
        }
      }

      setSending(true);

      const sendData = {
        content: textContent,
        ...contentProperties,
        parseAsMarkdown: contentProperties.parseAsMarkdown !== false
      };

      let successCount = 0;
      const errors = [];

      // Envoyer vers toutes les pages cibles
      for (const page of targets) {
        try {
          // 1. Envoyer le contenu texte (si présent)
          let textResult = { success: true };
          if (hasTextContent) {
            textResult = await window.electronAPI.sendToNotion({
              pageId: page.id,
              ...sendData
            });
          }

          // 2. Envoyer l'image du clipboard (si présente)
          let imageResult = { success: true };
          if (hasImageContent && content.preview) {
            console.log(`[handleSend] Envoi de l'image clipboard vers ${page.title}`);
            
            try {
              // Convertir la data URL en buffer
              const base64Data = content.preview.split(',')[1];
              const buffer = Array.from(new Uint8Array(Buffer.from(base64Data, 'base64')));
              
              imageResult = await window.electronAPI?.invoke('file:upload', {
                fileName: `clipboard-image-${Date.now()}.png`,
                fileBuffer: buffer,
                caption: 'Image du presse-papiers',
                pageId: page.id
              });
              
              if (!imageResult.success) {
                console.error('[handleSend] Erreur envoi image:', imageResult.error);
              }
            } catch (error) {
              console.error('[handleSend] Erreur traitement image:', error);
              imageResult = { success: false, error: error.message };
            }
          }

          // 3. Envoyer les fichiers attachés (si présents)
          let filesResults = [];
          if (attachedFiles.length > 0) {
            console.log(`[handleSend] Envoi de ${attachedFiles.length} fichiers vers ${page.title}`);
            
            for (const file of attachedFiles) {
              try {
                if (file.file) {
                  // Fichier local
                  const arrayBuffer = await file.file.arrayBuffer();
                  const buffer = Array.from(new Uint8Array(arrayBuffer));

                  const fileResult = await window.electronAPI?.invoke('file:upload', {
                    fileName: file.name,
                    fileBuffer: buffer,
                    caption: `Fichier joint: ${file.name}`,
                    integrationType: 'attachment', // Valeur par défaut
                    pageId: page.id
                  });

                  filesResults.push(fileResult);
                } else if (file.url) {
                  // Fichier depuis URL
                  const fileResult = await window.electronAPI?.invoke('file:upload-url', {
                    url: file.url,
                    caption: `Fichier joint: ${file.name}`,
                    integrationType: 'external', // Valeur par défaut pour URLs
                    pageId: page.id
                  });

                  filesResults.push(fileResult);
                }
              } catch (fileError) {
                console.error(`[handleSend] Erreur fichier ${file.name}:`, fileError);
                filesResults.push({ success: false, error: fileError.message });
              }
            }
          }

          // 3. Vérifier le succès global
          const allFilesSuccess = filesResults.length === 0 || filesResults.every(r => r.success);
          
          if (textResult.success && imageResult.success && allFilesSuccess) {
            successCount++;
            console.log(`[handleSend] Envoi réussi vers ${page.title} (texte: ${textResult.success}, image: ${imageResult.success}, fichiers: ${filesResults.length}/${filesResults.length})`);
          } else {
            const failedFiles = filesResults.filter(r => !r.success).length;
            const errorMsg = !textResult.success 
              ? textResult.error 
              : !imageResult.success
              ? `Image: ${imageResult.error}`
              : `${failedFiles} fichier(s) ont échoué`;
            errors.push({ page: page.title, error: errorMsg });
          }
        } catch (error) {
          console.error(`[handleSend] Erreur générale pour ${page.title}:`, error);
          errors.push({ page: page.title, error: error.message });
        }
      }

      setSending(false);

      if (successCount > 0) {
        setSendingStatus('success');
        showNotification(
          `Contenu envoyé vers ${successCount} page${successCount > 1 ? 's' : ''}`,
          'success'
        );

        // ✅ Ajouter à l'historique pour chaque envoi réussi
        console.log('[handleSend] Ajout à l\'historique pour', targets.length, 'pages');
        for (const page of targets) {
          try {
            if (window.electronAPI?.invoke) {
              // Créer un résumé du contenu envoyé
              let contentSummary = '';
              let contentPreview = '';
              
              if (hasTextContent) {
                contentSummary = textContent;
                contentPreview = textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '');
              }
              
              if (hasImageContent) {
                const imageInfo = `Image (${content.metadata?.dimensions?.width}x${content.metadata?.dimensions?.height})`;
                contentSummary += (contentSummary ? '\n\n' : '') + imageInfo;
                contentPreview += (contentPreview ? ' + ' : '') + 'Image';
              }
              
              if (attachedFiles.length > 0) {
                const filesSummary = attachedFiles.map(f => f.name).join(', ');
                contentSummary += (contentSummary ? '\n\n' : '') + `Fichiers joints: ${filesSummary}`;
                contentPreview += (contentPreview ? ' + ' : '') + `${attachedFiles.length} fichier(s)`;
              }

              const historyEntry = {
                timestamp: Date.now(),
                type: attachedFiles.length > 0 ? 'mixed' : 'clipboard',
                status: 'success',
                content: {
                  raw: contentSummary,
                  preview: contentPreview,
                  type: (hasImageContent && hasTextContent) || attachedFiles.length > 0 ? 'mixed' : (content.type || 'text'),
                  filesCount: attachedFiles.length
                },
                page: {
                  id: page.id,
                  title: page.title,
                  icon: page.icon || '📄'
                },
                sentAt: Date.now()
              };
              console.log('[handleSend] Ajout entrée historique:', historyEntry);
              await window.electronAPI.invoke('history:add', historyEntry);
              console.log('[handleSend] Entrée ajoutée avec succès');
            } else {
              console.warn('[handleSend] window.electronAPI.invoke non disponible');
            }
          } catch (error) {
            console.error('[handleSend] Erreur lors de l\'ajout à l\'historique:', error);
          }
        }

        // ✅ Recharger l'historique pour mettre à jour l'affichage
        console.log('[handleSend] Rechargement de l\'historique...');
        if (loadHistory) {
          await loadHistory();
          console.log('[handleSend] Historique rechargé');
        } else {
          console.warn('[handleSend] loadHistory non disponible');
        }

        // Reset du contenu édité et des fichiers attachés
        setEditedClipboard(null);
        setHasUserEditedContent(false);
        hasUserEditedContentRef.current = false;
        setAttachedFiles([]); // ✅ Vider les fichiers attachés après envoi réussi

        if (multiSelectMode) {
          setSelectedPages([]);
          setMultiSelectMode(false);
        }

        // Reset après 2 secondes
        setTimeout(() => setSendingStatus('idle'), 2000);
      } else {
        setSendingStatus('error');
        setTimeout(() => setSendingStatus('idle'), 3000);
      }

      if (errors.length > 0) {
        showNotification(
          `${errors.length} erreur${errors.length > 1 ? 's' : ''} lors de l'envoi`,
          'error'
        );
      }
    } catch (error) {
      setSending(false);
      setSendingStatus('error');
      showNotification(`Erreur: ${error.message}`, 'error');
      setTimeout(() => setSendingStatus('idle'), 3000);
    }
  }, [sending, multiSelectMode, selectedPages, selectedPage, editedClipboard, clipboard, contentProperties, showNotification, loadHistory]);

  // Handler pour la sélection de fichiers via input
  const handleFileSelect = useCallback((event) => {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      // Pour l'instant, on prend le premier fichier et on ouvre le panel d'upload
      setShowFileUpload(true);
      // Optionnel : pré-remplir avec le fichier sélectionné
      // setSelectedFile(files[0]);
    }
    // Reset l'input pour permettre la re-sélection du même fichier
    event.target.value = '';
  }, []);

  // 🆕 Handler pour l'upload de fichiers (nouvelle interface)
  const handleFileUpload = useCallback(async (config) => {
    try {
      // Vérifier qu'une page est sélectionnée
      if (!selectedPage) {
        showNotification('Sélectionnez une page de destination', 'error');
        return;
      }

      console.log('[handleFileUpload] Configuration reçue:', config);

      if (config.mode === 'local' && config.files) {
        // Upload de fichiers locaux
        for (const file of config.files) {
          showNotification(`Démarrage de l'upload de ${file.name}...`, 'info');

          // Convert file to buffer for IPC
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Array.from(new Uint8Array(arrayBuffer));

          const result = await window.electronAPI?.invoke('file:upload', {
            fileName: file.name,
            fileBuffer: buffer,
            caption: config.caption || `Fichier joint: ${file.name}`,
            integrationType: 'attachment', // Valeur par défaut pour fichiers locaux
            pageId: selectedPage.id
          });

          if (result?.success) {
            showNotification(`Fichier "${file.name}" uploadé avec succès`, 'success');
            
            // Ajouter à l'historique
            if (window.electronAPI?.invoke) {
              await window.electronAPI.invoke('history:add', {
                timestamp: Date.now(),
                type: 'file',
                status: 'success',
                content: {
                  raw: file.name,
                  preview: `Fichier: ${file.name}`,
                  type: 'file'
                },
                page: {
                  id: selectedPage.id,
                  title: selectedPage.title,
                  icon: selectedPage.icon || '📄'
                },
                sentAt: Date.now()
              });
            }
          } else {
            throw new Error(result?.error || 'Upload failed');
          }
        }
      } else if (config.mode === 'url' && config.url) {
        // Upload depuis URL
        showNotification(`Intégration de l'URL...`, 'info');

        const result = await window.electronAPI?.invoke('file:upload-url', {
          url: config.url,
          caption: config.caption || `Lien externe: ${config.url}`,
          integrationType: 'external', // Valeur par défaut pour URLs
          pageId: selectedPage.id
        });

        if (result?.success) {
          showNotification(`URL intégrée avec succès`, 'success');
          
          // Ajouter à l'historique
          if (window.electronAPI?.invoke) {
            await window.electronAPI.invoke('history:add', {
              timestamp: Date.now(),
              type: 'url',
              status: 'success',
              content: {
                raw: config.url,
                preview: `URL: ${config.url}`,
                type: 'url'
              },
              page: {
                id: selectedPage.id,
                title: selectedPage.title,
                icon: selectedPage.icon || '📄'
              },
              sentAt: Date.now()
            });
          }
        } else {
          throw new Error(result?.error || 'URL integration failed');
        }
      }

      // Recharger l'historique
      if (loadHistory) {
        await loadHistory();
      }

    } catch (error) {
      console.error('[handleFileUpload] Erreur:', error);
      showNotification(`Erreur d'upload: ${error.message}`, 'error');
    }
  }, [selectedPage, showNotification, loadHistory]);

  // 🆕 Handler pour les changements de fichiers attachés
  const handleAttachedFilesChange = useCallback((files) => {
    setAttachedFiles(files);
  }, []);

  // 🆕 Validation des fichiers avant envoi
  const validateAttachedFiles = useCallback((files) => {
    const maxSize = 5 * 1024 * 1024; // 5MB limite Notion
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
      'video/mp4', 'video/mov', 'video/webm',
      'audio/mp3', 'audio/wav', 'audio/ogg',
      'application/pdf'
    ];

    const errors = [];

    for (const file of files) {
      // Vérifier la taille
      if (file.size && file.size > maxSize) {
        errors.push(`${file.name}: Fichier trop volumineux (max 5MB)`);
      }

      // Vérifier le type
      if (file.type && !allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Type de fichier non supporté par Notion`);
      }
    }

    return errors;
  }, []);

  // ✅ RESET COMPLET : Remettre l'app comme à l'installation
  const handleResetApp = useCallback(async () => {
    try {
      console.log('[RESET] 🔄 Starting COMPLETE app reset to factory defaults...');

      // 1. Reset COMPLET de la configuration (toutes les variables)
      if (window.electronAPI?.resetConfig) {
        const result = await window.electronAPI.resetConfig();
        if (result.success) {
          console.log('[RESET] ✅ ALL config variables reset to defaults');
        }
      }

      // 2. Clear TOUS les caches
      if (window.electronAPI?.clearCache) {
        await window.electronAPI.clearCache();
        console.log('[RESET] ✅ Pages cache cleared');
      }

      if (window.electronAPI?.clearSuggestionCache) {
        await window.electronAPI.clearSuggestionCache();
        console.log('[RESET] ✅ Suggestions cache cleared');
      }

      // 3. Reset des statistiques
      if (window.electronAPI?.resetStats) {
        await window.electronAPI.resetStats();
        console.log('[RESET] ✅ Stats reset to zero');
      }

      // 4. Reset COMPLET des états React (comme à l'installation)
      setSelectedPage(null);
      setSelectedPages([]);
      setMultiSelectMode(false);
      setSidebarCollapsed(false);
      setOnboardingCompleted(false);
      setShowOnboarding(true);
      setConfigLoaded(false);
      setLoading(true);

      // 5. Reset du flag d'initialisation
      initializationDone.current = false;

      console.log('[RESET] ✅ COMPLETE reset done - App is now like a fresh install');
      showNotification('Application réinitialisée complètement', 'success');

    } catch (error) {
      console.error('[RESET] Error during reset:', error);
      showNotification('Erreur lors du reset', 'error');
    }
  }, [showNotification]);

  // ✅ HANDLERS POUR UNIFIEDWORKSPACE (en plus des existants)

  // Le handler d'envoi original (handleSend) est utilisé directement

  // Handlers UnifiedWorkspace supprimés - utilisation directe des handlers existants

  // ============================================
  // 🎯 CONFIGURATION DES RACCOURCIS CLAVIER
  // ============================================
  
  // Configuration des raccourcis avec actions
  const shortcuts = useMemo(() => [
    {
      ...DEFAULT_SHORTCUTS.SEND_CONTENT,
      action: () => {
        if (canSend && !sending && handleSend) {
          handleSend();
        }
      }
    },
    {
      ...DEFAULT_SHORTCUTS.TOGGLE_MINIMALIST,
      action: () => toggleMinimalist()
    },
    {
      ...DEFAULT_SHORTCUTS.CLEAR_CLIPBOARD,
      action: () => {
        if (window.confirm('Vider le presse-papiers ?')) {
          clearClipboard();
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
      ...DEFAULT_SHORTCUTS.TOGGLE_PREVIEW,
      action: () => setShowPreview(prev => !prev)
    },
    {
      ...DEFAULT_SHORTCUTS.FOCUS_SEARCH,
      action: () => {
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="recherch"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    },
    {
      ...DEFAULT_SHORTCUTS.SHOW_SHORTCUTS,
      action: () => setShowShortcuts(true)
    },
    {
      ...DEFAULT_SHORTCUTS.CLOSE_WINDOW,
      action: () => {
        if (window.electronAPI?.closeWindow) {
          window.electronAPI.closeWindow();
        }
      }
    },
    {
      ...DEFAULT_SHORTCUTS.MINIMIZE_WINDOW,
      action: () => {
        if (window.electronAPI?.minimizeWindow) {
          window.electronAPI.minimizeWindow();
        }
      }
    },
    {
      ...DEFAULT_SHORTCUTS.TOGGLE_PIN,
      action: () => togglePin()
    }
  ], [canSend, sending, toggleMinimalist, clearClipboard, togglePin, handleSend]);

  // Activer les raccourcis clavier
  useKeyboardShortcuts({
    shortcuts,
    enabled: true,
    preventDefault: true
  });

  // ============================================
  // RENDU CONDITIONNEL - OAUTH CALLBACK
  // ============================================

  if (isOAuthCallback) {
    return (
      <ErrorBoundary>
        <OAuthCallback
          onSuccess={(workspace) => {
            console.log('OAuth success:', workspace);
            setIsOAuthCallback(false);
            setOnboardingCompleted(true);
            setShowOnboarding(false);
            showNotification(`Connecté à ${workspace.name}`, 'success');
            // Recharger les pages
            if (loadPagesRef.current) {
              loadPagesRef.current();
            }
          }}
          onError={(error) => {
            console.error('OAuth error:', error);
            setIsOAuthCallback(false);
            showNotification(`Erreur OAuth: ${error}`, 'error');
          }}
        />
      </ErrorBoundary>
    );
  }

  // ============================================
  // RENDU CONDITIONNEL - MODE MINIMALISTE
  // ============================================

  if (isMinimalist) {
    return (
      <ErrorBoundary>
        <Layout loading={loading}>
          <Header
            isConnected={isConnected}
            isPinned={isPinned}
            onTogglePin={togglePin}
            isMinimalist={isMinimalist}
            onToggleMinimalist={toggleMinimalist}
            onMinimize={window.electronAPI?.minimizeWindow}
            onMaximize={window.electronAPI?.maximizeWindow}
            onClose={window.electronAPI?.closeWindow}
            onOpenConfig={() => setShowConfig(true)}
            // 🆕 Dynamic Island props
            queueCount={queueStats?.queued || 0}
            historyCount={historyStats?.total || 0}
            sendingStatus={sendingStatus}
            onSend={handleSend}
            onOpenHistory={() => setShowHistoryPanel(true)}
            onOpenQueue={() => setShowQueuePanel(true)}
            onOpenFileUpload={() => setShowFileUpload(true)}
          />

          <MemoizedMinimalistView
            clipboard={clipboard}
            editedClipboard={editedClipboard}
            onEditContent={handleEditContent}
            selectedPage={selectedPage}
            pages={pages}
            onPageSelect={handlePageSelect}
            onSend={handleSend}
            onClearClipboard={handleClearClipboard}
            onExitMinimalist={toggleMinimalist}
            sending={sending}
            canSend={canSend}
            attachedFiles={attachedFiles}
            onFilesChange={handleAttachedFilesChange}
            onFileUpload={handleFileUpload}
          />

          <NotificationManager
            notifications={notifications}
            onClose={closeNotification}
            isMinimalist={true}
          />

          {/* Config Panel même en mode minimaliste */}
          <AnimatePresence>
            {showConfig && (
              <ConfigPanel
                isOpen={showConfig}
                config={config}
                onClose={() => setShowConfig(false)}
                onSave={updateConfig}
                showNotification={showNotification}
                validateNotionToken={validateNotionToken}
                onResetApp={handleResetApp}
                theme={theme}
                actualTheme={actualTheme}
                onThemeChange={setTheme}
              />
            )}
          </AnimatePresence>
          
          {/* 🎯 Modal de raccourcis clavier (mode minimaliste) */}
          <ShortcutsModal
            isOpen={showShortcuts}
            onClose={() => setShowShortcuts(false)}
            shortcuts={shortcuts}
          />
          
          {/* Input caché pour l'upload de fichiers (mode minimaliste) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                const newFiles = files.map(file => ({
                  id: Date.now() + Math.random(),
                  file,
                  name: file.name,
                  type: file.type,
                  size: file.size
                }));
                setAttachedFiles(prev => [...prev, ...newFiles]);
              }
              e.target.value = ''; // Reset input
            }}
          />
        </Layout>
      </ErrorBoundary>
    );
  }

  // ============================================
  // RENDU PRINCIPAL - MODE NORMAL
  // ============================================



  // Vérifier si on est sur la route OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('data')) {
    const callbackData = JSON.parse(decodeURIComponent(urlParams.get('data')));
    
    return (
      <ErrorBoundary>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
            {callbackData.success ? (
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Connexion réussie !</h2>
                <p className="text-gray-600 mb-6">
                  Votre workspace <strong>{callbackData.workspace?.name || 'Notion'}</strong> est maintenant connecté
                </p>
                <button
                  onClick={() => {
                    handleCompleteOnboarding(callbackData.accessToken);
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Continuer
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X size={32} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur de connexion</h2>
                <p className="text-gray-600 mb-6">{callbackData.error}</p>
                <button
                  onClick={() => {
                    setShowOnboarding(true);
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="w-full px-6 py-3 bg-gray-600 text-white font-medium rounded-xl hover:bg-gray-700 transition-all"
                >
                  Réessayer
                </button>
              </>
            )}
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Onboarding original (ton design) avec OAuth
  if (showOnboarding) {
    return (
      <ErrorBoundary>
        <Layout>
          <Onboarding
            onComplete={handleCompleteOnboarding}
            onValidateToken={validateNotionToken}
          />
        </Layout>
      </ErrorBoundary>
    );
  }

  // Chargement initial
  if (loading && !onboardingCompleted) {
    return (
      <ErrorBoundary>
        <Layout loading={true}>
          <Header
            isConnected={isConnected}
            isPinned={isPinned}
            onTogglePin={togglePin}
            isMinimalist={isMinimalist}
            onToggleMinimalist={toggleMinimalist}
            onMinimize={window.electronAPI?.minimizeWindow}
            onMaximize={window.electronAPI?.maximizeWindow}
            onClose={window.electronAPI?.closeWindow}
            // 🆕 Dynamic Island props
            queueCount={queueStats?.queued || 0}
            historyCount={historyStats?.total || 0}
            sendingStatus={sendingStatus}
            onSend={handleSend}
            onOpenHistory={() => setShowHistoryPanel(true)}
            onOpenQueue={() => setShowQueuePanel(true)}
            onOpenFileUpload={() => setShowFileUpload(true)}
          />
          <div className="flex-1 flex">
            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'w-0' : 'w-80'}`}>
              <SkeletonPageList />
            </div>
            <ContentArea>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="loading-spinner w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement...</p>
                </div>
              </div>
            </ContentArea>
          </div>
        </Layout>
      </ErrorBoundary>
    );
  }

  // Interface principale
  return (
    <ErrorBoundary>
      <Layout>
        <Header
          onOpenConfig={() => setShowConfig(true)}
          onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
          sidebarCollapsed={sidebarCollapsed}
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview(prev => !prev)}
          config={config}
          isPinned={isPinned}
          onTogglePin={togglePin}
          isMinimalist={isMinimalist}
          onToggleMinimalist={toggleMinimalist}
          onMinimize={window.electronAPI?.minimizeWindow}
          onMaximize={window.electronAPI?.maximizeWindow}
          onClose={window.electronAPI?.closeWindow}
          isConnected={isConnected}
          // 🆕 Dynamic Island props
          queueCount={queueStats?.queued || 0}
          historyCount={historyStats?.total || 0}
          sendingStatus={sendingStatus}
          onSend={handleSend}
          onOpenHistory={() => setShowHistoryPanel(true)}
          onOpenQueue={() => setShowQueuePanel(true)}
          onOpenFileUpload={() => setShowFileUpload(true)}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* ResizableLayout avec PageList et ContentEditor */}
          {!sidebarCollapsed ? (
            <ResizableLayout
              leftPanel={
                <MemoizedPageList
                  filteredPages={filteredPages}
                  selectedPage={selectedPage}
                  selectedPages={selectedPages}
                  multiSelectMode={multiSelectMode}
                  favorites={favorites}
                  searchQuery={searchQuery}
                  activeTab={activeTab}
                  onPageSelect={handlePageSelect}
                  onToggleFavorite={toggleFavorite}
                  onSearchChange={setSearchQuery}
                  onTabChange={(tab) => setActiveTab(tab)}
                  loading={pagesLoading}
                  onDeselectAll={handleDeselectAll}
                  onToggleMultiSelect={handleToggleMultiSelect}
                />
              }
              rightPanel={
                <UnifiedWorkspace
                  selectedPage={selectedPage}
                  onPageSelect={handlePageSelect}
                  pages={pages}
                  onSend={handleSend}
                  canSend={canSend}
                  queueItems={queue || []}
                  onRetryQueue={retryQueue}
                  onRemoveFromQueue={removeQueue}
                  historyItems={history || []}
                  onRetryHistory={retry}
                  onDeleteHistory={deleteEntry}
                >
                  <ContentEditor
                    clipboard={clipboard}
                    editedClipboard={editedClipboard}
                    onEditContent={handleEditContent}
                    onClearClipboard={handleClearClipboard}
                    selectedPage={selectedPage}
                    selectedPages={selectedPages}
                    multiSelectMode={multiSelectMode}
                    sending={sending}
                    onSend={handleSend}
                    canSend={canSend}
                    contentProperties={contentProperties}
                    onUpdateProperties={handleUpdateProperties}
                    showNotification={showNotification}
                    pages={pages}
                    onDeselectPage={handleDeselectPage}
                    showPreview={showPreview}
                    config={config}
                    attachedFiles={attachedFiles}
                    onFilesChange={handleAttachedFilesChange}
                    onFileUpload={handleFileUpload}
                    maxFileSize={5 * 1024 * 1024}
                    allowedFileTypes={[
                      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
                      'image/webp', 'image/bmp', 'image/svg+xml',
                      'video/mp4', 'video/mov', 'video/webm',
                      'audio/mp3', 'audio/wav', 'audio/ogg',
                      'application/pdf'
                    ]}
                  />
                </UnifiedWorkspace>
              }
              defaultLeftWidth={320}
              minLeftWidth={280}
              maxLeftWidth={500}
            />
          ) : (
            /* Sidebar fermée - Juste le ContentEditor en plein écran */
            <div className="flex-1 overflow-hidden">
              <UnifiedWorkspace
                selectedPage={selectedPage}
                onPageSelect={handlePageSelect}
                pages={pages}
                onSend={handleSend}
                canSend={canSend}
                queueItems={queue || []}
                onRetryQueue={retryQueue}
                onRemoveFromQueue={removeQueue}
                historyItems={history || []}
                onRetryHistory={retry}
                onDeleteHistory={deleteEntry}
              >
                <ContentEditor
                  clipboard={clipboard}
                  editedClipboard={editedClipboard}
                  onEditContent={handleEditContent}
                  onClearClipboard={handleClearClipboard}
                  selectedPage={selectedPage}
                  selectedPages={selectedPages}
                  multiSelectMode={multiSelectMode}
                  sending={sending}
                  onSend={handleSend}
                  canSend={canSend}
                  contentProperties={contentProperties}
                  onUpdateProperties={handleUpdateProperties}
                  showNotification={showNotification}
                  pages={pages}
                  onDeselectPage={handleDeselectPage}
                  showPreview={showPreview}
                  config={config}
                  attachedFiles={attachedFiles}
                  onFilesChange={handleAttachedFilesChange}
                  onFileUpload={handleFileUpload}
                  maxFileSize={5 * 1024 * 1024}
                  allowedFileTypes={[
                    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
                    'image/webp', 'image/bmp', 'image/svg+xml',
                    'video/mp4', 'video/mov', 'video/webm',
                    'audio/mp3', 'audio/wav', 'audio/ogg',
                    'application/pdf'
                  ]}
                />
              </UnifiedWorkspace>
            </div>
          )}
        </div>



        {/* Config Panel */}
        <AnimatePresence>
          {showConfig && (
            <ConfigPanel
              isOpen={showConfig}
              config={config}
              onClose={() => setShowConfig(false)}
              onSave={updateConfig}
              showNotification={showNotification}
              validateNotionToken={validateNotionToken}
              onResetApp={handleResetApp}
              theme={theme}
              actualTheme={actualTheme}
              onThemeChange={setTheme}
            />
          )}
        </AnimatePresence>

        {/* 🆕 INPUT FILE CACHÉ POUR LA SÉLECTION DE FICHIERS */}
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload-input"
          accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
        />

        {/* 🆕 NOUVEAUX PANELS */}
        <AnimatePresence>
          {showFileUpload && (
            <FileUploadPanel
              onFileSelect={handleFileUpload}
              onCancel={() => setShowFileUpload(false)}
              currentPage={selectedPage}
              maxSize={20 * 1024 * 1024}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistoryPanel && (
            <HistoryPanel
              onClose={() => setShowHistoryPanel(false)}
              onRetry={retry}
              onDelete={deleteEntry}
              getHistory={loadHistory}
              getStats={async () => historyStats || {
                total: 0,
                success: 0,
                failed: 0,
                pending: 0,
                totalSize: 0,
                byType: {},
                byPage: {}
              }}
            />
          )}
        </AnimatePresence>

        {showQueuePanel && (
          <QueuePanel
            queue={queue}
            stats={queueStats}
            onClose={() => setShowQueuePanel(false)}
            onRetry={retryQueue}
            onRemove={removeQueue}
            onClear={clearQueue}
            isOnline={isConnected}
          />
        )}

        {/* Config Panel */}
        <AnimatePresence>
          {showConfig && (
            <ConfigPanel
              isOpen={showConfig}
              config={config}
              onClose={() => setShowConfig(false)}
              onSave={updateConfig}
              showNotification={showNotification}
              validateNotionToken={validateNotionToken}
              onResetApp={handleResetApp}
              theme={theme}
              actualTheme={actualTheme}
              onThemeChange={setTheme}
            />
          )}
        </AnimatePresence>

        {/* Notifications */}
        <NotificationManager
          notifications={notifications}
          onClose={closeNotification}
          isMinimalist={false}
        />
        
        {/* 🎯 Modal de raccourcis clavier */}
        <ShortcutsModal
          isOpen={showShortcuts}
          onClose={() => setShowShortcuts(false)}
          shortcuts={shortcuts}
        />
        
        {/* Input caché pour l'upload de fichiers */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              const newFiles = files.map(file => ({
                id: Date.now() + Math.random(),
                file,
                name: file.name,
                type: file.type,
                size: file.size
              }));
              setAttachedFiles(prev => [...prev, ...newFiles]);
            }
            e.target.value = ''; // Reset input
          }}
        />
      </Layout>
    </ErrorBoundary>
  );
}

export default App;