// packages/ui/src/hooks/useAppInitialization.ts
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
  const initializationDone = useRef(false);
  const loadConfigRef = useRef(loadConfig);
  const loadPagesRef = useRef(loadPages);

  // Mettre à jour les références
  useEffect(() => {
    loadConfigRef.current = loadConfig;
    loadPagesRef.current = loadPages;
  }, [loadConfig, loadPages]);

  // Initialisation de l'app - UNE SEULE FOIS
  useEffect(() => {
    if (initializationDone.current) {
      console.log('[INIT] ⚠️ Initialization already done, skipping...');
      return;
    }

    const initializeApp = async () => {
      try {
        console.log('[INIT] Starting app initialization...');
        initializationDone.current = true;

        // 1. Charger la configuration
        console.log('[INIT] Loading configuration...');
        if (!loadConfigRef.current) {
          console.error('[INIT] loadConfig not available');
          setShowOnboarding(true);
          setLoading(false);
          return;
        }

        const loadedConfig = await loadConfigRef.current();
        console.log('[INIT] Config loaded:', { 
          ...loadedConfig, 
          notionToken: loadedConfig.notionToken ? '***' : 'EMPTY' 
        });
        setConfigLoaded(true);

        // 2. Déterminer si l'onboarding est nécessaire
        const hasToken = !!(loadedConfig.notionToken || loadedConfig.notionToken_encrypted);
        const explicitlyCompleted = loadedConfig?.onboardingCompleted === true;
        const isOnboardingDone = hasToken || explicitlyCompleted;

        console.log('[INIT] Has token:', hasToken);
        console.log('[INIT] Explicitly completed:', explicitlyCompleted);
        console.log('[INIT] Onboarding done:', isOnboardingDone);

        setOnboardingCompleted(isOnboardingDone);
        setShowOnboarding(!isOnboardingDone);

        // 3. Charger les pages si token présent
        if (hasToken && loadPagesRef.current) {
          console.log('[INIT] Token found, loading pages...');
          await loadPagesRef.current();
        }
      } catch (error) {
        console.error('[INIT] Error during initialization:', error);
        setShowOnboarding(true);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []); // Aucune dépendance - ne se déclenche qu'au montage

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
      console.log('[ONBOARDING] ✅ Token and onboardingCompleted flag saved');

      // 2. Attendre la propagation
      await new Promise(resolve => setTimeout(resolve, 300));

      // 3. Recharger la config
      console.log('[ONBOARDING] 🔄 Reloading config to confirm token...');
      const updatedConfig = await loadConfigRef.current();
      console.log('[ONBOARDING] Updated config:', {
        ...updatedConfig,
        notionToken: updatedConfig.notionToken ? '***' : 'EMPTY',
        notionToken_encrypted: updatedConfig.notionToken_encrypted ? '***' : 'EMPTY'
      });

      // 4. Vérifier la sauvegarde
      const hasNewToken = !!(updatedConfig.notionToken || updatedConfig.notionToken_encrypted);
      console.log('[ONBOARDING] Has new token after save:', hasNewToken);
      
      if (!hasNewToken) {
        console.error('[ONBOARDING] ❌ Token was not saved correctly!');
        showNotification('Erreur: Le token n\'a pas été sauvegardé', 'error');
        return;
      }

      // 5. Réinitialiser le NotionService
      console.log('[ONBOARDING] 🔄 Forcing NotionService reinitialization...');
      if (window.electronAPI?.invoke) {
        try {
          const reinitResult = await window.electronAPI.invoke('notion:reinitialize-service');
          console.log('[ONBOARDING] NotionService reinitialization result:', reinitResult);
          
          if (!reinitResult.success) {
            console.error('[ONBOARDING] ❌ NotionService reinit failed:', reinitResult.error);
            showNotification(`Erreur d'initialisation: ${reinitResult.error}`, 'error');
            return;
          }
          console.log('[ONBOARDING] ✅ NotionService successfully reinitialized');
        } catch (error) {
          console.error('[ONBOARDING] ❌ Failed to reinitialize NotionService:', error);
          showNotification('Erreur lors de l\'initialisation du service', 'error');
          return;
        }
      }

      // 6. Charger les pages
      console.log('[ONBOARDING] 📄 Loading pages...');
      if (loadPagesRef.current) {
        await loadPagesRef.current();
        console.log('[ONBOARDING] ✅ Pages loaded successfully');
      } else {
        console.warn('[ONBOARDING] ⚠️ loadPages function not available');
      }

      // 7. Succès
      setShowOnboarding(false);
      setOnboardingCompleted(true);
      initializationDone.current = false; // Reset pour forcer un reload complet
      showNotification('Configuration terminée avec succès', 'success');
    } catch (error) {
      console.error('[ONBOARDING] ❌ Critical error during onboarding:', error);
      showNotification('Erreur critique lors de la configuration', 'error');
    }
  }, [updateConfig, showNotification]);

  // Handler pour reset complet de l'app
  const handleResetApp = useCallback(async () => {
    try {
      console.log('[RESET] 🔄 Starting COMPLETE app reset to factory defaults...');

      // 1. Reset complet de la configuration
      if (window.electronAPI?.invoke) {
        const result = await window.electronAPI.invoke('config:reset');
        if (result.success) {
          console.log('[RESET] ✅ ALL config variables reset to defaults');
        }
      }

      // 2. Clear tous les caches
      if (window.electronAPI?.invoke) {
        await window.electronAPI.invoke('cache:clear');
        console.log('[RESET] ✅ Pages cache cleared');
      }
      
      if (window.electronAPI?.invoke) {
        await window.electronAPI.invoke('suggestion:clear-cache');
        console.log('[RESET] ✅ Suggestions cache cleared');
      }

      // 3. Reset des statistiques
      if (window.electronAPI?.invoke) {
        await window.electronAPI.invoke('stats:reset');
        console.log('[RESET] ✅ Stats reset to zero');
      }

      // 4. Reset du flag d'initialisation
      initializationDone.current = false;
      
      console.log('[RESET] ✅ COMPLETE reset done - App is now like a fresh install');
      showNotification('Application réinitialisée complètement', 'success');
    } catch (error) {
      console.error('[RESET] Error during reset:', error);
      showNotification('Erreur lors du reset', 'error');
    }
  }, [showNotification]);

  return {
    initializationDone,
    handleCompleteOnboarding,
    handleResetApp
  };
}