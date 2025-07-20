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
import BackendDisconnected from './components/BackendDisconnected';
import { CLIPBOARD_CHECK_INTERVAL } from './utils/constants';

// Hooks
import { useNotifications } from './hooks/useNotifications';
import { usePages } from './hooks/usePages';
import { useClipboard } from './hooks/useClipboard';
import { useConfig } from './hooks/useConfig';
import { useSuggestions } from './hooks/useSuggestions';
import { useBackendConnection } from './hooks/useBackendConnection';
import api from "./services/api";

const API_URL = 'http://localhost:5000/api';

// Mémoriser les composants lourds
const MemoizedPageList = memo(PageList);
const MemoizedContentEditor = memo(ContentEditor);

function App() {
  // TOUS les hooks ici, AVANT tout if/return :
  // useState, useEffect, useCallback, useMemo, useRef, etc.
  // (ne rien déclarer après un return ou dans un bloc conditionnel)
  // (aucun hook plus bas dans le composant)
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
  const [activeTab, setActiveTab] = useState('suggested');
  const [backendRetrying, setBackendRetrying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);

  // Hooks personnalisés
  const { config, updateConfig, loadConfig, validateNotionToken } = useConfig();
  const { notifications, showNotification, closeNotification } = useNotifications();
  const { clipboard, editedClipboard, setEditedClipboard, loadClipboard, clearClipboard } = useClipboard();
  // Ajout de sendingRef pour la protection anti-spam
  const sendingRef = useRef(false);
  // Nouvelle signature pour usePages : on passe editedClipboard
  const { pages, filteredPages, searchQuery, setSearchQuery, activeTab: pagesActiveTab, setActiveTab: setPagesActiveTab, pagesLoading, loadPages, favorites, toggleFavorite } = usePages(
    'suggested',
    clipboard?.content || '',
    editedClipboard?.content || ''
  );
  const { getSuggestions } = useSuggestions();
  const { isConnected: isBackendConnected, isConnecting: isBackendConnecting, error: backendError, retryCount, retry: retryBackendConnection } = useBackendConnection();

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
    } catch (error) {
    }
  }, []);

  // Initialisation SEULEMENT après connexion au backend
  useEffect(() => {
    const initApp = async () => {
      try {
        await loadConfig();
        // Vérifier si l'onboarding est complété
        const health = await api.checkHealth();
        if (health.isHealthy) {
          setFirstRun(health.firstRun || false);
          setOnboardingCompleted(health.onboardingCompleted || false);
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
    });
    return () => controller.abort();
  }, [isBackendConnected, config.notionToken]);

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
  const canSend = useCallback(() => {
    const hasTarget = multiSelectMode
      ? selectedPages.length > 0
      : selectedPage !== null;
    const hasContent = (editedClipboard || clipboard)?.content;
    
    // Si multi-sélection, vérifier la compatibilité
    if (multiSelectMode && selectedPages.length > 1) {
      // Vérifier si toutes les pages sont du même type
      const pageInfos = selectedPages.map(pageId => {
        const page = pages.find(p => p.id === pageId);
        return {
          id: pageId,
          isDatabase: page?.parent?.type === 'database_id',
          databaseId: page?.parent?.database_id
        };
      });
      
      const hasSimplePages = pageInfos.some(p => !p.isDatabase);
      const hasDatabasePages = pageInfos.some(p => p.isDatabase);
      
      // Bloquer si types mixtes (pages simples + pages DB)
      if (hasSimplePages && hasDatabasePages) {
        return false;
      }
      
      // Si toutes sont des pages DB, vérifier qu'elles sont de la même DB
      if (hasDatabasePages) {
        const databaseIds = new Set(pageInfos.filter(p => p.isDatabase).map(p => p.databaseId));
        if (databaseIds.size > 1) {
          return false;
        }
      }
    }
    
    return hasTarget && hasContent && !sending;
  }, [multiSelectMode, selectedPages, selectedPage, clipboard, editedClipboard, sending, pages]);

  const contentPropertiesValue = useMemo(() => ({
    ...contentProperties,
    parseAsMarkdown: contentProperties.parseAsMarkdown ?? true,
    contentType: contentProperties.contentType || 'text'
  }), [contentProperties]);

  // Callbacks mémorisés
  const handleSend = useCallback(async () => {
    // Protection contre le double-clic
    if (!canSend || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const content = editedClipboard || clipboard;
    try {
      if (multiSelectMode && selectedPages.length > 1) {
        const pageInfos = await Promise.all(
          selectedPages.map(async (pageId) => {
            try {
              const response = await axios.get(`${API_URL}/pages/${pageId}/type-info`);
              return { pageId, ...response.data };
            } catch (error) {
              return { pageId, type: 'unknown', error: true };
            }
          })
        );
        const databaseIds = new Set();
        let hasSimplePages = false;
        let hasDatabasePages = false;
        pageInfos.forEach(info => {
          if (info.type === 'database_item') {
            hasDatabasePages = true;
            databaseIds.add(info.database_id);
          } else {
            hasSimplePages = true;
          }
        });
        if (hasSimplePages && hasDatabasePages) {
          showNotification(
            'Pages mixtes détectées. Les propriétés de DB ne s\'appliqueront qu\'aux pages de bases de données.',
            'warning'
          );
        } else if (databaseIds.size > 1) {
          showNotification(
            `${databaseIds.size} bases de données différentes. Les propriétés ne s\'appliqueront que si elles existent dans chaque base.`,
            'warning'
          );
        }
      }
      const payload = {
        content: content.content,
        contentType: contentProperties.contentType || 'text',
        parseAsMarkdown: true,
        properties: contentProperties.databaseProperties || {},
        pageProperties: {},
        ...(multiSelectMode
          ? { pageIds: selectedPages.map(p => typeof p === 'string' ? p : p.id) }
          : { pageId: selectedPage.id })
      };
      if (contentProperties.icon) {
        payload.pageProperties.icon = contentProperties.icon;
      }
      if (contentProperties.cover) {
        payload.pageProperties.cover = contentProperties.cover;
      }
      const response = await axios.post(`${API_URL}/send`, payload, {
        headers: { 'X-Notion-Token': config.notionToken }
      });
      if (response.data.success) {
        showNotification(
          multiSelectMode
            ? `Envoyé vers ${selectedPages.length} pages avec succès !`
            : 'Envoyé avec succès !',
          'success'
        );
        setEditedClipboard(null);
        loadClipboard();
      }
    } catch (error) {
      console.error('Erreur envoi:', error);
      showNotification(
        error.response?.data?.error || 'Erreur lors de l\'envoi',
        'error'
      );
    } finally {
      setSending(false);
      sendingRef.current = false; // Réinitialiser la protection
    }
  }, [canSend, multiSelectMode, selectedPages, selectedPage, clipboard, editedClipboard, contentProperties, config.notionToken, showNotification, loadClipboard, setEditedClipboard]);

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

  const loadSelectedPage = useCallback(() => {
    const saved = localStorage.getItem('lastSelectedPageId');
    if (saved && pages.length > 0) {
      const page = pages.find(p => p.id === saved);
      if (page) {
        setSelectedPage(page);
      }
    }
  }, [pages]);

  const checkBackendConnection = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/health`, { timeout: 3000 });
      if (response.data.status === 'healthy') {
        return true;
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }, []);

  const retryBackendConnectionLocal = useCallback(async () => {
    let retries = 0;
    const maxRetries = 5;
    while (retries < maxRetries) {
      const connected = await checkBackendConnection();
      if (connected) return true;
      retries++;
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 10000)));
    }
    return false;
  }, [checkBackendConnection]);

  const handleBackendReconnect = useCallback(async () => {
    setBackendRetrying(true);
    try {
      const connected = await retryBackendConnectionLocal();
      if (connected) {
        await loadPages();
        await loadClipboard();
        showNotification('Reconnexion réussie', 'success');
      } else {
        showNotification('Impossible de se reconnecter au backend', 'error');
      }
    } catch (error) {
      console.error('Erreur reconnexion:', error);
      showNotification('Erreur de reconnexion', 'error');
    } finally {
      setBackendRetrying(false);
    }
  }, [retryBackendConnectionLocal, loadPages, loadClipboard, showNotification]);

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
          // Charger les pages seulement si configuré
          await loadPages();
        }
        // Charger le presse-papiers
        await loadClipboard();
      } catch (error) {
        console.error('Erreur initialisation:', error);
        showNotification('error', 'Erreur lors du chargement de l\'application');
      } finally {
        setLoading(false);
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (pages.length > 0) {
      loadSelectedPage();
    }
  }, [pages, loadSelectedPage]);

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
        if (showConfig) setShowConfig(false);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canSend, handleSend, showConfig, isEditingText]);

  const handleToggleFavorite = useCallback((pageId) => {
    toggleFavorite(pageId);
  }, [toggleFavorite]);

  const handleWindowControl = useCallback(async (action) => {
    if (window.electronAPI && window.electronAPI[action]) {
      try {
        await window.electronAPI[action]();
      } catch (error) {
        console.error(`Erreur contrôle fenêtre ${action}:`, error);
      }
    }
  }, []);

  // Place ce bloc AVANT tout if/return :
  const showOnboardingTest = useCallback(() => {
    setShowOnboarding(true);
    setOnboardingCompleted(false);
    setSidebarCollapsed(false);
  }, []);

  const handleComplete = useCallback(async () => {
    setShowOnboarding(false);
    setOnboardingCompleted(true);
    // Réinitialiser les favoris de manière sûre
    const storedFavorites = localStorage.getItem('favorites');
    if (!storedFavorites || !Array.isArray(JSON.parse(storedFavorites))) {
      localStorage.setItem('favorites', JSON.stringify([]));
    }
    // Charger les pages après onboarding
    await loadPages();
  }, [loadPages]);

  // CONDITIONS DE RENDU APRÈS TOUS LES HOOKS :
  if (showOnboarding && !onboardingCompleted) {
    return (
      <Onboarding
        onComplete={handleComplete}
        onSaveConfig={updateConfig}
      />
    );
  }

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

  if (!isBackendConnected) {
    return (
      <BackendDisconnected 
        onRetry={handleBackendReconnect}
        retrying={backendRetrying}
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
      showPreview={showPreview}
      onTogglePreview={() => setShowPreview(!showPreview)}
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
              activeTab={pagesActiveTab}
              onPageSelect={handlePageSelect}
              onToggleFavorite={handleToggleFavorite}
              onSearchChange={setSearchQuery}
              onTabChange={setPagesActiveTab}
              loading={pagesLoading}
              onDeselectAll={handleDeselectAll}
              clipboard={clipboard}
              onRequestSuggestions={async () => {
                if (pagesActiveTab === 'suggested' && clipboard?.content) {
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
          showPreview={showPreview}
          config={config}
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