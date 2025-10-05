import { useState, useEffect, useCallback } from 'react';
import { Search, X, Settings, Send, Star, Clock, Folder, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageCard from './components/PageCard';
import TabIcon from './components/TabIcon';

interface NotionPage {
  id: string;
  title: string;
  icon?: any;
  parent?: any;
  parent_title?: string;
  last_edited_time?: string;
  type?: string;
}

interface Config {
  notionToken?: string;
  favorites?: string[];
}

type Tab = 'suggested' | 'favorites' | 'recent' | 'all';

function App() {
  const [view, setView] = useState<'main' | 'settings'>('main');
  const [config, setConfig] = useState<Config>({});
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<NotionPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(false);
  const [capturedText, setCapturedText] = useState('');
  const [token, setToken] = useState('');

  const tabs = [
    { id: 'suggested' as Tab, label: 'Suggérées', icon: 'TrendingUp' },
    { id: 'favorites' as Tab, label: 'Favoris', icon: 'Star' },
    { id: 'recent' as Tab, label: 'Récents', icon: 'Clock' },
    { id: 'all' as Tab, label: 'Toutes', icon: 'Folder' }
  ];

  useEffect(() => {
    loadConfig();
    loadCapturedData();
  }, []);

  useEffect(() => {
    if (config.notionToken) {
      loadPages();
    }
  }, [config.notionToken]);

  useEffect(() => {
    filterPages();
  }, [searchQuery, pages, activeTab, config.favorites]);

  async function loadConfig() {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
    if (response.success) {
      setConfig(response.config);
      setToken(response.config.notionToken || '');
    }
  }

  async function loadCapturedData() {
    const result = await chrome.storage.local.get('capturedData');
    if (result.capturedData) {
      setCapturedText(result.capturedData.text || result.capturedData.selection || '');
    }
  }

  async function loadPages() {
    setLoading(true);
    const response = await chrome.runtime.sendMessage({ type: 'GET_PAGES' });
    if (response.success) {
      setPages(response.pages);
    }
    setLoading(false);
  }

  function filterPages() {
    let filtered = [...pages];

    // Filter by tab
    switch (activeTab) {
      case 'favorites':
        filtered = filtered.filter(p => config.favorites?.includes(p.id));
        break;
      case 'recent':
        filtered = filtered.sort((a, b) => 
          new Date(b.last_edited_time || 0).getTime() - new Date(a.last_edited_time || 0).getTime()
        ).slice(0, 20);
        break;
      case 'suggested':
        // Simple suggestion: favorites + recent
        const favIds = config.favorites || [];
        filtered = [
          ...filtered.filter(p => favIds.includes(p.id)),
          ...filtered.filter(p => !favIds.includes(p.id)).slice(0, 10)
        ];
        break;
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(page =>
        (page.title || 'Sans titre').toLowerCase().includes(query) ||
        (page.parent_title || '').toLowerCase().includes(query)
      );
    }

    setFilteredPages(filtered);
  }

  async function saveToken() {
    await chrome.runtime.sendMessage({
      type: 'SAVE_CONFIG',
      config: { notionToken: token, favorites: config.favorites || [] }
    });
    setConfig({ notionToken: token, favorites: config.favorites || [] });
    setView('main');
    await loadPages();
  }

  async function toggleFavorite(pageId: string) {
    const favorites = config.favorites || [];
    const newFavorites = favorites.includes(pageId)
      ? favorites.filter(id => id !== pageId)
      : [...favorites, pageId];

    await chrome.runtime.sendMessage({
      type: 'SAVE_CONFIG',
      config: { ...config, favorites: newFavorites }
    });
    setConfig({ ...config, favorites: newFavorites });
  }

  async function sendToNotion() {
    if (!selectedPage || !capturedText) return;

    setLoading(true);
    const response = await chrome.runtime.sendMessage({
      type: 'SEND_TO_NOTION',
      data: { content: capturedText, pageId: selectedPage }
    });
    setLoading(false);

    if (response.success) {
      setTimeout(() => window.close(), 1000);
    }
  }

  // Settings view
  if (view === 'settings') {
    return (
      <div className="w-[400px] h-[600px] flex flex-col bg-white">
        <div className="p-4 border-b">
          <button onClick={() => setView('main')} className="text-sm text-gray-600 hover:text-black">
            ← Retour
          </button>
        </div>
        <div className="flex-1 p-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Token Notion</label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="secret_xxxxxxxxxxxx"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <button
            onClick={saveToken}
            disabled={!token}
            className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      </div>
    );
  }

  // Main view
  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h1 className="text-base font-semibold">Notion Clipper Pro</h1>
        <button onClick={() => setView('settings')} className="p-2 hover:bg-gray-100 rounded-lg">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Preview */}
      {capturedText && (
        <div className="p-3 bg-gray-50 border-b">
          <p className="text-xs text-gray-600 mb-1">Texte capturé :</p>
          <p className="text-sm line-clamp-2">{capturedText}</p>
        </div>
      )}

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 border-b bg-gray-50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-black text-white'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
          >
            <TabIcon name={tab.icon} size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pages list */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-500">
            {config.notionToken ? 'Aucune page' : 'Configurez votre token'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredPages.map(page => (
              <PageCard
                key={page.id}
                page={page}
                isSelected={selectedPage === page.id}
                isFavorite={config.favorites?.includes(page.id) || false}
                onClick={() => setSelectedPage(page.id)}
                onToggleFavorite={() => toggleFavorite(page.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t">
        <button
          onClick={sendToNotion}
          disabled={!selectedPage || loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm font-medium"
        >
          <Send className="w-4 h-4" />
          Envoyer vers Notion
        </button>
      </div>
    </div>
  );
}

export default App;