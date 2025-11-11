# 🚀 Guide d'Intégration Electron - Système Freemium/Premium

Ce guide explique comment intégrer le système de subscription dans votre application Electron NotionClipper.

---

## 📋 Table des Matières

1. [Architecture](#architecture)
2. [Prérequis](#prérequis)
3. [Étape 1: Initialiser les Services](#étape-1-initialiser-les-services)
4. [Étape 2: Ajouter le SubscriptionProvider](#étape-2-ajouter-le-subscriptionprovider)
5. [Étape 3: Créer le Composant Settings](#étape-3-créer-le-composant-settings)
6. [Étape 4: Gérer le Flow de Checkout](#étape-4-gérer-le-flow-de-checkout)
7. [Étape 5: Afficher les Quotas](#étape-5-afficher-les-quotas)
8. [Étape 6: Vérifier les Quotas Avant Actions](#étape-6-vérifier-les-quotas-avant-actions)
9. [Exemples Complets](#exemples-complets)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron App (UI)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         SubscriptionContext Provider                 │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ Components (Settings, UpgradeModal, Badges)   │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓ (API Calls)
┌─────────────────────────────────────────────────────────────┐
│             Core Services (core-shared)                     │
│  ┌───────────────────┐  ┌──────────────────┐               │
│  │ Subscription      │  │ EdgeFunction     │               │
│  │ Service           │  │ Service          │               │
│  └───────────────────┘  └──────────────────┘               │
│  ┌───────────────────┐  ┌──────────────────┐               │
│  │ Quota Service     │  │ UsageTracking    │               │
│  │                   │  │ Service          │               │
│  └───────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                           ↓ (HTTP Requests)
┌─────────────────────────────────────────────────────────────┐
│         Supabase Edge Functions (Server-side)               │
│  ┌───────────────────┐  ┌──────────────────┐               │
│  │ create-checkout   │  │ get-subscription │               │
│  └───────────────────┘  └──────────────────┘               │
│  ┌───────────────────┐  ┌──────────────────┐               │
│  │ webhook-stripe    │  │ create-portal    │               │
│  └───────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Stripe API + Supabase DB                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Prérequis

### 1. Variables d'environnement (.env)

```bash
# Supabase
SUPABASE_URL=https://rijjtngbgahxdjflfyhi.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Stripe (clés publiques uniquement)
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Success/Cancel URLs
STRIPE_SUCCESS_URL=notionclipper://subscription/success
STRIPE_CANCEL_URL=notionclipper://subscription/canceled
```

### 2. Edge Functions déployées

```bash
# Déployer toutes les Edge Functions
supabase functions deploy create-checkout
supabase functions deploy get-subscription
supabase functions deploy webhook-stripe
supabase functions deploy create-portal-session
```

### 3. Secrets configurés dans Supabase

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_PREMIUM_PRICE_ID=price_...
supabase secrets set SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Étape 1: Initialiser les Services

### packages/adapters/electron/src/subscription.adapter.ts

```typescript
/**
 * Subscription Adapter for Electron
 *
 * Initialise les services de subscription avec Supabase
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  SubscriptionService,
  UsageTrackingService,
  QuotaService,
  EdgeFunctionService,
} from '@notion-clipper/core-shared';

export class SubscriptionAdapter {
  private subscriptionService: SubscriptionService;
  private usageTrackingService: UsageTrackingService;
  private quotaService: QuotaService;
  private edgeFunctionService: EdgeFunctionService;

  constructor(supabaseClient: SupabaseClient, getAuthToken: () => Promise<string | null>) {
    // Créer EdgeFunctionService
    this.edgeFunctionService = new EdgeFunctionService(
      {
        supabaseUrl: process.env.SUPABASE_URL!,
      },
      getAuthToken
    );

    // Créer les services
    this.subscriptionService = new SubscriptionService(() => supabaseClient);
    this.usageTrackingService = new UsageTrackingService(() => supabaseClient);
    this.quotaService = new QuotaService(
      this.subscriptionService,
      this.usageTrackingService
    );

    // Initialiser EdgeFunctionService dans SubscriptionService
    this.subscriptionService.initialize(this.edgeFunctionService);
  }

  async initialize(): Promise<void> {
    await Promise.all([
      this.subscriptionService.initialize(this.edgeFunctionService),
      this.usageTrackingService.initialize(),
      this.quotaService.initialize(),
    ]);

    console.log('✅ Subscription services initialized');
  }

  getSubscriptionService(): SubscriptionService {
    return this.subscriptionService;
  }

  getUsageTrackingService(): UsageTrackingService {
    return this.usageTrackingService;
  }

  getQuotaService(): QuotaService {
    return this.quotaService;
  }

  getEdgeFunctionService(): EdgeFunctionService {
    return this.edgeFunctionService;
  }
}
```

---

## Étape 2: Ajouter le SubscriptionProvider

### App principale (ex: packages/ui/src/App.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  useEffect(() => {
    // Récupérer le client Supabase depuis l'adapter
    const client = window.electron.getSupabaseClient();
    setSupabaseClient(client);
  }, []);

  if (!supabaseClient) {
    return <div>Loading...</div>;
  }

  return (
    <SubscriptionProvider getSupabaseClient={() => supabaseClient}>
      <YourApp />
    </SubscriptionProvider>
  );
}
```

---

## Étape 3: Créer le Composant Settings

### packages/ui/src/pages/SettingsPage.tsx

```typescript
import React, { useEffect, useState } from 'react';
import { useSubscriptionContext } from '../contexts/SubscriptionContext';
import { SubscriptionBadge } from '../components/subscription/SubscriptionBadge';
import { QuotaCounter } from '../components/subscription/QuotaCounter';
import { UpgradeModal } from '../components/subscription/UpgradeModal';
import { StripeCheckoutHelper } from '@notion-clipper/core-shared';
import type { Subscription, QuotaSummary } from '@notion-clipper/core-shared';

export const SettingsPage: React.FC = () => {
  const { subscriptionService, quotaService } = useSubscriptionContext();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [quotas, setQuotas] = useState<QuotaSummary | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const sub = await subscriptionService.getCurrentSubscription();
      const quotaSummary = await quotaService.getQuotaSummary();

      setSubscription(sub);
      setQuotas(quotaSummary);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    }
  };

  const handleUpgrade = async () => {
    setIsLoadingCheckout(true);
    setIsUpgradeModalOpen(false);

    try {
      // Créer la session checkout
      const { url } = await subscriptionService.createCheckoutSession({
        success_url: 'notionclipper://subscription/success',
        cancel_url: 'notionclipper://subscription/canceled',
      });

      // Ouvrir dans le navigateur
      StripeCheckoutHelper.openCheckoutUrl(url);

      // Écouter le retour
      const cleanup = StripeCheckoutHelper.listenForCheckoutReturn(
        async () => {
          console.log('✅ Payment successful! Reloading subscription...');
          await loadSubscriptionData();
          cleanup();
        },
        () => {
          console.log('❌ Payment canceled');
          cleanup();
        }
      );
    } catch (error) {
      console.error('Failed to create checkout:', error);
      alert('Impossible de créer la session de paiement');
    } finally {
      setIsLoadingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!subscription || subscription.tier !== 'premium') {
      return;
    }

    setIsLoadingPortal(true);

    try {
      const { url } = await subscriptionService.openCustomerPortal(
        'notionclipper://settings'
      );

      StripeCheckoutHelper.openCheckoutUrl(url);
    } catch (error) {
      console.error('Failed to open portal:', error);
      alert('Impossible d\'ouvrir le portail de gestion');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  if (!subscription || !quotas) {
    return <div>Loading...</div>;
  }

  const isPremium = subscription.tier === 'premium';

  return (
    <div className="settings-page p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Paramètres</h1>

      {/* Section Abonnement */}
      <section className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Abonnement</h2>
          <SubscriptionBadge
            tier={subscription.tier}
            gracePeriodDaysRemaining={subscription.grace_period_days_remaining}
          />
        </div>

        {isPremium ? (
          <>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Vous bénéficiez de l'accès Premium illimité
            </p>
            <button
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className="btn-primary"
            >
              {isLoadingPortal ? 'Chargement...' : 'Gérer mon abonnement'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Gérez votre abonnement, vos factures et votre carte bancaire
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Passez à Premium pour débloquer toutes les fonctionnalités
            </p>
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="btn-premium"
            >
              Passer à Premium
            </button>
          </>
        )}
      </section>

      {/* Section Quotas */}
      {!isPremium && (
        <section className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <QuotaCounter
            summary={quotas}
            onUpgradeClick={() => setIsUpgradeModalOpen(true)}
          />
        </section>
      )}

      {/* Modal d'upgrade */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
};
```

---

## Étape 4: Gérer le Flow de Checkout

### Flow complet:

1. **Utilisateur clique sur "Upgrade"**
   ```typescript
   const handleUpgrade = async () => {
     const { url } = await subscriptionService.createCheckoutSession({
       success_url: 'notionclipper://subscription/success',
       cancel_url: 'notionclipper://subscription/canceled',
     });

     StripeCheckoutHelper.openCheckoutUrl(url);
   };
   ```

2. **L'utilisateur est redirigé vers Stripe Checkout**
   - Stripe ouvre dans le navigateur par défaut
   - L'utilisateur entre ses informations de paiement
   - L'utilisateur confirme le paiement

3. **Stripe traite le paiement**
   - Stripe envoie un webhook à `webhook-stripe` Edge Function
   - L'Edge Function met à jour la BDD Supabase
   - Status passe à `premium`

4. **L'utilisateur revient à l'app**
   - Stripe redirige vers `notionclipper://subscription/success`
   - L'app détecte le retour
   - L'app recharge la subscription

---

## Étape 5: Afficher les Quotas

### Dans la Sidebar (exemple)

```typescript
import React, { useEffect, useState } from 'react';
import { useSubscriptionContext } from '../contexts/SubscriptionContext';
import { QuotaCounterMini } from '../components/subscription/QuotaCounter';
import type { QuotaSummary } from '@notion-clipper/core-shared';

export const Sidebar: React.FC = () => {
  const { quotaService } = useSubscriptionContext();
  const [quotas, setQuotas] = useState<QuotaSummary | null>(null);

  useEffect(() => {
    loadQuotas();

    // Recharger toutes les 5 minutes
    const interval = setInterval(loadQuotas, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadQuotas = async () => {
    try {
      const summary = await quotaService.getQuotaSummary();
      setQuotas(summary);
    } catch (error) {
      console.error('Failed to load quotas:', error);
    }
  };

  if (!quotas) return null;

  return (
    <div className="sidebar p-4">
      {/* ... other sidebar content ... */}

      <QuotaCounterMini
        summary={quotas}
        onUpgradeClick={() => {
          // Ouvrir le modal d'upgrade ou rediriger vers Settings
        }}
      />
    </div>
  );
};
```

---

## Étape 6: Vérifier les Quotas Avant Actions

### Vérifier avant de clipper

```typescript
import { useSubscriptionContext } from '../contexts/SubscriptionContext';
import { FeatureType } from '@notion-clipper/core-shared';
import { UpgradeModal } from '../components/subscription/UpgradeModal';

export const ClipButton: React.FC = () => {
  const { quotaService, usageTrackingService } = useSubscriptionContext();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState<FeatureType | null>(null);

  const handleClip = async () => {
    try {
      // Vérifier le quota
      const canClip = await quotaService.canUseFeature(FeatureType.CLIPS);

      if (!canClip.allowed) {
        // Quota atteint, afficher le modal
        setBlockedFeature(FeatureType.CLIPS);
        setShowUpgradeModal(true);
        return;
      }

      // Clipper le contenu
      const content = await getClipContent();
      await clipToNotion(content);

      // Tracker l'usage
      await usageTrackingService.trackClip();

      console.log('✅ Clipped successfully!');
    } catch (error) {
      console.error('Failed to clip:', error);
    }
  };

  return (
    <>
      <button onClick={handleClip} className="btn-primary">
        Clipper
      </button>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        feature={blockedFeature}
        quotaReached={true}
      />
    </>
  );
};
```

### Vérifier les autres features

```typescript
// Vérifier upload de fichier
const canUploadFile = await quotaService.canUseFeature(FeatureType.FILES);

// Vérifier Focus Mode
const canUseFocusMode = await quotaService.canUseFeature(FeatureType.FOCUS_MODE_TIME, 10);

// Vérifier longueur du clip
const canClipLongContent = await quotaService.canUseFeature(
  FeatureType.WORDS_PER_CLIP,
  3500
);
```

---

## Exemples Complets

### Exemple 1: Badge Premium dans le Header

```typescript
import { SubscriptionBadgeCompact } from '../components/subscription/SubscriptionBadge';

export const Header: React.FC = () => {
  const { subscriptionService } = useSubscriptionContext();
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    subscriptionService.getCurrentSubscription().then(setSubscription);
  }, []);

  if (!subscription) return null;

  return (
    <header className="header">
      <h1>NotionClipper</h1>

      <SubscriptionBadgeCompact
        tier={subscription.tier}
        gracePeriodDaysRemaining={subscription.grace_period_days_remaining}
      />
    </header>
  );
};
```

### Exemple 2: Banner d'upgrade subtil

```typescript
import { UpgradeBanner } from '../components/subscription/UpgradeModal';

export const ContentEditor: React.FC = () => {
  const { quotaService } = useSubscriptionContext();
  const [showBanner, setShowBanner] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    checkQuota();
  }, []);

  const checkQuota = async () => {
    const quotas = await quotaService.getQuotaSummary();

    // Afficher le banner si moins de 20 clips restants
    if (quotas.clips.remaining < 20 && !quotas.clips.is_unlimited) {
      setRemaining(quotas.clips.remaining);
      setShowBanner(true);
    }
  };

  return (
    <div className="editor">
      {showBanner && (
        <UpgradeBanner
          feature={FeatureType.CLIPS}
          remaining={remaining}
          onUpgradeClick={handleUpgrade}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {/* ... editor content ... */}
    </div>
  );
};
```

---

## Troubleshooting

### Problème 1: "Authentication required"

**Cause:** Le token Supabase n'est pas valide ou expiré.

**Solution:**
```typescript
const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
};
```

### Problème 2: "No Stripe customer ID"

**Cause:** L'utilisateur n'a jamais payé, donc pas de `stripe_customer_id` dans la BDD.

**Solution:** Afficher un message approprié et ne pas essayer d'ouvrir le portal.

```typescript
if (!subscription.stripe_customer_id) {
  alert('Vous devez d\'abord souscrire à un abonnement Premium');
  return;
}
```

### Problème 3: Les quotas ne se mettent pas à jour

**Cause:** Le cache n'est pas invalidé après tracking.

**Solution:** Forcer le rechargement après chaque action.

```typescript
await usageTrackingService.trackClip();
await quotaService.invalidateCache(); // Force reload
```

### Problème 4: L'URL Stripe ne s'ouvre pas

**Cause:** Electron shell.openExternal() n'est pas disponible.

**Solution:** Vérifier que `electron` est bien importé.

```typescript
// Dans le main process Electron
ipcMain.handle('open-external', (event, url: string) => {
  shell.openExternal(url);
});

// Dans le renderer process
window.electron.openExternal(url);
```

---

## 🎉 Résultat Final

Avec cette intégration, vous avez :

- ✅ **Subscription management** complet (upgrade, cancel, manage)
- ✅ **Quota tracking** en temps réel
- ✅ **UI élégante** style Apple/Notion
- ✅ **Sécurité maximale** (clés serveur-side uniquement)
- ✅ **Flow de paiement fluide** avec Stripe Checkout
- ✅ **Customer Portal** pour gestion autonome
- ✅ **Grace period** support pour les utilisateurs premium annulés

---

## 📚 Ressources

- [Documentation Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Guide Stripe Customer Portal](./STRIPE_CUSTOMER_PORTAL.md)

---

**🚀 Votre système freemium est maintenant opérationnel !**
