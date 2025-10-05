import React, { useState, useEffect, useMemo } from 'react';
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
  // ============================================
  // ÉTATS DES PAGES
  // ============================================
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<NotionPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<NotionPage | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'suggested' | 'favorites' | 'recent' | 'all'>('all');

  // ============================================
  // ÉTATS UI
  // ============================================
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasNewPages, setHasNewPages] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | undefined>(undefined);

  // ============================================
  // ÉTATS CONTENU
  // ============================================
  const [contentProperties, setContentProperties] = useState<any>({
    contentType: 'paragraph',
    parseAsMarkdown: true
  });

  // ============================================
  // HOOKS
  // ============================================
  const { notifications, showNotification, closeNotification } = useNotifications();
  const { config, updateConfig, loadConfig, validateNotionToken } = useConfig(
    async (newConfig) => {
      await chrome.storage.local.set({ clipperConfig: newConfig });
    },
    async () => {
      const result = await chrome.storage.local.get(['clipperConfig']);
      return result.clipperConfig || { notionToken: '', onboardingCompleted: false };
    },
    async (token: string) => {
      // Validation via Notion API
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28'
        }
      });
      return { success: response.ok, error: response.ok ? undefined : 'Token invalide' };
    }
  );

  const { clipboard, editedClipboard, setEditedClipboard, clearClipboard } = useClipboard(
    async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const result = await chrome.tabs.sendMessage(tab.id!, { action: 'getClipboard' });
        return result?.clipboard || null;
      } catch (error) {
        console.error('Error getting clipboard:', error);
        return null;
      }
    }
  );

  // ============================================
  // LIFECYCLE
  // ============================================
  useEffect(() => {
    loadConfig();
    loadPages();
    loadFavorites();
  }, []);

  useEffect(() => {
    filterPages();
  }, [pages, searchQuery, activeTab, favorites]);

  // ============================================
  // FONCTIONS
  // ============================================
  const loadPages = async () => {
    if (!config.notionToken) return;
    
    setLoading(true);
    setLoadingProgress({ current: 0, total: 100, message: 'Chargement des pages...' });
    
    try {
      const response = await fetch('https://api.notion.com/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter: { property: 'object', value: 'page' },
          sort: { direction: 'descending', timestamp: 'last_edited_time' }
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des pages');
      }

      const data = await response.json();
      const notionPages: NotionPage[] = data.results.map((page: any) => ({
        id: page.id,
        title: page.properties?.title?.title?.[0]?.plain_text || 
               page.properties?.Name?.title?.[0]?.plain_text || 
               'Sans titre',
        icon: page.icon,
        parent: page.parent,
        url: page.url,
        lastEdited: page.last_edited_time,
        object: page.object
      }));

      setPages(notionPages);
      setHasNewPages(true);
      setTimeout(() => setHasNewPages(false), 3000);
    } catch (error) {
      console.error('Error loading pages:', error);
      showNotification('Erreur lors du chargement des pages', 'error');
    } finally {
      setLoading(false);
      setLoadingProgress(undefined);
    }
  };

  const loadFavorites = async () => {
    const result = await chrome.storage.local.get(['favorites']);
    setFavorites(result.favorites || []);
  };

  const filterPages = () => {
    let filtered = [...pages];

    if (searchQuery) {
      filtered = filtered.filter(page =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (activeTab) {
      case 'favorites':
        filtered = filtered.filter(page => favorites.includes(page.id));
        break;
      case 'recent':
        filtered = filtered.sort((a, b) =>
          new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime()
        ).slice(0, 20);
        break;
      default:
        break;
    }

    setFilteredPages(filtered);
  };

  const handlePageSelect = (page: NotionPage) => {
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
  };

  const handleToggleFavorite = async (pageId: string) => {
    const newFavorites = favorites.includes(pageId)
      ? favorites.filter(id => id !== pageId)
      : [...favorites, pageId];
    
    setFavorites(newFavorites);
    await chrome.storage.local.set({ favorites: newFavorites });
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);

    try {
      const targetPages = multiSelectMode
        ? pages.filter(p => selectedPages.includes(p.id))
        : [selectedPage!];

      // Envoi à Notion (simplifié pour l'exemple)
      for (const page of targetPages) {
        // TODO: Implémenter l'envoi réel
        console.log('Sending to:', page.title);
      }

      showNotification('Contenu envoyé avec succès !', 'success');
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

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <Layout
        loading={loading}
        
        // Sidebar
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        
        // Config
        config={config}
        onOpenConfig={() => setShowConfig(true)}
        
        // Preview
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
        
        // Indicators
        isOnline={true}
        isBackendConnected={true}
        hasNewPages={hasNewPages}
        loadingProgress={loadingProgress}
      >
        {/* SIDEBAR COMPACT pour extension */}
        <Sidebar isOpen={!sidebarCollapsed} width="compact">
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