// src/react/src/App.jsx
import React, { useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

// Contexts
import { AppProvider, useApp } from './contexts/AppContext';

// Components
import Header from './components/layout/Header';
import PageList from './components/pages/PageList';
import ContentEditor from './components/editor/ContentEditor';
import ConfigPanel from './components/settings/ConfigPanel';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import Notification from './components/common/Notification';
import LoadingSpinner from './components/common/LoadingSpinner';

// Hooks
import { usePages, usePageSelection } from './hooks/usePages';
import { useClipboard } from './hooks/useClipboard';
import { useConfig } from './hooks/useConfig';

// Services
import contentService from './services/content';
import configService from './services/config';

function AppContent() {
  const { 
    isOnline, 
    isBackendConnected, 
    isDarkMode, 
    notification,
    toggleTheme,
    showNotification,
    hideNotification,
    openExternalLink,
    refreshApp
  } = useApp();

  // États
  const [showConfig, setShowConfig] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sending, setSending] = useState(false);
  const [metadata, setMetadata] = useState({});
  const [activeTab, setActiveTab] = useState('SUGGESTED'); // Ajout de l'état pour l'onglet actif

  // Hooks personnalisés
  const { config, loading: configLoading, checkFirstRun } = useConfig();
  const {
    pages,
    filteredPages,
    favoritePages,
    suggestedPages,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    loading: pagesLoading,
    error: pagesError,
    refreshPages,
    toggleFavorite,
    addToRecent
  } = usePages();
  
  const {
    selectedPages,
    selectedCount,
    multiSelectMode,
    setMultiSelectMode,
    toggleSelection,
    clearSelection,
    isSelected
  } = usePageSelection();

  const {
    content: clipboardContent,
    editedContent,
    contentType,
    setEditedContent,
    setContentType,
    hasChanges,
    getFinalContent
  } = useClipboard(true);

  // Page sélectionnée
  const [selectedPage, setSelectedPage] = useState(null);

  // Vérifier le premier lancement
  useEffect(() => {
    const init = async () => {
      const firstRun = await checkFirstRun();
      if (firstRun) {
        setShowOnboarding(true);
      }
    };
    init();
  }, []);

  // Gérer la sélection de page
  const handlePageSelect = (page) => {
    if (multiSelectMode) {
      toggleSelection(page.id);
    } else {
      setSelectedPage(page);
      addToRecent(page.id);
    }
  };

  // Envoyer le contenu
  const handleSend = async (data) => {
    setSending(true);
    
    try {
      const content = getFinalContent();
      
      if (multiSelectMode && selectedPages.length > 0) {
        // Envoi multiple
        const result = await contentService.sendToMultiplePages(
          selectedPages,
          content,
          data
        );
        
        showNotification(
          `Envoyé vers ${result.successful} page(s) avec succès`,
          result.failed > 0 ? 'warning' : 'success'
        );
        
        clearSelection();
        setMultiSelectMode(false);
      } else if (selectedPage) {
        // Envoi simple
        await contentService.sendContent({
          pageId: selectedPage.id,
          content,
          ...data
        });
        
        showNotification('Contenu envoyé avec succès!', 'success');
      }
      
      // Réinitialiser l'éditeur
      setEditedContent('');
      setMetadata({});
      
    } catch (error) {
      showNotification(error.message || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  };

  // Fonction pour sauvegarder la config depuis l'onboarding
  const handleSaveConfig = async (config) => {
    await configService.updateConfig(config);
  };

  // Fonction pour changer d'onglet
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // (optionnel) tu peux filtrer les pages ici selon le tab
  };

  // Raccourcis clavier
  useHotkeys('ctrl+enter, cmd+enter', () => {
    if ((selectedPage || selectedCount > 0) && editedContent) {
      handleSend({ contentType, ...metadata });
    }
  });

  useHotkeys('ctrl+shift+m, cmd+shift+m', () => {
    setMultiSelectMode(!multiSelectMode);
  });

  useHotkeys('ctrl+r, cmd+r', (e) => {
    e.preventDefault();
    refreshPages();
  });

  useHotkeys('escape', () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  });

  // Si onboarding nécessaire
  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={async () => {
          setShowOnboarding(false);
          await refreshPages();
        }}
        onSaveConfig={handleSaveConfig}
      />
    );
  }

  // Si chargement initial
  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-notion-dark">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-notion-dark">
      {/* Header */}
      <Header
        isDarkMode={isDarkMode}
        isOnline={isOnline}
        isBackendConnected={isBackendConnected}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setShowConfig(true)}
        onRefresh={refreshPages}
        onOpenHelp={() => openExternalLink('https://github.com/votre-repo/notion-clipper-pro')}
        isRefreshing={pagesLoading}
      />

      {/* Contenu principal */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - Liste des pages */}
        <div className="w-80 border-r border-notion-gray-200 dark:border-notion-dark-border">
          <PageList
            pages={filteredPages}
            selectedPage={selectedPage}
            selectedPages={selectedPages}
            multiSelectMode={multiSelectMode}
            favorites={favoritePages.map(p => p.id)}
            searchQuery={searchQuery}
            filterType={filterType}
            activeTab={activeTab} // Ajout de la prop activeTab
            onTabChange={handleTabChange} // Ajout de la prop onTabChange
            onPageSelect={handlePageSelect}
            onPageToggle={toggleSelection}
            onToggleFavorite={toggleFavorite}
            onSearchChange={setSearchQuery}
            onFilterChange={setFilterType}
            loading={pagesLoading}
            error={pagesError}
          />
        </div>

        {/* Éditeur de contenu */}
        <div className="flex-1">
          <ContentEditor
            content={clipboardContent?.content}
            editedContent={editedContent}
            contentType={contentType}
            metadata={metadata}
            onContentChange={setEditedContent}
            onContentTypeChange={setContentType}
            onMetadataChange={setMetadata}
            onSend={handleSend}
            sending={sending}
            selectedPage={selectedPage}
            multiSelectMode={multiSelectMode}
            selectedPagesCount={selectedCount}
          />
        </div>
      </div>

      {/* Panneau de configuration */}
      {showConfig && (
        <ConfigPanel
          isOpen={showConfig}
          onClose={() => setShowConfig(false)}
          onConfigUpdate={refreshPages}
        />
      )}

      {/* Notifications */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}