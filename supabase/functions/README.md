# Supabase Edge Functions

Ce dossier contient les Edge Functions Supabase pour le système freemium/premium de NotionClipper.

## 🔐 Sécurité

**IMPORTANT:** Les Edge Functions permettent de garder les clés secrètes Stripe côté serveur, et non dans l'application Electron.

```
App (USER_TOKEN uniquement) → Edge Functions (STRIPE_SECRET_KEY) → Stripe
```

## 📦 Fonctions disponibles

### `create-checkout`
Crée une session Stripe Checkout de manière sécurisée.

**Endpoint:** `POST /functions/v1/create-checkout`

**Headers:**
- `Authorization: Bearer <USER_TOKEN>`

**Body:**
```json
{
  "success_url": "https://notionclipper.com/subscription/success",
  "cancel_url": "https://notionclipper.com/subscription/canceled",
  "metadata": {
    "source": "upgrade_modal"
  }
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/...",
  "session_id": "cs_..."
}
```

---

### `webhook-stripe`
Reçoit et traite les webhooks Stripe avec vérification de signature.

**Endpoint:** `POST /functions/v1/webhook-stripe`

**Headers:**
- `stripe-signature: <SIGNATURE>`

**Events gérés:**
- `checkout.session.completed` - Nouveau paiement
- `customer.subscription.created` - Création de subscription
- `customer.subscription.updated` - Mise à jour de subscription
- `customer.subscription.deleted` - Annulation
- `invoice.paid` - Paiement réussi
- `invoice.payment_failed` - Échec de paiement

---

### `get-subscription`
Retourne les informations de subscription de l'utilisateur avec quotas calculés.

**Endpoint:** `GET /functions/v1/get-subscription`

**Headers:**
- `Authorization: Bearer <USER_TOKEN>`

**Response:**
```json
{
  "subscription": {
    "id": "...",
    "tier": "premium",
    "status": "active",
    ...
  },
  "quotas": {
    "clips": {
      "used": 45,
      "limit": "Infinity",
      "remaining": "Infinity",
      "percentage": 0,
      "can_use": true
    },
    ...
  }
}
```

---

## 🚀 Déploiement

Voir le guide complet :
👉 [EDGE_FUNCTIONS_DEPLOY.md](../EDGE_FUNCTIONS_DEPLOY.md)

**Résumé rapide :**
```bash
# Se connecter
supabase login

# Lier au projet
supabase link --project-ref rijjtngbgahxdjflfyhi

# Configurer les secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_PREMIUM_PRICE_ID=price_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Déployer
supabase functions deploy create-checkout
supabase functions deploy webhook-stripe
supabase functions deploy get-subscription
```

---

## 🧪 Tests locaux

```bash
# Démarrer l'émulateur local
supabase start

# Servir les fonctions localement
supabase functions serve

# Tester create-checkout
curl -X POST http://localhost:54321/functions/v1/create-checkout \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"success_url":"http://localhost:3000/success"}'

# Forwarder les webhooks Stripe
stripe listen --forward-to http://localhost:54321/functions/v1/webhook-stripe
```

---

## 📊 Monitoring

### Logs en temps réel
```bash
supabase functions logs create-checkout --follow
supabase functions logs webhook-stripe --follow
```

### Dashboard Supabase
- **Edge Functions** → Invocations et métriques
- **Logs** → Filtrer par fonction
- **Metrics** → Latence, erreurs, coûts

---

## 💰 Coûts

- ✅ **2 millions** d'invocations/mois **GRATUIT**
- ✅ Puis **$2** par million supplémentaire

Pour NotionClipper avec 1000 utilisateurs × 10 requêtes/jour = 300k invocations/mois
→ **Totalement gratuit** 🎉

---

## 🔗 Ressources

- [Guide de déploiement complet](../EDGE_FUNCTIONS_DEPLOY.md)
- [Guide d'intégration client](../../docs/EDGE_FUNCTIONS_CLIENT_INTEGRATION.md)
- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentation Stripe Webhooks](https://stripe.com/docs/webhooks)
