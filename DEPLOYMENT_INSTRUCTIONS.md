# 🚀 INSTRUCTIONS DE DÉPLOIEMENT CRITIQUES

**Date**: 2025-11-16
**Dernière Mise à Jour**: 2025-11-16 19:05 UTC
**Problèmes Identifiés**: 4 erreurs critiques nécessitant intervention manuelle

---

## ❌ ERREUR 1: Edge Function get-user-profile Non Déployée

### Symptôme
```
POST https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/get-user-profile 404 (Not Found)
```

### Cause
L'Edge Function `get-user-profile` a été créée dans le code mais **jamais déployée** sur Supabase.

### ✅ Solution

```bash
# 1. Aller dans le dossier du projet
cd /path/to/NotionClipper

# 2. Déployer la fonction
supabase functions deploy get-user-profile

# 3. Vérifier le déploiement
supabase functions list
# Doit afficher get-user-profile dans la liste
```

### Vérification
```bash
# Tester l'Edge Function
curl -X POST https://rijjtngbgahxdjflfyhi.supabase.co/functions/v1/get-user-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"userId":"test-id"}'

# Doit retourner 404 {"success": false, "error": "User not found"}
# (pas une erreur CORS 404, mais un JSON 404)
```

---

## ❌ ERREUR 2: Migration 005 - subscription_id Manquant

### Symptôme
```
Error: Failed to run sql query: ERROR: 23502: null value in column "subscription_id" of relation "usage_records" violates not-null constraint
DETAIL: Failing row contains (..., null, ...)
CONTEXT: SQL statement "INSERT INTO public.usage_records..."
```

### Cause
La table `usage_records` a une contrainte `subscription_id NOT NULL`, mais la fonction `increment_usage` (migration 005) insère sans spécifier `subscription_id`.

### ✅ Solution (MIGRATION CORRECTIVE CRÉÉE)

**ORDRE D'EXÉCUTION IMPORTANT** : Exécuter Migration 005 FIX **AVANT** Migration 006 !

```bash
# Via Supabase Dashboard SQL Editor (RECOMMANDÉ)
# 1. Aller sur https://supabase.com/dashboard → SQL Editor
# 2. Créer un nouveau query
# 3. Copier-coller le contenu de:
#    database/migrations/005_fix_increment_usage_subscription_id.sql
# 4. Exécuter
```

### Contenu de la Migration 005 FIX

```sql
-- Drop and recreate increment_usage with subscription_id support
DROP FUNCTION IF EXISTS public.increment_usage(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_action TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_subscription_id UUID;
BEGIN
  v_year := EXTRACT(YEAR FROM NOW());
  v_month := EXTRACT(MONTH FROM NOW());

  -- ✅ CORRECTION: Fetch subscription_id before INSERT
  SELECT id INTO v_subscription_id
  FROM public.subscriptions
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_subscription_id IS NULL THEN
    RAISE WARNING 'No subscription found for user %. Cannot track usage.', p_user_id;
    RETURN;
  END IF;

  CASE p_action
    WHEN 'clip' THEN
      INSERT INTO public.usage_records (
        user_id, subscription_id, year, month, clips_count, files_count, focus_mode_minutes, compact_mode_minutes
      ) VALUES (
        p_user_id, v_subscription_id, v_year, v_month, p_amount, 0, 0, 0
      )
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET
        clips_count = usage_records.clips_count + p_amount,
        updated_at = NOW();
    -- ... (autres WHEN similaires)
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) TO service_role;
```

**(Voir fichier complet dans `database/migrations/005_fix_increment_usage_subscription_id.sql`)**

### Vérification

```sql
-- Tester la fonction avec un utilisateur existant
SELECT increment_usage(
  (SELECT id FROM user_profiles LIMIT 1),
  'clip',
  1
);

-- Vérifier usage_records
SELECT * FROM usage_records ORDER BY updated_at DESC LIMIT 5;
-- Doit avoir subscription_id NON NULL
```

---

## ❌ ERREUR 3: Migration 006 - Fonction SQL Existe Déjà

### Symptôme
```
Error: Failed to run sql query: ERROR: 42P13: cannot change return type of existing function
HINT: Use DROP FUNCTION increment_usage_counter(uuid,text,integer) first.
```

### Cause
La fonction `increment_usage_counter` existe déjà en base de données avec un type de retour différent.

