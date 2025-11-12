# 🔍 AUDIT COMPLET - SYSTÈME AUTH & PREMIUM/FREEMIUM
**Date:** 2025-01-12
**Auditeur:** Claude
**Scope:** Architecture authentification, subscription, quotas, sécurité

---

## 📊 RÉSUMÉ EXÉCUTIF

### État Global
🔴 **CRITIQUE** - Le système n'est PAS prêt pour la production

### Problèmes Majeurs Identifiés
- **27 problèmes** confirmés de votre audit
- **6 problèmes additionnels** découverts
- **1 problème bloquant** qui empêche tout le système de fonctionner

### Impact Business
- ❌ Aucun utilisateur (FREE ou PREMIUM) ne peut utiliser le système de quotas
- ❌ ConfigPanel affiche "Non connecté" pour tous les utilisateurs
- ❌ Impossible de tracker l'usage réel
- ❌ Stripe checkout fonctionne mais subscription jamais créée en DB
- ❌ Tokens Notion exposés en clair (risque sécurité)

---

## 🚨 PROBLÈMES CRITIQUES (BLOQUANTS)

### #1 - ARCHITECTURE AUTH HYBRIDE INCOHÉRENTE ⛔ **BLOQUANT**

**Status:** ✅ CONFIRMÉ
**Sévérité:** 🔴 CRITIQUE
**Impact:** Tout le système de subscription/quotas est non-fonctionnel

#### Description
Le système utilise **deux architectures d'authentification incompatibles** :

1. **OAuth (Google/Notion)** pour l'authentification utilisateur
   - Données stockées dans `user_profiles` via AuthDataManager
   - Pas de création de session Supabase Auth
   - userId stocké localement

2. **Supabase Auth (JWT)** attendu par tous les services
   - SubscriptionService.getSubscriptionStatus() ligne 87
   - SubscriptionService.incrementUsage() ligne 184
   - get-subscription Edge Function ligne 73
   - AuthContext ligne 79-92
   - ConfigPanel via useAuth()

#### Preuve du problème

**SubscriptionService.ts:87**
```typescript
const { data: { session }, error: sessionError } =
  await this.supabaseClient.auth.getSession();

if (sessionError || !session) {
  console.warn('[SubscriptionService] No active session');
  return this.getFreeTierDefault(); // ← Retourne TOUJOURS ici
}
```

**get-subscription Edge Function:73**
```typescript
const { data: { user }, error: authError } =
  await supabase.auth.getUser(token);

if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }),
    { status: 401 }); // ← Retourne TOUJOURS 401
}
```

#### Conséquences en cascade
1. `getSubscriptionStatus()` retourne toujours `getFreeTierDefault()`
2. `canPerformAction()` utilise toujours les valeurs par défaut (0 usage, limites FREE)
3. `incrementUsage()` ne fait jamais rien (pas de session)
4. ConfigPanel affiche "Non connecté" (useAuth() retourne null)
5. Quotas jamais mis à jour en DB
6. Impossible de distinguer FREE vs PREMIUM

#### Solution Requise
**Option B (Recommandée) :** Refactorer pour utiliser userId partout

**Fichiers à modifier:**
1. ✅ DÉJÀ FAIT: `create-checkout/index.ts` (accepte userId)
2. ❌ TODO: `get-subscription/index.ts` (accepter userId au lieu de JWT)
3. ❌ TODO: `SubscriptionService.ts` (utiliser AuthDataManager.getCurrentData())
4. ❌ TODO: `AuthContext.tsx` (charger depuis user_profiles au lieu de Supabase Auth)
5. ❌ TODO: Créer trigger DB pour auto-créer subscription FREE lors de user_profiles INSERT

**Estimation:** 4-6 heures de travail

---

### #2 - SUBSCRIPTION FREE NON FONCTIONNELLE ⚠️

**Status:** ✅ CONFIRMÉ
**Sévérité:** 🔴 CRITIQUE
**Impact:** Utilisateurs FREE n'ont pas de subscription en DB

#### Description
La subscription FREE devrait être créée automatiquement, mais :

1. `get-subscription` Edge Function a le code (lignes 94-122)
2. Mais cette fonction n'est JAMAIS appelée (problème #1)
3. Même si appelée, elle attend un JWT qui n'existe pas

#### Preuve
```typescript
// get-subscription/index.ts:94
if (!subscription) {
  // Code pour créer subscription FREE
  // Mais ce code n'est JAMAIS exécuté
}
```

