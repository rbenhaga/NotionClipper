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

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
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
  const services = useMemo(() => {
    // Créer les services
    const subscriptionService = new SubscriptionService(getSupabaseClient);
    const usageTrackingService = new UsageTrackingService(getSupabaseClient);
    const quotaService = new QuotaService(subscriptionService, usageTrackingService);

    // Les initialiser (à faire de manière asynchrone dans un useEffect)
    // Silently fail si l'utilisateur n'est pas encore authentifié (onboarding)
    Promise.all([
      subscriptionService.initialize(),
      usageTrackingService.initialize(),
      quotaService.initialize(),
    ]).catch((error) => {
      // Ne logger que si ce n'est pas une erreur d'authentification
      if (!error.message?.includes('Authentication required') && 
          !error.message?.includes('No subscription found')) {
        console.error('Failed to initialize subscription services:', error);
      }
    });

    return {
      subscriptionService,
      usageTrackingService,
      quotaService,
    };
  }, [getSupabaseClient]);

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
