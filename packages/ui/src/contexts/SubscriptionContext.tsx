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
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        setIsAuthenticated(!!user);
        setIsChecking(false);

        // Only initialize services if user is authenticated
        if (user) {
          Promise.all([
            services.subscriptionService.initialize(),
            services.usageTrackingService.initialize(),
            services.quotaService.initialize(),
          ]).catch((error) => {
            // Ne logger que si ce n'est pas une erreur d'authentification
            if (!error.message?.includes('Authentication required') &&
                !error.message?.includes('No subscription found')) {
              console.error('Failed to initialize subscription services:', error);
            }
          });
        }
      } catch (error) {
        console.error('Failed to check authentication:', error);
        setIsAuthenticated(false);
        setIsChecking(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      const wasAuthenticated = isAuthenticated;
      const nowAuthenticated = !!session?.user;

      setIsAuthenticated(nowAuthenticated);

      // Initialize services when user logs in
      if (!wasAuthenticated && nowAuthenticated) {
        Promise.all([
          services.subscriptionService.initialize(),
          services.usageTrackingService.initialize(),
          services.quotaService.initialize(),
        ]).catch((error) => {
          if (!error.message?.includes('Authentication required') &&
              !error.message?.includes('No subscription found')) {
            console.error('Failed to initialize subscription services:', error);
          }
        });
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
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
