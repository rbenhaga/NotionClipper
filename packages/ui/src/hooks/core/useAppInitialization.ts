// packages/ui/src/hooks/core/useAppInitialization.ts
// ✅ FIX: Prévention complète des boucles infinies lors de l'initialisation
import { useRef, useEffect, useCallback } from 'react';

interface UseAppInitializationProps {
  setLoading: (loading: boolean) => void;
  setShowOnboarding: (show: boolean) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setConfigLoaded: (loaded: boolean) => void;
  loadConfig: () => Promise<any>;
  loadPages: () => Promise<void>;
  updateConfig: (updates: any) => Promise<boolean>;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function useAppInitialization({
  setLoading,
  setShowOnboarding,
  setOnboardingCompleted,
  setConfigLoaded,
  loadConfig,
  loadPages,
  updateConfig,
  showNotification
}: UseAppInitializationProps) {
  // ✅ FIX: Flag pour empêcher les initialisations multiples
  const initializationDone = useRef(false);
  const initializationInProgress = useRef(false);

  // ✅ FIX: Fonction d'initialisation stable avec useCallback
  const initializeApp = useCallback(async () => {
    // Double protection contre les ré-entrées
    if (initializationDone.current || initializationInProgress.current) {
      console.log('[INIT] ⚠️ Initialization already completed or in progress, skipping...');
      return;
    }

    try {
      console.log('[INIT] 🚀 Starting app initialization...');
      initializationInProgress.current = true;
      setLoading(true);

      // 1. Charger la configuration
      console.log('[INIT] 📦 Loading configuration...');
      const loadedConfig = await loadConfig();
      console.log('[INIT] ✅ Config loaded:', { 
        hasToken: !!(loadedConfig.notionToken || loadedConfig.notionToken_encrypted),
        onboardingCompleted: loadedConfig.onboardingCompleted 
      });
      setConfigLoaded(true);

      // 2. Déterminer si l'onboarding est nécessaire
      const hasToken = !!(loadedConfig.notionToken || loadedConfig.notionToken_encrypted);
      const explicitlyCompleted = loadedConfig?.onboardingCompleted === true;
      const isOnboardingDone = hasToken || explicitlyCompleted;

      console.log('[INIT] 🎯 Onboarding status:', {
        hasToken,
        explicitlyCompleted,
        isOnboardingDone
      });

      setOnboardingCompleted(isOnboardingDone);
      setShowOnboarding(!isOnboardingDone);

      // 3. Charger les pages si token disponible
      if (hasToken) {
        console.log('[INIT] 📚 Loading Notion pages...');
        try {
          await loadPages();
          console.log('[INIT] ✅ Pages loaded successfully');
        } catch (error) {
          console.error('[INIT] ❌ Failed to load pages:', error);
          showNotification('Impossible de charger les pages Notion', 'error');
        }
      } else {
        console.log('[INIT] ℹ️ No token available, skipping pages load');
      }

      // ✅ FIX: Marquer comme terminé AVANT de désactiver le loading
      initializationDone.current = true;
      initializationInProgress.current = false;
      setLoading(false);
      console.log('[INIT] ✅ App initialization completed');

    } catch (error) {
      console.error('[INIT] ❌ Initialization error:', error);
      initializationInProgress.current = false;
      setLoading(false);
      showNotification('Erreur lors de l\'initialisation de l\'application', 'error');
    }
  }, [
    setLoading,
    setShowOnboarding,
    setOnboardingCompleted,
    setConfigLoaded,
    loadConfig,
    loadPages,
    showNotification
  ]);

  // ✅ FIX: useEffect qui s'exécute UNE SEULE FOIS au montage
  useEffect(() => {
    if (!initializationDone.current && !initializationInProgress.current) {
      initializeApp();
    }
  }, []); // ✅ IMPORTANT: Tableau de dépendances VIDE pour une seule exécution

  // Handler pour compléter l'onboarding
  const handleCompleteOnboarding = useCallback(async (token: string) => {
    try {
      console.log('[ONBOARDING] ✨ Completing onboarding with token:', token ? '***' : 'NO TOKEN');

      if (!token || !token.trim()) {
        console.error('[ONBOARDING] ❌ No token provided!');
        showNotification('Erreur: Token manquant', 'error');
        return;
      }

      // 1. Sauvegarder le token
      console.log('[ONBOARDING] 💾 Saving token to config...');
      await updateConfig({
        notionToken: token.trim(),
        onboardingCompleted: true
      });

      // 2. Charger les pages DIRECTEMENT avec l'API
      console.log('[ONBOARDING] 📄 Loading pages directly...');
      try {
        // Appel direct à l'API Notion pour charger les pages
        const pagesResult = await window.electronAPI?.getPagesPaginated?.({
          cursor: undefined,
          pageSize: 50
        });
        
        if (pagesResult?.success && pagesResult?.pages) {
          console.log(`[ONBOARDING] ✅ Loaded ${pagesResult.pages.length} pages directly`);
          
          // Forcer le rechargement de tous les hooks de pages
          window.dispatchEvent(new CustomEvent('pages-loaded', { 
            detail: { pages: pagesResult.pages, source: 'onboarding' }
          }));
        } else {
          console.warn('[ONBOARDING] ⚠️ Failed to load pages:', pagesResult);
        }
      } catch (error) {
        console.error('[ONBOARDING] ❌ Error loading pages:', error);
      }

      // 3. Succès
      setShowOnboarding(false);
      setOnboardingCompleted(true);
      showNotification('Configuration terminée avec succès', 'success');
    } catch (error) {
      console.error('[ONBOARDING] ❌ Critical error during onboarding:', error);
      showNotification('Erreur critique lors de la configuration', 'error');
    }
  }, [updateConfig, loadPages, setShowOnboarding, setOnboardingCompleted, showNotification]);

  // ✅ FIX: Fonction de réinitialisation explicite (si besoin)
  const resetInitialization = useCallback(() => {
    console.log('[INIT] 🔄 Resetting initialization state');
    initializationDone.current = false;
    initializationInProgress.current = false;
  }, []);

  return {
    isInitialized: initializationDone.current,
    handleCompleteOnboarding,
    resetInitialization
  };
}