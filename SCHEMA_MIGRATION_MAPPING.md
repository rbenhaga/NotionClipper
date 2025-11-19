# SCHEMA MIGRATION MAPPING - Old → New Optimized
**Date**: 2025-11-18
**Branch**: claude/oauth-freemium-audit-011tKzT23CgRVpTbSa3aHj83
**Phase**: 2 - Schema Mapping Analysis

---

## 🎯 EXECUTIVE SUMMARY

This document maps the **old Supabase schema** (current production) to the **new optimized VPS schema** (target state). The mapping identifies:

1. **Column-level changes** (renamed, removed, added)
2. **Data type changes**
3. **Constraint changes**
4. **Index changes**
5. **Breaking changes** that will require code updates
6. **Migration scripts** needed for data transformation

---

## 📊 TABLE MAPPING OVERVIEW

| Old Table (Supabase) | New Table (VPS) | Status | Changes |
|---------------------|-----------------|--------|---------|
| `user_profiles` | `user_profiles` | ✅ KEEP | Minor optimization |
| `subscriptions` | `subscriptions` | ⚠️ MODIFY | Schema optimization |
| `usage_records` | `usage_records` | ⚠️ MODIFY | Schema optimization |
| `notion_connections` | `notion_connections` | ✅ KEEP | No changes |
| ❌ Missing | `usage_events` | 🆕 CREATE | New table for detailed tracking |
| `mode_sessions` (TypeScript only) | ❌ Remove | 🗑️ DELETE | Not needed |

---

## 1. TABLE: user_profiles

### Mapping Status: ✅ KEEP AS-IS (Minor optimization)

### OLD Schema (Supabase)
```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY,                    -- Links to auth.users(id)
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  auth_provider TEXT,                     -- 'google' | 'notion'
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

-- Constraints
-- id → auth.users(id) (implicit FK)

-- Indexes
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
```

### NEW Schema (VPS Optimized)
```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY,                    -- Same
  email TEXT NOT NULL UNIQUE,             -- 🔧 Added UNIQUE constraint
  full_name TEXT,                         -- Same
  avatar_url TEXT,                        -- Same
  auth_provider TEXT NOT NULL,            -- 🔧 Added NOT NULL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints
CHECK (auth_provider IN ('google', 'notion'));  -- 🆕 NEW: Enum validation

-- Indexes
CREATE UNIQUE INDEX idx_user_profiles_email ON user_profiles(email);  -- 🔧 Changed to UNIQUE
```

### Changes Summary
| Column | Change | Migration Required |
|--------|--------|-------------------|
| `email` | Added UNIQUE constraint | ✅ YES - Check for duplicates |
| `auth_provider` | Added NOT NULL + CHECK constraint | ✅ YES - Validate existing data |

### Migration Impact: **LOW**
- **Breaking Changes**: None (backend only)
- **Data Migration**: Validate email uniqueness, fill NULL auth_providers
- **Code Changes**: None (structure preserved)

---

## 2. TABLE: subscriptions

### Mapping Status: ⚠️ MODIFY (Schema optimization)

### OLD Schema (Supabase)
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Subscription tier
  tier TEXT NOT NULL,                     -- 'free' | 'premium' | 'grace_period'
  status TEXT NOT NULL,                   -- 'active' | 'trialing' | 'past_due' | ...

  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Billing period
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Grace period (freemium downgrade)
  grace_period_ends_at TIMESTAMPTZ,
  is_grace_period BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints
UNIQUE(user_id);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
```

### NEW Schema (VPS Optimized)
```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- Subscription tier (normalized enum)
  tier TEXT NOT NULL CHECK (tier IN ('FREE', 'PREMIUM', 'GRACE_PERIOD')),  -- 🔧 Uppercase enum
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),  -- 🔧 Added CHECK

  -- Stripe integration (NOT NULL for premium)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Billing period
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Grace period (removed redundant column)
  grace_period_ends_at TIMESTAMPTZ,       -- 🗑️ Removed: is_grace_period (redundant with tier='GRACE_PERIOD')

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,     -- 🔧 Added default empty object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints
UNIQUE(user_id);
-- 🆕 NEW: Stripe data required for premium
CHECK (
  (tier = 'FREE' AND stripe_customer_id IS NULL) OR
  (tier IN ('PREMIUM', 'GRACE_PERIOD') AND stripe_customer_id IS NOT NULL)
);

