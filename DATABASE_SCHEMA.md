# ANALYSE EXHAUSTIVE DU SCHÉMA DE BASE DE DONNÉES - NotionClipper

Date: 2025-11-18
Branch: claude/oauth-freemium-audit-011tKzT23CgRVpTbSa3aHj83

---

## TABLES EXISTANTES

### 1. TABLE: user_profiles

**Status:** ✅ Existe (créée via Supabase UI, pas de migration SQL trouvée)

#### Colonnes:
```sql
- id: UUID PRIMARY KEY (identique à auth.users.id)
- email: TEXT NOT NULL
- full_name: TEXT (nullable)
- avatar_url: TEXT (nullable)
- auth_provider: TEXT ('google' | 'notion')
- created_at: TIMESTAMPTZ NOT NULL
- updated_at: TIMESTAMPTZ NOT NULL
```

#### Relations:
- **FK implicite:** `id` → `auth.users(id)` (via OAuth)
- **Referenced par:** 
  - `subscriptions.user_id`
  - `usage_records.user_id`
  - `notion_connections.user_id`

#### Indexes:
- PRIMARY KEY sur `id`
- Probablement UNIQUE sur `email` (à vérifier)

#### Triggers:
- **on_user_profile_created**: Crée automatiquement une subscription FREE après INSERT
  - Function: `create_free_subscription_for_new_user()`
  - Migration: `20251114_auto_create_free_subscription.sql`

#### RLS (Row Level Security):
- Status: Probablement activé mais non documenté dans les migrations
- Politique attendue: Users can only access their own profile

#### Utilisé par (côté Electron/Frontend):
- **Edge Functions:**
  - `create-user` - Création/mise à jour du profil OAuth
  - `get-user-profile` - Récupération du profil
  - `get-subscription` - Validation de l'existence de l'utilisateur
  - `create-checkout` - Validation avant création Stripe checkout
  - `get-user-by-workspace` - Récupération via workspace Notion

---

### 2. TABLE: subscriptions

**Status:** ✅ Existe (créée via Supabase UI, pas de migration SQL trouvée)

#### Colonnes:
```sql
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: UUID NOT NULL UNIQUE
- tier: TEXT NOT NULL ('free' | 'premium' | 'grace_period')
- status: TEXT NOT NULL ('active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'grace_period' | 'incomplete' | 'incomplete_expired')

-- Stripe Integration
- stripe_customer_id: TEXT (nullable)
- stripe_subscription_id: TEXT (nullable)
- stripe_price_id: TEXT (nullable)

-- Période d'abonnement
- current_period_start: TIMESTAMPTZ NOT NULL
- current_period_end: TIMESTAMPTZ NOT NULL
- cancel_at: TIMESTAMPTZ (nullable)
- canceled_at: TIMESTAMPTZ (nullable)

-- Période de grâce (Freemium → Premium downgrade)
- grace_period_ends_at: TIMESTAMPTZ (nullable)
- is_grace_period: BOOLEAN NOT NULL DEFAULT false

-- Métadonnées
- metadata: JSONB (nullable)
- created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### Contraintes:
```sql
UNIQUE(user_id) -- Un seul abonnement actif par utilisateur
```

#### Relations:
- **FK:** `user_id` → `user_profiles(id)` ON DELETE CASCADE
- **Referenced par:**
  - `usage_records.subscription_id`

#### Indexes:
- PRIMARY KEY sur `id`
- UNIQUE sur `user_id`
- Probablement INDEX sur `stripe_customer_id`, `stripe_subscription_id`

#### Triggers:
Aucun trigger direct, mais utilisé par le trigger `on_user_profile_created` qui crée la subscription FREE

#### RLS (Row Level Security):
- Status: Probablement activé
- Politique attendue: Users can only access their own subscription

#### RPC Functions associées:
Aucune RPC function spécifique

#### Utilisé par (côté Electron/Frontend):
- **Services TypeScript:**
  - `SubscriptionService` - Gestion des abonnements
  - `StripeService` - Intégration Stripe
  - `BackendApiService` - Communication frontend ↔ backend

- **Edge Functions:**
  - `get-subscription` - Récupération de l'abonnement et des quotas
  - `create-user` - Création subscription FREE par défaut
  - `create-checkout` - Création session Stripe checkout

- **IPC Handlers (Electron):**
  - Usage indirect via Services

---

### 3. TABLE: usage_records

**Status:** ✅ Existe (créée via Supabase UI, pas de migration SQL trouvée)

#### Colonnes:
```sql
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: UUID NOT NULL
- subscription_id: UUID NOT NULL

