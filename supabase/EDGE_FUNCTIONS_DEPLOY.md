# 🚀 Guide de Déploiement - Supabase Edge Functions

Ce guide explique comment déployer les Edge Functions sécurisées pour le système freemium/premium.

## 📋 Prérequis

- ✅ Compte Supabase avec projet créé
- ✅ [Supabase CLI](https://supabase.com/docs/guides/cli) installé
- ✅ Clés Stripe (publishable + secret)
- ✅ Migration SQL exécutée

---

## 🔧 Installation Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase

# Vérifier l'installation
supabase --version
```

---

## 🔐 Configuration des Secrets (Coffre-fort)

### Option 1 : Supabase Secrets (Recommandé - Gratuit)

Les secrets sont stockés de manière sécurisée dans Supabase et jamais exposés côté client.

```bash
# 1. Se connecter à Supabase
supabase login

# 2. Lier au projet
supabase link --project-ref rijjtngbgahxdjflfyhi

# 3. Définir les secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_PREMIUM_PRICE_ID=price_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# 4. Vérifier les secrets
supabase secrets list
```

### Option 2 : Doppler (Si tu préfères)

```bash
# 1. Installer Doppler CLI
brew install dopplerhq/cli/doppler

# 2. Se connecter
doppler login

# 3. Setup projet
doppler setup

# 4. Ajouter secrets
doppler secrets set STRIPE_SECRET_KEY=sk_live_...

# 5. Injecter dans Supabase
doppler run -- supabase functions deploy
```

### Option 3 : Infisical (Open-source)

Similaire à Doppler, voir [infisical.com/docs](https://infisical.com/docs)

---

## 📦 Déploiement des Edge Functions

### Déployer toutes les fonctions

```bash
# Depuis la racine du projet
cd supabase

# Déployer toutes les Edge Functions
supabase functions deploy create-checkout
supabase functions deploy webhook-stripe
supabase functions deploy get-subscription

# Ou toutes d'un coup
supabase functions deploy --no-verify-jwt
```

### Déployer une seule fonction

```bash
# Exemple : redéployer seulement webhook-stripe
supabase functions deploy webhook-stripe
```

### Vérifier le déploiement

```bash
# Lister les fonctions déployées
supabase functions list

# Voir les logs
supabase functions logs create-checkout
```

---

## 🔗 URLs des Edge Functions

Après déploiement, tes fonctions seront accessibles via :

```
https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/create-checkout
https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/webhook-stripe
https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/get-subscription
```

---

## 🎯 Configuration Stripe Webhook

### 1. Créer le webhook dans Stripe Dashboard

1. Va sur https://dashboard.stripe.com/webhooks
2. Clique sur **Add endpoint**
3. URL : `https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/webhook-stripe`
4. Événements à écouter :
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
   - ✅ `invoice.payment_failed`

5. Copie le **Signing secret** (commence par `whsec_`)

### 2. Ajouter le secret Webhook

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Redéployer webhook-stripe

```bash
supabase functions deploy webhook-stripe
```

---

## 🧪 Tester les Edge Functions

### Test local avec Supabase CLI

```bash
# 1. Démarrer l'émulateur local
supabase start

# 2. Servir les fonctions localement
supabase functions serve

# 3. Tester create-checkout
curl -X POST http://localhost:54321/functions/v1/create-checkout \
  -H "Authorization: Bearer eyJhbGci..." \
  -H "Content-Type: application/json" \
  -d '{"success_url":"http://localhost:3000/success"}'
```

### Test en production

```bash
# Avec un token utilisateur valide
curl -X POST https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/create-checkout \
  -H "Authorization: Bearer [USER_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"success_url":"https://notionclipper.com/success"}'
```

---

## 🔍 Debugging

### Voir les logs en temps réel

```bash
# Logs de create-checkout
supabase functions logs create-checkout --follow

# Logs de webhook-stripe
supabase functions logs webhook-stripe --follow
```

### Tester le webhook Stripe localement

```bash
# 1. Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Se connecter
stripe login

# 3. Forwarder les webhooks
stripe listen --forward-to http://localhost:54321/functions/v1/webhook-stripe

# 4. Déclencher un événement test
stripe trigger checkout.session.completed
```

---

## 🏗️ Architecture de Sécurité

```
┌─────────────────────────────────────────────────┐
│           App Electron (Client)                 │
│  • Stocke USER_TOKEN uniquement                 │
│  • AUCUNE clé secrète                           │
│  • Appelle Edge Functions via HTTPS             │
└─────────────────────────────────────────────────┘
                    ↓ HTTPS + Bearer Token

┌─────────────────────────────────────────────────┐
│    Supabase Edge Functions (Deno Runtime)      │
│  • Vérifie AUTH via Supabase Auth              │
│  • Récupère secrets depuis Supabase Vault      │
│  • STRIPE_SECRET_KEY jamais exposée             │
│  • Signature verification pour webhooks        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│         Supabase Secrets (Coffre-fort)         │
│  • STRIPE_SECRET_KEY                            │
│  • STRIPE_WEBHOOK_SECRET                        │
│  • SUPABASE_SERVICE_ROLE_KEY                    │
│  • Chiffré at-rest et in-transit               │
└─────────────────────────────────────────────────┘
```

### ✅ Ce qui est SÉCURISÉ

- Secrets stockés côté serveur (jamais dans l'app)
- Webhooks signés cryptographiquement
- Authentication obligatoire sur tous les endpoints
- RLS activé sur Supabase
- HTTPS partout

### ❌ Ce qui serait DANGEREUX

- Stocker STRIPE_SECRET_KEY dans l'app (même chiffrée)
- Appeler Stripe directement depuis l'app
- Accepter des webhooks non signés
- Désactiver l'authentification

---

## 📊 Monitoring

### Dashboard Supabase

1. Va sur https://supabase.com/dashboard/project/rijjtngbgahxdjflfyhi
2. **Edge Functions** → Voir les invocations
3. **Logs** → Filtrer par fonction
4. **Metrics** → Latence, erreurs, etc.

### Stripe Dashboard

1. Va sur https://dashboard.stripe.com/webhooks
2. Vérifie que les événements sont bien reçus
3. En cas d'échec, regarde les logs Supabase

---

## 🔄 Mise à jour des Edge Functions

```bash
# 1. Modifier le code local
vim supabase/functions/create-checkout/index.ts

# 2. Tester localement
supabase functions serve create-checkout

# 3. Déployer
supabase functions deploy create-checkout

# 4. Vérifier les logs
supabase functions logs create-checkout --follow
```

---

## 💰 Coûts

### Supabase Edge Functions

- ✅ **2 millions** d'invocations/mois **GRATUIT**
- ✅ Puis **$2** par million supplémentaire

Pour NotionClipper :
- 1000 utilisateurs × 10 requêtes/jour = 300k invocations/mois
- **Totalement gratuit** 🎉

### Alternative : Vercel Edge Functions

Si tu préfères Vercel :
- ✅ **1 million** d'invocations/mois gratuit
- Code similaire, même architecture

---

## 🎯 Checklist de Déploiement

- [ ] Supabase CLI installé
- [ ] Projet lié (`supabase link`)
- [ ] Secrets configurés (`supabase secrets set`)
- [ ] Migration SQL exécutée
- [ ] Produit Stripe créé (`node scripts/setup-stripe-product.js`)
- [ ] Edge Functions déployées (`supabase functions deploy`)
- [ ] Webhook Stripe configuré (URL + événements)
- [ ] Tests effectués (local + prod)
- [ ] Logs vérifiés (pas d'erreurs)

---

## 🆘 Troubleshooting

### Erreur : "No signature"

➡️ Le webhook Stripe n'a pas de signature. Vérifie que :
1. L'URL du webhook est correcte
2. Le `STRIPE_WEBHOOK_SECRET` est bien configuré
3. Le webhook est actif dans Stripe

### Erreur : "Unauthorized"

➡️ Le token utilisateur est invalide ou expiré
1. Vérifie que l'app envoie bien `Authorization: Bearer [token]`
2. Le token doit être un Supabase Auth token valide

### Edge Function ne se déploie pas

➡️ Vérifie la syntaxe TypeScript
```bash
# Tester localement d'abord
supabase functions serve create-checkout
```

---

## 📚 Ressources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Deno Deploy Docs](https://deno.com/deploy/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

---

**🎉 Une fois déployé, ton système freemium sera 100% sécurisé !**