-- Indexes (optimized)
CREATE UNIQUE INDEX idx_subscriptions_user_id ON subscriptions(user_id);  -- 🔧 Changed to UNIQUE
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;  -- 🔧 Partial index
CREATE INDEX idx_subscriptions_tier_status ON subscriptions(tier, status);  -- 🆕 NEW: Composite index for reporting
```

### Changes Summary
| Column | Change | Migration Required |
|--------|--------|-------------------|
| `tier` | Lowercase → Uppercase enum + CHECK constraint | ✅ YES - Transform data |
| `status` | Added CHECK constraint | ✅ YES - Validate existing |
| `is_grace_period` | ❌ REMOVED (redundant) | ✅ YES - Update code to check tier='GRACE_PERIOD' |
| `metadata` | Added default empty JSONB | ⚠️ Optional |
| **NEW Constraint** | Stripe data validation | ✅ YES - Validate premium subscriptions |

### Migration Impact: **MEDIUM-HIGH**
- **Breaking Changes**:
  - `is_grace_period` column removed → **CRITICAL: Update all code checking this field**
  - `tier` enum changed from lowercase to uppercase → **Update all queries**
- **Data Migration**:
  ```sql
  -- Transform tier to uppercase
  UPDATE subscriptions SET tier = UPPER(tier);

  -- Remove is_grace_period (no longer needed)
  ALTER TABLE subscriptions DROP COLUMN is_grace_period;
  ```
- **Code Changes**: **EXTENSIVE** - See section below

---

## 3. TABLE: usage_records

### Mapping Status: ⚠️ MODIFY (Schema optimization)

### OLD Schema (Supabase)
```sql
CREATE TABLE public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Period (calendar month)
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Usage counters
  clips_count INTEGER NOT NULL DEFAULT 0,
  files_count INTEGER NOT NULL DEFAULT 0,
  focus_mode_minutes INTEGER NOT NULL DEFAULT 0,
  compact_mode_minutes INTEGER NOT NULL DEFAULT 0,

  -- Last activity timestamps (detailed tracking)
  last_clip_at TIMESTAMPTZ,
  last_file_upload_at TIMESTAMPTZ,
  last_focus_mode_at TIMESTAMPTZ,
  last_compact_mode_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints
UNIQUE(user_id, year, month);  -- One record per user per month

-- Indexes
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_subscription_id ON usage_records(subscription_id);
CREATE INDEX idx_usage_records_period ON usage_records(year, month);
```

### NEW Schema (VPS Optimized)
```sql
CREATE TABLE public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE SET NULL,  -- 🔧 Changed CASCADE → SET NULL

  -- Period (calendar month) - optimized
  year SMALLINT NOT NULL CHECK (year >= 2025),  -- 🔧 Changed INTEGER → SMALLINT + validation
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),  -- 🔧 Changed INTEGER → SMALLINT
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Usage counters (optimized data types)
  clips_count INTEGER NOT NULL DEFAULT 0 CHECK (clips_count >= 0),  -- 🆕 Added CHECK >= 0
  files_count INTEGER NOT NULL DEFAULT 0 CHECK (files_count >= 0),
  focus_mode_minutes INTEGER NOT NULL DEFAULT 0 CHECK (focus_mode_minutes >= 0),
  compact_mode_minutes INTEGER NOT NULL DEFAULT 0 CHECK (compact_mode_minutes >= 0),

  -- Last activity timestamps (REMOVED - moved to usage_events table)
  -- 🗑️ REMOVED: last_clip_at, last_file_upload_at, last_focus_mode_at, last_compact_mode_at

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints
UNIQUE(user_id, year, month);
CHECK (period_end > period_start);  -- 🆕 NEW: Validate period consistency

