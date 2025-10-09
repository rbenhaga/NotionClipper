// apps/notion-clipper-app/src/react/src/App.jsx - CORRIGÉ (sans boucle)
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';

// ✅ IMPORTS DEPUIS packages/ui
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
const CLIPBOARD_CHECK_INTERVAL = 1000;

// Mémoriser les composants lourds
const MemoizedPageList = memo(PageList);
const MemoizedContentEditor = memo(ContentEditor);

function App() {
  // ============================================
  // ÉTATS UI
  // ============================================
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [firstRun, setFirstRun] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingText, setIsEditingText] = useState(false);
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
  
  // ✅ CALLBACKS MÉMORISÉS POUR CLIPBOARD (FIX BOUCLE INFINIE)
  const loadClipboardFn = useCallback(async () => {
    const result = await window.electronAPI.getClipboard();
    return result?.clipboard || null;
  }, []);

  const setClipboardFn = useCallback(async (data) => {
    await window.electronAPI.setClipboard(data);
  }, []);

  const clearClipboardFn = useCallback(async () => {
    await window.electronAPI.clearClipboard();
  }, []);

  // Config - avec callbacks IPC Electron
  const { config, updateConfig, loadConfig, validateNotionToken } = useConfig(
    // Save callback
    async (newConfig) => {
      await window.electronAPI.saveConfig(newConfig);
    },
    // Load callback
    async () => {
      const result = await window.electronAPI.getConfig();
      return result?.config || { notionToken: '', onboardingCompleted: false };
    },
    // Validate callback
    async (token) => {
      const result = await window.electronAPI.verifyToken(token);
      return {
        success: result?.success || false,
        error: result?.error
      };
    }
  );

  // Clipboard - avec callbacks MÉMORISÉS
  const { 
    clipboard, 
    editedClipboard, 
    setEditedClipboard, 
    loadClipboard, 
    clearClipboard 
  } = useClipboard(
    loadClipboardFn,
    setClipboardFn,
    clearClipboardFn
  );

  // Pages - avec callbacks IPC Electron
  const {
    pages,
    filteredPages,
    searchQuery,
    setSearchQuery,
    activeTab: pagesActiveTab,
    setActiveTab: setPagesActiveTab,
    loading: pagesLoading,
    loadPages,
    favorites,
    toggleFavorite,
    addToRecent,
    recentPages
  } = usePages(
    // Get pages callback
    async (forceRefresh = false) => {
      const result = await window.electronAPI.getPages(forceRefresh);
      return result?.pages || [];
    },
    // Get favorites callback
    async () => {
      const result = await window.electronAPI.getFavorites();
      return result?.favorites || [];
    },
    // Save favorites callback
    async (newFavorites) => {
      // Géré automatiquement par toggleFavorite dans IPC
    },
    // Get recent pages callback
    async (limit = 10) => {
      const result = await window.electronAPI.getRecentPages(limit);
      return result?.pages || [];
    },
    // Save recent page callback
    async (page) => {
      // Géré automatiquement côté Electron
    }
  );

  // Suggestions - avec callback IPC Electron
  const { suggestions, getSuggestions } = useSuggestions(
    async (content, pagesForSuggestion, favoritesForSuggestion) => {
      const result = await window.electronAPI.getSuggestions({
        content,
        pages: pagesForSuggestion,
        favorites: favoritesForSuggestion
      });
      return result?.suggestions || [];
    }
  );

  // ============================================
  // REFS
  // ============================================
  const sendingRef = useRef(false);

  // ============================================
  // CALLBACKS
  // ============================================

  const handleSend = useCallback(async () => {
    if (sendingRef.current || sending) {
      console.log('⚠️ Déjà en cours d\'envoi, annulation...');
      return;
    }

    if (!selectedPage && selectedPages.length === 0) {
      showNotification('Veuillez sélectionner une page', 'warning');
      return;
    }

    const content = editedClipboard || clipboard;
    if (!content || !content.text) {
      showNotification('Aucun contenu à envoyer', 'warning');
      return;
    }

    sendingRef.current = true;
    setSending(true);

    try {
      const targetPages = multiSelectMode ? selectedPages : [selectedPage.id];

      for (const pageId of targetPages) {
        const result = await window.electronAPI.sendToNotion({
          pageId,
          content: content.text,
          options: {
            contentType: contentProperties.contentType,
            parseAsMarkdown: contentProperties.parseAsMarkdown,
            icon: contentProperties.icon,
            cover: contentProperties.cover,
            databaseProperties: contentProperties.databaseProperties
          }
        });

        if (!result.success) {
          throw new Error(result.error || 'Échec de l\'envoi');
        }
      }

      showNotification(
        multiSelectMode
          ? `Contenu envoyé vers ${targetPages.length} pages`
          : 'Contenu envoyé avec succès',
        'success'
      );

      await clearClipboard();
      setEditedClipboard(null);
      setSelectedPage(null);
      setSelectedPages([]);
      setMultiSelectMode(false);

      await loadPages(true);
    } catch (error) {
      console.error('Erreur envoi:', error);
      showNotification(`Erreur: ${error.message}`, 'error');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [
    selectedPage,
    selectedPages,
    multiSelectMode,
    clipboard,
    editedClipboard,
    contentProperties,
    sending,
    showNotification,
    clearClipboard,
    setEditedClipboard,
    loadPages
  ]);

  const handlePageSelect = useCallback((page) => {
    if (multiSelectMode) {
      setSelectedPages(prev =>
        prev.includes(page.id)
          ? prev.filter(id => id !== page.id)
          : [...prev, page.id]
      );
    } else {
      setSelectedPage(page);
      setSelectedPages([]);
    }
  }, [multiSelectMode]);

  const handleDeselectPage = useCallback((pageId) => {
    setSelectedPages(prev => prev.filter(id => id !== pageId));
  }, []);

  const handleToggleMultiSelect = useCallback(() => {
    setMultiSelectMode(prev => !prev);
    setSelectedPages([]);
    setSelectedPage(null);
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedPages([]);
    if (!multiSelectMode) {
      setSelectedPage(null);
    }
  }, [multiSelectMode]);

  const canSend = useMemo(() => {
    const hasContent = !!(editedClipboard || clipboard)?.text;
    const hasSelection = multiSelectMode
      ? selectedPages.length > 0
      : !!selectedPage;
    return hasContent && hasSelection && !sending;
  }, [clipboard, editedClipboard, multiSelectMode, selectedPages, selectedPage, sending]);

  // ============================================
  // EFFECTS
  // ============================================

  // Initialisation - ✅ SANS BOUCLE INFINIE
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        
        // Charger la config
        const loadedConfig = await loadConfig();
        
        // Vérifier si l'onboarding est nécessaire
        const needsOnboarding = !loadedConfig.notionToken || !loadedConfig.onboardingCompleted;
        
        if (needsOnboarding) {
          setShowOnboarding(true);
          setOnboardingCompleted(false);
        } else {
          setOnboardingCompleted(true);
          await loadPages();
        }
        
        // Charger le presse-papiers UNE SEULE FOIS
        await loadClipboard();
      } catch (error) {
        console.error('Erreur initialisation:', error);
        showNotification('Erreur lors du chargement de l\'application', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    initializeApp();
    // ✅ eslint-disable-next-line car on veut charger UNE SEULE FOIS au mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ DÉPENDANCES VIDES = exécute UNE SEULE FOIS

  // Écouter les changements du clipboard via IPC - ✅ MAINTENANT STABLE
  useEffect(() => {
    if (window.electronAPI?.on) {
      const handleClipboardChange = (newContent) => {
        loadClipboard();
      };
      
      window.electronAPI.on('clipboard:changed', handleClipboardChange);
      
      return () => {
        if (window.electronAPI?.removeAllListeners) {
          window.electronAPI.removeAllListeners('clipboard:changed');
        }
      };
    }
  }, [loadClipboard]); // ✅ loadClipboard est maintenant stable grâce à useCallback

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      const activeElement = document.activeElement;
      const isInInput = activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true';

      if (e.key === 'Enter' && !e.shiftKey && !showConfig && !isEditingText) {
        if (!isInInput && canSend) {
          e.preventDefault();
          handleSend();
        }
      }

      if (e.key === 'Escape') {
        if (showConfig) {
          setShowConfig(false);
        } else if (multiSelectMode) {
          setMultiSelectMode(false);
          setSelectedPages([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showConfig, isEditingText, canSend, handleSend, multiSelectMode]);

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
          onComplete={async (data) => {
            await updateConfig({
              notionToken: data.token,
              previewPageId: data.previewPageId,
              onboardingCompleted: true
            });
            await window.electronAPI.completeOnboarding();
            setShowOnboarding(false);
            setOnboardingCompleted(true);
            await loadPages();
          }}
          onSkip={async () => {
            setShowOnboarding(false);
            setOnboardingCompleted(true);
          }}
          validateToken={validateNotionToken}
        />
      </Layout>
    );
  }

  // Main app
  return (
    <Layout>
      {/* Header */}
      <Header
        onOpenConfig={() => setShowConfig(true)}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        hasConfigIssue={!config.notionToken}
        hasNewPages={false}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <Sidebar isOpen={!sidebarCollapsed}>
              <MemoizedPageList
                filteredPages={filteredPages}
                selectedPage={selectedPage}
                selectedPages={selectedPages}
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
            </Sidebar>
          )}
        </AnimatePresence>

        {/* Content area */}
        <ContentArea>
          <MemoizedContentEditor
            clipboard={clipboard}
            editedClipboard={editedClipboard}
            onEditContent={setEditedClipboard}
            onClearClipboard={clearClipboard}
            selectedPage={selectedPage}
            selectedPages={selectedPages}
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
            onUpdateConfig={updateConfig}
            onSave={updateConfig}
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