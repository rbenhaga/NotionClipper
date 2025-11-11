# 🚀 Guide Rapide - Initialisation du SubscriptionProvider

Ce guide explique comment initialiser le `SubscriptionProvider` dans votre application Electron pour activer les fonctionnalités de subscription dans le ConfigPanel.

---

## ✅ Ce qui est déjà fait

- ✅ Edge Functions déployées (create-checkout, get-subscription, webhook-stripe, create-portal-session)
- ✅ ConfigPanel modifié avec section Abonnement intégrée
- ✅ Composants UI subscription créés (SubscriptionBadge, QuotaCounter, UpgradeModal)
- ✅ Services subscription créés (SubscriptionService, QuotaService, UsageTrackingService)
- ✅ SubscriptionContext créé

---

## 🔧 Ce qu'il reste à faire

### Étape 1: Wrapper l'app avec SubscriptionProvider

Trouve le composant principal de ton app Electron et wrappe-le avec le `SubscriptionProvider`.

#### Option A: Si tu as un fichier d'entrée React principal

**packages/adapters/electron/src/renderer.tsx** (ou similaire)

```typescript
import React from 'react';
import ReactDOM from 'react-dom';
import { SubscriptionProvider } from '@notion-clipper/ui';
import { App } from './App';

// Fonction pour obtenir le client Supabase
const getSupabaseClient = () => {
  // Retourner le client Supabase initialisé
  return window.electron.supabase;
};

ReactDOM.render(
  <React.StrictMode>
    <SubscriptionProvider getSupabaseClient={getSupabaseClient}>
      <App />
    </SubscriptionProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
```

#### Option B: Si tu utilises un composant App wrapper

```typescript
import React, { useEffect, useState } from 'react';
import { SubscriptionProvider } from '@notion-clipper/ui';
import { createClient } from '@supabase/supabase-js';

export function App() {
  const [supabaseClient, setSupabaseClient] = useState<any>(null);

  useEffect(() => {
    // Initialiser le client Supabase
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    setSupabaseClient(client);
  }, []);

  if (!supabaseClient) {
    return <LoadingScreen />;
  }

  return (
    <SubscriptionProvider getSupabaseClient={() => supabaseClient}>
      <YourMainApp />
    </SubscriptionProvider>
  );
}
```

---

### Étape 2: Vérifier que ConfigPanel s'affiche correctement

1. Lancer l'app Electron :
```bash
npm run dev
```