-- Indexes (optimized)
CREATE INDEX idx_usage_records_user_id_period ON usage_records(user_id, year DESC, month DESC);  -- 🔧 Composite + DESC for recent queries
CREATE INDEX idx_usage_records_subscription_id ON usage_records(subscription_id) WHERE subscription_id IS NOT NULL;  -- 🔧 Partial index
```

### Changes Summary
| Column | Change | Migration Required |
|--------|--------|-------------------|
| `subscription_id` | CASCADE → SET NULL on delete | ⚠️ Optional (better data retention) |
| `year`, `month` | INTEGER → SMALLINT + validation | ✅ YES - Data type change |
| All counters | Added CHECK >= 0 constraints | ⚠️ Optional (data validation) |
| `last_clip_at`, `last_file_upload_at`, etc. | ❌ REMOVED → Moved to `usage_events` | ✅ YES - Migrate to new table |

### Migration Impact: **HIGH**
- **Breaking Changes**:
  - `last_*_at` columns removed → **CRITICAL: Migrate to usage_events table**
- **Data Migration**:
  ```sql
  -- Transform data types
  ALTER TABLE usage_records ALTER COLUMN year TYPE SMALLINT;
  ALTER TABLE usage_records ALTER COLUMN month TYPE SMALLINT;

  -- Migrate last_*_at to usage_events (see usage_events section)
  INSERT INTO usage_events (...)
  SELECT ... FROM usage_records WHERE last_clip_at IS NOT NULL;

  -- Drop old columns
  ALTER TABLE usage_records
    DROP COLUMN last_clip_at,
    DROP COLUMN last_file_upload_at,
    DROP COLUMN last_focus_mode_at,
    DROP COLUMN last_compact_mode_at;
  ```
- **Code Changes**: **CRITICAL** - All code accessing `last_*_at` must be rewritten

---

## 4. TABLE: notion_connections

### Mapping Status: ✅ KEEP AS-IS

### Schema (Unchanged)
```sql
CREATE TABLE public.notion_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  workspace_icon TEXT,
  access_token TEXT NOT NULL,             -- Encrypted AES-256-GCM
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, workspace_id)
);

-- Indexes
CREATE INDEX idx_notion_connections_user_id ON notion_connections(user_id);
CREATE INDEX idx_notion_connections_workspace_id ON notion_connections(workspace_id);
CREATE INDEX idx_notion_connections_is_active ON notion_connections(is_active);
```

### Changes Summary
**No changes** - Table is already optimized.

### Migration Impact: **NONE**
- **Breaking Changes**: None
- **Data Migration**: None
- **Code Changes**: None

---

## 5. TABLE: usage_events (NEW)

### Mapping Status: 🆕 CREATE NEW TABLE

### OLD State
❌ **Does not exist** - Only TypeScript interface defined in `subscription.types.ts`

### NEW Schema (VPS Optimized)
```sql
CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  usage_record_id UUID REFERENCES usage_records(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'clip_sent',
    'file_uploaded',
    'focus_mode_started',
    'focus_mode_ended',
    'compact_mode_started',
    'compact_mode_ended',
    'quota_exceeded',
    'subscription_upgraded',
    'subscription_downgraded'
  )),
  feature TEXT NOT NULL CHECK (feature IN ('clips', 'files', 'focus_mode_minutes', 'compact_mode_minutes')),

  -- Event metadata (detailed tracking)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Examples:
  -- { "word_count": 1523, "page_id": "abc123" }  -- For clip_sent
  -- { "file_size": 2048576, "file_type": "pdf" }  -- For file_uploaded
  -- { "duration_minutes": 45 }  -- For focus_mode_ended

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes (optimized for queries)
CREATE INDEX idx_usage_events_user_id_created ON usage_events(user_id, created_at DESC);  -- Recent events by user
CREATE INDEX idx_usage_events_event_type ON usage_events(event_type);  -- Analytics queries
CREATE INDEX idx_usage_events_usage_record ON usage_events(usage_record_id);  -- Link to monthly record
CREATE INDEX idx_usage_events_created_at ON usage_events(created_at DESC);  -- Time-series queries

-- Partial index for quota_exceeded events (for debugging)
CREATE INDEX idx_usage_events_quota_exceeded ON usage_events(user_id, created_at DESC)
  WHERE event_type = 'quota_exceeded';