### ✅ Solution (MIGRATION CORRIGÉE)

J'ai corrigé la migration pour inclure `DROP FUNCTION IF EXISTS`. Voici comment l'appliquer:

```bash
# Option A: Via Supabase CLI
cd /path/to/NotionClipper
supabase db push

# Option B: Via Supabase Dashboard (RECOMMANDÉ)
# 1. Aller sur https://supabase.com/dashboard
# 2. Sélectionner votre projet
# 3. Aller dans "SQL Editor"
# 4. Créer un nouveau query
# 5. Copier-coller le contenu de:
#    database/migrations/006_create_increment_usage_counter.sql
# 6. Exécuter
```

### Contenu de la Migration (Corrigée)

```sql
-- Drop existing function if it exists (allows re-running migration)
DROP FUNCTION IF EXISTS public.increment_usage_counter(UUID, TEXT, INTEGER);

-- Create increment_usage_counter function that wraps increment_usage
CREATE OR REPLACE FUNCTION public.increment_usage_counter(
  p_user_id UUID,
  p_feature TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  year INTEGER,
  month INTEGER,
  clips_count INTEGER,
  files_count INTEGER,
  focus_mode_minutes INTEGER,
  compact_mode_minutes INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_year INTEGER;
  v_month INTEGER;
BEGIN
  -- Get current year and month
  v_year := EXTRACT(YEAR FROM NOW());
  v_month := EXTRACT(MONTH FROM NOW());

  -- Map feature to action (clips → clip, files → file)
  CASE p_feature
    WHEN 'clips' THEN
      v_action := 'clip';
    WHEN 'files' THEN
      v_action := 'file';
    WHEN 'focus_mode_time' THEN
      v_action := 'focus_mode';
    WHEN 'compact_mode_time' THEN
      v_action := 'compact_mode';
    ELSE
      RAISE EXCEPTION 'Invalid feature: %. Valid features: clips, files, focus_mode_time, compact_mode_time', p_feature;
  END CASE;

  -- Call the underlying increment_usage function
  PERFORM public.increment_usage(p_user_id, v_action, p_increment);

  -- Return the updated usage record
  RETURN QUERY
  SELECT
    ur.id,
    ur.user_id,
    ur.year,
    ur.month,
    ur.clips_count,
    ur.files_count,
    ur.focus_mode_minutes,
    ur.compact_mode_minutes,
    ur.created_at,
    ur.updated_at
  FROM public.usage_records ur
  WHERE ur.user_id = p_user_id
    AND ur.year = v_year
    AND ur.month = v_month;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(UUID, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(UUID, TEXT, INTEGER) TO service_role;
```

### Vérification

```sql
-- Vérifier que la fonction existe
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'increment_usage_counter';

-- Tester la fonction
SELECT * FROM increment_usage_counter(
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  'clips',
  1
);
```

---

## ❌ ERREUR 4: canPerformAction is not a function

### Symptôme
```
TypeError: subscriptionContext.subscriptionService.canPerformAction is not a function
```

### Cause
La méthode `canPerformAction` n'existait PAS dans `SubscriptionService`.

### ✅ Solution
**DÉJÀ CORRIGÉE** dans le code ! J'ai ajouté la méthode manquante dans:
`packages/core-shared/src/services/subscription.service.ts`

```typescript
async canPerformAction(feature: 'clip' | 'file', amount: number = 1): Promise<boolean> {
  const summary = await this.getQuotaSummary();

  switch (feature) {
    case 'clip':
      return summary.clips.can_use && (summary.clips.remaining >= amount || summary.clips.remaining === null);
    case 'file':
      return summary.files.can_use && (summary.files.remaining >= amount || summary.files.remaining === null);
    default:
      return false;
  }
}
```

### Action Requise
```bash
# Rebuild l'app pour appliquer les changements
cd /path/to/NotionClipper
pnpm build

# OU en mode dev
pnpm dev
```

---

## 📋 CHECKLIST DE DÉPLOIEMENT

- [x] **1. Déployer get-user-profile** (5 min) ✅ **FAIT**
  ```bash
  supabase functions deploy get-user-profile
  supabase functions list  # Vérifier
  ```

