# 🎫 Stripe Customer Portal - Gestion de Facturation

Ce guide explique comment utiliser le **Stripe Customer Portal** pour permettre aux utilisateurs de gérer leur abonnement, factures, et moyens de paiement directement sur le site de Stripe.

---

## 🎯 Qu'est-ce que le Customer Portal ?

Le **Stripe Customer Portal** est un site hébergé par Stripe qui permet aux clients de :
- ✅ Voir et télécharger leurs **factures** (PDF)
- ✅ Mettre à jour leur **carte bancaire**
- ✅ Voir les **détails de l'abonnement** (prix, cycle, prochain paiement)
- ✅ **Annuler** ou **réactiver** leur abonnement
- ✅ Mettre à jour l'**adresse de facturation**

**Avantage énorme** : Tu n'as PAS besoin de créer une interface de gestion d'abonnement. Stripe le fait pour toi. C'est sécurisé, conforme PCI-DSS, et traduit en 25 langues.

---

## 📐 Architecture

```
NotionClipper App
  ↓ Utilisateur clique "Gérer mon abonnement"
  ↓ Appel Edge Function create-portal-session
Edge Function Supabase
  ↓ Vérifie auth + récupère stripe_customer_id
  ↓ Crée session Stripe Portal
Stripe API
  ↓ Retourne URL du portal (https://billing.stripe.com/...)
App ouvre l'URL dans le navigateur
  ↓ Utilisateur gère son abonnement
Stripe Webhook met à jour la BDD
  ↓ App recharge la subscription
```

---

## 🚀 Étape 1 : Activer le Customer Portal dans Stripe

### 1. Aller dans Stripe Dashboard

https://dashboard.stripe.com/settings/billing/portal

### 2. Activer le Portal

Cliquer sur **"Activate"** ou **"Activer le portal"**.

### 3. Configurer les fonctionnalités

**Fonctionnalités recommandées :**
- ✅ **Gérer l'abonnement** (modifier, annuler, réactiver)
- ✅ **Mettre à jour le moyen de paiement**
- ✅ **Voir l'historique de facturation**
- ✅ **Télécharger les factures (PDF)**
- ✅ **Mettre à jour l'adresse de facturation**

**Options recommandées :**
- ✅ **Permettre l'annulation immédiate** (ou à la fin de la période)
- ✅ **Demander un feedback** lors de l'annulation
- ✅ **Afficher un message de rétention** (offre de rester)

### 4. Personnalisation (optionnel)

- **Logo** : Ajouter le logo NotionClipper
- **Couleurs** : Adapter aux couleurs de la marque
- **Domaine personnalisé** : `billing.notionclipper.com` (nécessite plan Business)

### 5. Sauvegarder

Cliquer sur **"Save"**.

---

## 🛠️ Étape 2 : Créer l'Edge Function

L'Edge Function **`create-portal-session`** est déjà créée dans :
```
supabase/functions/create-portal-session/index.ts
```

### Déploiement

```bash
# Déployer l'Edge Function
supabase functions deploy create-portal-session

# Vérifier les logs
supabase functions logs create-portal-session --follow
```

---

## 💻 Étape 3 : Intégration dans l'App

### Ajouter la méthode dans EdgeFunctionService

```typescript
// packages/core-shared/src/services/edge-function.service.ts

export class EdgeFunctionService {
  // ... méthodes existantes ...

  /**
   * Crée une session Stripe Customer Portal
   *
   * Permet à l'utilisateur de gérer son abonnement (annuler, facturer, modifier carte)
   * sur le site de Stripe
   */
  async createPortalSession(returnUrl?: string): Promise<{ url: string }> {
    const response = await this.callEdgeFunction<{ url: string }>(
      'create-portal-session',
      {
        method: 'POST',
        body: JSON.stringify({
          return_url: returnUrl || 'notionclipper://settings',
        }),
      }
    );

    return response;
  }
}
```

### Ajouter dans SubscriptionService