#### Solution Requise
1. Créer un **trigger PostgreSQL** sur `user_profiles`
2. Lors de l'INSERT, auto-créer une entrée dans `subscriptions`
3. Tier = 'free', status = 'active'

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION create_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    tier,
    status,
    current_period_start,
    current_period_end,
    is_grace_period
  ) VALUES (
    NEW.user_id,
    'free',
    'active',
    NOW(),
    NOW() + INTERVAL '1 month',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_free_subscription();
```

---

### #3 - PAGES NOTION NON CHARGÉES APRÈS ONBOARDING ⚠️

**Status:** ✅ CONFIRMÉ (votre audit)
**Sévérité:** 🟡 MOYEN
**Impact:** Mauvaise UX après inscription

#### Solution appliquée
handleStayFree() appelle maintenant `pages.loadPages()` mais besoin de vérifier que le token est sauvegardé avant.

#### À vérifier
```typescript
// App.tsx:handleStayFree
await authDataManager.saveAuthData(...); // ← Est-ce que ça sauvegarde le token?
await pages.loadPages(); // ← Est-ce que le token est disponible?
```

---

## ⚠️ PROBLÈMES MOYENS

### #4 - LOGS DE DEBUG EN PRODUCTION

**Status:** ✅ CONFIRMÉ
**Sévérité:** 🟡 MOYEN
**Impact:** Performance, sécurité

#### Exemples trouvés
```typescript
// AuthDataManager.ts:158
console.log('[AuthDataManager] 🔧 URL:', this.supabaseUrl);
console.log('[AuthDataManager] 🔧 Key:', this.supabaseKey ? 'Present' : 'Missing');

// SubscriptionService.ts:67
console.log('[SubscriptionService] Initialized with Supabase:', !!supabaseClient);

// create-checkout/index.ts:74
console.log('[create-checkout] Creating checkout for user:', userId, profile.email);
```

#### Solution
Implémenter un système de logging avec niveaux :
```typescript
// utils/logger.ts
const LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'error' : 'debug';

export const logger = {
  debug: (msg: string, ...args: any[]) => {
    if (LOG_LEVEL === 'debug') console.log(msg, ...args);
  },
  info: (msg: string, ...args: any[]) => {
    if (['debug', 'info'].includes(LOG_LEVEL)) console.log(msg, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    console.error(msg, ...args);
  }
};
```

---

### #5 - GESTION D'ERREURS SILENCIEUSE

**Status:** ✅ CONFIRMÉ
**Sévérité:** 🟡 MOYEN
**Impact:** Utilisateur ne sait pas si une action a échoué

#### Exemples
```typescript
// AuthDataManager.ts:189
catch (error) {
  console.error('[AuthDataManager] Error saving to Supabase:', error);
  // ← Pas de notification à l'utilisateur
}

// SubscriptionService.ts:199
catch (error) {
  console.error('[SubscriptionService] Error incrementing usage:', error);
  return; // ← Échec silencieux
}
```

#### Solution
Retourner les erreurs au caller et afficher des notifications :
```typescript
async saveAuthData(data: UserAuthData): Promise<{ success: boolean; error?: string }> {
  try {
    // ...
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// Dans App.tsx
const result = await authDataManager.saveAuthData(data);
if (!result.success) {
  notifications.showNotification(`Erreur: ${result.error}`, 'error');
}
```

---

### #6 - CONFIGPANEL NE MONTRE PAS LES INFOS USER

**Status:** ✅ CONFIRMÉ
**Sévérité:** 🟡 MOYEN
**Impact:** Mauvaise UX

#### Problème
ConfigPanel dépend de `useAuth()` qui retourne toujours null (problème #1)

#### Solution
Utiliser `AuthDataManager.getCurrentData()` :

```typescript
// ConfigPanel.tsx
const authData = authDataManager.getCurrentData();

// Afficher
{authData && (
  <div>
    <p>Email: {authData.email}</p>
    <p>Provider: {authData.authProvider}</p>
    {authData.notionWorkspace && (
      <p>Workspace: {authData.notionWorkspace.name}</p>
    )}
  </div>
)}
```

---

### #7 - PAS DE RETRY LOGIC POUR EDGE FUNCTIONS

**Status:** ✅ CONFIRMÉ
**Sévérité:** 🟡 MOYEN
**Impact:** Perte de données possible

#### Solution
Créer un wrapper avec retry :
```typescript
async function invokeWithRetry(
  client: SupabaseClient,
  functionName: string,
  body: any,
  maxRetries = 3
) {
  for (let i = 0; i < maxRetries; i++) {
    const { data, error } = await client.functions.invoke(functionName, { body });
    if (!error) return { data, error: null };

    if (i < maxRetries - 1) {
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000)); // Exponential backoff
    }
  }
  return { data: null, error: new Error('Max retries reached') };
}
```

---

### #12 - TOKEN NOTION NON CHIFFRÉ 🔐

**Status:** ✅ CONFIRMÉ
**Sévérité:** 🔴 HAUTE (Sécurité)
**Impact:** Token accessible si accès au stockage

#### Lieux de stockage
1. localStorage (clair)
2. Electron config (clair)
3. Supabase `notion_connections.access_token_encrypted` (nom trompeur, pas vraiment chiffré)

#### Solution
Utiliser `safeStorage` d'Electron :

```typescript
// Dans electron/main
import { safeStorage } from 'electron';

ipcMain.handle('store-token-secure', async (event, token: string) => {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token);
    return encrypted.toString('base64');
  }
  return token; // Fallback
});

