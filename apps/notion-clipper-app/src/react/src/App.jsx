// apps/notion-clipper-app/src/react/src/App.jsx - VERSION CORRIGÉE
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import './App.css';

// Imports depuis packages/ui
import {
  Onboarding,
  Layout,
  Header,
  Sidebar,
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
  useWindowPreferences
} from '@notion-clipper/ui';

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
const MemoizedContentEditor = memo(ContentEditor);
const MemoizedMinimalistView = memo(MinimalistView);

function App() {
  // ============================================
  // ÉTATS UI
  // ============================================
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
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
  const [isConnected, setIsConnected] = useState(true); // État de connexion réseau
  const [hasUserEditedContent, setHasUserEditedContent] = useState(false); // Flag pour protéger le contenu édité
  const hasUserEditedContentRef = useRef(false); // Ref pour accès immédiat
  const ignoreNextEditRef = useRef(false); // Flag pour ignorer le prochain handleEditContent
  // lastClipboardTextRef supprimé - plus nécessaire sans le useEffect destructeur

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

  // Surveiller l'état du réseau via le polling service
  useEffect(() => {
    if (!window.electronAPI?.invoke) return;

    let intervalId;

    const checkNetworkStatus = async () => {
      try {
        const result = await window.electronAPI.invoke('polling:get-status');
        if (result.success && result.status) {
          // Connecté si le polling fonctionne et n'est pas en pause réseau
          const connected = result.status.isRunning && !result.status.isNetworkPaused;
          setIsConnected(connected);
        }
      } catch (error) {
        console.warn('[NETWORK] Error checking status:', error);
        setIsConnected(false);
      }
    };

    // Vérifier immédiatement
    checkNetworkStatus();

    // Puis vérifier toutes les 10 secondes
    intervalId = setInterval(checkNetworkStatus, 10000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

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

  const handlePageSelect = useCallback((page) => {
    if (multiSelectMode) {
      setSelectedPages(prev => {
        if (prev.includes(page.id)) {
          return prev.filter(id => id !== page.id);
        }
        return [...prev, page.id];
      });
    } else {
      setSelectedPage(page);
      setSelectedPages([]);
    }
  }, [multiSelectMode]);

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
  }, []);

  const handleDeselectPage = useCallback((pageId) => {
    setSelectedPages(prev => prev.filter(id => id !== pageId));
  }, []);

  const handleSend = useCallback(async () => {
    if (sending) return;

    const targets = multiSelectMode ? selectedPages : (selectedPage ? [selectedPage] : []);
    
    // ✅ PRIORITÉ ABSOLUE au contenu édité
    const content = editedClipboard || clipboard;

    console.log('[SEND] 📤 Preparing to send:', {
      hasEditedClipboard: !!editedClipboard,
      hasClipboard: !!clipboard,
      usingContent: editedClipboard ? '📝 EDITED' : '📋 CLIPBOARD',
      contentLength: (content?.text || content?.data || '').length,
      targets: targets.length
    });

    if (!targets.length) {
      showNotification('Sélectionnez au moins une page', 'error');
      return;
    }

    // ✅ EXTRACTION SÉCURISÉE DU TEXTE
    let textContent = '';
    
    if (!content) {
      showNotification('Aucun contenu à envoyer', 'error');
      return;
    }

    // Extraire le texte de manière robuste
    if (typeof content === 'string') {
      textContent = content;
    } else if (content.text) {
      textContent = content.text;
    } else if (content.data) {
      textContent = content.data;
    } else if (content.content) {
      textContent = content.content;
    } else {
      console.warn('[SEND] ⚠️ Could not extract text from content:', content);
      showNotification('Format de contenu invalide', 'error');
      return;
    }

    if (!textContent || textContent.trim() === '') {
      showNotification('Ajoutez du contenu à envoyer', 'error');
      return;
    }

    console.log('[SEND] ✅ Text extracted:', {
      length: textContent.length,
      preview: textContent.substring(0, 100) + '...'
    });

    setSending(true);
    setSendingProgress({ current: 0, total: targets.length });

    // Préparer les données d'envoi
    const sendData = {
      content: textContent,  // ✅ Toujours une string
      ...contentProperties,
      parseAsMarkdown: contentProperties.parseAsMarkdown !== false
    };

    let successCount = 0;
    const errors = [];

    // Envoyer vers toutes les pages cibles
    for (let i = 0; i < targets.length; i++) {
      const page = targets[i];
      setSendingProgress({ current: i + 1, total: targets.length });

      try {
        console.log(`[SEND] 📤 Sending to page ${i + 1}/${targets.length}:`, page.title);

        const result = await window.electronAPI.sendToNotion({
          pageId: page.id,
          ...sendData
        });

        if (result.success) {
          successCount++;
          console.log(`[SEND] ✅ Success: ${page.title}`);
        } else {
          errors.push({ page: page.title, error: result.error });
          console.error(`[SEND] ❌ Failed: ${page.title}`, result.error);
        }
      } catch (error) {
        errors.push({ page: page.title, error: error.message });
        console.error(`[SEND] ❌ Exception: ${page.title}`, error);
      }
    }

    setSending(false);
    setSendingProgress({ current: 0, total: 0 });

    // ✅ RESET APRÈS ENVOI RÉUSSI
    // C'est ICI et SEULEMENT ICI qu'on libère le contenu édité protégé
    if (successCount > 0) {
      showNotification(
        `Contenu envoyé vers ${successCount} page${successCount > 1 ? 's' : ''}`,
        'success'
      );

      console.log('[SEND] 🔄 Resetting protected content after successful send');
      console.log('[SEND] 📋 New clipboard content will now be displayed');
      
      // ✅ Reset explicite de l'état d'édition
      ignoreNextEditRef.current = true;
      setEditedClipboard(null);
      setHasUserEditedContent(false);
      hasUserEditedContentRef.current = false;
      
      setTimeout(() => {
        ignoreNextEditRef.current = false;
        // ✅ Recharger le clipboard pour afficher le dernier contenu copié
        if (loadClipboard) {
          loadClipboard();
        }
        console.log('[SEND] ✅ Ready for new content');
      }, 200);

      // Désélectionner les pages en mode multi-select
      if (multiSelectMode) {
        setSelectedPages([]);
        setMultiSelectMode(false);
      }
    }

    // Afficher les erreurs s'il y en a
    if (errors.length > 0) {
      console.error('[SEND] ❌ Errors occurred:', errors);
      showNotification(
        `${errors.length} erreur${errors.length > 1 ? 's' : ''} lors de l'envoi`,
        'error'
      );
    }
  }, [editedClipboard, clipboard, selectedPage, selectedPages, multiSelectMode, contentProperties, sending, showNotification, loadClipboard]); // ✅ Supprimé clearClipboard

  const canSend = useMemo(() => {
    const hasContent = clipboard && (clipboard.text || clipboard.html || clipboard.images?.length > 0);
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
          />

          <NotificationManager
            notifications={notifications}
            onClose={closeNotification}
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
              />
            )}
          </AnimatePresence>
        </Layout>
      </ErrorBoundary>
    );
  }

  // ============================================
  // RENDU PRINCIPAL - MODE NORMAL
  // ============================================

  // Onboarding
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
                <ContentArea>
                  <MemoizedContentEditor
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
                  />
                </ContentArea>
              }
              defaultLeftSize={35}
              minLeftSize={25}
              minRightSize={35}
              storageKey="notion-clipper-panel-sizes"
            />
          ) : (
            /* Sidebar fermée - Juste le ContentEditor en plein écran */
            <ContentArea>
              <MemoizedContentEditor
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
              />
            </ContentArea>
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
            />
          )}
        </AnimatePresence>

        {/* Notifications */}
        <NotificationManager
          notifications={notifications}
          onClose={closeNotification}
        />
      </Layout>
    </ErrorBoundary>
  );
}

export default App;