```typescript
// packages/core-shared/src/services/subscription.service.ts

export class SubscriptionService {
  // ... méthodes existantes ...

  /**
   * Ouvre le Stripe Customer Portal
   *
   * Permet à l'utilisateur de gérer son abonnement (annuler, facturer, modifier carte)
   */
  async openCustomerPortal(returnUrl?: string): Promise<string> {
    if (!this.edgeFunctionService) {
      throw new Error('EdgeFunctionService not initialized');
    }

    const { url } = await this.edgeFunctionService.createPortalSession(returnUrl);
    return url;
  }
}
```

### Utilisation dans l'UI

```typescript
// Exemple : Bouton "Gérer mon abonnement"

import { useSubscription } from '../providers/SubscriptionProvider';
import { StripeCheckoutHelper } from '@notion-clipper/core-shared';

export function SubscriptionSettings() {
  const { subscriptionService } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    setIsLoading(true);

    try {
      // 1. Créer la session portal
      const portalUrl = await subscriptionService.openCustomerPortal(
        'notionclipper://settings'
      );

      // 2. Ouvrir dans le navigateur
      StripeCheckoutHelper.openCheckoutUrl(portalUrl);

      // 3. Écouter le retour (optionnel)
      // L'utilisateur reviendra avec notionclipper://settings dans l'URL

    } catch (error) {
      console.error('Failed to open portal:', error);
      alert('Impossible d\'ouvrir le portail de gestion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="subscription-settings">
      <h2>Abonnement</h2>

      {/* Bouton pour gérer l'abonnement */}
      <button
        onClick={handleManageSubscription}
        disabled={isLoading}
        className="btn-secondary"
      >
        {isLoading ? 'Chargement...' : 'Gérer mon abonnement'}
      </button>

      <p className="help-text">
        Vous serez redirigé vers le portail de gestion sécurisé de Stripe.
        Vous pourrez :
      </p>
      <ul>
        <li>Voir et télécharger vos factures</li>
        <li>Mettre à jour votre carte bancaire</li>
        <li>Annuler ou réactiver votre abonnement</li>
        <li>Modifier votre adresse de facturation</li>
      </ul>
    </div>
  );
}
```

---

## 🎨 Exemple de Composant Complet

```typescript
// components/settings/SubscriptionManagement.tsx

import { useState, useEffect } from 'react';
import { useSubscription } from '../providers/SubscriptionProvider';
import { StripeCheckoutHelper } from '@notion-clipper/core-shared';
import type { Subscription, QuotaSummary } from '@notion-clipper/core-shared';

export function SubscriptionManagement() {
  const { subscriptionService } = useSubscription();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [quotas, setQuotas] = useState<QuotaSummary | null>(null);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  useEffect(() => {
    // Charger la subscription
    subscriptionService.getCurrentSubscription().then(setSubscription);
    subscriptionService.getQuotaSummary().then(setQuotas);
  }, [subscriptionService]);

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);

    try {
      const portalUrl = await subscriptionService.openCustomerPortal();
      StripeCheckoutHelper.openCheckoutUrl(portalUrl);
    } catch (error) {
      console.error('Failed to open portal:', error);
      alert('Impossible d\'ouvrir le portail de gestion');
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const isPremium = subscription?.tier === 'premium';

  return (
    <div className="subscription-management">
      {/* Statut actuel */}
      <div className="current-status">
        <h3>Abonnement actuel</h3>
        <div className={`badge ${isPremium ? 'premium' : 'free'}`}>
          {isPremium ? '✨ Premium' : '🆓 Gratuit'}
        </div>
        {isPremium && (
          <p className="price">3,99€/mois</p>
        )}
      </div>

      {/* Quotas (si free) */}
      {!isPremium && quotas && (
        <div className="quotas">
          <h4>Utilisation</h4>
          <div className="quota-item">
            <span>Clips</span>
            <span>{quotas.clips.used} / {quotas.clips.limit}</span>
          </div>
          <div className="quota-item">
            <span>Fichiers</span>
            <span>{quotas.files.used} / {quotas.files.limit}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="actions">
        {isPremium ? (
          <>
            <button
              onClick={handleManageSubscription}
              disabled={isLoadingPortal}
              className="btn-primary"
            >
              {isLoadingPortal ? 'Chargement...' : 'Gérer mon abonnement'}
            </button>

            <p className="help-text">
              Gérez votre abonnement, vos factures, et votre carte bancaire
              sur le portail sécurisé de Stripe.
            </p>
          </>
        ) : (
          <>
            <button
              onClick={() => {/* Appeler upgrade logic */}}
              className="btn-premium"
            >
              Passer à Premium
            </button>

            <p className="help-text">
              Débloquez les clips illimités, le Focus Mode illimité, et plus encore !
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 🔐 Sécurité

### ✅ Ce qui est sécurisé

- **Authentification** : L'Edge Function vérifie le USER_TOKEN
- **Isolation** : Chaque user ne voit QUE son propre portal
- **HTTPS uniquement** : Tout est chiffré en transit
- **Stripe gère les cartes** : Aucune donnée bancaire n'est stockée dans ton app

### ⚠️ Important

- Le `stripe_customer_id` doit être stocké dans la table `subscriptions`
- Il est créé automatiquement lors du premier checkout (par la Edge Function `create-checkout`)
- Si l'utilisateur n'a jamais payé, il n'aura pas de `stripe_customer_id` → afficher un message approprié

---

## 🧪 Test

### En mode test

```bash
# 1. Créer un abonnement test avec Stripe CLI
stripe customers create \
  --email test@example.com \
  --description "Test Customer"

