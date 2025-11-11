// packages/ui/src/hooks/core/useAppInitialization.ts
// ✅ FIX: Prévention complète des boucles infinies lors de l'initialisation
import { useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '@notion-clipper/i18n';

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
  // i18n
  const { t } = useTranslation();

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

      // 3. Réinitialiser le NotionService si token disponible
      if (hasToken) {
        console.log('[INIT] 🔄 Reinitializing NotionService with existing token...');
        try {
          const reinitResult = await window.electronAPI?.invoke?.('notion:reinitialize-service');
          if (reinitResult?.success) {
            console.log('[INIT] ✅ NotionService reinitialized successfully');
          } else {
            console.error('[INIT] ❌ Failed to reinitialize NotionService:', reinitResult?.error);
          }
        } catch (error) {
          console.error('[INIT] ❌ Error reinitializing NotionService:', error);
        }

        // 4. Charger les pages
        console.log('[INIT] 📚 Loading Notion pages...');
        try {
          await loadPages();
          console.log('[INIT] ✅ Pages loaded successfully');
        } catch (error) {
          console.error('[INIT] ❌ Failed to load pages:', error);
          showNotification(t('notifications.loadPagesError'), 'error');
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
      showNotification(t('notifications.initError'), 'error');
    }
  }, [
    t,
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
  const handleCompleteOnboarding = useCallback(async (token: string, workspaceInfo?: { id: string; name: string; icon?: string }) => {
    try {
      console.log('[ONBOARDING] ✨ Completing onboarding with token:', token ? '***' : 'NO TOKEN');

      if (!token || !token.trim()) {
        console.error('[ONBOARDING] ❌ No token provided!');
        showNotification(t('notifications.tokenMissing'), 'error');
        return;
      }

      // 1. Sauvegarder le token
      console.log('[ONBOARDING] 💾 Saving token to config...');
      await updateConfig({
        notionToken: token.trim(),
        onboardingCompleted: true
      });

      // 🆕 2. NOUVEAU: Enregistrer dans Supabase Auth
      if (window.electronAPI?.supabase && workspaceInfo) {
        try {
          console.log('[ONBOARDING] 🔐 Creating Supabase user...');

          // Générer un email basé sur workspace_id
          const email = `${workspaceInfo.id}@notionclipper.app`;

          // Générer un mot de passe sécurisé aléatoire
          const password = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          // Essayer de créer un utilisateur Supabase
          const { data, error } = await window.electronAPI.supabase.auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                notion_workspace_id: workspaceInfo.id,
                notion_workspace_name: workspaceInfo.name,
                notion_workspace_icon: workspaceInfo.icon,
                source: 'notion_oauth'
              }
            }
          });

          if (error) {
            // Si l'utilisateur existe déjà, se connecter
            if (error.message.includes('already registered') || error.message.includes('User already registered')) {
              console.log('[ONBOARDING] User already exists, signing in...');

              // Se connecter avec l'email/password stocké
              const { data: signInData, error: signInError } = await window.electronAPI.supabase.auth.signInWithPassword({
                email: email,
                password: password
              });

              if (signInError) {
                console.warn('[ONBOARDING] ⚠️ Could not sign in existing user:', signInError);
              } else {
                console.log('[ONBOARDING] ✅ Signed in existing user:', signInData.user?.id);
              }
            } else {
              throw error;
            }
          } else {
            console.log('[ONBOARDING] ✅ Supabase user created:', data.user?.id);
          }

          // La subscription FREE sera créée automatiquement par l'Edge Function get-subscription

        } catch (supabaseError: any) {
          console.error('[ONBOARDING] ⚠️ Supabase registration failed:', supabaseError);
          // Continuer quand même - la subscription sera créée au prochain appel API
        }
      } else {
        console.warn('[ONBOARDING] ⚠️ Supabase client or workspace info not available');
      }

      // 🔥 FIX CRITIQUE: Réinitialiser le NotionService avec le nouveau token
      console.log('[ONBOARDING] 🔄 Reinitializing NotionService...');
      try {
        const reinitResult = await window.electronAPI?.invoke?.('notion:reinitialize-service');
        if (reinitResult?.success) {
          console.log('[ONBOARDING] ✅ NotionService reinitialized successfully');
        } else {
          console.error('[ONBOARDING] ❌ Failed to reinitialize NotionService:', reinitResult?.error);
          showNotification(t('notifications.notionServiceError'), 'error');
          return;
        }
      } catch (error) {
        console.error('[ONBOARDING] ❌ Critical error reinitializing NotionService:', error);
        showNotification(t('notifications.criticalInitError'), 'error');
        return;
      }

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
      showNotification(t('notifications.configCompleted'), 'success');

      // 🆕 4. NOUVEAU: Retourner true pour indiquer qu'on doit afficher le modal Premium
      return true;

    } catch (error) {
      console.error('[ONBOARDING] ❌ Critical error during onboarding:', error);
      showNotification(t('notifications.criticalConfigError'), 'error');
      return false;
    }
  }, [t, updateConfig, loadPages, setShowOnboarding, setOnboardingCompleted, showNotification]);

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