// src/react/src/App.jsx
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Header from './components/layout/Header';
import PageList from './components/pages/PageList';
import ContentEditor from './components/editor/ContentEditor';
import ConfigPanel from './components/settings/ConfigPanel';
import OnBoarding from './OnBoarding';
import Notification from './components/common/Notification';
import LoadingSpinner from './components/common/LoadingSpinner';

import { usePages, usePageSelection } from './hooks/usePages';
import { useClipboard } from './hooks/useClipboard';
import { useConfig } from './hooks/useConfig';

import contentService from './services/content';
import configService from './services/config';

function AppContent() {
  const {
    isOnline,
    isBackendConnected,
    notification,
    showNotification,
    hideNotification
  } = useApp();

  const [showConfig, setShowConfig] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sending, setSending] = useState(false);
  const [metadata, setMetadata] = useState({});
  const [activeTab, setActiveTab] = useState('suggested');
  const [selectedPage, setSelectedPage] = useState(null);

  const { config, loading: configLoading, checkFirstRun } = useConfig();
  const {
    pages,
    filteredPages,
    favoritePages,
    searchQuery,
    setSearchQuery,
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
    clearSelection
  } = usePageSelection();
  const {
    content,
    editedContent,
    contentType,
    setEditedContent,
    setContentType,
    getFinalContent
  } = useClipboard(true);

  useEffect(() => {
    const init = async () => {
      if (await checkFirstRun()) {
        setShowOnboarding(true);
      }
    };
    init();
  }, []);

  const handlePageSelect = (page) => {
    if (multiSelectMode) {
      toggleSelection(page.id);
    } else {
      setSelectedPage(page);
      addToRecent(page.id);
    }
  };

  const handleSend = async () => {
    if (!editedContent) return;
    setSending(true);
    try {
      const finalContent = getFinalContent();
      if (multiSelectMode && selectedPages.length > 0) {
        await contentService.sendToMultiplePages(
          selectedPages,
          finalContent,
          { contentType, ...metadata }
        );
      } else if (selectedPage) {
        await contentService.sendContent({
          pageId: selectedPage.id,
          content: finalContent,
          contentType,
          ...metadata
        });
      }
      showNotification('Contenu envoyé avec succès', 'success');
      setEditedContent('');
      setMetadata({});
    } catch (error) {
      showNotification(error.message || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSaveConfig = async (cfg) => {
    await configService.updateConfig(cfg);
    await refreshPages();
  };

  if (showOnboarding) {
    return (
      <OnBoarding
        onComplete={async () => {
          console.log('onComplete appelé');
          setShowOnboarding(false);
          await refreshPages();
        }}
        onSaveConfig={handleSaveConfig}
      />
    );
  }

  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <Header
        isOnline={isOnline}
        isBackendConnected={isBackendConnected}
        onMinimize={() => window.electronAPI?.minimize()}
        onMaximize={() => window.electronAPI?.maximize()}
        onClose={() => window.electronAPI?.close()}
      />
      <div className="flex flex-1 min-h-0">
        <div className="w-80 border-r border-notion-gray-200">
          <PageList
            pages={filteredPages}
            selectedPage={selectedPage}
            selectedPages={selectedPages}
            multiSelectMode={multiSelectMode}
            favorites={favoritePages.map(p => p.id)}
            searchQuery={searchQuery}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onPageSelect={handlePageSelect}
            onPageToggle={(page) => toggleSelection(page.id)}
            onToggleFavorite={(id) => toggleFavorite(id)}
            onSearchChange={setSearchQuery}
            onRefresh={refreshPages}
            loading={pagesLoading}
            error={pagesError}
          />
        </div>
        <div className="flex-1">
          <ContentEditor
            clipboard={content}
            editedClipboard={editedContent ? { content: editedContent } : null}
            setEditedClipboard={(c) => setEditedContent(c?.content || '')}
            selectedPage={selectedPage}
            selectedPages={selectedPages}
            multiSelectMode={multiSelectMode}
            sending={sending}
            onSend={handleSend}
            showNotification={showNotification}
            contentType={contentType}
            setContentType={setContentType}
            notionProperties={metadata}
            setNotionProperties={setMetadata}
            getCurrentClipboard={() => ({ content: editedContent || content?.content })}
            clearClipboard={() => setEditedContent('')}
            config={config}
          />
        </div>
      </div>

      {showConfig && (
        <ConfigPanel
          isOpen={showConfig}
          onClose={() => setShowConfig(false)}
          onConfigUpdate={refreshPages}
          config={config}
          showNotification={showNotification}
        />
      )}

      {notification && <Notification notification={notification} />}
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