- [ ] **2. Appliquer Migration 005 FIX** (2 min) 🔴 **CRITIQUE - FAIRE EN PREMIER**
  ```bash
  # Via Supabase Dashboard SQL Editor
  # Copier contenu de database/migrations/005_fix_increment_usage_subscription_id.sql
  # Exécuter
  ```

- [ ] **3. Appliquer Migration 006** (2 min)
  ```bash
  # Via Supabase Dashboard SQL Editor
  # Copier contenu de database/migrations/006_create_increment_usage_counter.sql
  # Exécuter
  ```

- [ ] **4. Rebuild l'Application** (1 min)
  ```bash
  pnpm build  # OU pnpm dev
  ```

- [ ] **4. Clear Cache & Test** (5 min)
  - F12 → Application → Clear Storage
  - Se reconnecter avec Notion OAuth
  - Envoyer un clip
  - Vérifier logs (aucune erreur 404 ou "is not a function")

---

## 🧪 TESTS APRÈS DÉPLOIEMENT

### Test 1: get-user-profile Fonctionne
**Logs attendus** :
```
✅ [AuthDataManager] ℹ️ User already exists, skipping create-user call
```

**Pas de** :
```
❌ POST .../get-user-profile 404 (Not Found)
```

### Test 2: Migration SQL Appliquée
```sql
-- Dans Supabase SQL Editor
SELECT * FROM increment_usage_counter(
  (SELECT id FROM user_profiles LIMIT 1),
  'clips',
  1
);
-- Doit retourner une ligne avec clips_count incrémenté
```

### Test 3: canPerformAction Fonctionne
**Logs attendus** :
```
✅ [App] ✅ Quota OK, sending...
```

**Pas de** :
```
❌ TypeError: subscriptionContext.subscriptionService.canPerformAction is not a function
```

### Test 4: Quotas Trackés en DB
```sql
-- Vérifier usage_records
SELECT * FROM usage_records
WHERE user_id = 'YOUR_USER_ID'
ORDER BY updated_at DESC;

-- Envoyer 2-3 clips, clips_count doit s'incrémenter: 1 → 2 → 3
```

---

## 📊 RÉSUMÉ DES CHANGEMENTS

| # | Problème | Fichier Modifié | Action Requise | Status |
|---|----------|----------------|----------------|--------|
| 1 | get-user-profile 404 | `supabase/functions/get-user-profile/index.ts` | ✅ Déployer via CLI | ✅ **FAIT** |
| 2 | subscription_id NULL | `database/migrations/005_fix_increment_usage_subscription_id.sql` | ⏳ Exécuter SQL | 🔴 **CRITIQUE** |
| 3 | Migration 006 erreur | `database/migrations/006_create_increment_usage_counter.sql` | ⏳ Exécuter SQL | ⏳ **APRÈS #2** |
| 4 | canPerformAction missing | `packages/core-shared/src/services/subscription.service.ts` | ✅ Rebuild app | ✅ **CODE PRÊT** |

---

## 🆘 EN CAS DE PROBLÈME

### get-user-profile toujours 404 après déploiement ?
```bash
# Vérifier les logs Supabase
supabase functions logs get-user-profile

# Vérifier les secrets
supabase secrets list
# Doit contenir SUPABASE_SERVICE_ROLE_KEY
```

### Migration 005 FIX échoue ?
```sql
-- Vérifier que la table subscriptions a bien des données
SELECT COUNT(*) FROM subscriptions;

-- Vérifier qu'il y a une subscription pour votre user_id
SELECT * FROM subscriptions WHERE user_id = 'VOTRE_USER_ID';

-- Si pas de subscription, en créer une manuellement:
INSERT INTO subscriptions (user_id, tier, status)
VALUES ('VOTRE_USER_ID', 'free', 'active');
```

### Migration 006 échoue toujours ?
```sql
-- Forcer la suppression manuelle
DROP FUNCTION IF EXISTS public.increment_usage_counter(UUID, TEXT, INTEGER) CASCADE;

-- Puis réexécuter la migration
```

### canPerformAction toujours erreur ?
```bash
# Vérifier que le rebuild a été fait
rm -rf node_modules/.vite
pnpm dev

# Clear cache navigateur
# F12 → Application → Clear Storage
```

---

**FIN DES INSTRUCTIONS**
**Temps Estimé Total**: 15 minutes
**Criticité**: HAUTE - Bloque le tracking des quotas