2. Ouvrir le ConfigPanel (généralement via un bouton Settings dans l'UI)

3. Vérifier que tu vois maintenant :
   - ✅ Section "Connexion" (Notion)
   - ✅ **Section "Abonnement"** (NOUVELLE !) avec badge + bouton upgrade
   - ✅ Section "Apparence" (thème)
   - ✅ Section "Langue"
   - ✅ Section "Actions" (vider cache, déconnexion)

---

### Étape 3: Tester le flow complet

#### Test 1: Vérifier l'affichage du badge

1. Ouvrir ConfigPanel
2. La section "Abonnement" doit montrer :
   - Badge "Gratuit" pour un utilisateur free
   - Bouton "Passer à Premium"
   - Quotas compacts si < 100% utilisés

#### Test 2: Tester l'upgrade

1. Cliquer sur "Passer à Premium"
2. Modal d'upgrade doit s'ouvrir
3. Cliquer "Upgrade"
4. Navigateur s'ouvre avec Stripe Checkout
5. Payer avec carte test: `4242 4242 4242 4242`
6. Revenir à l'app
7. Badge doit passer à "Premium"

#### Test 3: Tester le Customer Portal (si premium)

1. Après être passé Premium
2. Ouvrir ConfigPanel
3. Cliquer sur "Gérer mon abonnement"
4. Navigateur s'ouvre avec Stripe Customer Portal
5. Voir factures, modifier carte, annuler abonnement

---

## 🐛 Troubleshooting

### Le ConfigPanel ne montre pas la section Abonnement

**Cause**: SubscriptionProvider n'est pas initialisé

**Solution**: Vérifier que l'app est wrappée avec `<SubscriptionProvider>`

---

### Erreur "SubscriptionProvider not available"

**Cause**: C'est normal ! ConfigPanel gère ce cas gracieusement

**Effet**: La section Abonnement ne s'affichera simplement pas

**Solution**: Ajouter le SubscriptionProvider comme indiqué ci-dessus

---

### Erreur "Cannot read property 'subscriptionService' of null"

**Cause**: Le SubscriptionProvider n'a pas accès au client Supabase

**Solution**: Vérifier que `getSupabaseClient` retourne bien un client valide

```typescript
const getSupabaseClient = () => {
  const client = window.electron?.supabase || createClient(...);
  console.log('Supabase client:', client); // Debug
  return client;
};
```

---

### La section Abonnement s'affiche mais reste vide

**Cause**: Erreur lors du chargement des données

**Solution**: Ouvrir la console et vérifier les erreurs :
```
Failed to load subscription data: [error message]
```

Vérifier que :
- ✅ Edge Functions sont déployées
- ✅ Secrets Supabase sont configurés
- ✅ Tables `subscriptions` et `usage_records` existent

---

## 📊 Comportement attendu

### Pour un utilisateur FREE:

```
┌────────────────────────────────────┐
│  Config Panel                   [X]│
├────────────────────────────────────┤
│  Connexion                         │
│  [Notion]  🟢 Connecté             │
├────────────────────────────────────┤
│  Abonnement          🆓 Gratuit    │
│  ┌──────────────────────────────┐ │
│  │ ⚡ Passer à Premium           │ │
│  │ 3,99€/mois • Clips illimités │ │
│  └──────────────────────────────┘ │
│                                    │
│  Utilisation:                      │
│  Clips: 45/100                     │
│  Fichiers: 3/10                    │
├────────────────────────────────────┤
│  Apparence                         │
│  [Clair] [Sombre] [Auto]           │
└────────────────────────────────────┘
```

### Pour un utilisateur PREMIUM:

```
┌────────────────────────────────────┐
│  Config Panel                   [X]│
├────────────────────────────────────┤
│  Connexion                         │
│  [Notion]  🟢 Connecté             │
├────────────────────────────────────┤
│  Abonnement          ✨ Premium    │
│  ┌──────────────────────────────┐ │
│  │ 💳 Gérer mon abonnement      │ │
│  │ Factures, carte, annulation  │ │
│  └──────────────────────────────┘ │
├────────────────────────────────────┤
│  Apparence                         │
│  [Clair] [Sombre] [Auto]           │
└────────────────────────────────────┘
```

---

## 🎯 Checklist finale

Avant de considérer l'intégration comme terminée :

- [ ] SubscriptionProvider ajouté au composant racine
- [ ] ConfigPanel s'affiche correctement
- [ ] Section Abonnement visible dans ConfigPanel
- [ ] Badge affiche le bon tier (Free/Premium/Grace)
- [ ] Bouton "Passer à Premium" fonctionne
- [ ] Modal d'upgrade s'ouvre correctement
- [ ] Stripe Checkout s'ouvre dans le navigateur
- [ ] Paiement test réussi (carte 4242...)
- [ ] Badge se met à jour après paiement
- [ ] Bouton "Gérer mon abonnement" fonctionne (si premium)
- [ ] Customer Portal s'ouvre correctement

---

## 📚 Ressources

- [Guide d'intégration complet](./INTEGRATION_ELECTRON.md)
- [Documentation Stripe Customer Portal](./STRIPE_CUSTOMER_PORTAL.md)
- [SubscriptionContext API](../packages/ui/src/contexts/SubscriptionContext.tsx)
- [ConfigPanel source](../packages/ui/src/components/panels/ConfigPanel.tsx)

---

**✅ Une fois le SubscriptionProvider ajouté, le système est 100% opérationnel !**