-- Période (mois calendaire)
- year: INTEGER NOT NULL
- month: INTEGER NOT NULL (1-12)
- period_start: TIMESTAMPTZ NOT NULL
- period_end: TIMESTAMPTZ NOT NULL

-- Compteurs d'usage
- clips_count: INTEGER NOT NULL DEFAULT 0
- files_count: INTEGER NOT NULL DEFAULT 0
- focus_mode_minutes: INTEGER NOT NULL DEFAULT 0
- compact_mode_minutes: INTEGER NOT NULL DEFAULT 0

-- Dernières activités (tracking fin)
- last_clip_at: TIMESTAMPTZ (nullable)
- last_file_upload_at: TIMESTAMPTZ (nullable)
- last_focus_mode_at: TIMESTAMPTZ (nullable)
- last_compact_mode_at: TIMESTAMPTZ (nullable)

-- Timestamps
- created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### Contraintes:
```sql
UNIQUE(user_id, year, month) -- Un seul record par utilisateur par mois
-- Migration: 008_add_usage_records_unique_constraint.sql
```

#### Relations:
- **FK:** `user_id` → `user_profiles(id)` ON DELETE CASCADE
- **FK:** `subscription_id` → `subscriptions(id)` ON DELETE CASCADE

#### Indexes:
- PRIMARY KEY sur `id`
- UNIQUE sur `(user_id, year, month)`
- Probablement INDEX sur `subscription_id`, `(year, month)`

#### Triggers:
Aucun

#### RPC Functions associées:

**1. increment_usage(p_user_id UUID, p_action TEXT, p_amount INTEGER)**
```sql
-- Migration: 005_fix_increment_usage_subscription_id.sql
-- Description: Incrémente atomiquement un compteur d'usage
-- Actions supportées: 'clip', 'file', 'focus_mode', 'compact_mode'
-- Comportement: UPSERT (INSERT si n'existe pas, UPDATE sinon)
```

**2. increment_usage_counter(p_user_id UUID, p_feature TEXT, p_increment INTEGER)**
```sql
-- Migration: 006_create_increment_usage_counter.sql
-- Description: Wrapper autour de increment_usage() avec API moderne
-- Features supportées: 'clips', 'files', 'focus_mode_minutes', 'compact_mode_minutes'
-- Retourne: TABLE (full usage_record row)
```

**3. get_or_create_current_usage_record(p_user_id UUID, p_subscription_id UUID)**
```sql
-- Migration: 007_create_get_or_create_usage_record.sql
-- Description: Récupère ou crée le record d'usage du mois courant
-- Retourne: SETOF usage_records
-- Utilisé par: SubscriptionService.getCurrentUsageRecord()
```

#### Utilisé par (côté Electron/Frontend):
- **Services TypeScript:**
  - `SubscriptionService` - Récupération des quotas
  - `UsageTrackingService` - Tracking des actions utilisateur
  - `BackendApiService` - API calls

- **Edge Functions:**
  - `get-subscription` - Calcul des quotas disponibles
  - `track-usage` - Incrémentation des compteurs

- **IPC Handlers (Electron):**
  - Usage indirect via SubscriptionService et UsageTrackingService

---

### 4. TABLE: notion_connections

**Status:** ✅ Existe (migration: `20250113_create_notion_connections.sql`)

#### Colonnes:
```sql
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- workspace_id: TEXT NOT NULL
- workspace_name: TEXT NOT NULL
- workspace_icon: TEXT (nullable)
- access_token: TEXT NOT NULL -- Token chiffré AES-256-GCM (base64)
- is_active: BOOLEAN NOT NULL DEFAULT true
- created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

#### Contraintes:
```sql
UNIQUE(user_id, workspace_id) -- Une seule connexion par user par workspace
```

#### Relations:
- **FK:** `user_id` → `auth.users(id)` ON DELETE CASCADE

#### Indexes:
```sql
CREATE INDEX idx_notion_connections_user_id ON notion_connections(user_id);
CREATE INDEX idx_notion_connections_workspace_id ON notion_connections(workspace_id);
CREATE INDEX idx_notion_connections_is_active ON notion_connections(is_active);
```

#### Triggers:
```sql
-- Trigger: update_notion_connections_updated_at
-- Function: update_notion_connections_updated_at()
-- Description: Met à jour automatiquement updated_at sur UPDATE
```

#### RLS (Row Level Security):
```sql
-- ✅ RLS ENABLED

-- Policy: "Users can view their own Notion connections"
CREATE POLICY ... FOR SELECT USING (auth.uid() = user_id);

