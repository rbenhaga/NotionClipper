# 🎯 Intégration Client - Edge Functions Supabase

Ce guide explique comment utiliser les Edge Functions de manière sécurisée depuis l'application NotionClipper.

## 📋 Table des matières

1. [Architecture Sécurisée](#architecture-sécurisée)
2. [Configuration](#configuration)
3. [Upgrade vers Premium](#upgrade-vers-premium)
4. [Vérifier le statut de subscription](#vérifier-le-statut-de-subscription)
5. [Gestion du retour depuis Stripe](#gestion-du-retour-depuis-stripe)
6. [Exemples complets](#exemples-complets)

---

## Architecture Sécurisée

```
┌──────────────────────────────────────────────────┐
│           NotionClipper App (Electron)           │
│                                                  │
│  ❌ AUCUNE clé secrète Stripe                   │
│  ✅ USER_TOKEN uniquement (Supabase Auth)       │
│  ✅ Appelle les Edge Functions via HTTPS        │
│                                                  │
│  Services utilisés:                             │
│  - SubscriptionService (gère la logique métier) │
│  - EdgeFunctionService (appelle les APIs)       │
│  - StripeCheckoutHelper (ouvre le navigateur)   │
└──────────────────────────────────────────────────┘
                    ↓ HTTPS + Bearer Token
┌──────────────────────────────────────────────────┐
│      Supabase Edge Functions (Deno Runtime)      │
│                                                  │
│  ✅ STRIPE_SECRET_KEY (jamais exposée)          │
│  ✅ Vérifie l'authentification utilisateur       │
│  ✅ Crée les sessions Stripe                     │
│  ✅ Traite les webhooks Stripe                   │
│  ✅ Met à jour la base de données                │
└──────────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────────┐
│                   Stripe                         │
│  - Gère le paiement sécurisé                     │
│  - Envoie les webhooks à l'Edge Function         │
└──────────────────────────────────────────────────┘
```

**Pourquoi cette architecture ?**
- ✅ Aucune clé secrète dans l'app (pas de risque si l'app est reverse-engineered)
- ✅ Conformité PCI-DSS (Stripe gère tout le paiement)
- ✅ Scalable (Edge Functions serverless)
- ✅ Pas de serveur à maintenir
- ✅ Gratuit jusqu'à 2 millions d'invocations/mois

---

## Configuration

### 1. Initialiser les services

Dans votre `App.tsx` ou point d'entrée principal :

```typescript
import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@notion-clipper/core-shared';

// Créer le client Supabase (UNIQUEMENT avec anon key publique)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // ⚠️ PAS la service_role key !
);

// Créer le SubscriptionService
const subscriptionService = new SubscriptionService(() => supabase);

// Initialiser (charge la subscription courante)
await subscriptionService.initialize();
```

**IMPORTANT:**
- ✅ Utiliser `SUPABASE_ANON_KEY` (clé publique)
- ❌ NE JAMAIS utiliser `SUPABASE_SERVICE_ROLE_KEY` côté client
- ❌ NE JAMAIS mettre `STRIPE_SECRET_KEY` dans l'app

---

## Upgrade vers Premium

### Option 1 : Avec le SubscriptionService (Recommandé)

```typescript
import { SubscriptionService, StripeCheckoutHelper } from '@notion-clipper/core-shared';

async function handleUpgradeToPremium() {
  try {
    // 1. Créer la session de checkout via Edge Function
    const checkoutResponse = await subscriptionService.createCheckoutSession({
      success_url: 'https://notionclipper.com/subscription/success',
      cancel_url: 'https://notionclipper.com/subscription/canceled',
      metadata: {
        source: 'upgrade_modal',
        app_version: '1.0.0',
      },
    });

    console.log('Checkout URL:', checkoutResponse.checkout_url);

    // 2. Ouvrir dans le navigateur
    StripeCheckoutHelper.openCheckoutUrl(checkoutResponse.checkout_url);

    // 3. Écouter le retour de l'utilisateur
    const cleanup = StripeCheckoutHelper.listenForCheckoutReturn(
      async () => {
        // ✅ Paiement réussi !
        console.log('Payment successful!');

        // Recharger la subscription (mise à jour par webhook)
        await subscriptionService.loadCurrentSubscription();

        // Afficher une notification de succès
        showSuccessNotification('Bienvenue dans NotionClipper Premium ! 🎉');
      },
      () => {
        // ❌ Paiement annulé
        console.log('Payment canceled');
        showInfoNotification('Paiement annulé. Vous restez sur le plan gratuit.');
      }
    );

    // Nettoyer les listeners quand le composant est démonté
    return cleanup;

  } catch (error) {
    console.error('Upgrade failed:', error);
    showErrorNotification('Impossible de lancer le paiement. Réessayez plus tard.');
  }
}
```

### Option 2 : Avec l'EdgeFunctionService directement

```typescript
import { EdgeFunctionService, StripeCheckoutHelper } from '@notion-clipper/core-shared';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const edgeFunctionService = new EdgeFunctionService(
  { supabaseUrl: process.env.SUPABASE_URL! },
  async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }
);

async function handleUpgrade() {
  const response = await edgeFunctionService.createCheckout({
    success_url: 'https://notionclipper.com/subscription/success',
    cancel_url: 'https://notionclipper.com/subscription/canceled',
  });

  StripeCheckoutHelper.openCheckoutUrl(response.checkout_url);
}
```

---

## Vérifier le statut de subscription

### Avec SubscriptionService (Cache intelligent)

```typescript
// Récupérer la subscription courante (avec cache)
const subscription = await subscriptionService.getCurrentSubscription();

console.log('Tier:', subscription.tier); // 'free' | 'premium' | 'grace_period'
console.log('Status:', subscription.status); // 'active' | 'canceled' | etc.

// Vérifier si premium
if (subscription.tier === 'premium') {
  console.log('Utilisateur premium !');
}

// Obtenir le résumé des quotas
const quotaSummary = await subscriptionService.getQuotaSummary();

console.log('Clips utilisés:', quotaSummary.clips.used);
console.log('Clips restants:', quotaSummary.clips.remaining);
console.log('Clips limit:', quotaSummary.clips.limit);
console.log('Pourcentage:', quotaSummary.clips.percentage);
console.log('Alerte:', quotaSummary.clips.alert_level); // 'none' | 'warning' | 'critical'

// Vérifier si une feature est accessible
const canUseFocusMode = await subscriptionService.hasFeatureAccess('focus_mode');
```

### Avec EdgeFunctionService (Appel direct)

```typescript
const result = await edgeFunctionService.getSubscription();

console.log('Subscription:', result.subscription);
console.log('Quotas:', result.quotas);
```

---

## Gestion du retour depuis Stripe

Lorsque l'utilisateur termine son paiement sur Stripe, il est redirigé vers l'URL de succès ou d'annulation.

### Avec StripeCheckoutHelper

```typescript
import { StripeCheckoutHelper } from '@notion-clipper/core-shared';

// Dans un composant React/Vue
useEffect(() => {
  const cleanup = StripeCheckoutHelper.listenForCheckoutReturn(
    async () => {
      // Succès
      await subscriptionService.loadCurrentSubscription();
      showSuccessModal();
    },
    () => {
      // Annulé
      showCanceledModal();
    }
  );

  return cleanup; // Nettoyer à la destruction du composant
}, []);
```

### Manuellement (détection d'URL)

```typescript
// Vérifier les query params au chargement de l'app
const params = new URLSearchParams(window.location.search);

if (params.has('checkout_success')) {
  // L'utilisateur revient après un paiement réussi
  await subscriptionService.loadCurrentSubscription();
  showSuccessNotification('Paiement réussi ! 🎉');

  // Nettoyer l'URL
  window.history.replaceState({}, '', window.location.pathname);
}

if (params.has('checkout_canceled')) {
  // L'utilisateur a annulé
  showInfoNotification('Paiement annulé.');
  window.history.replaceState({}, '', window.location.pathname);
}
```

---

## Exemples complets

### Exemple 1 : Bouton "Passer à Premium" dans l'UpgradeModal

```typescript
// packages/ui/src/components/subscription/UpgradeModal.tsx

import { useSubscription } from '../providers/SubscriptionProvider';
import { StripeCheckoutHelper } from '@notion-clipper/core-shared';

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { subscriptionService } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);

    try {
      // 1. Créer la session de checkout
      const response = await subscriptionService.createCheckoutSession({
        success_url: `${window.location.origin}?checkout_success=true`,
        cancel_url: `${window.location.origin}?checkout_canceled=true`,
        metadata: {
          source: 'upgrade_modal',
        },
      });

      // 2. Ouvrir dans le navigateur
      StripeCheckoutHelper.openCheckoutUrl(response.checkout_url);

      // 3. Fermer le modal (l'utilisateur sera redirigé)
      onClose();

    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Impossible de lancer le paiement. Réessayez plus tard.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2>Passez à NotionClipper Premium</h2>
      <p>Clips illimités, fichiers illimités, Focus Mode illimité</p>
      <p className="price">3,99€/mois</p>

      <button
        onClick={handleUpgrade}
        disabled={isLoading}
      >
        {isLoading ? 'Chargement...' : 'Passer à Premium'}
      </button>
    </Modal>
  );
}
```

### Exemple 2 : Hook personnalisé pour gérer l'upgrade

```typescript
// hooks/useUpgradeToPremium.ts

import { useCallback, useState } from 'react';
import { useSubscription } from '../providers/SubscriptionProvider';
import { StripeCheckoutHelper } from '@notion-clipper/core-shared';

export function useUpgradeToPremium() {
  const { subscriptionService } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgrade = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await subscriptionService.createCheckoutSession({
        success_url: `${window.location.origin}?checkout_success=true`,
        cancel_url: `${window.location.origin}?checkout_canceled=true`,
      });

      StripeCheckoutHelper.openCheckoutUrl(response.checkout_url);

      return { success: true };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionService]);

  return {
    upgrade,
    isLoading,
    error,
  };
}

// Usage dans un composant
function UpgradeButton() {
  const { upgrade, isLoading, error } = useUpgradeToPremium();

  return (
    <div>
      <button onClick={upgrade} disabled={isLoading}>
        {isLoading ? 'Chargement...' : 'Passer à Premium'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### Exemple 3 : Afficher les quotas en temps réel

```typescript
// components/QuotaDisplay.tsx

import { useEffect, useState } from 'react';
import { useSubscription } from '../providers/SubscriptionProvider';
import { QuotaSummary } from '@notion-clipper/core-shared';

export function QuotaDisplay() {
  const { subscriptionService } = useSubscription();
  const [quotas, setQuotas] = useState<QuotaSummary | null>(null);

  useEffect(() => {
    // Charger les quotas initialement
    const loadQuotas = async () => {
      const summary = await subscriptionService.getQuotaSummary();
      setQuotas(summary);
    };

    loadQuotas();

    // Écouter les changements
    const unsubscribe = subscriptionService.onQuotaChanged((summary) => {
      setQuotas(summary);
    });

    return unsubscribe;
  }, [subscriptionService]);

  if (!quotas) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="quota-display">
      {/* Clips */}
      <div className="quota-item">
        <span>Clips</span>
        <ProgressBar
          value={quotas.clips.percentage}
          max={100}
          alertLevel={quotas.clips.alert_level}
        />
        <span>
          {quotas.clips.used} / {quotas.clips.is_unlimited ? '∞' : quotas.clips.limit}
        </span>
      </div>

      {/* Files */}
      <div className="quota-item">
        <span>Fichiers</span>
        <ProgressBar
          value={quotas.files.percentage}
          max={100}
          alertLevel={quotas.files.alert_level}
        />
        <span>
          {quotas.files.used} / {quotas.files.is_unlimited ? '∞' : quotas.files.limit}
        </span>
      </div>

      {/* Reset info */}
      <p className="reset-info">
        Réinitialisation dans {quotas.days_until_reset} jours
      </p>

      {/* Upgrade si proche de la limite */}
      {quotas.clips.alert_level === 'critical' && (
        <button onClick={() => showUpgradeModal()}>
          Passer à Premium pour des clips illimités
        </button>
      )}
    </div>
  );
}
```

### Exemple 4 : Listener de retour depuis Stripe dans App.tsx

```typescript
// App.tsx

import { useEffect } from 'react';
import { useSubscription } from './providers/SubscriptionProvider';
import { StripeCheckoutHelper } from '@notion-clipper/core-shared';

export function App() {
  const { subscriptionService } = useSubscription();

  useEffect(() => {
    // Écouter le retour depuis Stripe
    const cleanup = StripeCheckoutHelper.listenForCheckoutReturn(
      async () => {
        // Succès - recharger la subscription
        console.log('Payment successful! Reloading subscription...');

        await subscriptionService.loadCurrentSubscription();

        // Afficher une notification de succès
        showNotification({
          type: 'success',
          title: 'Bienvenue dans Premium !',
          message: 'Vous avez maintenant accès à toutes les fonctionnalités.',
        });
      },
      () => {
        // Annulé
        console.log('Payment canceled');

        showNotification({
          type: 'info',
          title: 'Paiement annulé',
          message: 'Vous pouvez passer à Premium à tout moment.',
        });
      }
    );

    return cleanup;
  }, [subscriptionService]);

  return (
    <div className="app">
      {/* Votre app ici */}
    </div>
  );
}
```

---

## Sécurité

### ✅ Ce qui est SÉCURISÉ

- Stocker `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans l'app (ce sont des clés publiques)
- Appeler les Edge Functions avec le `USER_TOKEN`
- Ouvrir l'URL Stripe Checkout dans le navigateur
- Recharger la subscription après paiement

### ❌ Ce qui serait DANGEREUX

- Stocker `STRIPE_SECRET_KEY` dans l'app (même chiffrée)
- Stocker `SUPABASE_SERVICE_ROLE_KEY` dans l'app
- Appeler l'API Stripe directement depuis l'app
- Accepter des webhooks côté client

---

## Troubleshooting

### Erreur : "Authentication required"

➡️ L'utilisateur n'est pas connecté. Vérifiez que `supabase.auth.getSession()` retourne un token valide.

### Erreur : "EdgeFunctionService not initialized"

➡️ Appelez `await subscriptionService.initialize()` avant d'utiliser le service.

### L'URL de checkout ne s'ouvre pas

➡️ Vérifiez que `electron.shell` est disponible. En dev, utilisez `window.open()` comme fallback.

### La subscription n'est pas mise à jour après paiement

➡️ Le webhook Stripe prend quelques secondes. Attendez 3-5 secondes puis appelez :
```typescript
await subscriptionService.loadCurrentSubscription();
```

---

## Ressources

- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentation Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Guide de déploiement Edge Functions](../supabase/EDGE_FUNCTIONS_DEPLOY.md)

---

**🎉 Votre système de paiement est maintenant 100% sécurisé !**
