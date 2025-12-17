/**
 * Subscription Context
 *
 * Fournit les services de subscription à toute l'application
 *
 * Design Philosophy:
 * - Injection de dépendances propre
 * - Initialisation centralisée avec déduplication
 * - Pas de logique métier (uniquement provider)
 */

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { SubscriptionService, UsageTrackingService, QuotaService } from '@notion-clipper/core-shared';
import { authDataManager } from '../services/AuthDataManager';

export interface SubscriptionContextValue {
  subscriptionService: SubscriptionService;
  usageTrackingService: UsageTrackingService;
  quotaService: QuotaService;
  isServicesInitialized: boolean;
  // 🔧 FIX: Expose initializeServices for manual triggering after onboarding
  initializeServices: (userId: string) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export interface SubscriptionProviderProps {
  children: ReactNode;
  getSupabaseClient: () => any;
  supabaseUrl: string;
  supabaseKey: string;
}

/**
 * Provider pour les services de subscription
 */
export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
  getSupabaseClient,
  supabaseUrl,
  supabaseKey,
}) => {
  const [isServicesInitialized, setIsServicesInitialized] = useState(false);
  
  // Refs for deduplication - prevent multiple init calls
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const didMountRef = useRef(false);
  
  // 🔧 FIX BUG #1: Use ref to track isServicesInitialized for stable callback
  // This prevents stale closure in event listeners
  const isInitializedRef = useRef(false);
  useEffect(() => {
    isInitializedRef.current = isServicesInitialized;
  }, [isServicesInitialized]);

  // 🔧 FIX RISK #1: Stabilize getSupabaseClient via ref to prevent services recreation
  const getSupabaseClientRef = useRef(getSupabaseClient);
  useEffect(() => {
    getSupabaseClientRef.current = getSupabaseClient;
  }, [getSupabaseClient]);

  const services = useMemo(() => {
    // Use ref getter to avoid dependency on getSupabaseClient
    const stableGetter = () => getSupabaseClientRef.current();
    const subscriptionService = new SubscriptionService(stableGetter, supabaseUrl, supabaseKey);
    const usageTrackingService = new UsageTrackingService(stableGetter, supabaseUrl, supabaseKey);
    const quotaService = new QuotaService(subscriptionService, usageTrackingService);

    return {
      subscriptionService,
      usageTrackingService,
      quotaService,
    };
  }, [supabaseUrl, supabaseKey]); // 🔧 Removed getSupabaseClient - now stable via ref

  // Single initialization function with deduplication
  // 🔧 FIX BUG #1: Use isInitializedRef instead of isServicesInitialized state
  // This makes the callback truly stable (no deps on changing state)
  const initializeServices = useCallback(async (userId: string): Promise<void> => {
    // Skip if already initializing or same user
    if (initPromiseRef.current && lastUserIdRef.current === userId) {
      return initPromiseRef.current;
    }

    // Skip if same user already initialized (use ref, not state!)
    if (lastUserIdRef.current === userId && isInitializedRef.current) {
      return;
    }

    console.log('[SubscriptionContext] Initializing services for user:', userId);
    lastUserIdRef.current = userId;
    setIsServicesInitialized(false);
    isInitializedRef.current = false;

    // Set getUserId callback
    services.usageTrackingService.setGetUserIdCallback(async () => {
      try {
        const authData = await authDataManager.loadAuthData();
        return authData?.userId || null;
      } catch {
        return null;
      }
    });

    // Create and store the promise
    initPromiseRef.current = Promise.all([
      services.subscriptionService.initialize(),
      services.usageTrackingService.initialize(),
      services.quotaService.initialize(),
    ]).then(() => {
      console.log('[SubscriptionContext] ✅ Services initialized');
      setIsServicesInitialized(true);
      isInitializedRef.current = true;
      initPromiseRef.current = null;
    }).catch((error) => {
      if (!error.message?.includes('Authentication required') &&
          !error.message?.includes('No subscription found')) {
        console.error('[SubscriptionContext] Init error:', error);
      }
      setIsServicesInitialized(false);
      isInitializedRef.current = false;
      initPromiseRef.current = null;
    });

    return initPromiseRef.current;
  }, [services]); // 🔧 Only depends on services (stable), not isServicesInitialized

  // 🔧 FIX: Separate useEffect for event listener to ensure it's always attached
  // even after StrictMode re-mounts
  // 🔧 FIX BUG #1: initializeServices is now stable (deps only on services), so no stale closure
  useEffect(() => {
    // Listen for custom auth events - this MUST run on every mount
    // 🔧 FIX RISK #2: Use event payload to avoid unnecessary loadAuthData calls
    const handleAuthChange = async (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string | null }>;
      const userIdFromEvent = customEvent.detail?.userId;
      
      console.log('[SubscriptionContext] 🔔 Received auth-data-changed event', { userIdFromEvent });
      
      try {
        // Use userId from event if available, otherwise fetch fresh
        let userId = userIdFromEvent;
        if (userId === undefined) {
          const freshAuthData = await authDataManager.loadAuthData(true);
          userId = freshAuthData?.userId ?? null;
          console.log('[SubscriptionContext] 📊 Fetched fresh auth data:', {
            userId: userId?.substring(0, 8) + '...'
          });
        }
        
        if (userId) {
          console.log('[SubscriptionContext] 🚀 Calling initializeServices...');
          await initializeServices(userId);
        } else {
          // 🔧 FIX BUG #2: Handle logout (userId = null from clearAuthData)
          console.log('[SubscriptionContext] ⚠️ No userId, resetting services (logout)');
          lastUserIdRef.current = null;
          setIsServicesInitialized(false);
          isInitializedRef.current = false;
        }
      } catch (error) {
        console.error('[SubscriptionContext] ❌ Error in handleAuthChange:', error);
      }
    };

    window.addEventListener('auth-data-changed', handleAuthChange);
    console.log('[SubscriptionContext] 👂 Event listener attached for auth-data-changed');

    return () => {
      console.log('[SubscriptionContext] 🔌 Event listener removed for auth-data-changed');
      window.removeEventListener('auth-data-changed', handleAuthChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps OK - initializeServices is stable now

  // Single useEffect for initial auth check (runs once)
  useEffect(() => {
    if (didMountRef.current) return;
    didMountRef.current = true;

    const checkAuth = async () => {
      try {
        console.log('[SubscriptionContext] 🔍 Checking initial auth...');
        const authData = await authDataManager.loadAuthData();
        if (authData?.userId) {
          console.log('[SubscriptionContext] 🎯 Found userId, initializing services...');
          await initializeServices(authData.userId);
        } else {
          console.log('[SubscriptionContext] ℹ️ No userId found on initial check');
        }
      } catch (error) {
        console.error('[SubscriptionContext] Auth check failed:', error);
      }
    };

    checkAuth();

    // Listen for Supabase auth changes
    const supabase = getSupabaseClient();
    let unsubscribe: (() => void) | undefined;
    
    if (supabase?.auth?.onAuthStateChange) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
        if (session?.user?.id) {
          await initializeServices(session.user.id);
        } else {
          lastUserIdRef.current = null;
          setIsServicesInitialized(false);
        }
      });
      unsubscribe = () => subscription?.unsubscribe();
    }

    return () => {
      unsubscribe?.();
    };
  // eslint-disable-next-line react-hooks-deps
  }, []); // Empty deps - didMountRef guards

  // 🔧 FIX: Memoize context value to prevent unnecessary re-renders
  // Without this, every render creates a new object → consumers re-render → potential infinite loops
  const contextValue = useMemo(() => ({
    ...services,
    isServicesInitialized,
    initializeServices,
  }), [services, isServicesInitialized, initializeServices]);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

/**
 * Hook pour accéder au context
 */
export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error(
      'useSubscriptionContext must be used within a SubscriptionProvider'
    );
  }

  return context;
}

/**
 * HOC pour injecter les services
 */
export function withSubscription<P extends object>(
  Component: React.ComponentType<P & SubscriptionContextValue>
) {
  return (props: P) => {
    const services = useSubscriptionContext();
    return <Component {...props} {...services} />;
  };
}