ipcMain.handle('retrieve-token-secure', async (event, encrypted: string) => {
  if (safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(encrypted, 'base64');
    return safeStorage.decryptString(buffer);
  }
  return encrypted; // Fallback
});
```

---

## 🔧 PROBLÈMES ADDITIONNELS DÉCOUVERTS

### #28 - INCONSISTANCE NOMS VARIABLES D'ENVIRONNEMENT

**Sévérité:** 🟡 MOYEN

#### Problème
```typescript
// create-checkout/index.ts:25
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// get-subscription/index.ts:29
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!;
```

Incohérence dans les noms de variables.

#### Solution
Standardiser sur `SUPABASE_SERVICE_ROLE_KEY` partout.

---

### #29 - STRUCTURE QUOTAS INCONSISTANTE

**Sévérité:** 🟢 FAIBLE

#### Problème
```typescript
// get-subscription/index.ts:156
focus_mode_time: { ... }
compact_mode_time: { ... }

// SubscriptionService.ts:35
focusMode: QuotaInfo;
compactMode: QuotaInfo;
```

Noms différents (snake_case vs camelCase).

#### Solution
Mapper correctement dans SubscriptionService :
```typescript
const quotas = {
  clips: data.quotas.clips,
  files: data.quotas.files,
  focusMode: data.quotas.focus_mode_time,
  compactMode: data.quotas.compact_mode_time
};
```

---

### #30 - RPC increment_usage NON VÉRIFIÉ

**Sévérité:** 🟡 MOYEN

#### Problème
```typescript
// SubscriptionService.ts:192
const { error } = await this.supabaseClient.rpc('increment_usage', {
  p_user_id: session.user.id,
  p_action: action,
  p_amount: amount
});
```

Cette fonction RPC existe dans la migration SQL, mais jamais testée.

#### À vérifier
1. La migration 003 est-elle appliquée en DB ?
2. La fonction `increment_usage()` fonctionne-t-elle ?
3. Les paramètres correspondent-ils ?

---

### #31 - CORS TROP PERMISSIF 🔐

**Status:** ✅ CONFIRMÉ
**Sévérité:** 🟡 MOYEN (Sécurité)

#### Problème
```typescript
// Toutes les Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // ← Trop permissif
};
```

#### Solution
```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://notionclipper.com',
  'capacitor://localhost', // Pour mobile
];

