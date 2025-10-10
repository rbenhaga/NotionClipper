// apps/notion-clipper-app/src/react/src/App.jsx - VERSION FINALE CORRIGÉE
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import './App.css'; // ✅ Import des styles Tailwind CSS

// ✅ IMPORTS DEPUIS packages/ui UNIQUEMENT
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
  useNotifications,
  useConfig,
  usePages,
  useClipboard,
  useSuggestions
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

// Mémoriser les composants lourds - DÉSACTIVÉ pour debug
// const MemoizedPageList = memo(PageList);
// const MemoizedContentEditor = memo(ContentEditor);

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
  const [contentProperties, setContentProperties] = useState({
    contentType: 'paragraph',
    parseAsMarkdown: true
  });



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
    // Validate callback - utilise verifyToken
    async (token) => {
      const result = await window.electronAPI.verifyToken(token);
      return {
        success: result?.success || false,
        error: result?.error
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
        return result?.clipboard || null;
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

        // Check first run - utilise getValue pour récupérer onboardingCompleted
        const onboardingStatus = await window.electronAPI.getValue('onboardingCompleted');
        const isFirstRun = !onboardingStatus;

        if (isFirstRun) {
          setShowOnboarding(true);
        } else if (loadedConfig.notionToken) {
          // Load pages if configured
          await loadPages();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Erreur lors de l\'initialisation', 'error');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Auto-refresh clipboard - seulement avec les événements IPC
  useEffect(() => {
    if (config.autoDetectClipboard !== false) { // Actif par défaut
      // Listen for clipboard changes from main process
      const handleClipboardChange = () => {
        loadClipboard();
      };

      if (window.electronAPI?.on) {
        window.electronAPI.on('clipboard:changed', handleClipboardChange);
      }

      // Load clipboard immediately
      loadClipboard();

      return () => {
        if (window.electronAPI?.removeAllListeners) {
          window.electronAPI.removeAllListeners('clipboard:changed');
        }
      };
    }
  }, [config.autoDetectClipboard, loadClipboard]); // Ajouter loadClipboard comme dépendance

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

    try {
      const results = await Promise.all(
        targets.map(page =>
          window.electronAPI.sendToNotion({
            pageId: page.id,
            content: content.text,
            properties: contentProperties
          })
        )
      );

      const successCount = results.filter(r => r.success).length;

      if (successCount === targets.length) {
        showNotification(
          `Contenu envoyé vers ${successCount} page${successCount > 1 ? 's' : ''} ✅`,
          'success'
        );
        clearClipboard();
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

  const handleCompleteOnboarding = useCallback(async (data) => {
    await updateConfig({
      notionToken: data.token,
      previewPageId: data.previewPageId,
      onboardingCompleted: true
    });
    await window.electronAPI.completeOnboarding();
    setShowOnboarding(false);
    setOnboardingCompleted(true);
    await loadPages();
  }, [updateConfig, loadPages]);

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
  // RENDER
  // ============================================

  // Loading
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Onboarding
  if (showOnboarding && !onboardingCompleted) {
    return (
      <Layout>
        <Onboarding
          onComplete={handleCompleteOnboarding}
          onSkip={async () => {
            setShowOnboarding(false);
            setOnboardingCompleted(true);
          }}
          validateToken={validateNotionToken}
          platformKey="Ctrl"
          mode="default"
        />
      </Layout>
    );
  }

  // Main app
  return (
    <Layout>
      {/* Header avec boutons de fenêtre */}
      <Header
        title="Notion Clipper Pro"
        showLogo={true}
        isOnline={true}
        isConnected={!!config.notionToken}
        onOpenConfig={() => setShowConfig(true)}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        hasNewPages={false}
        loadingProgress={undefined}
        onMinimize={() => window.electronAPI?.minimizeWindow?.()}
        onMaximize={() => window.electronAPI?.maximizeWindow?.()}
        onClose={() => window.electronAPI?.closeWindow?.()}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <Sidebar isOpen={!sidebarCollapsed} width="default">
              <PageList
                filteredPages={filteredPages}
                selectedPage={selectedPage}
                selectedPages={selectedPageIds} // ✅ Passer les IDs, pas les objets
                multiSelectMode={multiSelectMode}
                favorites={favorites} // ✅ favorites est maintenant toujours un array
                searchQuery={searchQuery}
                activeTab={pagesActiveTab}
                onPageSelect={handlePageSelect}
                onToggleFavorite={toggleFavorite}
                onSearchChange={setSearchQuery}
                onTabChange={(tab) => setPagesActiveTab(tab)} // ✅ Wrapper pour le type
                loading={pagesLoading}
                onDeselectAll={handleDeselectAll}
                onToggleMultiSelect={handleToggleMultiSelect}
              />
            </Sidebar>
          )}
        </AnimatePresence>

        {/* Content area */}
        <ContentArea>
          <ContentEditor
            clipboard={clipboard}
            editedClipboard={editedClipboard}
            onEditContent={setEditedClipboard}
            onClearClipboard={clearClipboard}
            selectedPage={selectedPage}
            selectedPages={selectedPageIds} // ✅ Passer les IDs, pas les objets
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
      </div>

      {/* Config panel */}
      <AnimatePresence>
        {showConfig && (
          <ConfigPanel
            isOpen={showConfig}
            config={config}
            onSave={updateConfig} // ✅ Utiliser onSave uniquement
            validateNotionToken={validateNotionToken}
            showNotification={showNotification}
            onClose={() => setShowConfig(false)}
          />
        )}
      </AnimatePresence>

      {/* Notifications */}
      <NotificationManager
        notifications={notifications}
        onClose={closeNotification}
      />
    </Layout>
  );
}

export default App;