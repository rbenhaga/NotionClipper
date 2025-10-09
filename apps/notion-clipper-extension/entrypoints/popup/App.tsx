import { useState, useEffect, useMemo } from 'react';
import { storage, browser } from '../utils/storage';
import { AnimatePresence } from 'framer-motion';
import {
  Header,
  Sidebar,
  ContentArea,
  PageList,
  ContentEditor,
  ConfigPanel,
  Onboarding,
  useNotifications,
  NotificationManager,
  useConfig,
  LoadingSpinner,
} from '@notion-clipper/ui';
import type { NotionPage } from '@notion-clipper/ui';
import type {
  ValidateTokenResponse,
  GetPagesResponse,
  ToggleFavoriteResponse,
  GetFavoritesResponse,
  SendToNotionResponse
} from '../types/messages';

// Type pour le clipboard
interface ClipboardData {
  text: string;
  html?: string;
  imageUrl?: string | null;
  metadata?: {
    source?: string;
    title?: string;
    timestamp?: number;
  };
}

function App() {
  // ============================================
  // ÉTATS ONBOARDING
  // ============================================
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [firstRun, setFirstRun] = useState(true);
  const [initializing, setInitializing] = useState(true);

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
  const [hasNewPages, setHasNewPages] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | undefined>(undefined);

  // ============================================
  // ÉTATS CONTENU
  // ============================================
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [editedClipboard, setEditedClipboard] = useState<ClipboardData | null>(null);
  const [contentProperties, setContentProperties] = useState<any>({
    contentType: 'paragraph',
    parseAsMarkdown: true
  });

  // ============================================
  // HOOKS
  // ============================================
  const { notifications, showNotification, closeNotification } = useNotifications();
  const { config, updateConfig, loadConfig, validateNotionToken } = useConfig(
    // Save callback
    async (newConfig) => {
      console.log('💾 Saving config:', newConfig);
      await storage.set('clipperConfig', newConfig);
    },
    // Load callback - CORRIGÉ
    async () => {
      console.log('📖 Loading config...');
      const result = await storage.get<any>('clipperConfig');
      console.log('📖 Loaded config:', result);
      // ✅ storage.get retourne directement la valeur, pas un objet
      return result || { notionToken: '', onboardingCompleted: false };
    },
    // Validate callback - CORRIGÉ avec typage
    async (token: string): Promise<{ success: boolean; error?: string }> => {
      console.log('🔐 Validating token...');
      try {
        const response = await browser.runtime.sendMessage({
          type: 'VALIDATE_TOKEN',
          token
        }) as ValidateTokenResponse;

        console.log('🔐 Validation response:', response);

        return {
          success: response.success,
          error: response.error
        };
      } catch (error: any) {
        console.error('🔐 Validation error:', error);
        return {
          success: false,
          error: error.message || 'Erreur de connexion au service'
        };
      }
    }
  );

  // ============================================
  // WRAPPER pour showNotification compatible avec ConfigPanel
  // ============================================
  const showNotificationForConfig = (message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    showNotification(message, type);
  };

  // ============================================
  // VÉRIFICATION PREMIER LANCEMENT
  // ============================================
  useEffect(() => {
    const checkFirstRun = async () => {
      try {
        console.log('🔍 Checking first run...');

        // ✅ Utiliser le wrapper de storage sûr
        const onboardingCompleted = await storage.get<boolean>('onboardingCompleted');
        console.log('🔍 Onboarding status:', onboardingCompleted);

        if (!onboardingCompleted) {
          console.log('🆕 First run detected - showing onboarding');
          setShowOnboarding(true);
          setFirstRun(true);
        } else {
          console.log('✅ Onboarding already completed');
          setFirstRun(false);

          // Charger la config
          await loadConfig();
        }
      } catch (error) {
        console.error('❌ Error checking first run:', error);
        // ✅ Fallback: afficher l'onboarding par défaut en cas d'erreur
        setShowOnboarding(true);
        setFirstRun(true);
      } finally {
        // ✅ TOUJOURS arrêter l'initialisation
        setInitializing(false);
      }
    };

    checkFirstRun();
  }, [loadConfig]);

  // ============================================
  // CHARGER LES DONNÉES APRÈS CONFIG
  // ============================================
  useEffect(() => {
    if (!firstRun && !initializing && config.notionToken) {
      console.log('📚 Loading pages and data...');
      loadPages();
      loadFavorites();
      loadClipboard();
    }
  }, [config.notionToken, firstRun, initializing]);

  // ============================================
  // FILTRAGE DES PAGES
  // ============================================
  useEffect(() => {
    filterPages();
  }, [pages, searchQuery, activeTab, favorites]);

  // ============================================
  // FONCTIONS - CONFIG & ONBOARDING
  // ============================================
  const handleCompleteOnboarding = async () => {
    try {
      console.log('✅ Completing onboarding...');
      await storage.set('onboardingCompleted', true);
      setShowOnboarding(false);
      setFirstRun(false);
      await loadConfig();

      const configResult = await storage.get<any>('clipperConfig'); // ✅ Direct
      if (configResult?.notionToken) { // ✅ Pas de .clipperConfig
        console.log('🔑 Token found, loading pages...');
        await loadPages();
        await loadFavorites();
      }
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      showNotification('Erreur lors de la finalisation', 'error');
    }
  };

  const handleSaveOnboardingConfig = async (newConfig: any) => {
    try {
      console.log('💾 Saving onboarding config:', newConfig);
      await storage.set(
        'clipperConfig', {
        ...newConfig,
        onboardingCompleted: true
      }
      );

      updateConfig(newConfig);

      if (newConfig.notionToken) {
        console.log('🔑 Setting token in background...');
        await browser.runtime.sendMessage({
          type: 'SAVE_CONFIG',
          config: newConfig
        });
      }
    } catch (error) {
      console.error('❌ Error saving config:', error);
      throw error;
    }
  };

  // ============================================
  // FONCTIONS - PAGES
  // ============================================
  const loadPages = async () => {
    if (!config.notionToken) {
      console.log('⚠️ No token, skipping page load');
      return;
    }

    setLoading(true);
    setLoadingProgress({
      current: 0,
      total: 100,
      message: 'Chargement des pages...'
    });

    try {
      console.log('📚 Loading pages from background...');
      const response = await browser.runtime.sendMessage({
        type: 'GET_PAGES'
      }) as GetPagesResponse; // ✅ Typage

      console.log('📚 Pages response:', response);

      if (response.success && response.pages) {
        setPages(response.pages);
        setHasNewPages(true);
        setTimeout(() => setHasNewPages(false), 3000);
        console.log(`✅ Loaded ${response.pages.length} pages`);
      } else {
        throw new Error(response.error || 'Erreur de chargement');
      }
    } catch (error: any) {
      console.error('❌ Error loading pages:', error);
      showNotification('Erreur lors du chargement des pages', 'error');
    } finally {
      setLoading(false);
      setLoadingProgress(undefined);
    }
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
          new Date(b.last_edited_time || 0).getTime() - new Date(a.last_edited_time || 0).getTime()
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

  // ============================================
  // FONCTIONS - FAVORIS
  // ============================================
  const loadFavorites = async () => {
    try {
      console.log('⭐ Loading favorites...');
      const response = await browser.runtime.sendMessage({
        type: 'GET_FAVORITES'
      }) as GetFavoritesResponse; // ✅ Typage

      if (response.success) {
        setFavorites(response.favorites || []);
        console.log('⭐ Favorites loaded:', response.favorites);
      } else {
        console.error('⚠️ Failed to load favorites:', response.error);
      }
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
    }
  };

  const handleToggleFavorite = async (pageId: string) => {
    try {
      console.log('⭐ Toggling favorite:', pageId);
      const response = await browser.runtime.sendMessage({
        type: 'TOGGLE_FAVORITE',
        pageId
      }) as ToggleFavoriteResponse; // ✅ Typage

      if (response.success) {
        setFavorites(prev =>
          response.isFavorite
            ? [...prev, pageId]
            : prev.filter(id => id !== pageId)
        );
        console.log(`✅ Favorite toggled for page ${pageId}`);
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      showNotification('Erreur lors de la mise à jour du favori', 'error');
    }
  };

  // ============================================
  // FONCTIONS - CLIPBOARD
  // ============================================
  const loadClipboard = async () => {
    try {
      console.log('📋 Loading clipboard...');
      const capturedData = await storage.get<any>('capturedData'); // ✅ Direct
      console.log('📋 Clipboard data:', capturedData);

      if (capturedData) {
        const clipboardData: ClipboardData = {
          text: capturedData.text || '',
          html: capturedData.html || '',
          imageUrl: capturedData.imageUrl || null,
          metadata: {
            source: capturedData.url || '',
            title: capturedData.title || '',
            timestamp: capturedData.timestamp || Date.now()
          }
        };

        setClipboard(clipboardData);
        setEditedClipboard(null);
      }
    } catch (error) {
      console.error('❌ Error loading clipboard:', error);
    }
  };

  const clearClipboard = async () => {
    try {
      console.log('🗑️ Clearing clipboard...');
      await storage.remove('capturedData');

      setClipboard(null);
      setEditedClipboard(null);
      console.log('✅ Clipboard cleared');
    } catch (error) {
      console.error('❌ Error clearing clipboard:', error);
    }
  };

  // ============================================
  // FONCTIONS - ENVOI
  // ============================================
  const handleSend = async () => {
    if (!canSend) {
      console.log('⚠️ Cannot send: no target or content');
      return;
    }

    setSending(true);

    try {
      const targetPages = multiSelectMode
        ? pages.filter(p => selectedPages.includes(p.id))
        : [selectedPage!];

      // Utiliser editedClipboard si modifié, sinon clipboard
      const content = editedClipboard?.text || clipboard?.text || '';

      if (!content) {
        throw new Error('Aucun contenu à envoyer');
      }

      console.log(`📤 Sending to ${targetPages.length} page(s)`);

      const response = await browser.runtime.sendMessage({
        type: 'SEND_TO_NOTION',
        data: {
          pageIds: multiSelectMode
            ? selectedPages
            : [selectedPage!.id], // ✅ Support multi-pages
          content: {
            text: content,
            html: editedClipboard?.html || clipboard?.html
          },
          properties: contentProperties
        }
      }) as SendToNotionResponse; // ✅ Typage

      if (response.success) {
        showNotification(
          `Contenu envoyé vers ${targetPages.length} page${targetPages.length > 1 ? 's' : ''} !`,
          'success'
        );

        await clearClipboard();
        setSelectedPage(null);
        setSelectedPages([]);
        setMultiSelectMode(false);

        console.log('✅ Content sent successfully');
      } else {
        throw new Error(response.error || 'Erreur d\'envoi');
      }
    } catch (error: any) {
      console.error('❌ Error sending content:', error);
      showNotification(`Erreur: ${error.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  // ============================================
  // COMPUTED
  // ============================================
  const canSend = useMemo(() => {
    const hasTarget = multiSelectMode
      ? selectedPages.length > 0
      : selectedPage !== null;
    const hasContent = !!(editedClipboard?.text || clipboard?.text);
    return hasTarget && hasContent && !sending;
  }, [multiSelectMode, selectedPages, selectedPage, editedClipboard, clipboard, sending]);

  // ============================================
  // RENDU - INITIALISATION
  // ============================================
  if (initializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Initialisation...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDU - ONBOARDING
  // ============================================
  if (showOnboarding) {
    console.log('🎨 Rendering onboarding');
    return (
      <Onboarding
        onComplete={handleCompleteOnboarding}
        onSaveConfig={handleSaveOnboardingConfig}
        validateNotionToken={validateNotionToken}
        platformKey="Ctrl"
      />
    );
  }

  // ============================================
  // RENDU - CHARGEMENT INITIAL
  // ============================================
  if (loading && !pages.length) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 mt-4">Chargement de vos pages...</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDU PRINCIPAL
  // ============================================
  console.log('🎨 Rendering main app');
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header
        isOnline={true}
        isConnected={!!config.notionToken && pages.length > 0}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenConfig={() => {
          console.log('⚙️ Opening config panel');
          setShowConfig(true);
        }}
        sidebarCollapsed={sidebarCollapsed}
        hasNewPages={hasNewPages}
        loadingProgress={loadingProgress}
      />

      {/* Contenu principal */}
      <div className="flex-1 flex overflow-hidden">
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
            onTabChange={(tab: string) => {
              // Wrapper pour convertir string en type union
              setActiveTab(tab as 'suggested' | 'favorites' | 'recent' | 'all');
            }}
            loading={loading}
            onDeselectAll={() => setSelectedPages([])}
            onToggleMultiSelect={() => {
              setMultiSelectMode(!multiSelectMode);
              setSelectedPages([]);
            }}
          />
        </Sidebar>

        <ContentArea>
          <ContentEditor
            selectedPage={selectedPage}
            selectedPages={selectedPages}
            multiSelectMode={multiSelectMode}
            clipboard={clipboard}
            editedClipboard={editedClipboard}
            onEditContent={(content: any) => setEditedClipboard(content)}
            onClearClipboard={clearClipboard}
            onSend={handleSend}
            sending={sending}
            onDeselectPage={(pageId) => {
              setSelectedPages(prev => prev.filter(id => id !== pageId));
            }}
            onUpdateProperties={(props) => {
              setContentProperties(props);
            }}
            canSend={canSend}
            contentProperties={contentProperties}
            showNotification={showNotificationForConfig}
            pages={pages}
            showPreview={false}
            config={config}
          />
        </ContentArea>
      </div>

      {/* Notifications */}
      <NotificationManager
        notifications={notifications}
        onClose={closeNotification}
      />

      {/* ConfigPanel en modal */}
      <AnimatePresence>
        {showConfig && (
          <div className="fixed inset-0 z-[9999]">
            <ConfigPanel
              isOpen={showConfig}
              config={config}
              onSave={async (newConfig) => {
                console.log('💾 Saving config from panel:', newConfig);
                await storage.set('clipperConfig', newConfig);
                await updateConfig(newConfig);

                // Mettre à jour le token dans le background si changé
                if (newConfig.notionToken !== config.notionToken) {
                  await browser.runtime.sendMessage({
                    type: 'SAVE_CONFIG',
                    config: newConfig
                  });
                  // Recharger les pages
                  await loadPages();
                }

                setShowConfig(false);
              }}
              onClose={() => {
                console.log('❌ Closing config panel');
                setShowConfig(false);
              }}
              showNotification={showNotificationForConfig}
              validateNotionToken={validateNotionToken}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;