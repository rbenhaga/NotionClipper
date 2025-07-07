// src/react/src/App.jsx
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
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

  // Ajout de l'effet pour recharger les pages si backend connecté, onboarding terminé et pas loading
  useEffect(() => {
    if (isBackendConnected && onboardingCompleted && !loading) {
      loadPages();
    }
  }, [isBackendConnected, onboardingCompleted, loading]);

  // Hooks personnalisés
  const { config, updateConfig, loadConfig } = useConfig();
  const { notifications, showNotification, closeNotification } = useNotifications();
  const { pages, filteredPages, searchQuery, setSearchQuery, activeTab, setActiveTab, pagesLoading, loadPages, favorites, toggleFavorite } = usePages();
  const { clipboard, editedClipboard, setEditedClipboard, loadClipboard, clearClipboard } = useClipboard();
  const { getSuggestions } = useSuggestions();

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
    if (!isBackendConnected) return;
    
    const initialize = async () => {
      setLoading(true);
      try {
        const cfg = await loadConfig();
        if (!cfg.notionToken || !cfg.onboardingCompleted) {
          setShowOnboarding(true);
          setLoading(false);
          return;
        }

        updateConfig(cfg);
        setOnboardingCompleted(true);
        
        // Chargement initial avec gestion d'erreur
        const results = await Promise.allSettled([
          loadPages(),
          loadClipboard()
        ]);
        
        // Vérifier les erreurs
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Erreur chargement ${index === 0 ? 'pages' : 'clipboard'}:`, result.reason);
          }
        });
        
      } catch (error) {
        console.error('Erreur initialisation:', error);
        showNotification('Erreur lors de l\'initialisation', 'error');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [isBackendConnected]); // Dépendance sur la connexion backend

  // Auto-refresh SEULEMENT si connecté
  useEffect(() => {
    if (!onboardingCompleted || !isBackendConnected) return;
    
    const intervals = {
      clipboard: setInterval(loadClipboard, 2000),
      pages: setInterval(loadPages, 30000)
    };
    
    return () => {
      Object.values(intervals).forEach(clearInterval);
    };
  }, [onboardingCompleted, isBackendConnected]);

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
    // Notification immédiate
    showNotification('Envoi en cours...', 'info');
    const content = editedClipboard || clipboard;

    try {
      const endpoint = multiSelectMode ? '/send-multi' : '/send';
      const payload = {
        content: content.content,
        ...contentPropertiesValue,
        ...(multiSelectMode ? { pageIds: selectedPages } : { pageId: selectedPage.id })
      };

      const response = await axios.post(`${API_URL}${endpoint}`, payload, {
        headers: { 'X-Notion-Token': config.notionToken }
      });

      if (response.data.success) {
        showNotification('Envoyé !', 'success');
        setEditedClipboard(null);
        // Recharger immédiatement le presse-papiers
        loadClipboard();
      }
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  }, [canSend, multiSelectMode, selectedPages, selectedPage, clipboard, editedClipboard, 
      contentPropertiesValue, config.notionToken, showNotification, loadClipboard]);

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
      <Layout loading>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </Layout>
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
      showOnboardingTest={() => setShowOnboarding(true)}
      config={config}
      onUpdateConfig={updateConfig}
      validateNotionToken={validateNotionToken}
      showNotification={showNotification}
    >
      {/* Sidebar avec liste des pages */}
      {!sidebarCollapsed && (
        <Sidebar>
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
          contentProperties={contentPropertiesValue}
          onUpdateProperties={setContentProperties}
          showNotification={showNotification}
        />
      </ContentArea>

      {/* Panneau de configuration */}
      <AnimatePresence>
        {showConfig && (
          <ConfigPanel
            config={config}
            onUpdateConfig={updateConfig}
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