/**
 * Edge Function Service
 *
 * Client pour appeler les Supabase Edge Functions de manière sécurisée
 *
 * SÉCURITÉ:
 * - N'expose JAMAIS les clés secrètes Stripe
 * - Envoie uniquement le USER_TOKEN (Bearer)
 * - Toute la logique Stripe est côté serveur
 *
 * Design Philosophy (Apple/Notion):
 * - API simple et claire
 * - Gestion d'erreurs robuste
 * - Retry automatique avec exponential backoff
 * - Timeout configurable
 */

import {
  CreateCheckoutPayload,
  CheckoutResponse,
  Subscription,
  QuotaSummary,
} from '../types/subscription.types';

export interface EdgeFunctionConfig {
  supabaseUrl: string;
  supabaseKey: string; // Anon key pour authentifier les requêtes Edge Functions
  functionPath?: string; // Par défaut: /functions/v1
}

export interface EdgeFunctionCallOptions {
  timeout?: number; // Timeout en ms (défaut: 30000)
  retries?: number; // Nombre de retries (défaut: 2)
  requireAuth?: boolean; // Nécessite authentification (défaut: true)
}

export class EdgeFunctionService {
  private config: EdgeFunctionConfig;
  private getAuthToken: () => Promise<string | null>;

  constructor(
    config: EdgeFunctionConfig,
    getAuthToken: () => Promise<string | null>
  ) {
    // 🔧 FIX: Validate config
    if (!config.supabaseUrl) {
      throw new Error('EdgeFunctionService: supabaseUrl is required');
    }
    if (!config.supabaseKey) {
      throw new Error('EdgeFunctionService: supabaseKey is required');
    }

    this.config = {
      functionPath: '/functions/v1',
      ...config,
    };
    this.getAuthToken = getAuthToken;

    console.log('[EdgeFunctionService] Initialized with URL:', config.supabaseUrl);
  }

  /**
   * Appelle create-checkout Edge Function
   *
   * Crée une session Stripe Checkout de manière sécurisée
   * L'Edge Function gère STRIPE_SECRET_KEY côté serveur
   *
   * @returns URL de checkout Stripe et session_id
   */
  async createCheckout(payload: CreateCheckoutPayload): Promise<CheckoutResponse> {
    const response = await this.callEdgeFunction<CheckoutResponse>(
      'create-checkout',
      {
        method: 'POST',
        body: JSON.stringify({
          success_url: payload.success_url,
          cancel_url: payload.cancel_url,
          metadata: payload.metadata,
        }),
      }
    );

    return response;
  }

  /**
   * Appelle get-subscription Edge Function
   *
   * Récupère les informations de subscription avec quotas calculés
   *
   * @param userId - ID de l'utilisateur (obligatoire)
   * @returns Subscription complète avec usage et quotas
   */
  async getSubscription(userId: string): Promise<{
    subscription: Subscription | null;
    quotas: QuotaSummary;
  }> {
    if (!userId) {
      throw new Error('userId is required for getSubscription');
    }

    const response = await this.callEdgeFunction<{
      subscription: any;
      quotas: QuotaSummary;
    }>('get-subscription', {
      method: 'POST',
      body: JSON.stringify({ userId }),
      requireAuth: false, // Edge Function uses SERVICE_ROLE_KEY, no user auth needed
    });

    return response;
  }

  /**
   * Appelle create-portal-session Edge Function
   *
   * Crée une session Stripe Customer Portal pour gérer l'abonnement
   * (annuler, voir factures, modifier carte, etc.)
   *
   * @param returnUrl URL de retour après gestion (optionnel)
   * @returns URL du portal Stripe
   */
  async createPortalSession(returnUrl?: string): Promise<{ url: string }> {
    const response = await this.callEdgeFunction<{ url: string }>(
      'create-portal-session',
      {
        method: 'POST',
        body: JSON.stringify({
          return_url: returnUrl || 'clipperpro://settings',
        }),
      }
    );

    return response;
  }

