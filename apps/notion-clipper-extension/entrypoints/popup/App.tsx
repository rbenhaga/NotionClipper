import React, { useState, useEffect } from 'react';
import {
  Layout,
  Sidebar,
  ContentArea,
  PageList,
  ContentEditor,
  ConfigPanel,
  useNotifications,
  NotificationManager,
  useConfig,
  useClipboard,
  ClipboardData
} from '@notion-clipper/ui';
import type { NotionPage } from '@notion-clipper/ui';

function App() {
  // États des pages
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<NotionPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<NotionPage | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'suggested' | 'favorites' | 'recent' | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // États UI
  const [showConfig, setShowConfig] = useState(false);
  const [contentProperties, setContentProperties] = useState<any>({
    contentType: 'paragraph',
    parseAsMarkdown: true
  });

  // Hook notifications
  const { notifications, showNotification, closeNotification } = useNotifications();

  // Hook config
  const { config, updateConfig, loadConfig, validateNotionToken } = useConfig(
    async (newConfig) => {
      await chrome.storage.local.set({ clipperConfig: newConfig });
    },
    async () => {
      const result = await chrome.storage.local.get(['clipperConfig']);
      return result.clipperConfig || { notionToken: '', onboardingCompleted: false };
    },
    async (token: string) => {
      const response = await chrome.runtime.sendMessage({
        type: 'VALIDATE_TOKEN',
        token
      });
      return response;
    }
  );

  // Hook clipboard
  const { clipboard, editedClipboard, setEditedClipboard, clearClipboard } = useClipboard(
    async () => {
      const result = await chrome.storage.local.get(['capturedData']);
      if (result.capturedData) {
        return {
          content: result.capturedData.text || result.capturedData.selection || '',
          type: 'text' as const,
          metadata: {
            url: result.capturedData.url,
            title: result.capturedData.title
          }
        };
      }
      return null;
    },
    async () => {
      await chrome.storage.local.remove(['capturedData']);
    }
  );

  // Charger les pages et favoris au montage
  useEffect(() => {
    loadPages();
    loadFavorites();
    loadConfig();
  }, []);

  async function loadPages() {
    console.log('🔄 loadPages START');
    setLoading(true);
    
    try {
      console.log('📡 Sending message to background...');
      
      // Timeout de 5 secondes
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: background script ne répond pas')), 5000)
      );
      
      const messagePromise = chrome.runtime.sendMessage({ type: 'GET_PAGES' });
      
      const response = await Promise.race([messagePromise, timeoutPromise]) as any;
      console.log('📨 Response received:', response);
      
      if (response.success) {
        setPages(response.pages);
        setFilteredPages(response.pages);
        console.log('✅ Pages loaded:', response.pages.length);
      } else if (response.error === 'No token') {
        showNotification('⚠️ Token Notion manquant - Configurez l\'extension', 'error');
        setPages([]);
        setFilteredPages([]);
        console.log('⚠️ No token');
      } else {
        showNotification(response.error || 'Erreur de chargement', 'error');
        console.log('❌ Error:', response.error);
      }
    } catch (error: any) {
      console.error('❌ Exception in loadPages:', error);
      if (error.message.includes('Timeout')) {
        showNotification('⚠️ Background script ne répond pas - Rechargez l\'extension', 'error');
      } else {
        showNotification('Erreur de connexion', 'error');
      }
    } finally {
      console.log('✅ loadPages FINALLY, setting loading to false');
      setLoading(false);
    }
  }

  async function loadFavorites() {
    const result = await chrome.storage.local.get(['favorites']);
    if (result.favorites) {
      setFavorites(result.favorites);
    }
  }

  // Filtrer les pages
  useEffect(() => {
    let filtered = pages;

    // Filtre par recherche
    if (searchQuery) {
      filtered = filtered.filter(page =>
        page.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtre par onglet
    switch (activeTab) {
      case 'favorites':
        filtered = filtered.filter(page => favorites.includes(page.id));
        break;
      case 'recent':
        filtered = [...filtered].sort((a, b) =>
          new Date(b.last_edited_time || 0).getTime() - new Date(a.last_edited_time || 0).getTime()
        );
        break;
    }

    setFilteredPages(filtered);
  }, [searchQuery, pages, activeTab, favorites]);

  const handlePageSelect = (page: NotionPage) => {
    if (multiSelectMode) {
      setSelectedPages(prev =>
        prev.includes(page.id)
          ? prev.filter(id => id !== page.id)
          : [...prev, page.id]
      );
    } else {
      setSelectedPage(page);
      showNotification(`Page sélectionnée: ${page.title}`, 'success');
    }
  };

  const handleToggleFavorite = async (pageId: string) => {
    const newFavorites = favorites.includes(pageId)
      ? favorites.filter(id => id !== pageId)
      : [...favorites, pageId];

    setFavorites(newFavorites);
    await chrome.storage.local.set({ favorites: newFavorites });
    showNotification(
      favorites.includes(pageId) ? 'Retiré des favoris' : 'Ajouté aux favoris',
      'success'
    );
  };

  const handleSend = async () => {
    if (!clipboard) {
      showNotification('Aucun contenu à envoyer', 'error');
      return;
    }

    if (!selectedPage && selectedPages.length === 0) {
      showNotification('Sélectionnez au moins une page', 'error');
      return;
    }

    setSending(true);
    try {
      const targetPageIds = multiSelectMode ? selectedPages : [selectedPage!.id];
      
      for (const pageId of targetPageIds) {
        const response = await chrome.runtime.sendMessage({
          type: 'SEND_TO_NOTION',
          data: {
            pageId,
            content: editedClipboard?.content || clipboard.content,
            properties: contentProperties
          }
        });

        if (!response.success) {
          throw new Error(response.error || 'Erreur d\'envoi');
        }
      }

      showNotification('✅ Contenu envoyé avec succès !', 'success');
      await clearClipboard();
      setSelectedPage(null);
      setSelectedPages([]);
    } catch (error: any) {
      showNotification(`Erreur: ${error.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  const canSend = useMemo(() => {
    const hasTarget = multiSelectMode
      ? selectedPages.length > 0
      : selectedPage !== null;
    const hasContent = !!clipboard?.content;
    return hasTarget && hasContent && !sending;
  }, [multiSelectMode, selectedPages, selectedPage, clipboard, sending]);

  console.log('🎨 RENDER - loading:', loading, 'pages:', pages.length);

  return (
    <>
      <Layout
        loading={loading}
        onSettingsClick={() => setShowConfig(true)}
      >
        <Sidebar>
          <PageList
            filteredPages={filteredPages}
            selectedPage={selectedPage}
            selectedPages={selectedPages}
            multiSelectMode={multiSelectMode}
            favorites={favorites}
            searchQuery={searchQuery}
            activeTab={activeTab}
            onPageSelect={handlePageSelect}
            onToggleFavorite={handleToggleFavorite}
            onSearchChange={setSearchQuery}
            onTabChange={(tab: string) => setActiveTab(tab as 'suggested' | 'favorites' | 'recent' | 'all')}
            loading={loading}
            onDeselectAll={() => setSelectedPages([])}
            onToggleMultiSelect={() => setMultiSelectMode(!multiSelectMode)}
          />
        </Sidebar>

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
            canSend={canSend}
            contentProperties={contentProperties}
            onUpdateProperties={setContentProperties}
            showNotification={showNotification}
            pages={pages}
            onDeselectPage={(pageId) => {
              setSelectedPages(prev => prev.filter(id => id !== pageId));
            }}
          />
        </ContentArea>

        <NotificationManager
          notifications={notifications}
          onClose={closeNotification}
        />
      </Layout>

      {/* ConfigPanel */}
      {showConfig && (
        <ConfigPanel
          isOpen={showConfig}
          onClose={() => setShowConfig(false)}
          onSave={updateConfig}
          config={config}
          showNotification={showNotification}
          validateNotionToken={validateNotionToken}
        />
      )}
    </>
  );
}

export default App;