# Copier le customer_id (cus_xxx)

# 2. L'ajouter dans Supabase
UPDATE subscriptions
SET stripe_customer_id = 'cus_xxx'
WHERE user_id = 'xxx';

# 3. Tester le portal
curl -X POST https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/create-portal-session \
  -H "Authorization: Bearer <USER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"return_url":"http://localhost:3000/settings"}'

# 4. Ouvrir l'URL retournée dans le navigateur
```

---

## 📊 Résultat Final

Quand l'utilisateur clique sur **"Gérer mon abonnement"** :
1. L'app crée une session portal via Edge Function
2. L'URL du portal est retournée (ex: `https://billing.stripe.com/p/session_xxx`)
3. L'app ouvre cette URL dans le navigateur par défaut (Electron shell.openExternal)
4. L'utilisateur voit une belle interface Stripe où il peut :
   - Télécharger ses factures en PDF
   - Mettre à jour sa carte
   - Annuler son abonnement
   - Voir son historique de paiements
5. Quand il a terminé, il clique "Retourner à NotionClipper"
6. Il est redirigé vers `notionclipper://settings`
7. L'app recharge la subscription pour refléter les changements

---

## 💡 Bonus : Messages de Feedback

Dans le Stripe Dashboard → Customer Portal Settings, tu peux configurer :
- **Message de rétention** : "Avant de partir, voici une offre spéciale..."
- **Raisons d'annulation** : Collecter le feedback (trop cher, pas assez de features, etc.)
- **Email de confirmation** : Envoyer un email quand l'abonnement est annulé

---

## 🎉 Avantages

✅ **Zéro code UI** : Pas besoin de créer une interface de gestion
✅ **Sécurité** : Stripe gère tout (PCI-DSS compliant)
✅ **Multilingue** : Traduit automatiquement en 25 langues
✅ **Responsive** : Fonctionne sur mobile, tablette, desktop
✅ **Factures PDF** : Générées automatiquement
✅ **Mise à jour instantanée** : Les changements sont reflétés via webhook

---

## 🔗 Ressources

- [Documentation Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Personnalisation du Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal#configure)
- [Webhooks à écouter](https://stripe.com/docs/billing/subscriptions/webhooks)

---

**🎊 Terminé !** Tes utilisateurs peuvent maintenant gérer leur abonnement en toute autonomie, sans que tu aies à coder d'interface de gestion.
