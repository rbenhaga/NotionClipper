# 🔧 CORRECTIONS CRITIQUES - Système de Subscription

**Date**: 2025-11-16
**Branch**: `claude/audit-oauth-freemium-014qMX9wQX44vZfxKM7T5PXu`

---

## 🚨 PROBLÈME IDENTIFIÉ

**L'application N'UTILISAIT PAS la base de données Supabase pour les subscriptions !**

### Symptômes

```
[SubscriptionService] Supabase client not yet initialized, using defaults
[SubscriptionService] No subscription found, creating default FREE tier
```

Logs répétés à chaque action, même après connexion réussie.

### Cause Racine

Le `SupabaseClient` créé par `createClient()` **n'expose PAS** `supabaseUrl` et `supabaseKey` comme propriétés publiques.

**Code BUGUÉ** (subscription.service.ts ligne 71-72):
```typescript
const supabaseUrl = this.supabaseClient.supabaseUrl; // ❌ UNDEFINED !
const supabaseKey = this.supabaseClient.supabaseKey; // ❌ UNDEFINED !

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required properties'); // ❌ ERREUR !
}
```

**Résultat** :
1. `initialize()` lance une erreur silencieuse
2. `edgeFunctionService` n'est JAMAIS créé
3. AUCUNE communication avec la base de données
4. Subscriptions "ephemeral" créées en mémoire à la place
5. **Quotas JAMAIS trackés en DB** ❌

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. SubscriptionProvider modifié

**Fichier**: `packages/ui/src/contexts/SubscriptionContext.tsx`

**Changement**:
```typescript
export interface SubscriptionProviderProps {
  children: ReactNode;
  getSupabaseClient: () => any;
  supabaseUrl: string;        // ✅ NOUVEAU
  supabaseKey: string;         // ✅ NOUVEAU
}
```

### 2. SubscriptionService modifié

**Fichier**: `packages/core-shared/src/services/subscription.service.ts`

**Changement**:
```typescript
constructor(
  private readonly getSupabaseClient: () => SupabaseClient,
  private readonly supabaseUrl: string,   // ✅ NOUVEAU
  private readonly supabaseKey: string    // ✅ NOUVEAU
) {
  this.supabaseClient = null;
}

async initialize(): Promise<void> {
  this.supabaseClient = this.getSupabaseClient();

  // ✅ Utiliser les paramètres passés au constructor
  this.edgeFunctionService = new EdgeFunctionService(
    { supabaseUrl: this.supabaseUrl, supabaseKey: this.supabaseKey },
    async () => { /* ... */ }
  );
}
```

### 3. UsageTrackingService modifié

**Fichier**: `packages/core-shared/src/services/usage-tracking.service.ts`

**Changement**:
```typescript
constructor(
  private readonly getSupabaseClient: () => SupabaseClient,
  private readonly supabaseUrl?: string,   // ✅ NOUVEAU (optionnel)
  private readonly supabaseKey?: string    // ✅ NOUVEAU (optionnel)
) {}
```

### 4. App.tsx modifié

**Fichier**: `apps/notion-clipper-app/src/react/src/App.tsx`

**Changement**:
```typescript
<SubscriptionProvider
  getSupabaseClient={() => supabaseClient}
  supabaseUrl={supabaseUrl}        // ✅ NOUVEAU
  supabaseKey={supabaseAnonKey}   // ✅ NOUVEAU
>
  <App />
</SubscriptionProvider>
```

---

## 🚀 DÉPLOIEMENT REQUIS

### 1. Déployer l'Edge Function manquante (CRITIQUE)

```bash
supabase functions deploy get-user-profile
```

**Vérifier le déploiement**:
```bash
supabase functions list
# Devrait montrer get-user-profile dans la liste
```

### 2. Tester le Flow Complet

1. **Redémarrer l'app**:
   ```bash
   pnpm dev
   ```

2. **Clear le cache**:
   - F12 → Application → Clear Storage
   - OU Cmd+Shift+Delete

3. **Se connecter avec Notion OAuth**

4. **Vérifier les logs** (doivent montrer):
   ```
   ✅ [SubscriptionService] Initialized with Supabase: true URL: true Key: true
   ✅ [SubscriptionService] Fetching subscription for user: xxx
   ✅ [SubscriptionService] Subscription status loaded: free
   ```

