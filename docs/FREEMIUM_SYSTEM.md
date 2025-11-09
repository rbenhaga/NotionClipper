# 🎯 Système Freemium/Premium NotionClipper

Documentation complète du système de subscription freemium/premium pour NotionClipper.

**Design Philosophy:** Inspiré par Apple et Notion
**Date de création:** 2025-11-09
**Version:** 1.0.0

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Installation](#installation)
5. [Utilisation](#utilisation)
6. [Composants UI](#composants-ui)
7. [Intégration Stripe](#intégration-stripe)
8. [Migration utilisateurs](#migration-utilisateurs)
9. [FAQ](#faq)

---

## 🎯 Vue d'ensemble

### Objectifs

- Créer un modèle freemium **généreux mais incitatif**
- Maximiser la conversion des utilisateurs gratuits vers premium
- UX **non frustrante** et **encourageante**
- Design **Apple/Notion** : subtil, élégant, professionnel

### Quotas & Limites

#### Plan Gratuit (Free)

| Feature | Limite mensuelle | Configurable |
|---------|------------------|--------------|
| **Clips** | 100/mois | ✅ `SUBSCRIPTION_QUOTAS.free.clips` |
| **Fichiers** | 10/mois | ✅ `SUBSCRIPTION_QUOTAS.free.files` |
| **Mots par clip** | 1000 mots | ✅ `SUBSCRIPTION_QUOTAS.free.words_per_clip` |
| **Mode Focus** | 60 min/mois | ✅ `SUBSCRIPTION_QUOTAS.free.focus_mode_time` |
| **Mode Compact** | 60 min/mois | ✅ `SUBSCRIPTION_QUOTAS.free.compact_mode_time` |
| **Pages Notion** | Illimité | ✅ (pas de limite) |
| **Envois multiples** | Compte comme 1 clip | ✅ (intelligent) |

#### Plan Premium

| Feature | Limite |
|---------|--------|
| **Tout** | ♾️ Illimité |
| **Prix** | 3,99€/mois |

#### Période de Grâce (Migration)

- **Durée:** 30 jours
- **Accès:** Premium complet
- **Pour qui:** Utilisateurs existants lors du déploiement

---

## 🏗 Architecture

### Structure des packages

```
NotionClipper/
├── packages/
│   ├── core-shared/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   └── subscription.config.ts    # 🆕 Configuration quotas
│   │   │   ├── types/
│   │   │   │   └── subscription.types.ts     # 🆕 Types TypeScript
│   │   │   ├── interfaces/
│   │   │   │   └── subscription.interface.ts # 🆕 Interfaces services
│   │   │   └── services/
│   │   │       ├── subscription.service.ts   # 🆕 Gestion abonnements
│   │   │       ├── usage-tracking.service.ts # 🆕 Tracking usage
│   │   │       └── quota.service.ts          # 🆕 Vérification quotas
│   │   └── ...
│   ├── ui/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── subscription/             # 🆕 Composants UI
│   │   │   │       ├── SubscriptionBadge.tsx
│   │   │   │       ├── QuotaCounter.tsx
│   │   │   │       ├── UpgradeModal.tsx
│   │   │   │       └── index.ts
│   │   │   ├── hooks/
│   │   │   │   └── useSubscription.ts        # 🆕 Hook React
│   │   │   └── contexts/
│   │   │       └── SubscriptionContext.tsx   # 🆕 Context Provider
│   │   └── ...
│   └── ...
├── supabase/
│   └── migrations/
│       ├── 001_create_subscriptions_tables.sql # 🆕 Schema Supabase
│       └── README.md                           # 🆕 Guide migrations
└── docs/
    └── FREEMIUM_SYSTEM.md                      # 🆕 Ce fichier
```

### Services

#### 1. SubscriptionService

**Responsabilités:**
- Gestion des subscriptions (CRUD)
- Intégration Stripe
- Période de grâce
- Événements observables

**API:**

```typescript
const subscriptionService = new SubscriptionService(getSupabaseClient);

// Récupérer la subscription courante
const subscription = await subscriptionService.getCurrentSubscription();

// Vérifier le tier
const isPremium = subscription.tier === SubscriptionTier.PREMIUM;

// Récupérer le résumé des quotas
const quotaSummary = await subscriptionService.getQuotaSummary();

// Migrer vers période de grâce
await subscriptionService.migrateToGracePeriod(userId);
```

#### 2. UsageTrackingService

**Responsabilités:**
- Tracking des clips, fichiers, modes
- Sessions des modes Focus/Compact
- Événements pour analytics

**API:**

```typescript
const usageService = new UsageTrackingService(getSupabaseClient);

// Tracker un clip
await usageService.trackClip(wordCount, isMultiple, pageCount);

// Tracker un fichier
await usageService.trackFileUpload(fileSize, fileType);

// Démarrer Mode Focus
const session = await usageService.trackFocusModeStart();

// Terminer Mode Focus
await usageService.trackFocusModeEnd(session.id);
```

#### 3. QuotaService

**Responsabilités:**
- Vérification des quotas
- Messages d'upgrade
- Détection des warnings

**API:**

```typescript
const quotaService = new QuotaService(subscriptionService, usageService);

// Vérifier si un clip peut être envoyé
const result = await quotaService.canSendClip(wordCount);

if (!result.allowed) {
  showUpgradeModal();
} else {
  sendClip();
}

// Vérifier warning
const warning = await quotaService.getQuotaWarning(FeatureType.CLIPS);
if (warning) {
  showBanner(warning);
}
```

---

## ⚙️ Configuration

### Variables d'environnement

Ajouter à `.env`:

```bash
# Supabase (déjà existant)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Stripe (nouveau)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Personnaliser les quotas

Éditer `packages/core-shared/src/config/subscription.config.ts`:

```typescript
export const SUBSCRIPTION_QUOTAS = {
  [SubscriptionTier.FREE]: {
    [FeatureType.CLIPS]: 200,           // Modifier ici
    [FeatureType.FILES]: 20,            // Modifier ici
    [FeatureType.WORDS_PER_CLIP]: 2000, // Modifier ici
    // ...
  },
  // ...
};
```

---

## 🚀 Installation

### 1. Appliquer les migrations Supabase

```bash
cd supabase/migrations
supabase db push
```

Ou via le dashboard Supabase (copier-coller le SQL).

### 2. Migrer les utilisateurs existants

Exécuter dans Supabase SQL Editor:

```sql
SELECT migrate_existing_users_to_grace_period();
```

Résultat: `n` utilisateurs migrés avec 30 jours de grâce.

### 3. Installer les dépendances

```bash
pnpm install
```

### 4. Configurer Stripe (optionnel pour l'instant)

Créer un compte Stripe et récupérer les clés.

---

## 💻 Utilisation

### Dans l'application React

#### 1. Wrapper l'app avec le Provider

```tsx
// App.tsx
import { SubscriptionProvider } from '@notion-clipper/ui/contexts/SubscriptionContext';
import { supabaseClient } from './supabaseClient';

function App() {
  return (
    <SubscriptionProvider getSupabaseClient={() => supabaseClient}>
      <YourApp />
    </SubscriptionProvider>
  );
}
```

#### 2. Utiliser le hook

```tsx
import { useSubscription } from '@notion-clipper/ui/hooks/useSubscription';
import { useSubscriptionContext } from '@notion-clipper/ui/contexts/SubscriptionContext';

function MyComponent() {
  const services = useSubscriptionContext();
  const {
    subscription,
    quotaSummary,
    isPremium,
    canSendClip,
    trackClip,
  } = useSubscription(services);

  const handleSend = async () => {
    // Vérifier avant d'envoyer
    const check = await canSendClip(wordCount);

    if (!check.allowed) {
      setShowUpgradeModal(true);
      return;
    }

    // Envoyer le clip
    await sendClipToNotion();

    // Tracker après l'envoi
    await trackClip(wordCount, isMultiple, pageCount);
  };

  return (
    <div>
      {isPremium ? (
        <SubscriptionBadge tier={subscription.tier} />
      ) : (
        <QuotaCounter summary={quotaSummary} />
      )}
    </div>
  );
}
```

### Vérification avant actions critiques

#### Envoi de clip

```typescript
// Avant d'envoyer
const check = await quotaService.canSendClip(wordCount);

if (!check.allowed) {
  if (check.requires_upgrade) {
    showUpgradeModal(FeatureType.CLIPS, check.message);
  }
  return;
}

// Envoyer
await sendClip();

// Tracker
await usageTrackingService.trackClip(wordCount, isMultiple, pageCount);
```

#### Upload de fichier

```typescript
const check = await quotaService.canUploadFile();

if (!check.allowed) {
  showUpgradeModal(FeatureType.FILES);
  return;
}

await uploadFile();
await usageTrackingService.trackFileUpload(fileSize, fileType);
```

#### Mode Focus/Compact

```typescript
const check = await quotaService.canUseFocusMode();

if (!check.allowed) {
  showUpgradeModal(FeatureType.FOCUS_MODE_TIME);
  return;
}

const sessionId = await usageTrackingService.trackFocusModeStart();

// Quand le mode se termine
await usageTrackingService.trackFocusModeEnd(sessionId);
```

---

## 🎨 Composants UI

### SubscriptionBadge

Badge subtil affichant le tier (Free/Premium/Grace).

```tsx
import { SubscriptionBadge } from '@notion-clipper/ui/components/subscription';

<SubscriptionBadge
  tier={subscription.tier}
  gracePeriodDaysRemaining={7}
  size="md"
  showIcon={true}
/>
```

**Variantes:**
- `size`: `'sm' | 'md' | 'lg'`
- `SubscriptionBadgeCompact`: Juste l'icône avec tooltip

### QuotaCounter

Affiche les quotas avec progress bars.

```tsx
import { QuotaCounter } from '@notion-clipper/ui/components/subscription';

<QuotaCounter
  summary={quotaSummary}
  compact={false}
  showAll={true}
  onUpgradeClick={() => setShowUpgradeModal(true)}
/>
```

**Variantes:**
- `QuotaCounterMini`: Version minimaliste pour sidebar

### UpgradeModal

Modal élégante pour encourager l'upgrade.

```tsx
import { UpgradeModal } from '@notion-clipper/ui/components/subscription';

<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  onUpgrade={handleUpgradeClick}
  feature={FeatureType.CLIPS}
  quotaReached={true}
  remainingQuota={0}
/>
```

**Features:**
- Animations Framer Motion
- Messages contextuels selon la feature
- Gradient élégant
- Call-to-action clair

---

## 💳 Intégration Stripe

### TODO: À implémenter

1. **Créer un produit Stripe**
   - Prix: 3,99€/mois
   - Récurrent mensuel

2. **Checkout Session**
   ```typescript
   const session = await subscriptionService.createCheckoutSession({
     user_id: user.id,
     email: user.email,
     success_url: 'https://app.com/success',
     cancel_url: 'https://app.com/cancel',
   });

   window.location.href = session.checkout_url;
   ```

3. **Webhooks**
   - Endpoint: `/api/webhooks/stripe`
   - Événements à gérer:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

4. **Backend Stripe** (API séparée ou Supabase Edge Function)

---

## 👥 Migration utilisateurs

### Stratégie

**Utilisateurs existants:**
- 30 jours de période de grâce (Premium complet)
- Migration automatique au déploiement
- Message encourageant : "Profitez de 30 jours d'essai Premium"

**Nouveaux utilisateurs:**
- Plan Free par défaut
- Modal d'onboarding expliquant les plans

### Exécution

```sql
-- Migrer tous les utilisateurs existants
SELECT migrate_existing_users_to_grace_period();

-- Vérifier
SELECT user_id, tier, grace_period_ends_at
FROM subscriptions
WHERE is_grace_period = true;
```

### Communication

Email/notification aux utilisateurs:

> **🎉 NotionClipper Premium - 30 jours gratuits!**
>
> Merci d'être un utilisateur de NotionClipper. Pour vous remercier, nous vous offrons 30 jours de Premium gratuit.
>
> Profitez de:
> - Clips illimités
> - Upload de fichiers sans limite
> - Modes Focus et Compact en illimité
>
> [Découvrir Premium →]

---

## ❓ FAQ

### Comment modifier les quotas?

Éditer `packages/core-shared/src/config/subscription.config.ts` et modifier les valeurs dans `SUBSCRIPTION_QUOTAS`.

### Comment tester en local?

1. Créer une subscription Free pour un user de test
2. Tester les limites
3. Upgrader manuellement vers Premium en DB
4. Vérifier que tout fonctionne

### Les quotas se réinitialisent quand?

Le **1er de chaque mois calendaire** à 00h00 UTC.

### Que se passe-t-il quand un quota est atteint?

1. L'utilisateur voit un message encourageant
2. Une modal d'upgrade apparaît
3. L'action est bloquée jusqu'à upgrade ou reset mensuel

### Comment gérer les remboursements?

Via Stripe Dashboard. La subscription sera automatiquement annulée via webhook.

### Performance?

- ✅ Cache intelligent (5 min pour subscription, 2 min pour quotas)
- ✅ Requêtes optimisées avec indexes Supabase
- ✅ Vérifications async non bloquantes

---

## 🎯 Roadmap

### Phase 1: MVP ✅ (Complété)
- [x] Configuration et types
- [x] Schema Supabase
- [x] Services backend
- [x] Composants UI
- [x] Hook React
- [x] Documentation

### Phase 2: Intégration (En cours)
- [ ] Wrapper l'app avec SubscriptionProvider
- [ ] Intégrer vérifications dans handleSend
- [ ] Intégrer vérifications dans upload fichiers
- [ ] Timer pour modes Focus/Compact
- [ ] Tests E2E

### Phase 3: Stripe
- [ ] Configuration Stripe
- [ ] Checkout flow
- [ ] Webhooks
- [ ] Site de paiement

### Phase 4: Polish
- [ ] Analytics avancées
- [ ] A/B testing messages d'upgrade
- [ ] Emails marketing
- [ ] Dashboard admin

---

## 🏆 Philosophie Design

### Principes Apple/Notion

1. **Subtilité**
   - Pas de popups agressives
   - Indicateurs discrets mais présents
   - Animations douces et naturelles

2. **Clarté**
   - Messages simples et directs
   - Pas de jargon technique
   - Valeur claire pour l'utilisateur

3. **Encouragement**
   - Ton positif et motivant
   - Focus sur les bénéfices, pas les limites
   - Gratitude envers les utilisateurs

4. **Excellence**
   - Code propre et maintenable
   - Performance optimale
   - UX irréprochable

---

## 📞 Support

Questions? Contactez l'équipe:
- GitHub Issues: [NotionClipper/issues](https://github.com/...)
- Email: support@notionclipper.com

---

**Créé avec ❤️ par l'équipe NotionClipper**
