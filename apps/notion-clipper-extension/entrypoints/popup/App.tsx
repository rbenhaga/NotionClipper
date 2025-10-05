import { useState, useEffect, useMemo } from 'react';
import {
  Layout,
  Sidebar,
  ContentArea,
  PageList,
  useNotifications,
  NotificationManager
} from '@notion-clipper/ui';
import type { NotionPage } from '@notion-clipper/ui';

function App() {
  // États
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<NotionPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<NotionPage | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'suggested' | 'favorites' | 'recent' | 'all'>('all');
  const [loading, setLoading] = useState(false);

  // Hook notifications
  const { notifications, showNotification, closeNotification } = useNotifications();

  // Charger les pages depuis l'extension
  useEffect(() => {
    loadPages();
    loadFavorites();
  }, []);

  async function loadPages() {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_PAGES' });
      if (response.success) {
        setPages(response.pages);
        setFilteredPages(response.pages);
      }
    } catch (error) {
      showNotification('Erreur de chargement des pages', 'error');
    } finally {
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
        // Tri par dernière édition
        filtered = [...filtered].sort((a, b) =>
          new Date(b.last_edited_time || 0).getTime() - new Date(a.last_edited_time || 0).getTime()
        );
        break;
      // 'all' et 'suggested' : pas de filtre
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

  return (
    <Layout
      loading={loading}
      onSettingsClick={() => showNotification('Paramètres non implémentés', 'info')}
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
          onTabChange={setActiveTab}
          loading={loading}
          onDeselectAll={() => setSelectedPages([])}
          onToggleMultiSelect={() => setMultiSelectMode(!multiSelectMode)}
        />
      </Sidebar>

      <ContentArea>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>Éditeur de contenu à implémenter</p>
        </div>
      </ContentArea>

      <NotificationManager
        notifications={notifications}
        onClose={closeNotification}
      />
    </Layout>
  );
}

export default App;