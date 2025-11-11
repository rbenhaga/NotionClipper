# 🎯 Guide de Configuration - Système Freemium/Premium

Ce guide explique comment configurer le système freemium/premium de NotionClipper avec Stripe et Supabase.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Configuration Supabase](#configuration-supabase)
3. [Configuration Stripe](#configuration-stripe)
4. [Variables d'environnement](#variables-denvironnement)
5. [Migration de la base de données](#migration-de-la-base-de-données)
6. [Création du produit Stripe](#création-du-produit-stripe)
7. [Intégration dans l'application](#intégration-dans-lapplication)
8. [Tests](#tests)

---

## Prérequis

- ✅ Compte [Supabase](https://supabase.com/) (gratuit)
- ✅ Compte [Stripe](https://stripe.com/) (test/prod)
- ✅ Node.js v18+ et pnpm installés
- ✅ Clés API Notion configurées

---

## Configuration Supabase

### 1. Créer un projet Supabase

1. Connectez-vous à [supabase.com](https://supabase.com/)
2. Créez un nouveau projet
3. Notez votre **URL** et vos **clés API**

### 2. Récupérer les clés

Allez dans **Settings** → **API**

```bash
# URL du projet
SUPABASE_URL=https://xxxxx.supabase.co

# Clé publique (anon key)
SUPABASE_ANON_KEY=eyJhbGci...

# Clé de service (service_role key) - GARDEZ-LA SECRÈTE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

⚠️ **IMPORTANT** : La clé `service_role` doit rester secrète et n'être utilisée que côté serveur !

---

## Configuration Stripe

### 1. Créer un compte Stripe

1. Créez un compte sur [stripe.com](https://stripe.com/)
2. Activez le mode **Test** pour développement
3. Récupérez vos clés API

### 2. Récupérer les clés

Allez dans **Developers** → **API keys**

```bash
# Clé publique (publishable key)
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Clé secrète (secret key) - GARDEZ-LA SECRÈTE
STRIPE_SECRET_KEY=sk_live_...
```

---

## Variables d'environnement

### 1. Copier le fichier template

```bash
cp .env.example .env
```

### 2. Remplir les variables

Éditez `.env` avec vos vraies valeurs :

```bash
# Supabase
SUPABASE_URL=https://rijjtngbgahxdjflfyhi.supabase.co
SUPABASE_ANON_KEY=eyJhbGci... # Votre clé anon
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... # Votre clé service

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_51LDo... # Votre clé publique
STRIPE_SECRET_KEY=sk_live_... # Votre clé secrète
STRIPE_PREMIUM_PRICE_ID=price_... # À créer (voir ci-dessous)
STRIPE_WEBHOOK_SECRET=whsec_... # À créer avec webhook

# URLs de redirection
STRIPE_SUCCESS_URL=http://localhost:3000/subscription/success
STRIPE_CANCEL_URL=http://localhost:3000/subscription/canceled
```

⚠️ **NE JAMAIS** commiter le fichier `.env` !

---

## Migration de la base de données

### Option 1 : SQL Editor (Recommandé)

1. Ouvrez le **SQL Editor** de Supabase
   ```
   https://supabase.com/dashboard/project/[votre-projet]/sql/new
   ```

2. Copiez le contenu de `supabase/migrations/20251111_create_subscription_tables.sql`

3. Collez dans l'éditeur et cliquez sur **Run**

4. Vérifiez que les tables ont été créées :
   - `subscriptions`
   - `usage_records`
   - `usage_events`
   - `mode_sessions`

### Option 2 : Script automatique (Nécessite service_role key)

```bash
# Avec la clé service_role dans .env
node scripts/run-supabase-migration.js
```

### Vérification

Dans le **Table Editor** de Supabase, vous devriez voir les 4 nouvelles tables.

---

## Création du produit Stripe

### Option 1 : Script automatique (Recommandé)

```bash
# Assurez-vous que STRIPE_SECRET_KEY est dans .env
node scripts/setup-stripe-product.js
```

Ce script va :
- ✅ Créer le produit "NotionClipper Premium"
- ✅ Créer le prix 3.99€/mois
- ✅ Afficher les IDs à copier dans `.env`

### Option 2 : Dashboard Stripe

1. Allez dans **Products** → **Add product**
2. Nom : `NotionClipper Premium`
3. Prix : `3.99€` / `mois` / `recurring`
4. Copiez le `PRICE_ID` dans `.env`

---

## Déploiement des Edge Functions (Sécurité)

### ⚠️ IMPORTANT : Architecture Sécurisée

Pour des raisons de sécurité, **les clés secrètes Stripe NE DOIVENT PAS être stockées dans l'application Electron**. À la place, nous utilisons des **Supabase Edge Functions** (backend serverless) qui gèrent toute la logique Stripe côté serveur.

```
App (USER_TOKEN uniquement)
  ↓ HTTPS + Bearer
Edge Functions (STRIPE_SECRET_KEY côté serveur)
  ↓
Stripe
```

### 1. Déployer les Edge Functions

Suivez le guide complet de déploiement :
👉 [supabase/EDGE_FUNCTIONS_DEPLOY.md](../supabase/EDGE_FUNCTIONS_DEPLOY.md)

**Résumé rapide :**
```bash
# Se connecter à Supabase
supabase login

# Lier au projet
supabase link --project-ref rijjtngbgahxdjflfyhi

# Configurer les secrets (coffre-fort serveur)
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_PREMIUM_PRICE_ID=price_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Déployer les 3 Edge Functions
supabase functions deploy create-checkout
supabase functions deploy webhook-stripe
supabase functions deploy get-subscription
```

### 2. Configuration du Webhook Stripe

Dans Stripe Dashboard → **Developers** → **Webhooks** :

1. Cliquez sur **Add endpoint**
2. URL : `https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/webhook-stripe`
3. Événements à écouter :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

4. Copiez le **Signing secret** (whsec_...) et ajoutez-le dans Supabase Secrets :
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Intégration dans l'application

### 1. Installer les dépendances

```bash
pnpm install
```

Vérifie que ces packages sont installés :
- `@supabase/supabase-js`
- `stripe` (uniquement pour typage côté client, pas utilisé directement)

### 2. Build des packages

```bash
pnpm run build:packages
```

### 3. Intégration complète avec exemples

👉 **Guide complet d'intégration client :**
[docs/EDGE_FUNCTIONS_CLIENT_INTEGRATION.md](./EDGE_FUNCTIONS_CLIENT_INTEGRATION.md)

Ce guide contient :
- ✅ Architecture sécurisée expliquée
- ✅ Configuration du SubscriptionService
- ✅ Exemples complets de bouton "Upgrade"
- ✅ Gestion du retour depuis Stripe
- ✅ Affichage des quotas en temps réel
- ✅ Hooks React personnalisés

### 4. Résumé rapide (voir guide complet pour détails)

```typescript
// Dans apps/notion-clipper-app/src/react/src/App.tsx

import { createClient } from '@supabase/supabase-js';
import { SubscriptionService } from '@notion-clipper/core-shared';

// Créer un client Supabase (UNIQUEMENT avec anon key)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // ⚠️ PAS la service_role key !
);

// Créer le SubscriptionService
const subscriptionService = new SubscriptionService(() => supabase);

// Initialiser
await subscriptionService.initialize();

// Wrapper avec SubscriptionProvider
function AppWithProviders() {
  return (
    <LocaleProvider>
      <SubscriptionProvider getSupabaseClient={() => supabase}>
        <App />
      </SubscriptionProvider>
    </LocaleProvider>
  );
}
```

**Upgrade vers Premium :**
```typescript
import { StripeCheckoutHelper } from '@notion-clipper/core-shared';

async function handleUpgrade() {
  const response = await subscriptionService.createCheckoutSession({
    success_url: `${window.location.origin}?checkout_success=true`,
    cancel_url: `${window.location.origin}?checkout_canceled=true`,
  });

  StripeCheckoutHelper.openCheckoutUrl(response.checkout_url);
}
```

---

## Quotas configurés

Les limites du plan **Gratuit** sont définies dans `packages/core-shared/src/config/subscription.config.ts` :

```typescript
FREE: {
  CLIPS: 100,                    // 100 clips/mois
  FILES: 10,                     // 10 fichiers/mois
  WORDS_PER_CLIP: 1000,          // 1000 mots max par clip
  FOCUS_MODE_TIME: 60,           // 60 minutes/mois
  COMPACT_MODE_TIME: 60,         // 60 minutes/mois
  MULTIPLE_SELECTIONS: Infinity  // Illimité (compte comme 1 clip)
}
```

**Plan Premium** : Tout illimité à **3.99€/mois**

---

## Tests

### 1. Test local

```bash
# Lancer l'app en dev
pnpm run dev:app
```

### 2. Test du flow d'upgrade

1. Utilisez l'app normalement
2. Atteignez une limite (ex: 100 clips)
3. Le modal d'upgrade devrait apparaître
4. Cliquez sur "Passer à Premium"
5. Vous serez redirigé vers Stripe Checkout

### 3. Tester avec Stripe Test Mode

Utilisez ces cartes de test Stripe :

- ✅ **Succès** : `4242 4242 4242 4242`
- ❌ **Échec** : `4000 0000 0000 0002`
- 🔄 **3D Secure** : `4000 0025 0000 3155`

Date : N'importe quelle date future
CVC : N'importe quel 3 chiffres

---

## Architecture

### Architecture Sécurisée avec Edge Functions

```
┌─────────────────────────────────────────────────────┐
│               NotionClipper App (Electron)          │
│                                                     │
│  ❌ AUCUNE clé secrète Stripe                      │
│  ✅ USER_TOKEN uniquement                           │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │         SubscriptionProvider (UI)             │ │
│  │                                               │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │   SubscriptionService                  │  │ │
│  │  │   + EdgeFunctionService                │  │ │
│  │  │   - Gère subscriptions                 │  │ │
│  │  │   - Appelle Edge Functions             │  │ │
│  │  │   - Calcule quotas                     │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  │                                               │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │  UsageTrackingService                  │  │ │
│  │  │  - Track clips, files, modes           │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  │                                               │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │      QuotaService                      │  │ │
│  │  │  - Vérifie avant actions               │  │ │
│  │  │  - Prompts upgrade                     │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
              ↓ HTTPS + Bearer Token
┌─────────────────────────────────────────────────────┐
│         Supabase Edge Functions (Deno)              │
│                                                     │
│  ✅ STRIPE_SECRET_KEY (coffre-fort serveur)        │
│  ✅ Vérifie authentification                        │
│                                                     │
│  • create-checkout → Crée session Stripe           │
│  • webhook-stripe → Traite webhooks Stripe         │
│  • get-subscription → Retourne status + quotas     │
└─────────────────────────────────────────────────────┘
              ↓                          ↓
        ┌──────────┐              ┌──────────┐
        │ Supabase │              │  Stripe  │
        │  (BDD)   │              │ (Payment)│
        └──────────┘              └──────────┘
```

### Flux de Paiement

1. **Utilisateur clique "Upgrade"** → App appelle `subscriptionService.createCheckoutSession()`
2. **EdgeFunctionService** → Appelle Edge Function `create-checkout` avec USER_TOKEN
3. **Edge Function** → Vérifie auth, crée session Stripe avec STRIPE_SECRET_KEY
4. **App reçoit URL** → Ouvre Stripe Checkout dans navigateur
5. **Utilisateur paie** → Stripe traite le paiement
6. **Stripe webhook** → Envoie événement à Edge Function `webhook-stripe`
7. **Edge Function** → Vérifie signature, met à jour BDD Supabase
8. **Utilisateur revient** → App recharge subscription, voit Premium actif

---

## Troubleshooting

### Erreur : "Auth session missing"

➡️ C'est normal avec la clé `anon`. Pour des opérations admin (migrations, Edge Functions), utilisez la clé `service_role` configurée dans Supabase Secrets.

### Erreur : "EdgeFunctionService not initialized"

➡️ Appelez `await subscriptionService.initialize()` avant d'utiliser le service.

### Erreur : "Authentication required"

➡️ L'utilisateur n'est pas connecté. Vérifiez que `supabase.auth.getSession()` retourne un token valide.

### Tables Supabase non créées

➡️ Exécutez manuellement la migration SQL dans le SQL Editor de Supabase.

### Edge Function ne se déploie pas

➡️ Vérifiez la syntaxe TypeScript et testez localement :
```bash
supabase functions serve create-checkout
```

### Webhook non reçu

➡️ Pour tester les webhooks en local avec les Edge Functions :

```bash
# 1. Servir les Edge Functions localement
supabase functions serve

# 2. Forwarder les webhooks Stripe vers l'Edge Function locale
stripe listen --forward-to http://localhost:54321/functions/v1/webhook-stripe

# 3. Déclencher un événement test
stripe trigger checkout.session.completed
```

➡️ En production, vérifiez que l'URL webhook dans Stripe Dashboard pointe vers :
```
https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/webhook-stripe
```

### La subscription n'est pas mise à jour après paiement

➡️ Le webhook Stripe prend quelques secondes. Attendez 3-5 secondes puis appelez :
```typescript
await subscriptionService.loadCurrentSubscription();
```

---

## Ressources

### Guides NotionClipper
- 🚀 [Guide de déploiement Edge Functions](../supabase/EDGE_FUNCTIONS_DEPLOY.md)
- 🎯 [Guide d'intégration client](./EDGE_FUNCTIONS_CLIENT_INTEGRATION.md)

### Documentation externe
- 📚 [Documentation Supabase](https://supabase.com/docs)
- ⚡ [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- 💳 [Documentation Stripe](https://stripe.com/docs)
- 🔐 [Stripe Webhooks](https://stripe.com/docs/webhooks)
- 🎨 [Design System Apple](https://developer.apple.com/design/)
- ✨ [Design Notion](https://www.notion.so/product)

---

## Support

Pour toute question :
- 📧 Email : support@notionclipper.com
- 💬 Discord : [Lien Discord]
- 🐛 Issues : [GitHub Issues]

---

**Made with ❤️ by NotionClipper Team**