```

### Data Migration from OLD schema
```sql
-- Migrate last_clip_at from usage_records
INSERT INTO usage_events (user_id, subscription_id, usage_record_id, event_type, feature, created_at)
SELECT
  user_id,
  subscription_id,
  id AS usage_record_id,
  'clip_sent' AS event_type,
  'clips' AS feature,
  last_clip_at AS created_at
FROM usage_records
WHERE last_clip_at IS NOT NULL;

-- Migrate last_file_upload_at
INSERT INTO usage_events (user_id, subscription_id, usage_record_id, event_type, feature, created_at)
SELECT
  user_id,
  subscription_id,
  id AS usage_record_id,
  'file_uploaded' AS event_type,
  'files' AS feature,
  last_file_upload_at AS created_at
FROM usage_records
WHERE last_file_upload_at IS NOT NULL;

-- Similar for last_focus_mode_at and last_compact_mode_at
```

### Migration Impact: **HIGH**
- **Breaking Changes**:
  - Code expecting `usage_records.last_*_at` must be rewritten to query `usage_events`
- **New Functionality**:
  - Detailed event tracking for analytics
  - Better debugging capabilities
  - Support for multiple events per feature per month
- **Code Changes**: **EXTENSIVE** - See section below

---

## 6. TABLE: mode_sessions (REMOVED)

### Mapping Status: 🗑️ DELETE (Not needed)

### OLD State
TypeScript interface exists but **no SQL table created**.

### Decision
**Do not create this table** - `usage_events` provides better tracking.

### Migration Impact: **NONE**
- Table never existed in database
- Only remove TypeScript interface

---

## 🔥 BREAKING CHANGES SUMMARY

### Critical (Must Fix Before Migration)

1. **subscriptions.is_grace_period removed**
   - **Impact**: HIGH
   - **Files Affected**:
     - `packages/core-shared/src/services/subscription.service.ts`
     - `packages/ui/src/hooks/core/useAppState.ts`
     - `apps/notion-clipper-app/src/react/src/App.tsx`
   - **Fix**: Replace `subscription.is_grace_period` with `subscription.tier === 'GRACE_PERIOD'`

2. **subscriptions.tier enum changed (lowercase → UPPERCASE)**
   - **Impact**: MEDIUM-HIGH
   - **Files Affected**: All files checking `tier === 'free'` etc.
   - **Fix**: Update all comparisons to use uppercase: `tier === 'FREE'`

3. **usage_records.last_*_at columns removed**
   - **Impact**: HIGH
   - **Files Affected**:
     - `packages/core-shared/src/services/subscription.service.ts` (last activity display)
   - **Fix**: Query `usage_events` table instead

### Medium Priority

4. **user_profiles.email now UNIQUE**
   - **Impact**: LOW (backend only)
   - **Fix**: Deduplicate emails before migration

5. **user_profiles.auth_provider now NOT NULL**
   - **Impact**: LOW
   - **Fix**: Fill NULL values before migration

---

## 📝 CODE MIGRATION CHECKLIST

### SubscriptionService Changes

```typescript
// ❌ OLD (BROKEN after migration)
if (subscription.is_grace_period) {
  // Grace period logic
}

if (subscription.tier === 'free') {
  // Free tier logic
}

// Last activity
const lastClip = usageRecord.last_clip_at;

// ✅ NEW (Fixed)
if (subscription.tier === 'GRACE_PERIOD') {
  // Grace period logic
}

if (subscription.tier === 'FREE') {
  // Free tier logic
}

// Last activity (query usage_events)
const lastClipEvent = await supabase
  .from('usage_events')
  .select('created_at')
  .eq('user_id', userId)
  .eq('event_type', 'clip_sent')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

### Edge Functions Changes

All Edge Functions checking tier must be updated:

**Files to update**:
- `supabase/functions/get-subscription/index.ts`
- `supabase/functions/track-usage/index.ts`
- `supabase/functions/create-checkout/index.ts`

### RPC Functions Changes

**increment_usage_counter()** - No changes needed (already uses features)

**get_or_create_current_usage_record()** - No changes needed

---

## 🚀 MIGRATION SCRIPT OUTLINE

