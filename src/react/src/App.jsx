// src/react/src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Components existants
import Onboarding from './OnBoarding';
import Layout from './components/layout/Layout';
import Sidebar from './components/layout/Sidebar';
import ContentArea from './components/layout/ContentArea';
import PageList from './components/pages/PageList';
import ContentEditor from './components/editor/ContentEditor';
import SettingsPanel from './components/settings/ConfigPanel';
import NotificationManager from './components/common/NotificationManager';
import { useNotifications } from './hooks/useNotifications';
import { usePages } from './hooks/usePages';
import { useClipboard } from './hooks/useClipboard';
import { useConfig } from './hooks/useConfig';

const API_URL = 'http://localhost:5000/api';

function App() {
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
  const { pages, filteredPages, searchQuery, setSearchQuery, activeTab, setActiveTab, loadPages, favorites, toggleFavorite } = usePages();
  const { clipboard, editedClipboard, setEditedClipboard, loadClipboard, clearClipboard } = useClipboard();

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
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Initialisation
  useEffect(() => {
    const initialize = async () => {
      try {
        const configData = await loadConfig();
        
        if (!configData.notionToken || !configData.onboardingCompleted) {
          setShowOnboarding(true);
          setOnboardingCompleted(false);
        } else {
          setOnboardingCompleted(true);
          await loadPages();
        }
      } catch (error) {
        console.error('Erreur initialisation:', error);
        setShowOnboarding(true);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (onboardingCompleted && autoRefresh) {
      const clipboardInterval = setInterval(loadClipboard, 2000);
      const pagesInterval = setInterval(loadPages, 30000);
      const healthInterval = setInterval(checkBackendHealth, 20000);

      return () => {
        clearInterval(clipboardInterval);
        clearInterval(pagesInterval);
        clearInterval(healthInterval);
      };
    }
  }, [onboardingCompleted, autoRefresh]);

  // Vérifier la santé du backend
  const checkBackendHealth = async () => {
    try {
      const response = await axios.get(`${API_URL}/health`);
      setIsBackendConnected(response.data.status === 'healthy');
    } catch (error) {
      setIsBackendConnected(false);
    }
  };

  // Gestion de l'envoi
  const handleSend = useCallback(async () => {
    if (!canSend()) return;

    setSending(true);
    const content = editedClipboard || clipboard;

    try {
      const endpoint = multiSelectMode ? '/send-multi' : '/send';
      const payload = {
        content: content.content,
        ...contentProperties,
        ...(multiSelectMode ? { pageIds: selectedPages } : { pageId: selectedPage.id })
      };

      const response = await axios.post(`${API_URL}${endpoint}`, payload, {
        headers: { 'X-Notion-Token': config.notionToken }
      });

      if (response.data.success) {
        showNotification(
          `Contenu envoyé avec succès (${response.data.blocksCount} blocs)`,
          'success'
        );
        
        setEditedClipboard(null);
        setTimeout(loadClipboard, 1000);
      }
    } catch (error) {
      showNotification(error.response?.data?.error || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  }, [clipboard, editedClipboard, contentProperties, multiSelectMode, selectedPages, selectedPage, config]);

  // Vérifier si on peut envoyer
  const canSend = useCallback(() => {
    const hasTarget = multiSelectMode ? selectedPages.length > 0 : selectedPage !== null;
    const hasContent = (editedClipboard || clipboard)?.content;
    return hasTarget && hasContent && !sending;
  }, [multiSelectMode, selectedPages, selectedPage, clipboard, editedClipboard, sending]);

  // Gestion de la sélection de pages
  const handlePageSelect = (page) => {
    if (multiSelectMode) {
      setSelectedPages(prev =>
        prev.includes(page.id)
          ? prev.filter(id => id !== page.id)
          : [...prev, page.id]
      );
    } else {
      setSelectedPage(page);
    }
  };

  // Contrôles de fenêtre
  const handleWindowControl = async (action) => {
    if (window.electronAPI) {
      if (action === 'minimize' && window.electronAPI.minimizeWindow) {
        await window.electronAPI.minimizeWindow();
      } else if (action === 'maximize' && window.electronAPI.maximizeWindow) {
        await window.electronAPI.maximizeWindow();
      } else if (action === 'close' && window.electronAPI.closeWindow) {
        await window.electronAPI.closeWindow();
      }
    }
  };

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
      autoRefresh={autoRefresh}
      onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
      isOnline={isOnline}
      isBackendConnected={isBackendConnected}
    >
      {/* Sidebar avec liste des pages */}
      {!sidebarCollapsed && (
        <Sidebar>
          <PageList
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
            loading={false}
          />
        </Sidebar>
      )}

      {/* Zone de contenu principal */}
      <ContentArea>
        <ContentEditor
          clipboard={clipboard}
          editedClipboard={editedClipboard}
          onEditContent={setEditedClipboard}
          onClearClipboard={clearClipboard}
          selectedPage={selectedPage}
          selectedPages={selectedPages}
          multiSelectMode={multiSelectMode}
          sending={sending}
          onSend={handleSend}
          canSend={canSend()}
          contentProperties={contentProperties}
          onUpdateProperties={setContentProperties}
          config={config}
        />
      </ContentArea>

      {/* Modals */}
      <AnimatePresence>
        {showConfig && (
          <SettingsPanel
            config={config}
            onSave={updateConfig}
            onClose={() => setShowConfig(false)}
            onClearCache={async () => {
              try {
                await axios.post(`${API_URL}/clear-cache`);
                showNotification('Cache vidé avec succès', 'success');
                await loadPages();
              } catch (error) {
                showNotification('Erreur lors du vidage du cache', 'error');
              }
            }}
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