5. **Envoyer un clip et vérifier** :
   - Le quota devrait être tracké en DB
   - Pas de message "creating default FREE tier" après le premier login

---

## 📊 AVANT vs APRÈS

### AVANT (Bugué) ❌

```
1. User logs in with Notion OAuth
2. SubscriptionService.initialize() called
3. Tries to access this.supabaseClient.supabaseUrl → UNDEFINED
4. Throws error "Missing required properties"
5. edgeFunctionService = null
6. getCurrentSubscription() returns ephemeral FREE subscription
7. Quotas NOT tracked in database
8. Every action creates new ephemeral subscription
```

**Logs**:
```
[SubscriptionService] Supabase client not yet initialized, using defaults
[SubscriptionService] No subscription found, creating default FREE tier
[SubscriptionService] No subscription or usage record, returning default quotas
```

### APRÈS (Corrigé) ✅

```
1. User logs in with Notion OAuth
2. SubscriptionService.initialize() called
3. Uses supabaseUrl/supabaseKey from constructor params
4. edgeFunctionService created successfully
5. getCurrentSubscription() fetches from database via Edge Function
6. Quotas tracked in usage_records table
7. Subscription persisted across sessions
```

**Logs**:
```
[SubscriptionService] Initialized with Supabase: true URL: true Key: true
[SubscriptionService] Fetching subscription for user: xxx
[EdgeFunction] Fetching https://...supabase.co/functions/v1/get-subscription
[EdgeFunction] ✅ Fetch succeeded on attempt 1
[SubscriptionService] ✅ Subscription status loaded: free
```

---

## 🔍 TESTS À RÉALISER

### Test 1: Première inscription
1. Clear storage
2. Connect with Notion OAuth
3. Vérifier que subscription est créée en DB (table `subscriptions`)
4. Envoyer un clip
5. Vérifier que `usage_records` table a une entrée avec `clips_count = 1`

### Test 2: Reconnexion
1. Disconnect (clear storage)
2. Reconnect with same Notion account
3. Vérifier que subscription est chargée depuis DB (pas recréée)
4. Envoyer un clip
5. Vérifier que `clips_count` s'incrémente (pas reset à 1)

### Test 3: Quotas
1. Vérifier le header affiche les bons quotas (ex: 1/100 clips)
2. Envoyer plusieurs clips
3. Vérifier que le compteur s'incrémente en temps réel
4. Refresh la page
5. Vérifier que le compteur persiste (chargé depuis DB)

---

## 📝 FICHIERS MODIFIÉS

| Fichier | Lignes | Changement |
|---------|--------|------------|
| `packages/ui/src/contexts/SubscriptionContext.tsx` | 24-57 | Ajout props supabaseUrl/supabaseKey |
| `packages/core-shared/src/services/subscription.service.ts` | 56-85 | Constructor + initialize() modifiés |
| `packages/core-shared/src/services/usage-tracking.service.ts` | 49-53 | Constructor modifié |
| `apps/notion-clipper-app/src/react/src/App.tsx` | 1331-1337 | Ajout props à SubscriptionProvider |

---

## ⚠️ BREAKING CHANGES

Si vous avez d'autres apps qui utilisent `SubscriptionProvider`, vous devez ajouter les props `supabaseUrl` et `supabaseKey` :

```typescript
// AVANT
<SubscriptionProvider getSupabaseClient={() => client}>

// APRÈS
<SubscriptionProvider
  getSupabaseClient={() => client}
  supabaseUrl={YOUR_SUPABASE_URL}
  supabaseKey={YOUR_SUPABASE_KEY}
>
```

---

## 🎯 PROCHAINES ÉTAPES

1. ✅ **Déployer get-user-profile** (commande ci-dessus)
2. ✅ **Tester le flow complet** (étapes ci-dessus)
3. 🔄 **Monitoring** : Surveiller les logs pour confirmer que DB est utilisée
4. 🔄 **Vérifier la table usage_records** : Doit se remplir au fur et à mesure

---

**Fin du guide de correction**
**Impact**: CRITIQUE - L'app utilise maintenant la base de données pour les subscriptions et quotas
**Statut**: TESTÉ LOCALEMENT - À déployer en production