-- Policy: "Users can insert their own Notion connections"
CREATE POLICY ... FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: "Users can update their own Notion connections"
CREATE POLICY ... FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policy: "Users can delete their own Notion connections"
CREATE POLICY ... FOR DELETE USING (auth.uid() = user_id);

-- Policy: "Service role has full access to Notion connections"
CREATE POLICY ... FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

#### Permissions:
```sql
GRANT ALL ON notion_connections TO authenticated;
GRANT ALL ON notion_connections TO service_role;
```

#### Sécurité du token:
- **Chiffrement:** AES-256-GCM
- **Clé:** `TOKEN_ENCRYPTION_KEY` (stockée dans Supabase Vault)
- **Format:** Base64(IV(12 bytes) + Encrypted Data)
- **Chiffrement:** Effectué dans Edge Function `save-notion-connection`
- **Déchiffrement:** Effectué dans Edge Function `get-notion-connection`

#### RPC Functions associées:
Aucune (manipulation via Edge Functions uniquement)

#### Utilisé par (côté Electron/Frontend):
- **Services TypeScript:**
  - `NotionAuthService` - Gestion des connexions Notion OAuth
  - `BackendApiService` - API calls

- **Edge Functions:**
  - `save-notion-connection` - Sauvegarde du token chiffré
  - `get-notion-connection` - Récupération et déchiffrement du token
  - `get-user-by-workspace` - Recherche d'utilisateur par workspace

---

## TABLES MENTIONNÉES MAIS NON CRÉÉES

### 5. TABLE: usage_events

**Status:** ❌ Mentionnée dans le code TypeScript mais AUCUNE migration SQL trouvée

#### Colonnes attendues (d'après `subscription.types.ts`):
```typescript
interface UsageEvent {
  id: string;
  user_id: string;
  subscription_id: string;
  usage_record_id: string;
  event_type: UsageEventType; // 'clip_sent' | 'file_uploaded' | 'focus_mode_started' | ...
  feature: FeatureType;
  metadata?: {
    word_count?: number;
    file_size?: number;
    file_type?: string;
    duration_minutes?: number;
    is_multiple_selection?: boolean;
    page_count?: number;
  };
  created_at: Date;
}
```

#### Utilité prévue:
- Tracking fin des événements d'usage
- Analytics détaillées
- Debugging et auditing

#### Action requise:
⚠️ **CRÉER LA TABLE** si vous voulez activer le tracking détaillé d'événements

---

### 6. TABLE: mode_sessions

**Status:** ❌ Mentionnée dans le code TypeScript mais AUCUNE migration SQL trouvée

#### Colonnes attendues (d'après `subscription.types.ts`):
```typescript
interface ModeSession {
  id: string;
  user_id: string;
  mode_type: 'focus' | 'compact';
  started_at: Date;
  ended_at?: Date;
  duration_minutes: number;
  is_active: boolean;
  was_interrupted: boolean;
}
```

#### Utilité prévue:
- Tracking des sessions Focus Mode / Compact Mode
- Calcul précis de la durée d'utilisation
- Détection des interruptions

#### Action requise:
⚠️ **CRÉER LA TABLE** si vous voulez activer le tracking de sessions

---

## TABLES ANCIENNES (Legacy - à vérifier)

D'après `scripts/check-supabase-tables.js`, ces tables sont mentionnées mais probablement obsolètes:

```javascript
const tablesToCheck = [
  'users',              // ❓ Probablement remplacé par user_profiles
  'notion_workspaces',  // ❓ Probablement remplacé par notion_connections
  'notion_api_keys',    // ❓ Probablement obsolète (OAuth maintenant)
  'user_favorites',     // ❓ Status inconnu
  'clip_history',       // ❓ Status inconnu
  ...
];
```

### Action requise:
⚠️ **VÉRIFIER ET NETTOYER** ces tables si elles existent encore

---

## SCHÉMA auth.users (Supabase Auth)

**Status:** ✅ Table système Supabase (gérée automatiquement)

#### Colonnes principales:
```sql
- id: UUID PRIMARY KEY
- email: TEXT
- encrypted_password: TEXT (nullable pour OAuth)
- email_confirmed_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- raw_app_meta_data: JSONB
- raw_user_meta_data: JSONB
- ... (autres colonnes système)
```

#### Relation avec NotionClipper:
- `user_profiles.id` = `auth.users.id`
- OAuth Google/Notion crée un utilisateur dans `auth.users`
- Le profil est ensuite créé dans `user_profiles`

---

## RÉSUMÉ DES RPC FUNCTIONS