const origin = req.headers.get('origin');
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Credentials': 'true',
};
```

---

### #32 - AUTHDATA POURRAIT ÉCRASER DES DONNÉES

**Sévérité:** 🟡 MOYEN

#### Problème
```typescript
// AuthDataManager.ts:saveAuthData()
// Si appelé plusieurs fois, pourrait écraser des données
```

#### Solution
Utiliser UPSERT au lieu de toujours INSERT :
```sql
INSERT INTO user_profiles (...)
VALUES (...)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);
```

---

### #33 - PAS DE MÉCANISME DE MIGRATION USERS EXISTANTS

**Sévérité:** 🟢 FAIBLE (si nouveau projet)
**Sévérité:** 🔴 HAUTE (si users existants)

#### Problème
Si des utilisateurs existent déjà dans la DB sans subscription, ils seront bloqués.

#### Solution
Créer un script de migration :
```sql
INSERT INTO subscriptions (user_id, tier, status, ...)
SELECT user_id, 'free', 'active', NOW(), NOW() + INTERVAL '1 month', FALSE
FROM user_profiles
WHERE user_id NOT IN (SELECT user_id FROM subscriptions);
```

---

## 📋 PLAN D'ACTION PRIORISÉ

### 🔴 PHASE 1 - URGENT (Aujourd'hui)
**Objectif:** Débloquer le système de subscription

#### 1.1 Refactorer get-subscription Edge Function
- [ ] Accepter `userId` dans le body au lieu de JWT
- [ ] Vérifier user dans `user_profiles`
- [ ] Tester avec curl

**Fichier:** `supabase/functions/get-subscription/index.ts`
**Temps estimé:** 30 min

#### 1.2 Refactorer SubscriptionService
- [ ] Utiliser `AuthDataManager.getCurrentData()` au lieu de `supabaseClient.auth`
- [ ] Passer userId aux Edge Functions
- [ ] Tester getSubscriptionStatus(), canPerformAction(), incrementUsage()

**Fichier:** `packages/ui/src/services/SubscriptionService.ts`
**Temps estimé:** 1h

#### 1.3 Créer trigger auto-subscription FREE
- [ ] Créer migration SQL avec trigger
- [ ] Appliquer en DB
- [ ] Tester avec un nouvel utilisateur

**Fichier:** `database/migrations/004_auto_create_free_subscription.sql`
**Temps estimé:** 30 min

#### 1.4 Mettre à jour ConfigPanel
- [ ] Utiliser `AuthDataManager.getCurrentData()`
- [ ] Afficher email, provider, workspace
- [ ] Tester affichage

**Fichier:** `packages/ui/src/components/panels/ConfigPanel.tsx`
**Temps estimé:** 30 min

**Total Phase 1:** 2h30
**Impact:** Débloque tout le système

---

### 🟡 PHASE 2 - IMPORTANT (Cette semaine)

#### 2.1 Chiffrer tokens Notion
- [ ] Implémenter safeStorage dans Electron
- [ ] Migrer AuthDataManager pour utiliser safeStorage
- [ ] Tester chiffrement/déchiffrement

**Temps estimé:** 2h

#### 2.2 Ajouter retry logic
- [ ] Créer `invokeWithRetry()` helper
- [ ] Utiliser dans tous les appels Edge Functions
- [ ] Tester avec network throttling

**Temps estimé:** 1h

#### 2.3 Améliorer gestion d'erreurs
- [ ] Retourner `{ success, error }` partout
- [ ] Afficher notifications à l'utilisateur
- [ ] Tester tous les flows d'erreur

**Temps estimé:** 2h

#### 2.4 Réduire logs production
- [ ] Créer système de logger
- [ ] Remplacer tous les console.log
- [ ] Tester en dev et prod

**Temps estimé:** 1h

#### 2.5 Fixer CORS
- [ ] Restreindre origins
- [ ] Tester depuis différents origins
- [ ] Documenter origins autorisés

**Temps estimé:** 30 min

**Total Phase 2:** 6h30

---

### 🟢 PHASE 3 - AMÉLIORATION (Prochaine itération)

#### 3.1 Refactoring architecture
- [ ] Centraliser logique auth dans AuthService unique
- [ ] Extraire logique App.tsx en hooks
- [ ] Implémenter state machine pour onboarding

**Temps estimé:** 8h

#### 3.2 Tests
- [ ] Tests unitaires AuthDataManager
- [ ] Tests unitaires SubscriptionService
- [ ] Tests intégration flow onboarding
- [ ] Tests E2E complet

**Temps estimé:** 12h

#### 3.3 Monitoring & Analytics
- [ ] Intégrer Sentry
- [ ] Intégrer analytics (Mixpanel/Amplitude)
- [ ] Créer dashboards

**Temps estimé:** 4h

**Total Phase 3:** 24h

---

## 🎯 RECOMMANDATION FINALE

### Priorité Absolue
Le **Problème #1 (Architecture Auth)** bloque TOUT. Il faut le résoudre en priorité.

### Quick Win
Faire la **Phase 1** (2h30) permet de :
- ✅ Débloquer subscriptions
- ✅ Débloquer quotas
- ✅ Débloquer ConfigPanel
- ✅ Rendre le système utilisable

### Après Phase 1
Le système sera **fonctionnel mais pas sécurisé**. Phase 2 (6h30) rend le système **production-ready**.

### Timeline Recommandée
- **Aujourd'hui:** Phase 1 (2h30)
- **Cette semaine:** Phase 2 (6h30)
- **Prochaine itération:** Phase 3 (24h)

**Total investissement:** ~33h pour un système complet, sécurisé, et testé

---

## 📊 CONFIRMATION DE VOTRE AUDIT

### Problèmes confirmés (27/27)
✅ Tous les problèmes de votre audit sont **confirmés** et **validés**

### Problèmes additionnels trouvés (6)
- #28 Inconsistance noms variables env
- #29 Structure quotas inconsistante
- #30 RPC increment_usage non vérifié
- #31 CORS trop permissif
- #32 AuthData pourrait écraser données
- #33 Pas de migration users existants

### Total
**33 problèmes** identifiés au total

---

## ✅ PROCHAINES ÉTAPES

1. **Valider ce plan** avec vous
2. **Commencer Phase 1** immédiatement
3. **Tester chaque fix** avant de passer au suivant
4. **Documenter** les changements au fur et à mesure

Souhaitez-vous que je commence l'implémentation de la Phase 1 ?