### Phase 1: Pre-Migration Validation
```sql
-- Check for duplicate emails
SELECT email, COUNT(*)
FROM user_profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- Check for NULL auth_providers
SELECT COUNT(*)
FROM user_profiles
WHERE auth_provider IS NULL;

-- Check for invalid tier values
SELECT tier, COUNT(*)
FROM subscriptions
GROUP BY tier;
```

### Phase 2: Schema Changes
```sql
-- 1. Create usage_events table
CREATE TABLE public.usage_events (...);

-- 2. Migrate last_*_at data to usage_events
INSERT INTO usage_events (...) SELECT ... FROM usage_records;

-- 3. Update subscriptions tier to uppercase
UPDATE subscriptions SET tier = UPPER(tier);

-- 4. Drop is_grace_period column
ALTER TABLE subscriptions DROP COLUMN is_grace_period;

-- 5. Drop last_*_at columns from usage_records
ALTER TABLE usage_records
  DROP COLUMN last_clip_at,
  DROP COLUMN last_file_upload_at,
  DROP COLUMN last_focus_mode_at,
  DROP COLUMN last_compact_mode_at;

-- 6. Add new constraints
ALTER TABLE user_profiles ADD CONSTRAINT uq_email UNIQUE (email);
ALTER TABLE user_profiles ALTER COLUMN auth_provider SET NOT NULL;
ALTER TABLE subscriptions ADD CONSTRAINT check_tier CHECK (tier IN ('FREE', 'PREMIUM', 'GRACE_PERIOD'));
```

### Phase 3: Index Optimization
```sql
-- Drop old indexes
DROP INDEX IF EXISTS idx_usage_records_user_id;
DROP INDEX IF EXISTS idx_usage_records_subscription_id;

-- Create optimized indexes
CREATE INDEX idx_usage_records_user_id_period ON usage_records(user_id, year DESC, month DESC);
CREATE INDEX idx_usage_records_subscription_id ON usage_records(subscription_id) WHERE subscription_id IS NOT NULL;

-- Create usage_events indexes
CREATE INDEX idx_usage_events_user_id_created ON usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_events_event_type ON usage_events(event_type);
```

### Phase 4: Rollback Plan
```sql
-- If migration fails, restore from backup:
-- 1. Drop new usage_events table
DROP TABLE IF EXISTS usage_events;

-- 2. Restore is_grace_period column
ALTER TABLE subscriptions ADD COLUMN is_grace_period BOOLEAN DEFAULT false;
UPDATE subscriptions SET is_grace_period = (tier = 'GRACE_PERIOD');

-- 3. Restore tier to lowercase
UPDATE subscriptions SET tier = LOWER(tier);

-- 4. Restore last_*_at columns (cannot restore data without backup)
ALTER TABLE usage_records ADD COLUMN last_clip_at TIMESTAMPTZ;
-- ... etc
```

---

## 📊 ESTIMATED MIGRATION EFFORT

| Task | Effort | Risk |
|------|--------|------|
| Create usage_events table | 2h | LOW |
| Migrate last_*_at data | 4h | MEDIUM |
| Update subscriptions schema | 2h | LOW |
| Update all code (tier enum) | 8h | MEDIUM |
| Update all code (is_grace_period) | 6h | HIGH |
| Update all code (last_*_at queries) | 10h | HIGH |
| Testing | 16h | HIGH |
| **TOTAL** | **48h (6 days)** | **MEDIUM-HIGH** |

---

## ✅ NEXT STEPS (Phase 3)

1. **Identify all integration points** (Electron ↔ Backend)
   - List all services calling Supabase
   - List all Edge Functions
   - List all IPC handlers

2. **Create migration implementation plan**
   - Order of operations
   - Rollback strategy
   - Testing plan

3. **Update all code to use new schema**
   - Fix tier enum (lowercase → UPPERCASE)
   - Remove is_grace_period checks
   - Rewrite last_*_at queries

---

**Status**: Phase 2 COMPLETED ✅
**Next Phase**: Phase 3 - Identify Integration Points
**Blockers**: None
**Risk Level**: MEDIUM-HIGH (schema breaking changes)