  /**
   * Appelle une Edge Function générique
   *
   * Gère automatiquement:
   * - Authentification (Bearer token)
   * - Retry avec exponential backoff
   * - Timeout
   * - Parsing des erreurs
   */
  private async callEdgeFunction<T>(
    functionName: string,
    init: RequestInit & EdgeFunctionCallOptions = {}
  ): Promise<T> {
    const {
      timeout = 30000,
      retries = 2,
      requireAuth = true,
      ...fetchOptions
    } = init;

    // Construire l'URL
    const url = `${this.config.supabaseUrl}${this.config.functionPath}/${functionName}`;

    console.log(`[EdgeFunctionService] Calling ${functionName}:`, { url, requireAuth });

    // Préparer les headers
    // 🔧 FIX: Toujours inclure apikey (requis par Supabase Edge Functions)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': this.config.supabaseKey, // ✅ CRITICAL: Required by Supabase
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    // Ajouter l'authentification
    // 🔧 FIX CRITICAL: Toujours envoyer Authorization header
    // - Pour requireAuth: true → utiliser le JWT utilisateur
    // - Pour requireAuth: false → utiliser l'anon key
    // NOTE: Les changements Supabase 2025 (interdisant anon key dans Authorization)
    // sont opt-in et pas encore actifs. Le comportement actuel requiert Authorization.
    if (requireAuth) {
      // Auth utilisateur requise → utiliser JWT
      const token = await this.getAuthToken();

      if (!token) {
        console.error('[EdgeFunctionService] No auth token available for', functionName);
        throw new EdgeFunctionError(
          'Authentication required',
          'UNAUTHORIZED',
          401
        );
      }

      headers['Authorization'] = `Bearer ${token}`;
      console.log('[EdgeFunctionService] Using user JWT token');
    } else {
      // Edge Function avec SERVICE_ROLE_KEY → utiliser anon key
      // (même pattern que get-notion-token qui fonctionne)
      headers['Authorization'] = `Bearer ${this.config.supabaseKey}`;
      console.log('[EdgeFunctionService] Using anon key for auth');
    }

    // Appeler avec retry
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Vérifier le status
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new EdgeFunctionError(
            errorData.error || `HTTP ${response.status}`,
            errorData.code || 'HTTP_ERROR',
            response.status,
            errorData
          );
        }

        // Parser la réponse
        const data = await response.json();

        return data as T;
      } catch (error) {
        lastError = error as Error;

        // Ne pas retry sur les erreurs 4xx (sauf 429)
        if (
          error instanceof EdgeFunctionError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429
        ) {
          throw error;
        }

        // Attendre avant de retry (exponential backoff)
        if (attempt < retries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // Tous les retries ont échoué
    throw lastError || new Error('Edge Function call failed');
  }
}

/**
 * Erreur spécifique aux Edge Functions
 */
export class EdgeFunctionError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'EdgeFunctionError';
  }
}

/**
 * Helpers pour gérer les redirections Stripe
 */
export class StripeCheckoutHelper {
  /**
   * Ouvre l'URL de checkout dans le navigateur par défaut
   *
   * Compatible Electron et Web
   */
  static openCheckoutUrl(url: string): void {
    // Détecter l'environnement
    if (typeof window !== 'undefined' && typeof require === 'function') {
      // Environnement Electron
      try {
        const { shell } = require('electron');
        shell.openExternal(url);
      } catch (error) {
        console.error('Failed to open checkout URL in Electron:', error);
        // Fallback: ouvrir dans une nouvelle fenêtre
        window.open(url, '_blank');
      }
    } else if (typeof window !== 'undefined') {
      // Environnement Web
      window.open(url, '_blank');
    } else {
      console.error('Cannot open checkout URL: no window object available');
    }
  }

  /**
   * Écoute les événements de retour depuis Stripe
   *
   * Détecte quand l'utilisateur revient après paiement
   */
  static listenForCheckoutReturn(
    onSuccess: () => void,
    onCancel: () => void
  ): () => void {
    if (typeof window === 'undefined') {
      console.warn('Cannot listen for checkout return: no window object');
      return () => {};
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // L'utilisateur est revenu à l'app
        // Vérifier le status de la subscription
        const params = new URLSearchParams(window.location.search);

        if (params.has('checkout_success')) {
          onSuccess();
        } else if (params.has('checkout_canceled')) {
          onCancel();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Retourner la fonction de cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }
}
