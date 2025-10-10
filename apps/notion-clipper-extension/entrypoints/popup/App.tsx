// apps/notion-clipper-extension/entrypoints/popup/App.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
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
  ErrorBoundary,
} from '@notion-clipper/ui';
import type { NotionPage } from '@notion-clipper/ui';

// Types pour les messages
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

// Interface supprimée car non utilisée - remplacée par les types dans les handlers

interface ValidateTokenResponse {
  success: boolean;
  error?: string;
}

interface GetPagesResponse {
  success: boolean;
  pages?: NotionPage[];
  error?: string;
}

interface ToggleFavoriteResponse {
  success: boolean;
  isFavorite?: boolean;
  error?: string;
}

interface GetFavoritesResponse {
  success: boolean;
  favorites?: string[];
  error?: string;
}

interface SendToNotionResponse {
  success: boolean;
  blockId?: string;
  error?: string;
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
  const [selectedPages, setSelectedPages] = useState<NotionPage[]>([]);
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
  const [hasNewPages] = useState(false);
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
  // ÉTAT PERMISSIONS
  // ============================================
  const [hasClipboardPermission, setHasClipboardPermission] = useState(false);

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
    // Load callback
    async () => {
      console.log('📖 Loading config...');
      const result = await storage.get<any>('clipperConfig');
      console.log('📖 Loaded config:', result);
      return result || { notionToken: '', onboardingCompleted: false };
    },
    // Validate callback
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
  // INITIALISATION AU LANCEMENT
  // ============================================
  useEffect(() => {
    console.log('🚀 Extension popup opened, initializing...');

    // Vérifier les permissions sans les demander automatiquement
    checkClipboardPermission();

    // Charger le clipboard avec un petit délai pour laisser le temps au background
    setTimeout(() => {
      loadClipboard();
    }, 100);
  }, []);

  // ============================================
  // CHARGER CLIPBOARD QUAND PERMISSION ACCORDÉE
  // ============================================
  useEffect(() => {
    if (hasClipboardPermission) {
      console.log('✅ Permission accordée, rechargement du clipboard...');
      loadClipboard();
    }
  }, [hasClipboardPermission]);

  const checkClipboardPermission = async () => {
    try {
      console.log('🔍 Checking clipboard permissions...');

      // Vérifier si on a la permission clipboard-read
      const permissions = await browser.permissions.contains({
        permissions: ['clipboardRead']
      });

      console.log('📋 Current clipboard permission:', permissions);
      setHasClipboardPermission(permissions);

      if (permissions) {
        console.log('✅ Already have clipboard permission, loading clipboard...');
        // Si on a déjà la permission, charger le clipboard
        setTimeout(() => loadClipboard(), 100);
      } else {
        console.log('🚫 No clipboard permission - will request when needed');
        // Ne pas demander automatiquement pour éviter de fermer l'extension
        // La permission sera demandée quand l'utilisateur clique sur "Autoriser"
      }
    } catch (error) {
      console.error('❌ Error checking clipboard permissions:', error);
      setHasClipboardPermission(false);
    }
  };

  // Fonction séparée pour demander la permission
  const requestClipboardPermission = async () => {
    try {
      console.log('🚫 Requesting clipboard permission...');

      // Essayer directement la permission sans fermer le popup
      const granted = await browser.permissions.request({
        permissions: ['clipboardRead']
      });

      console.log('📋 Permission request result:', granted);
      setHasClipboardPermission(granted);

      if (granted) {
        console.log('✅ Clipboard permission granted, loading clipboard...');
        // Sauvegarder le statut
        await browser.storage.local.set({ clipboardPermissionGranted: true });
        setTimeout(() => loadClipboard(), 100);
        showNotification('Permission accordée ! Le clipboard sera détecté automatiquement.', 'success');
      } else {
        showNotification('Permission refusée. Vous pouvez saisir le contenu manuellement.', 'warning');
      }
    } catch (requestError) {
      console.error('❌ Error requesting clipboard permission:', requestError);
      setHasClipboardPermission(false);
      showNotification('Erreur lors de la demande de permission.', 'error');
    }
  };

