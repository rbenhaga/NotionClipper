# Edge Functions Deployment Guide

## 🚨 IMPORTANT: Edge Functions Non Déployées

Les Edge Functions Supabase existent dans le code (`supabase/functions/`) mais **ne sont PAS déployées sur Supabase**.

Actuellement, l'app fonctionne avec un **fallback "ephemeral subscription"** :
- Quand une Edge Function échoue avec 401 → subscription FREE créée en mémoire
- Toutes les features FREE tier fonctionnent normalement
- Pas de persistance en base de données (subscription temporaire par session)

## 🎯 Edge Functions Critiques à Déployer

### 1. `get-subscription` (PRIORITÉ HAUTE)
**Fichier:** `supabase/functions/get-subscription/index.ts`

**Rôle:**
- Récupère la subscription de l'utilisateur depuis la base
- Bypass les RLS (Row Level Security) pour les utilisateurs OAuth
- Retourne les quotas calculés avec usage actuel

**Sans déploiement:**
- Erreur 401 au chargement
- Fallback vers subscription ephemeral FREE (✅ fonctionne)

**Avec déploiement:**
- Chargement depuis la vraie base de données
- Persistance de la subscription entre sessions
- Tracking d'usage précis

### 2. `get-notion-token` (DÉPLOYÉE ✅)
**Status:** Cette fonction semble déjà déployée (aucune erreur 401 observée)

### 3. `create-checkout` (Stripe)
**Rôle:** Créer session Stripe Checkout pour upgrade Premium

### 4. `create-portal-session` (Stripe)
**Rôle:** Créer session Stripe Customer Portal (gestion abonnement)

### 5. `webhook-stripe` (Stripe)
**Rôle:** Recevoir webhooks Stripe (paiements, annulations)

## 📋 Comment Déployer

### Prérequis
```bash
# Installer Supabase CLI
npm install -g supabase

# Login à Supabase
supabase login
```

### Lier au Projet
```bash
# Depuis la racine du projet
cd /path/to/NotionClipper

# Lier au projet Supabase
supabase link --project-ref rijjtngbgahxdjflfyhi
```

### Déployer Toutes les Functions
```bash
# Déployer toutes les Edge Functions d'un coup
supabase functions deploy

# OU déployer une fonction spécifique
supabase functions deploy get-subscription
supabase functions deploy get-notion-token
supabase functions deploy create-checkout
supabase functions deploy create-portal-session
supabase functions deploy webhook-stripe
```

### Configurer les Secrets
Les Edge Functions nécessitent des variables d'environnement :

```bash
# Secrets Supabase (déjà configurés automatiquement)
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - SUPABASE_ANON_KEY

# Secrets Stripe (à configurer manuellement)
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PREMIUM_PRICE_ID=price_...

# Secret Encryption (pour tokens OAuth)
supabase secrets set TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### Vérifier le Déploiement
```bash
# Lister les fonctions déployées
supabase functions list

# Vérifier les logs
supabase functions logs get-subscription
```

### Tester les Functions
```bash
# Test manuel avec curl
curl -i --location --request POST \
  'https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/get-subscription' \
  --header 'Authorization: Bearer SUPABASE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"userId":"7d3c1cc9-3777-4e13-9a73-d78a9d13c2cd"}'
```

## 🔍 Diagnostic des Erreurs

### Erreur 401 Unauthorized
**Cause:** Edge Function non déployée ou mauvaise authentification

**Solution:**
1. Vérifier que la fonction est déployée : `supabase functions list`
2. Redéployer : `supabase functions deploy get-subscription`
3. Vérifier les logs : `supabase functions logs get-subscription`

### Erreur 406 Not Acceptable
**Cause:** RLS bloque l'accès direct à la table (requête REST API)

**Solution:**
- Utiliser Edge Function qui bypass RLS avec SERVICE_ROLE_KEY
- OU modifier les RLS policies pour permettre accès OAuth users

### Erreur 500 Internal Server Error
**Cause:** Bug dans le code de l'Edge Function

**Solution:**
1. Vérifier les logs : `supabase functions logs get-subscription`
2. Vérifier les secrets : variables d'environnement manquantes
3. Tester localement : `supabase functions serve get-subscription`

## 🏗️ Architecture Actuelle (Sans Déploiement)

```
Client App
    ↓
EdgeFunctionService.getSubscription()
    ↓
Edge Function get-subscription
    ↓ 401 (not deployed)
    ↓
SubscriptionService.loadCurrentSubscription()
    ↓ catch error
    ↓
CREATE EPHEMERAL FREE SUBSCRIPTION
    ↓
{
  id: 'ephemeral-free',
  tier: 'FREE',
  status: 'active',
  metadata: { ephemeral: true }
}
```

## 🎯 Architecture Cible (Avec Déploiement)

```
Client App
    ↓
EdgeFunctionService.getSubscription()
    ↓
Edge Function get-subscription
    ↓ SERVICE_ROLE_KEY (bypass RLS)
    ↓
Supabase Database
    ├─ subscriptions table
    └─ usage_records table
    ↓
RETURN REAL SUBSCRIPTION + QUOTAS
```

## 📊 Impact du Déploiement

### Sans Déploiement (Actuel)
- ✅ App fonctionne (subscription ephemeral)
- ✅ Toutes les features FREE accessibles
- ❌ Pas de persistance de subscription
- ❌ Pas de tracking d'usage précis
- ❌ Upgrade Premium impossible (pas de Stripe integration)

### Avec Déploiement
- ✅ Persistance subscription en database
- ✅ Tracking usage précis (clips, files, temps)
- ✅ Upgrade Premium via Stripe
- ✅ Gestion abonnement (Customer Portal)
- ✅ Webhooks Stripe pour synchronisation automatique

## 🚀 Prochaines Étapes

1. **Déployer get-subscription** (priorité haute)
   ```bash
   supabase functions deploy get-subscription
   ```

2. **Vérifier que ça fonctionne**
   - Relancer l'app
   - Vérifier les logs console → Plus d'erreur 401
   - Vérifier logs Supabase : `supabase functions logs get-subscription`

3. **Déployer les autres functions Stripe** (si upgrade Premium souhaité)
   ```bash
   supabase functions deploy create-checkout
   supabase functions deploy create-portal-session
   supabase functions deploy webhook-stripe
   ```

4. **Configurer Stripe**
   - Créer compte Stripe
   - Créer Product "Notion Clipper Premium"
   - Récupérer STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PREMIUM_PRICE_ID
   - Configurer secrets : `supabase secrets set ...`

## 📝 Notes Importantes

- Les Edge Functions utilisent **Deno** (pas Node.js)
- Les imports doivent utiliser des URLs complètes (ESM modules)
- Les secrets sont injectés via `Deno.env.get()`
- Les CORS sont gérés dans `_shared/cors.ts`
- Les constantes partagées dans `_shared/constants.ts`

## 🔗 Ressources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [Deno Deploy Docs](https://deno.com/deploy/docs)
