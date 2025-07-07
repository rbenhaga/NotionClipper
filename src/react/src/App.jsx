// src/react/src/App.jsx
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';

// Components
import Onboarding from './OnBoarding';
import Layout from './components/layout/Layout';
import Sidebar from './components/layout/Sidebar';
import ContentArea from './components/layout/ContentArea';
import PageList from './components/pages/PageList';
import ContentEditor from './components/editor/ContentEditor';
import ConfigPanel from './components/panels/ConfigPanel'; // Correction de l'import
import NotificationManager from './components/common/NotificationManager';
import BackendConnectionGuard from './components/BackendConnectionGuard';
import { CLIPBOARD_CHECK_INTERVAL } from './utils/constants';

// Hooks
import { useNotifications } from './hooks/useNotifications';
import { usePages } from './hooks/usePages';
import { useClipboard } from './hooks/useClipboard';
import { useConfig } from './hooks/useConfig';
import { useSuggestions } from './hooks/useSuggestions';
import { useBackendConnection } from './hooks/useBackendConnection';

const API_URL = 'http://localhost:5000/api';

// Mémoriser les composants lourds
const MemoizedPageList = memo(PageList);
const MemoizedContentEditor = memo(ContentEditor);

function App() {
  // Hook de connexion au backend
  const { 
    isConnected: isBackendConnected, 
    isConnecting: isBackendConnecting,
    error: backendError,
    retryCount,
    retry: retryBackendConnection
  } = useBackendConnection();

  // États principaux
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hooks personnalisés
  const { config, updateConfig, loadConfig } = useConfig();
  const { notifications, showNotification, closeNotification } = useNotifications();
  const { pages, filteredPages, searchQuery, setSearchQuery, activeTab, setActiveTab, pagesLoading, loadPages, favorites, toggleFavorite } = usePages();
  const { clipboard, editedClipboard, setEditedClipboard, loadClipboard, clearClipboard } = useClipboard();
  const { getSuggestions } = useSuggestions();

  // Supprimer ce bloc :
  // useEffect(() => {
  //   if (isBackendConnected && onboardingCompleted && !pagesLoading) {
  //     const timer = setTimeout(() => {
  //       loadPages();
  //     }, 300);
  //     return () => clearTimeout(timer);
  //   }
  // }, [isBackendConnected, onboardingCompleted, pagesLoading, loadPages]);

  // États d'envoi
  const [sending, setSending] = useState(false);
  const [contentProperties, setContentProperties] = useState({
    contentType: 'text',
    parseAsMarkdown: true,
    tags: [],
    sourceUrl: '',
    markAsFavorite: false,
    category: '',
    dueDate: '',
    addReminder: false
  });

  // Connectivité
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // const [isBackendConnected, setIsBackendConnected] = useState(false); // This state is now managed by useBackendConnection

  // Référence pour les intervalles
  const intervalsRef = useRef({
    clipboard: null,
    pages: null,
    health: null
  });

  // Mémoriser checkBackendHealth avec useCallback
  const checkBackendHealth = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      // setIsBackendConnected(response.data.status === 'healthy'); // This state is now managed by useBackendConnection
    } catch (error) {
      // setIsBackendConnected(false); // This state is now managed by useBackendConnection
    }
  }, []);

  // Initialisation SEULEMENT après connexion au backend
  useEffect(() => {
    const initApp = async () => {
      try {
        await loadConfig();
        // Vérifier si l'onboarding est complété
        const response = await axios.get(`${API_URL}/health`);
        if (!response.data.firstRun && response.data.onboardingCompleted) {
          setOnboardingCompleted(true);
          await loadPages();
        } else if (response.data.firstRun) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Erreur initialisation:', error);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  // Auto-refresh SEULEMENT si connecté
  useEffect(() => {
    if (!isBackendConnected || !config.notionToken) return;
    
    const controller = new AbortController();
    
    loadPages().then(() => {
      // Ne pas appeler loadClipboard ici car il est déjà appelé via son propre useEffect
    });
    
    return () => controller.abort();
  }, [isBackendConnected, config.notionToken]); // Retirer loadPages et loadClipboard des deps

  // Gestion de la connectivité
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ajouter ce useEffect après l'initialisation :
  useEffect(() => {
    if (!isBackendConnected || !onboardingCompleted) return;
    const interval = setInterval(() => {
      loadClipboard();
    }, CLIPBOARD_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [isBackendConnected, onboardingCompleted, loadClipboard]);

  // Mémorisation des valeurs calculées
  const canSend = useMemo(() => {
    const hasTarget = multiSelectMode ? selectedPages.length > 0 : selectedPage !== null;
    const hasContent = (editedClipboard || clipboard)?.content;
    return hasTarget && hasContent && !sending;
  }, [multiSelectMode, selectedPages, selectedPage, clipboard, editedClipboard, sending]);

  const contentPropertiesValue = useMemo(() => ({
    ...contentProperties,
    parseAsMarkdown: contentProperties.parseAsMarkdown ?? true,
    contentType: contentProperties.contentType || 'text'
  }), [contentProperties]);

  // Callbacks mémorisés
  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    const content = editedClipboard || clipboard;
    // Notification adaptée au mode
    const sendingMessage = multiSelectMode 
      ? `Envoi vers ${selectedPages.length} pages...` 
      : 'Envoi en cours...';
    showNotification(sendingMessage, 'info');
    try {
      const payload = {
        content: content.content,
        contentType: contentPropertiesValue.contentType || 'text',
        parseAsMarkdown: contentPropertiesValue.parseAsMarkdown || true,
        ...(multiSelectMode
          ? { pageIds: selectedPages.map(p => typeof p === 'string' ? p : p.id) }
          : { pageId: selectedPage.id })
      };
      const endpoint = multiSelectMode ? '/send-multiple' : '/send';
      const response = await axios.post(`${API_URL}${endpoint}`, payload, {
        headers: { 'X-Notion-Token': config.notionToken }
      });
      if (response.data.success) {
        const successMessage = multiSelectMode
          ? `Envoyé vers ${response.data.successCount || selectedPages.length} pages avec succès !`
          : 'Envoyé avec succès !';
        showNotification(successMessage, 'success');
        // Si certains envois ont échoué en multi
        if (multiSelectMode && response.data.failedCount > 0) {
          setTimeout(() => {
            showNotification(
              `${response.data.failedCount} envoi(s) ont échoué`, 
              'warning'
            );
          }, 2000);
        }
        setEditedClipboard(null);
        loadClipboard();
      }
    } catch (error) {
      const errorMessage = multiSelectMode
        ? 'Erreur lors de l\'envoi multiple'
        : 'Erreur lors de l\'envoi';
      showNotification(
        error.response?.data?.error || errorMessage, 
        'error'
      );
    } finally {
      setSending(false);
    }
  }, [canSend, multiSelectMode, selectedPages, selectedPage, clipboard, 
      editedClipboard, contentPropertiesValue, config.notionToken, 
      showNotification, loadClipboard]);

  const handlePageSelect = useCallback((page) => {
    if (multiSelectMode) {
      setSelectedPages(prev =>
        prev.includes(page.id)
          ? prev.filter(id => id !== page.id)
          : [...prev, page.id]
      );
    } else {
      setSelectedPage(page);
      localStorage.setItem('lastSelectedPageId', page.id);
    }
  }, [multiSelectMode]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPages([]);
  }, []);

  const handleWindowControl = useCallback(async (action) => {
    if (window.electronAPI && window.electronAPI[action]) {
      try {
        await window.electronAPI[action]();
      } catch (error) {
        console.error(`Erreur contrôle fenêtre ${action}:`, error);
      }
    }
  }, []);

  const validateNotionToken = useCallback(async (token) => {
    try {
      const response = await axios.post(`${API_URL}/verify-token`, { token });
      return response.data.valid;
    } catch (error) {
      return false;
    }
  }, []);

  const showOnboardingTest = useCallback(() => {
    setShowOnboarding(true);
    setOnboardingCompleted(false);
    setSidebarCollapsed(false); // Ouvrir le sidebar
  }, []);

  // Si onboarding nécessaire
  if (showOnboarding && !onboardingCompleted) {
    return (
      <Onboarding
        onComplete={async () => {
          setShowOnboarding(false);
          setOnboardingCompleted(true);
          await loadPages();
        }}
        onSaveConfig={updateConfig}
      />
    );
  }

  // État de chargement
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen bg-notion-gray-50"
      >
        <Layout loading>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          </div>
        </Layout>
      </motion.div>
    );
  }

  // Garde de connexion au backend
  if (!isBackendConnected) {
    return (
      <BackendConnectionGuard
        isConnected={isBackendConnected}
        isConnecting={isBackendConnecting}
        error={backendError}
        retryCount={retryCount}
        onRetry={retryBackendConnection}
      />
    );
  }

  return (
    <Layout
      onWindowControl={handleWindowControl}
      onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      onToggleMultiSelect={() => {
        setMultiSelectMode(!multiSelectMode);
        setSelectedPages([]);
      }}
      onOpenConfig={() => setShowConfig(true)}
      multiSelectMode={multiSelectMode}
      sidebarCollapsed={sidebarCollapsed}
      isOnline={isOnline}
      isBackendConnected={isBackendConnected}
      showOnboardingTest={showOnboardingTest}
      config={config}
      onUpdateConfig={updateConfig}
      validateNotionToken={validateNotionToken}
      showNotification={showNotification}
    >
      {/* Sidebar avec liste des pages */}
      <AnimatePresence mode="wait">
        {!sidebarCollapsed && (
          <Sidebar isOpen={!sidebarCollapsed}>
            <MemoizedPageList
              pages={pages}
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
              onTabChange={setActiveTab}
              loading={pagesLoading}
              onDeselectAll={handleDeselectAll}
              clipboard={clipboard}
              onRequestSuggestions={async () => {
                if (activeTab === 'suggested' && clipboard?.content) {
                  const suggestions = await getSuggestions(
                    clipboard.content,
                    pages,
                    favorites
                  );
                  setFilteredPages(suggestions);
                }
              }}
            />
          </Sidebar>
        )}
      </AnimatePresence>

      {/* Zone de contenu principal */}
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
          pages={pages} // passage de la prop pages
        />
      </ContentArea>

      {/* Panneau de configuration */}
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