  // ============================================
  // WRAPPER pour showNotification compatible
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
        const onboardingCompleted = await storage.get<boolean>('onboardingCompleted');
        console.log('🔍 Onboarding status:', onboardingCompleted);

        if (onboardingCompleted === true) {
          console.log('✅ Onboarding already completed');
          setFirstRun(false);
          await loadConfig();
        } else {
          console.log('🆕 First run detected - showing onboarding');
          setShowOnboarding(true);
          setFirstRun(true);
        }
      } catch (error) {
        console.error('❌ Error checking first run:', error);
        setShowOnboarding(true);
        setFirstRun(true);
      } finally {
        setInitializing(false);
      }
    };

    checkFirstRun();
  }, []); // Pas de dépendances pour éviter la boucle

  // ============================================
  // CHARGER LES DONNÉES APRÈS CONFIG
  // ============================================
  useEffect(() => {
    if (!firstRun && !initializing && config.notionToken) {
      console.log('📚 Loading pages and data...');
      loadPages();
      loadFavorites();
      loadClipboard();

      // Auto-detect clipboard si permission accordée
      if (config.autoDetectClipboard && hasClipboardPermission) {
        const interval = setInterval(loadClipboard, 2000);
        return () => clearInterval(interval);
      }
    }
  }, [config.notionToken, config.autoDetectClipboard, firstRun, initializing, hasClipboardPermission]);

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
      if (config.notionToken) {
        await loadPages();
        await loadFavorites();
      }
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      showNotification('Erreur lors de la configuration', 'error');
    }
  };

  const handleSaveOnboardingConfig = async (onboardingConfig: { notionToken: string }) => {
    try {
      console.log('💾 Saving onboarding config:', onboardingConfig);

      // ✅ Validation du token
      if (!onboardingConfig.notionToken || !onboardingConfig.notionToken.trim()) {
        throw new Error('Token Notion requis');
      }

      if (!onboardingConfig.notionToken.startsWith('ntn')) {
        console.warn('⚠️ Le token ne commence pas par "ntn" - vérifiez qu\'il est valide');
      }

      const newConfig = {
        ...config,
        notionToken: onboardingConfig.notionToken.trim(),
        onboardingCompleted: true,
        autoDetectClipboard: true
      };

      console.log('💾 Config to save:', { ...newConfig, notionToken: '***' });
      await updateConfig(newConfig);
      await checkClipboardPermission();
    } catch (error) {
      console.error('❌ Error saving onboarding config:', error);
      throw error;
    }
  };

  // ============================================
  // FONCTIONS - PAGES
  // ============================================
  const loadPages = async () => {
    if (!config.notionToken) {
      console.log('🚫 No token, skipping page load');
      return;
    }

    setLoading(true);
    setLoadingProgress({ current: 0, total: 1, message: 'Chargement des pages...' });

    try {
      console.log('📚 Loading pages...');
      const response = await browser.runtime.sendMessage({
        type: 'GET_PAGES'
      }) as GetPagesResponse;

      if (response.success && response.pages) {
        console.log(`📚 Loaded ${response.pages.length} pages`);
        setPages(response.pages);
        setLoadingProgress({ current: 1, total: 1, message: 'Pages chargées' });
      } else {
        throw new Error(response.error || 'Failed to load pages');
      }
    } catch (error: any) {
      console.error('❌ Error loading pages:', error);
      showNotification(error.message || 'Erreur lors du chargement des pages', 'error');
    } finally {
      setLoading(false);
      setLoadingProgress(undefined);
    }
  };

  const filterPages = () => {
    let filtered = [...pages];

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(page =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by tab
    switch (activeTab) {
      case 'favorites':
        filtered = filtered.filter(page => favorites.includes(page.id));
        break;
      case 'recent':
        filtered = filtered.slice(0, 10);
        break;
      case 'suggested':
        filtered = filtered.slice(0, 5);
        break;
    }

    setFilteredPages(filtered);
  };

  // ============================================
  // FONCTIONS - SÉLECTION
  // ============================================
  const handlePageSelect = useCallback((page: NotionPage) => {
    console.log('📄 Selecting page:', page);

    if (multiSelectMode) {
      setSelectedPages(prev => {
        const isSelected = prev.some(p => p.id === page.id);
        if (isSelected) {
          return prev.filter(p => p.id !== page.id);
        } else {
          return [...prev, page];
        }
      });
    } else {
      setSelectedPage(page);
      setSelectedPages([]);
    }
  }, [multiSelectMode]);

  const handleToggleMultiSelect = useCallback(() => {
    console.log('🔄 Toggling multi-select mode');
    setMultiSelectMode(prev => !prev);

    if (multiSelectMode) {
      setSelectedPages([]);
    } else if (selectedPage) {
      setSelectedPages([selectedPage]);
      setSelectedPage(null);
    }
  }, [multiSelectMode, selectedPage]);

  const handleDeselectAll = useCallback(() => {
    console.log('❌ Deselecting all');
    setSelectedPages([]);
    setSelectedPage(null);
  }, []);

  const handleDeselectPage = useCallback((pageId: string) => {
    console.log('❌ Deselecting page:', pageId);
    setSelectedPages(prev => prev.filter(p => p.id !== pageId));
  }, []);

  // ============================================
  // FONCTIONS - FAVORIS
  // ============================================
  const loadFavorites = async () => {
    try {
      console.log('⭐ Loading favorites...');
      const response = await browser.runtime.sendMessage({
        type: 'GET_FAVORITES'
      }) as GetFavoritesResponse;

      if (response.success && response.favorites) {
        console.log(`⭐ Loaded ${response.favorites.length} favorites`);
        setFavorites(response.favorites);
      }
    } catch (error) {
      console.error('❌ Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (pageId: string) => {
    try {
      console.log('⭐ Toggling favorite:', pageId);
      const response = await browser.runtime.sendMessage({
        type: 'TOGGLE_FAVORITE',
        pageId
      }) as ToggleFavoriteResponse;

      if (response.success) {
        setFavorites(prev => {
          if (prev.includes(pageId)) {
            return prev.filter(id => id !== pageId);
          } else {
            return [...prev, pageId];
          }
        });
        showNotification(
          response.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
          'success'
        );
      }
    } catch (error) {
      console.error('❌ Error toggling favorite:', error);
      showNotification('Erreur lors de la modification des favoris', 'error');
    }
  };

  // ============================================
  // FONCTIONS - CLIPBOARD
  // ============================================
  const loadClipboard = async () => {
    console.log('📋 === LOADING CLIPBOARD ===');

    // PRIORITÉ 1: Context menu selection (le plus important)
    try {
      console.log('📋 [1/4] Checking context menu selection...');
      const selectionResponse = await browser.runtime.sendMessage({
        type: 'GET_LAST_SELECTION'
      }) as { success: boolean; selection?: { text: string; url?: string; title?: string; timestamp?: number } };

      console.log('📋 Context menu response:', selectionResponse);

      if (selectionResponse?.success && selectionResponse.selection?.text) {
        const clipboardData = {
          text: selectionResponse.selection.text,
          html: undefined,
          imageUrl: null,
          metadata: {
            source: selectionResponse.selection.url || 'context-menu',
            title: selectionResponse.selection.title || 'Sélection',
            timestamp: selectionResponse.selection.timestamp || Date.now()
          }
        };

        setClipboard(clipboardData);
        console.log('✅ SUCCESS: Context menu selection loaded:', selectionResponse.selection.text.substring(0, 50) + '...');
        return;
      }
    } catch (error) {
      console.log('❌ Context menu selection failed:', error);
    }

    // PRIORITÉ 2: Navigator clipboard
    try {
      console.log('📋 [2/4] Trying navigator.clipboard...');
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();

        if (text && text.trim()) {
          const clipboardData = {
            text: text.trim(),
            html: undefined,
            imageUrl: null,
            metadata: {
              source: 'navigator',
              title: 'Presse-papier',
              timestamp: Date.now()
            }
          };

          setClipboard(clipboardData);
          console.log('✅ SUCCESS: Navigator clipboard loaded:', text.substring(0, 50) + '...');
          return;
        } else {
          console.log('⚠️ Navigator clipboard is empty');
        }
      } else {
        console.log('❌ Navigator clipboard API not available');
      }
    } catch (navError: any) {
      console.log('❌ Navigator clipboard failed:', navError);
      if (navError?.message?.includes('permission') || navError?.message?.includes('denied')) {
        setHasClipboardPermission(false);
      }
    }

    // PRIORITÉ 3: Background script
    try {
      console.log('📋 [3/4] Trying background script...');
      const bgResponse = await browser.runtime.sendMessage({
        type: 'GET_CLIPBOARD'
      }) as { success: boolean; clipboard?: { text: string; html?: string; imageUrl?: string | null } };

      console.log('📋 Background response:', bgResponse);

      if (bgResponse?.success && bgResponse.clipboard?.text) {
        const clipboardData = {
          text: bgResponse.clipboard.text,
          html: bgResponse.clipboard.html,
          imageUrl: bgResponse.clipboard.imageUrl || null,
          metadata: {
            source: 'background',
            title: 'Presse-papier',
            timestamp: Date.now()
          }
        };

        setClipboard(clipboardData);
        console.log('✅ SUCCESS: Background clipboard loaded');
        return;
      }
    } catch (error) {
      console.log('❌ Background clipboard failed:', error);
    }

    // PRIORITÉ 4: Clipboard vide mais éditable
    console.log('📋 [4/4] Creating empty editable clipboard');
    setClipboard({
      text: '',
      html: undefined,
      imageUrl: null,
      metadata: {
        source: 'empty',
        title: 'Saisissez votre contenu',
        timestamp: Date.now()
      }
    });
    console.log('✅ Empty clipboard created');
  };

  const clearClipboard = () => {
    setClipboard(null);
    setEditedClipboard(null);
  };

  const handleEditContent = (newContent: ClipboardData | null) => {
    console.log('✏️ Content edited:', newContent?.text?.substring(0, 50) + '...');
    setEditedClipboard(newContent);
  };

  // ============================================
  // FONCTIONS - ENVOI
  // ============================================
  const handleSend = async () => {
    const targets = multiSelectMode ? selectedPages : (selectedPage ? [selectedPage] : []);

    // Priorité au contenu édité, sinon clipboard original
    const content = editedClipboard || clipboard;

    console.log('📤 Sending content:', {
      hasEditedClipboard: !!editedClipboard,
      hasClipboard: !!clipboard,
      contentText: content?.text?.substring(0, 50) + '...',
      targets: targets.length
    });

    if (!targets.length) {
      showNotification('Sélectionnez au moins une page', 'warning');
      return;
    }

    if (!content?.text || content.text.trim() === '') {
      showNotification('Ajoutez du contenu à envoyer', 'warning');
      return;
    }

    setSending(true);
    setLoadingProgress({
      current: 0,
      total: targets.length,
      message: `Envoi vers ${targets.length} page${targets.length > 1 ? 's' : ''}...`
    });

    try {
      let successCount = 0;
      for (let i = 0; i < targets.length; i++) {
        const page = targets[i];
        const response = await browser.runtime.sendMessage({
          type: 'SEND_TO_NOTION',
          pageId: page.id,
          content: {
            text: content.text,
            html: content.html,
            imageUrl: content.imageUrl,
            properties: contentProperties
          }
        }) as SendToNotionResponse;

        if (response.success) {
          successCount++;
        }

        setLoadingProgress({
          current: i + 1,
          total: targets.length,
          message: `Envoi ${i + 1}/${targets.length}...`
        });
      }

      if (successCount === targets.length) {
        showNotification(
          `Contenu envoyé vers ${successCount} page${successCount > 1 ? 's' : ''} ✅`,
          'success'
        );
        clearClipboard();
        handleDeselectAll();
      } else if (successCount > 0) {
        showNotification(
          `${successCount}/${targets.length} envois réussis`,
          'warning'
        );
      } else {
        throw new Error('Aucun envoi réussi');
      }
    } catch (error: any) {
      console.error('❌ Error sending to Notion:', error);
      showNotification(error.message || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSending(false);
      setLoadingProgress(undefined);
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

  // Convertir selectedPages en array d'IDs pour PageList
  const selectedPageIds = useMemo(() => {
    return selectedPages.map(p => p.id);
  }, [selectedPages]);

  // ============================================
  // RENDU - INITIALISATION
  // ============================================
  if (initializing) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-50">
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
      <div className="w-[700px] h-[600px] overflow-auto">
        <Onboarding
          onComplete={handleCompleteOnboarding}
          onSaveConfig={handleSaveOnboardingConfig}
          validateNotionToken={validateNotionToken}
          platformKey="Ctrl"
          mode="compact"
        />
      </div>
    );
  }

  // ============================================
  // RENDU - CHARGEMENT INITIAL
  // ============================================
  if (loading && !pages.length) {
    return (
      <div className="h-[600px] flex flex-col bg-gray-50">
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
    <ErrorBoundary>
      <div className="w-[700px] h-[600px] flex flex-col bg-gray-50 overflow-hidden">
        {/* Header */}
        <Header
          title="Notion Clipper Pro"
          showLogo={true}
          isOnline={true}
          isConnected={!!config.notionToken}
          onOpenConfig={() => setShowConfig(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          hasNewPages={hasNewPages}
          loadingProgress={loadingProgress}
        />

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar avec width compact */}
          <AnimatePresence>
            {!sidebarCollapsed && (
              <Sidebar isOpen={!sidebarCollapsed} width="compact">
                <PageList
                  filteredPages={filteredPages}
                  selectedPage={selectedPage}
                  selectedPages={selectedPageIds} // ✅ Passer les IDs, pas les objets
                  multiSelectMode={multiSelectMode}
                  favorites={favorites}
                  searchQuery={searchQuery}
                  activeTab={activeTab}
                  onPageSelect={handlePageSelect}
                  onToggleFavorite={toggleFavorite}
                  onSearchChange={setSearchQuery}
                  onTabChange={(tab: string) => setActiveTab(tab as 'suggested' | 'favorites' | 'recent' | 'all')} // ✅ Cast typé
                  loading={loading}
                  onDeselectAll={handleDeselectAll}
                  onToggleMultiSelect={handleToggleMultiSelect}
                />
              </Sidebar>
            )}
          </AnimatePresence>

          {/* Content area */}
          <ContentArea>
            <ContentEditor
              clipboard={clipboard}
              editedClipboard={editedClipboard}
              onEditContent={handleEditContent}
              onClearClipboard={clearClipboard}
              selectedPage={selectedPage}
              selectedPages={selectedPageIds} // ✅ Passer les IDs, pas les objets
              multiSelectMode={multiSelectMode}
              sending={sending}
              onSend={handleSend}
              canSend={canSend}
              contentProperties={contentProperties}
              onUpdateProperties={setContentProperties}
              showNotification={showNotification}
              pages={pages}
              onDeselectPage={handleDeselectPage}
              showPreview={false}
              config={config}
            />

            {/* Bouton pour demander permission clipboard si pas accordée */}
            {!hasClipboardPermission && config.autoDetectClipboard && (
              <div className="p-4 bg-yellow-50 border-t border-yellow-200">
                <button
                  onClick={requestClipboardPermission}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Autoriser l'accès au presse-papiers
                </button>
              </div>
            )}
          </ContentArea>
        </div>

        {/* Config panel */}
        <AnimatePresence>
          {showConfig && (
            <ConfigPanel
              isOpen={showConfig}
              config={config}
              onSave={updateConfig} // ✅ Utiliser onSave, pas onUpdateConfig
              validateNotionToken={validateNotionToken}
              showNotification={showNotificationForConfig}
              onClose={() => setShowConfig(false)}
            />
          )}
        </AnimatePresence>

        {/* Notifications */}
        <NotificationManager
          notifications={notifications}
          onClose={closeNotification}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;