/**
 * Subscription Context
 *
 * Fournit les services de subscription à toute l'application
 *
 * Design Philosophy:
 * - Injection de dépendances propre
 * - Initialisation centralisée
 * - Pas de logique métier (uniquement provider)
 */

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { SubscriptionService, UsageTrackingService, QuotaService } from '@notion-clipper/core-shared';
import { authDataManager } from '../services/AuthDataManager';

export interface SubscriptionContextValue {
  subscriptionService: SubscriptionService;
  usageTrackingService: UsageTrackingService;
  quotaService: QuotaService;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export interface SubscriptionProviderProps {
  children: ReactNode;
  getSupabaseClient: () => any;
}

/**
 * Provider pour les services de subscription
 */
export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
  getSupabaseClient,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const services = useMemo(() => {
    // Créer les services
    const subscriptionService = new SubscriptionService(getSupabaseClient);
    const usageTrackingService = new UsageTrackingService(getSupabaseClient);
    const quotaService = new QuotaService(subscriptionService, usageTrackingService);

    return {
      subscriptionService,
      usageTrackingService,
      quotaService,
    };
  }, [getSupabaseClient]);

  // Check authentication status before initializing services
  // 🔧 FIX: Use AuthDataManager instead of Supabase Auth (custom OAuth flow)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ✅ FIX: Check AuthDataManager for custom OAuth users (Google/Notion)
        const authData = await authDataManager.loadAuthData();
        const isUserAuthenticated = !!(authData?.userId);

        console.log('[SubscriptionContext] Auth check:', {
          isAuthenticated: isUserAuthenticated,
          userId: authData?.userId,
          provider: authData?.authProvider
        });

        setIsAuthenticated(isUserAuthenticated);
        setIsChecking(false);

        // Only initialize services if user is authenticated
        if (isUserAuthenticated) {
          console.log('[SubscriptionContext] Initializing subscription services...');
          Promise.all([
            services.subscriptionService.initialize(),
            services.usageTrackingService.initialize(),
            services.quotaService.initialize(),
          ]).then(() => {
            console.log('[SubscriptionContext] ✅ Subscription services initialized');
          }).catch((error) => {
            // Ne logger que si ce n'est pas une erreur d'authentification
            if (!error.message?.includes('Authentication required') &&
                !error.message?.includes('No subscription found')) {
              console.error('[SubscriptionContext] Failed to initialize subscription services:', error);
            }
          });
        } else {
          console.log('[SubscriptionContext] No authenticated user, skipping service initialization');
        }
      } catch (error) {
        console.error('[SubscriptionContext] Failed to check authentication:', error);
        setIsAuthenticated(false);
        setIsChecking(false);
      }
    };

    checkAuth();

    // Listen for auth state changes (Supabase Auth - for future compatibility)
    // Note: Custom OAuth (Google/Notion) users won't trigger this
    const supabase = getSupabaseClient();
    if (supabase?.auth?.onAuthStateChange) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
        console.log('[SubscriptionContext] Supabase auth state changed:', event);

        const wasAuthenticated = isAuthenticated;
        const nowAuthenticated = !!session?.user;

        setIsAuthenticated(nowAuthenticated);

        // Initialize services when user logs in
        if (!wasAuthenticated && nowAuthenticated) {
          console.log('[SubscriptionContext] User logged in via Supabase Auth, initializing services...');
          Promise.all([
            services.subscriptionService.initialize(),
            services.usageTrackingService.initialize(),
            services.quotaService.initialize(),
          ]).catch((error) => {
            if (!error.message?.includes('Authentication required') &&
                !error.message?.includes('No subscription found')) {
              console.error('[SubscriptionContext] Failed to initialize subscription services:', error);
            }
          });
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, [getSupabaseClient, services, isAuthenticated]);

  return (
    <SubscriptionContext.Provider value={services}>
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