### 1. increment_usage(p_user_id UUID, p_action TEXT, p_amount INTEGER)
- **Fichier:** `005_fix_increment_usage_subscription_id.sql`
- **Type:** VOID
- **Sécurité:** SECURITY DEFINER
- **Actions:** 'clip', 'file', 'focus_mode', 'compact_mode'
- **Utilisé par:** `increment_usage_counter()`

### 2. increment_usage_counter(p_user_id UUID, p_feature TEXT, p_increment INTEGER)
- **Fichier:** `006_create_increment_usage_counter.sql`
- **Type:** TABLE (retourne usage_record)
- **Sécurité:** SECURITY DEFINER
- **Features:** 'clips', 'files', 'focus_mode_minutes', 'compact_mode_minutes'
- **Utilisé par:** 
  - Edge Function `track-usage`
  - `UsageTrackingService`

### 3. get_or_create_current_usage_record(p_user_id UUID, p_subscription_id UUID)
- **Fichier:** `007_create_get_or_create_usage_record.sql`
- **Type:** SETOF usage_records
- **Sécurité:** SECURITY DEFINER
- **Utilisé par:**
  - `SubscriptionService.getCurrentUsageRecord()`
  - `UsageTrackingService.getCurrentUsageRecord()`

### 4. create_free_subscription_for_new_user()
- **Fichier:** `20251114_auto_create_free_subscription.sql`
- **Type:** TRIGGER FUNCTION
- **Sécurité:** SECURITY DEFINER
- **Déclenché par:** AFTER INSERT ON user_profiles
- **Action:** Crée automatiquement une subscription FREE

### 5. update_notion_connections_updated_at()
- **Fichier:** `20250113_create_notion_connections.sql`
- **Type:** TRIGGER FUNCTION
- **Déclenché par:** BEFORE UPDATE ON notion_connections
- **Action:** Met à jour `updated_at = NOW()`

---

## EDGE FUNCTIONS (Supabase)

### 1. create-user
- **Usage:** Crée/met à jour un utilisateur après OAuth
- **Tables:** user_profiles, subscriptions
- **Sécurité:** SERVICE_ROLE_KEY (bypass RLS)

### 2. get-user-profile
- **Usage:** Récupère le profil utilisateur
- **Tables:** user_profiles
- **Sécurité:** SERVICE_ROLE_KEY

### 3. get-subscription
- **Usage:** Récupère subscription + quotas
- **Tables:** user_profiles, subscriptions, usage_records
- **Sécurité:** SERVICE_ROLE_KEY

### 4. create-checkout
- **Usage:** Crée une session Stripe checkout
- **Tables:** user_profiles
- **Sécurité:** SERVICE_ROLE_KEY

### 5. save-notion-connection
- **Usage:** Chiffre et sauvegarde le token Notion
- **Tables:** notion_connections
- **Sécurité:** SERVICE_ROLE_KEY + TOKEN_ENCRYPTION_KEY

### 6. get-notion-connection
- **Usage:** Déchiffre et retourne le token Notion
- **Tables:** notion_connections
- **Sécurité:** SERVICE_ROLE_KEY + TOKEN_ENCRYPTION_KEY

### 7. get-user-by-workspace
- **Usage:** Recherche utilisateur par workspace Notion
- **Tables:** notion_connections, user_profiles
- **Sécurité:** SERVICE_ROLE_KEY

### 8. track-usage
- **Usage:** Incrémente les compteurs d'usage
- **Tables:** usage_records (via RPC increment_usage_counter)
- **Sécurité:** SERVICE_ROLE_KEY

---

## SERVICES TYPESCRIPT (Frontend/Electron)

### SubscriptionService
- **Fichier:** `packages/core-shared/src/services/subscription.service.ts`
- **Tables utilisées:**
  - subscriptions (via Edge Function `get-subscription`)
  - usage_records (via RPC `get_or_create_current_usage_record`)

### UsageTrackingService
- **Fichier:** `packages/core-shared/src/services/usage-tracking.service.ts`
- **Tables utilisées:**
  - usage_records (via Edge Function `track-usage`)

### StripeService
- **Fichier:** `packages/core-shared/src/services/stripe.service.ts`
- **Tables utilisées:**
  - subscriptions (indirect via SubscriptionService)

### BackendApiService
- **Fichier:** `packages/core-shared/src/services/backend-api.service.ts`
- **Tables utilisées:**
  - Toutes (via Edge Functions)

---

## QUOTAS & LIMITES

D'après `supabase/functions/_shared/constants.ts`:

```typescript
QUOTA_LIMITS = {
  free: {
    clips: 100,
    files: 10,
    words_per_clip: 5000,
    focus_mode_time: 60,     // minutes
    compact_mode_time: 60,   // minutes
  },
  premium: {
    clips: null,            // unlimited
    files: null,            // unlimited
    words_per_clip: null,   // unlimited
    focus_mode_time: null,  // unlimited
    compact_mode_time: null // unlimited
  },
  grace_period: {
    clips: 100,
    files: 10,
    words_per_clip: 5000,
    focus_mode_time: 60,
    compact_mode_time: 60
  }
}
```

---

## MIGRATIONS À APPLIQUER

### Ordre d'application (déjà appliquées):
1. ✅ `20250113_create_notion_connections.sql`
2. ✅ `20250113_add_access_token_column.sql`
3. ✅ `20251114_auto_create_free_subscription.sql`
4. ✅ `004_auto_create_free_subscription.sql` (duplicate de #3)
5. ✅ `005_create_increment_usage_function.sql`
6. ✅ `005_fix_increment_usage_subscription_id.sql` (FIX de #5)
7. ✅ `006_create_increment_usage_counter.sql`
8. ✅ `007_create_get_or_create_usage_record.sql`
9. ✅ `008_add_usage_records_unique_constraint.sql`

---

## PROBLÈMES IDENTIFIÉS

### ⚠️ Problème 1: Tables manquantes
- **Tables attendues mais non créées:** `usage_events`, `mode_sessions`
- **Impact:** Fonctionnalités de tracking avancé non disponibles
- **Action:** Créer les migrations SQL si nécessaire

### ⚠️ Problème 2: Migrations en double
- **Fichiers dupliqués:**
  - `004_auto_create_free_subscription.sql`
  - `20251114_auto_create_free_subscription.sql`
  - `005_create_increment_usage_function.sql`
  - `005_fix_increment_usage_subscription_id.sql`
- **Action:** Nettoyer et standardiser les migrations

### ⚠️ Problème 3: Schéma initial manquant
- **Problème:** Pas de CREATE TABLE pour `user_profiles`, `subscriptions`, `usage_records`
- **Impact:** Impossible de recréer la BDD from scratch
- **Action:** Créer une migration `001_initial_schema.sql`

### ⚠️ Problème 4: RLS non documenté
- **Tables sans migration RLS documentée:** `user_profiles`, `subscriptions`, `usage_records`
- **Impact:** Sécurité potentiellement non appliquée
- **Action:** Documenter ou créer les policies RLS

---

## RECOMMANDATIONS POUR LA MIGRATION

1. **Créer migration initiale complète:**
   ```sql
   -- 001_initial_schema.sql
   CREATE TABLE user_profiles (...);
   CREATE TABLE subscriptions (...);
   CREATE TABLE usage_records (...);
   ```

2. **Documenter toutes les RLS policies:**
   ```sql
   -- 002_enable_rls.sql
   ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
   CREATE POLICY ...
   ```

3. **Créer les tables manquantes (optionnel):**
   ```sql
   -- 010_create_usage_events.sql
   -- 011_create_mode_sessions.sql
   ```

4. **Nettoyer les migrations dupliquées**

5. **Ajouter des indexes de performance:**
   ```sql
   -- 012_add_performance_indexes.sql
   CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
   CREATE INDEX idx_usage_records_subscription_id ON usage_records(subscription_id);
   ```

---

## DIAGRAMME DES RELATIONS

```
auth.users (Supabase)
    ↓ (1:1)
user_profiles
    ↓ (1:1)
subscriptions
    ↓ (1:N)
usage_records

user_profiles
    ↓ (1:N)
notion_connections

[Tables non créées:]
usage_records
    ↓ (1:N)
usage_events

user_profiles
    ↓ (1:N)
mode_sessions
```

---

## FICHIERS À CONSULTER POUR LA MIGRATION

### Migrations SQL:
- `/home/user/NotionClipper/supabase/migrations/*.sql`
- `/home/user/NotionClipper/database/migrations/*.sql`

### Types TypeScript:
- `/home/user/NotionClipper/packages/core-shared/src/types/subscription.types.ts`
- `/home/user/NotionClipper/packages/core-shared/src/config/subscription.config.ts`

### Services:
- `/home/user/NotionClipper/packages/core-shared/src/services/subscription.service.ts`
- `/home/user/NotionClipper/packages/core-shared/src/services/usage-tracking.service.ts`

### Edge Functions:
- `/home/user/NotionClipper/supabase/functions/*/index.ts`

---

FIN DU RAPPORT
