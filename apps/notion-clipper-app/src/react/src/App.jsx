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
    loading: configLoading,
    error: configError,
    updateConfig,
    validateToken
  } = useConfig(
    useCallback(async (updates) => {
      if (window.electronAPI?.updateConfig) {
        const result = await window.electronAPI.updateConfig(updates);
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
      if (window.electronAPI?.validateToken) {
        const result = await window.electronAPI.validateToken(token);
        return result.valid;
      }
      return false;
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

  // Initialisation - attendre que la config soit chargée
  useEffect(() => {
    if (config !== null) {
      initializeApp();
    }
  }, [config]);

  // Charger le clipboard au démarrage
  useEffect(() => {
    loadClipboard();
  }, [loadClipboard]);

  async function initializeApp() {
    try {
      setLoading(true);

      // ✅ CORRECTION: Vérifier AUSSI onboardingCompleted
      if (!config?.notionToken || config?.onboardingCompleted !== true) {
        setShowOnboarding(true);
        setLoading(false);
        return;
      }

      setOnboardingCompleted(true);
      await loadPages(false);
    } catch (error) {
      console.error('Initialization error:', error);
      showNotification('Erreur d\'initialisation', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ✅ NOUVELLE APPROCHE: Écouter les changements du clipboard sans condition
  useEffect(() => {
    if (!window.electronAPI?.on) return;

    const handleClipboardChange = (event, data) => {
      console.log('[CLIPBOARD] 📋 Changed:', data);
      console.log('[CLIPBOARD] 🔍 Current hasUserEditedContent ref:', hasUserEditedContentRef.current);
      
      // ✅ TOUJOURS traiter les changements du clipboard
      // La protection se fait au niveau de l'affichage, pas ici
      console.log('[CLIPBOARD] ✅ Processing clipboard change (protection handled in UI)');
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
    // ✅ Ignorer si c'est une mise à jour système
    if (ignoreNextEditRef.current) {
      console.log('[CLIPBOARD] 🤖 Ignoring system-triggered edit');
      ignoreNextEditRef.current = false;
      return;
    }
    
    console.log('[CLIPBOARD] ✏️ Real user edited content');
    setEditedClipboard(newContent);
    setHasUserEditedContent(true);
    hasUserEditedContentRef.current = true;
  }, []);

  // ✅ PROTECTION SYSTÈME: Fonction pour reprendre la surveillance du clipboard
  const resumeClipboardWatching = useCallback(async () => {
    console.log('[CLIPBOARD] 🔄 Resuming clipboard watching');
    
    // ✅ 1. Activer la protection contre les événements système
    ignoreNextEditRef.current = true;
    
    // ✅ 2. Remettre les flags à false
    setHasUserEditedContent(false);
    hasUserEditedContentRef.current = false;
    
    // ✅ 3. Effacer le contenu édité (cela va déclencher onChange mais sera ignoré)
    setEditedClipboard(null);
    
    // ✅ 4. Forcer le rechargement du clipboard
    await loadClipboard();
    
    // ✅ 5. Sécurité: remettre le flag à false après un délai
    setTimeout(() => {
      ignoreNextEditRef.current = false;
    }, 200);
    
    console.log('[CLIPBOARD] ✅ Clipboard watching resumed and content refreshed');
  }, [loadClipboard, setEditedClipboard]);

  // Réinitialiser aussi lors du clear
  const handleClearClipboard = useCallback(async () => {
    clearClipboard();
    await resumeClipboardWatching(); // ✅ Reprendre la surveillance après clear
  }, [clearClipboard, resumeClipboardWatching]);

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
    if (!clipboard || sending) return;

    const targetPages = multiSelectMode
      ? selectedPages.map(id => pages.find(p => p.id === id)).filter(Boolean)
      : selectedPage ? [selectedPage] : [];

    if (targetPages.length === 0) {
      showNotification('Veuillez sélectionner au moins une page de destination', 'error');
      return;
    }

    try {
      setSending(true);
      setSendingProgress({ current: 0, total: targetPages.length });

      for (let i = 0; i < targetPages.length; i++) {
        const page = targetPages[i];

        if (window.electronAPI?.sendToNotion) {
          // ✅ CORRECTION: Utiliser le contenu approprié (édité ou original)
          const contentToSend = editedClipboard || clipboard?.text || clipboard?.content || clipboard?.data || '';
          
          const result = await window.electronAPI.sendToNotion({
            pageId: page.id,
            content: contentToSend,
            contentType: contentProperties.contentType,
            parseAsMarkdown: contentProperties.parseAsMarkdown,
            images: clipboard.images || []
          });

          if (!result.success) {
            throw new Error(result.error || 'Erreur d\'envoi');
          }
        }

        setSendingProgress({ current: i + 1, total: targetPages.length });
      }

      showNotification(`Contenu envoyé vers ${targetPages.length} page(s)`, 'success');

      clearClipboard();
      await resumeClipboardWatching(); // ✅ Reprendre la surveillance après envoi réussi

      if (multiSelectMode) {
        setSelectedPages([]);
      }
    } catch (error) {
      console.error('Send error:', error);
      showNotification(error.message || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
      setSendingProgress({ current: 0, total: 0 });
    }
  }, [clipboard, editedClipboard, selectedPage, selectedPages, multiSelectMode, contentProperties, pages, sending, showNotification, clearClipboard]);

  const canSend = useMemo(() => {
    const hasContent = clipboard && (clipboard.text || clipboard.html || clipboard.images?.length > 0);
    const hasDestination = multiSelectMode ? selectedPages.length > 0 : selectedPage !== null;
    return hasContent && hasDestination && !sending;
  }, [clipboard, selectedPage, selectedPages, multiSelectMode, sending]);

  const handleCompleteOnboarding = useCallback(async (token) => {
    try {
      console.log('[ONBOARDING] Completing onboarding...');

      // ✅ Marquer explicitement l'onboarding comme complété
      await updateConfig({
        ...config,
        notionToken: token,
        onboardingCompleted: true // ✅ IMPORTANT
      });

      setShowOnboarding(false);
      setOnboardingCompleted(true);
      await loadPages(true);

      showNotification('Configuration terminée !', 'success');
    } catch (error) {
      console.error('[ONBOARDING] Error:', error);
      showNotification('Erreur lors de la configuration', 'error');
    }
  }, [config, updateConfig, loadPages, showNotification]);

  const handleUpdateProperties = useCallback((properties) => {
    setContentProperties(prev => ({ ...prev, ...properties }));
  }, []);

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
                validateNotionToken={validateToken}
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
            onValidateToken={validateToken}
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
              validateNotionToken={validateToken}
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