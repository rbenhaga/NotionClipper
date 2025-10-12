// apps/notion-clipper-app/src/react/src/App.jsx - VERSION AVEC NOUVELLES FONCTIONNALITÉS
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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
  ResizableLayout,       // NOUVEAU
  MinimalistView,        // NOUVEAU
  useNotifications,
  useConfig,
  usePages,
  useClipboard,
  useSuggestions,
  useWindowPreferences   // NOUVEAU
} from '@notion-clipper/ui';

// Constantes
// CLIPBOARD_CHECK_INTERVAL supprimé - on utilise seulement les événements IPC

// Fonction debounce pour éviter les appels trop fréquents
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
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0 });
  const [contentProperties, setContentProperties] = useState({
    contentType: 'paragraph',
    parseAsMarkdown: true
  });

  // ============================================
  // NOUVEAUX HOOKS - Window Preferences
  // ============================================
  const {
    isPinned,
    isMinimalist,
    togglePin,
    toggleMinimalist
  } = useWindowPreferences();

  // ============================================
  // HOOKS packages/ui
  // ============================================

  // Notifications
  const { notifications, showNotification, closeNotification } = useNotifications();

  // Config - avec les bonnes méthodes API
  const { config, updateConfig, loadConfig, validateNotionToken } = useConfig(
    // Save callback - utilise saveConfig
    async (newConfig) => {
      return await window.electronAPI.saveConfig(newConfig);
    },
    // Load callback - utilise getConfig
    async () => {
      const result = await window.electronAPI.getConfig();
      return result?.config || { notionToken: '', onboardingCompleted: false };
    },
    // Validate callback - utilise verifyToken et précharge les pages
    async (token) => {
      const result = await window.electronAPI.verifyToken(token);
      
      // Si la validation réussit et qu'on a des pages préchargées, les stocker
      if (result?.success && result?.pages) {
        console.log('🎉 Token validated with', result.pages.length, 'preloaded pages');
        // Les pages seront automatiquement disponibles après l'onboarding
      }
      
      return {
        success: result?.success || false,
        error: result?.error,
        pages: result?.pages || []
      };
    }
  );

  // Pages - avec les bonnes méthodes API
  const {
    pages,
    filteredPages,
    favorites,
    searchQuery,
    activeTab: pagesActiveTab,
    setSearchQuery,
    setActiveTab: setPagesActiveTab,
    loadPages,
    toggleFavorite,
    pagesLoading
  } = usePages(
    // Load pages callback - utilise getPages
    async () => {
      try {
        const result = await window.electronAPI.getPages();
        if (result?.success) {
          return result.pages || [];
        }
        throw new Error(result?.error || 'Failed to load pages');
      } catch (error) {
        console.error('Error loading pages:', error);
        return [];
      }
    },
    // Load favorites callback - utilise getFavorites
    async () => {
      try {
        const result = await window.electronAPI.getFavorites();
        return result?.favorites || []; // ✅ Toujours retourner un array
      } catch (error) {
        console.error('Error loading favorites:', error);
        return []; // ✅ Retourner un array vide en cas d'erreur
      }
    },
    // Toggle favorite callback - utilise invoke avec le bon canal
    async (pageId) => {
      try {
        const result = await window.electronAPI.invoke('page:toggle-favorite', { pageId });
        return result?.success || false;
      } catch (error) {
        console.error('Error toggling favorite:', error);
        return false;
      }
    },
    // Load recent pages callback - utilise getRecentPages
    async (limit = 10) => {
      try {
        const result = await window.electronAPI.getRecentPages(limit);
        return result?.pages || [];
      } catch (error) {
        console.error('Error loading recent pages:', error);
        return [];
      }
    }
  );

  // Clipboard - avec les bonnes méthodes API
  const {
    clipboard,
    editedClipboard,
    setEditedClipboard,
    loadClipboard,
    clearClipboard
  } = useClipboard(
    // Load callback - utilise getClipboard
    async () => {
      try {
        const result = await window.electronAPI.getClipboard();
        const electronClipboard = result?.clipboard;
        
        if (!electronClipboard) {
          return null;
        }
        
        // Transform Electron clipboard format to UI format
        const content = electronClipboard.data || '';
        const transformed = {
          content: content,  // Champ principal
          text: content,     // Alias pour compatibilité
          type: electronClipboard.type || 'text',
          timestamp: electronClipboard.timestamp,
          metadata: electronClipboard.metadata,
          hash: electronClipboard.hash  // Ajouter le hash
        };
        
        return transformed;
      } catch (error) {
        console.error('Error loading clipboard:', error);
        return null;
      }
    }
  );

  // Pas de polling personnalisé - on utilise seulement les événements IPC

  // Suggestions - avec la bonne méthode API
  const {
    getSuggestions
  } = useSuggestions(
    async (content) => {
      try {
        const result = await window.electronAPI.getSuggestions(content);
        if (result?.success) {
          return result.suggestions;
        }
        return [];
      } catch (error) {
        console.error('Error getting suggestions:', error);
        return [];
      }
    }
  );



  // ============================================
  // EFFETS
  // ============================================

  // Initial load - corrigé avec les bonnes méthodes
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        // Load config avec getConfig
        const loadedConfig = await loadConfig();
        console.log('🔧 Loaded config:', loadedConfig);

        // Check first run - vérifier si on a un token
        const hasToken = loadedConfig?.notionToken && loadedConfig.notionToken.trim().length > 0;
        const onboardingStatus = loadedConfig?.onboardingCompleted;
        
        console.log('🔍 First run check:', { hasToken, onboardingStatus });

        if (!hasToken || !onboardingStatus) {
          console.log('🚀 Starting onboarding...');
          setShowOnboarding(true);
          setOnboardingCompleted(false);
        } else {
          console.log('✅ App already configured, loading pages...');
          setOnboardingCompleted(true);
          // Load pages if configured
          await loadPages();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Erreur lors de l\'initialisation', 'error');
        // En cas d'erreur, forcer l'onboarding
        setShowOnboarding(true);
        setOnboardingCompleted(false);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Auto-refresh clipboard - seulement avec les événements IPC
  useEffect(() => {
    if (config.autoDetectClipboard !== false) { // Actif par défaut
      // Debounce clipboard loading to avoid race conditions
      const debouncedLoadClipboard = debounce(() => {
        // ✅ Ne pas mettre à jour le clipboard si l'utilisateur est en train d'éditer
        if (!editedClipboard) {
          loadClipboard();
        }
      }, 100);

      // Listen for clipboard changes from main process
      const handleClipboardChange = (event, data) => {
        debouncedLoadClipboard();
      };

      if (window.electronAPI?.on) {
        window.electronAPI.on('clipboard:changed', handleClipboardChange);
      }

      // Load clipboard immediately (seulement si pas d'édition en cours)
      if (!editedClipboard) {
        loadClipboard();
      }

      return () => {
        if (window.electronAPI?.removeAllListeners) {
          window.electronAPI.removeAllListeners('clipboard:changed');
        }
      };
    }
  }, [config.autoDetectClipboard, loadClipboard, editedClipboard]); // Ajouter editedClipboard comme dépendance

  // Get suggestions when clipboard changes - avec protection contre les boucles
  const getSuggestionsDebounced = useCallback(
    debounce((text, pages, favorites) => {
      if (text && typeof text === 'string' && text.trim() && pages.length > 0) {
        getSuggestions(text, pages, favorites);
      }
    }, 1000), // Debounce de 1 seconde
    [] // ERREUR CORRIGÉE: Supprimer getSuggestions des dépendances pour éviter la re-création
  );

  useEffect(() => {
    if (clipboard?.text && pages.length > 0) {
      getSuggestionsDebounced(clipboard.text, pages, favorites);
    }
  }, [clipboard?.hash, pages.length, favorites.length]); // ERREUR CORRIGÉE: Supprimer getSuggestionsDebounced des dépendances

  // ============================================
  // HANDLERS
  // ============================================

  const handlePageSelect = useCallback((page) => {
    if (multiSelectMode) {
      setSelectedPages(prev => {
        const isSelected = prev.some(p => p.id === page.id);
        if (isSelected) {
          return prev.filter(p => p.id !== page.id);
        } else {
          return [...prev, page];
        }
      });
    } else {
      setSelectedPage(page);
      setSelectedPages([]);
    }
  }, [multiSelectMode]);

  const handleToggleMultiSelect = useCallback(() => {
    setMultiSelectMode(prev => !prev);
    if (multiSelectMode) {
      setSelectedPages([]);
    } else if (selectedPage) {
      setSelectedPages([selectedPage]);
      setSelectedPage(null);
    }
  }, [multiSelectMode, selectedPage]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPages([]);
    setSelectedPage(null);
  }, []);

  const handleDeselectPage = useCallback((pageId) => {
    setSelectedPages(prev => prev.filter(p => p.id !== pageId));
  }, []);

  const handleSend = useCallback(async () => {
    const targets = multiSelectMode ? selectedPages : (selectedPage ? [selectedPage] : []);
    const content = editedClipboard || clipboard;

    if (!targets.length || !content?.text) {
      showNotification('Sélectionnez une page et ajoutez du contenu', 'warning');
      return;
    }

    setSending(true);
    setSendingProgress({ current: 0, total: targets.length });

    try {
      let successCount = 0;
      
      // Envoi séquentiel avec progression
      for (let i = 0; i < targets.length; i++) {
        const page = targets[i];
        
        try {
          const result = await window.electronAPI.sendToNotion({
            pageId: page.id,
            content: content.text,
            properties: contentProperties
          });
          
          if (result.success) {
            successCount++;
          }
        } catch (error) {
          console.error('Error sending to page:', page.id, error);
        }
        
        // Mettre à jour la progression
        setSendingProgress({ current: i + 1, total: targets.length });
        
        // Petit délai pour éviter de surcharger l'API
        if (i < targets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (successCount === targets.length) {
        showNotification(
          `Contenu envoyé vers ${successCount} page${successCount > 1 ? 's' : ''} ✅`,
          'success'
        );
        // ✅ Clear clipboard state and reset detection
        await window.electronAPI.clearClipboard(); // Reset lastContent in service
        clearClipboard(); // Clear local state
        handleDeselectAll();
      } else {
        showNotification(
          `${successCount}/${targets.length} envois réussis`,
          'warning'
        );
      }
    } catch (error) {
      console.error('Error sending to Notion:', error);
      showNotification('Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
      setSendingProgress({ current: 0, total: 0 });
    }
  }, [
    multiSelectMode,
    selectedPages,
    selectedPage,
    editedClipboard,
    clipboard,
    contentProperties,
    showNotification,
    clearClipboard,
    handleDeselectAll
  ]);

  const handleCompleteOnboarding = useCallback(async (token) => {
    try {
      console.log('🎉 Completing onboarding with token:', token);
      
      // Le token est passé directement comme string depuis l'onboarding
      await updateConfig({
        notionToken: token,
        onboardingCompleted: true
      });
      
      // Marquer l'onboarding comme terminé dans Electron
      try {
        await window.electronAPI.completeOnboarding();
      } catch (electronError) {
        console.warn('⚠️ Could not call completeOnboarding:', electronError);
      }
      
      setShowOnboarding(false);
      setOnboardingCompleted(true);
      
      // Charger les pages après configuration (les pages sont déjà préchargées pendant la validation)
      console.log('🔄 Loading pages after onboarding...');
      await loadPages();
      
      showNotification('Configuration terminée avec succès !', 'success');
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      showNotification('Erreur lors de la configuration', 'error');
    }
  }, [updateConfig, loadPages, showNotification]);

  // ============================================
  // COMPUTED
  // ============================================

  const canSend = useMemo(() => {
    const hasTarget = multiSelectMode
      ? selectedPages.length > 0
      : selectedPage !== null;
    const hasContent = !!(editedClipboard?.text || clipboard?.text);
    return hasTarget && hasContent && !sending;
  }, [multiSelectMode, selectedPages, selectedPage, editedClipboard, clipboard, sending]);

  // Convertir selectedPages en array d'IDs pour PageList
  const selectedPageIds = useMemo(() => {
    return selectedPages.map(p => p.id);
  }, [selectedPages]);

  // ============================================
  // RENDU CONDITIONNEL - MODE MINIMALISTE
  // ============================================
  if (isMinimalist) {
    return (
      <ErrorBoundary>
        <Layout loading={loading}>
          <Header
            isPinned={isPinned}
            onTogglePin={togglePin}
            isMinimalist={isMinimalist}
            onToggleMinimalist={toggleMinimalist}
            onMinimize={window.electronAPI?.minimizeWindow}
            onMaximize={window.electronAPI?.maximizeWindow}
            onClose={window.electronAPI?.closeWindow}
            isOnline={true}
            isConnected={true}
          />
          <MemoizedMinimalistView
            clipboard={clipboard}
            editedClipboard={editedClipboard}
            onEditContent={setEditedClipboard}
            selectedPage={selectedPage}
            pages={pages}
            onPageSelect={handlePageSelect}
            onSend={handleSend}
            onClearClipboard={clearClipboard}
            onExitMinimalist={toggleMinimalist}
            sending={sending}
            canSend={canSend}
          />
          <NotificationManager
            notifications={notifications}
            onClose={closeNotification}
          />
        </Layout>
      </ErrorBoundary>
    );
  }

  // ============================================
  // RENDU PRINCIPAL - MODE NORMAL
  // ============================================
  
  // Loading
  if (loading && !onboardingCompleted) {
    return (
      <ErrorBoundary>
        <Layout loading={true}>
          <Header
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

  // Interface principale avec ResizableLayout
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
          isOnline={true}
          isConnected={true}
        />

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar avec transition */}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <Sidebar
                activeView="clipboard"
                config={config}
                onOpenConfig={() => setShowConfig(true)}
              />
            )}
          </AnimatePresence>

          {/* ResizableLayout avec PageList et ContentEditor */}
          <ResizableLayout
            leftPanel={
              <MemoizedPageList
                filteredPages={filteredPages}
                selectedPage={selectedPage}
                selectedPages={selectedPageIds}
                multiSelectMode={multiSelectMode}
                favorites={favorites}
                searchQuery={searchQuery}
                activeTab={pagesActiveTab}
                onPageSelect={handlePageSelect}
                onToggleFavorite={toggleFavorite}
                onSearchChange={setSearchQuery}
                onTabChange={setPagesActiveTab}
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
                  onEditContent={setEditedClipboard}
                  onClearClipboard={clearClipboard}
                  selectedPage={selectedPage}
                  selectedPages={selectedPageIds}
                  multiSelectMode={multiSelectMode}
                  sending={sending}
                  onSend={handleSend}
                  canSend={canSend}
                  contentProperties={contentProperties}
                  onUpdateProperties={setContentProperties}
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
        </div>

        {/* Config Panel */}
        <AnimatePresence>
          {showConfig && (
            <ConfigPanel
              config={config}
              onClose={() => setShowConfig(false)}
              onSave={updateConfig}
              onValidateToken={validateNotionToken}
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