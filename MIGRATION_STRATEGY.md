# MIGRATION STRATEGY - Zero-Downtime Backend Migration
**Date**: 2025-11-18
**Branch**: claude/oauth-freemium-audit-011tKzT23CgRVpTbSa3aHj83
**Phase**: 4 - Migration Strategy Planning

---

## 🎯 EXECUTIVE SUMMARY

This document outlines the **complete migration strategy** to move from the old Supabase schema to the new optimized VPS schema **WITHOUT breaking the application**.

**Strategy**: **Blue-Green Migration with Dual-Write Period**

**Timeline**: 5 days (phased rollout)
**Downtime**: 0 minutes
**Rollback Time**: < 5 minutes

---

## 🏗️ MIGRATION ARCHITECTURE

### Current State (Before Migration)
```
Electron App
    ↓
    ├─→ Services (SubscriptionService, UsageTrackingService, etc.)
    │       ↓
    │   Supabase Client (Direct DB access)
    │       ↓
    │   OLD SCHEMA:
    │   ├─ subscriptions (tier lowercase, is_grace_period column)
    │   ├─ usage_records (with last_*_at columns)
    │   └─ user_profiles
    │
    └─→ Edge Functions (get-subscription, track-usage, etc.)
            ↓
        OLD SCHEMA (same as above)
```

### Target State (After Migration)
```
Electron App
    ↓
    ├─→ Services (Updated to use NEW schema)
    │       ↓
    │   Supabase Client (Direct DB access)
    │       ↓
    │   NEW SCHEMA:
    │   ├─ subscriptions (tier UPPERCASE, NO is_grace_period)
    │   ├─ usage_records (NO last_*_at columns)
    │   ├─ usage_events (NEW TABLE for detailed tracking)
    │   └─ user_profiles (UNIQUE email)
    │
    └─→ Edge Functions (Updated to use NEW schema)
            ↓
        NEW SCHEMA (same as above)
```

### Transition State (During Migration - Days 2-3)
```
Electron App (Mixed versions - some users on old, some on new)
    ↓
    ├─→ Services (BACKWARD COMPATIBLE - handle both schemas)
    │       ↓
    │   Supabase Client
    │       ↓
    │   DUAL-WRITE SCHEMA:
    │   ├─ subscriptions
    │   │   ├─ tier (accepts BOTH lowercase + uppercase)
    │   │   └─ is_grace_period (VIRTUAL COLUMN - computed from tier)
    │   ├─ usage_records
    │   │   └─ last_*_at (VIRTUAL COLUMNS - queried from usage_events)
    │   └─ usage_events (NEW - populated by triggers)
    │
    └─→ Edge Functions (BACKWARD COMPATIBLE)
            ↓
        DUAL-WRITE SCHEMA (same as above)
```

---

## 📅 MIGRATION TIMELINE

### **Day 0: Pre-Migration Validation** (4 hours)
**Goal**: Ensure data is clean and migration will succeed

**Tasks**:
1. ✅ **Backup current database** (full snapshot)
   ```bash
   # Supabase CLI
   supabase db dump -f backup_pre_migration_$(date +%Y%m%d).sql
   ```

2. ✅ **Run data validation queries**
   ```sql
   -- Check for duplicate emails
   SELECT email, COUNT(*) as count
   FROM user_profiles
   GROUP BY email
   HAVING COUNT(*) > 1;
   -- Expected: 0 rows

   -- Check for NULL auth_providers
   SELECT COUNT(*) FROM user_profiles WHERE auth_provider IS NULL;
   -- Expected: 0 rows

   -- Check for invalid tier values
   SELECT DISTINCT tier FROM subscriptions;
   -- Expected: 'free', 'premium', 'grace_period' only

   -- Check for negative usage counts
   SELECT COUNT(*) FROM usage_records
   WHERE clips_count < 0 OR files_count < 0
      OR focus_mode_minutes < 0 OR compact_mode_minutes < 0;
   -- Expected: 0 rows
   ```

3. ✅ **Fix data inconsistencies** (if found)
   ```sql
   -- Deduplicate emails (keep oldest user)
   DELETE FROM user_profiles
   WHERE id NOT IN (
     SELECT MIN(id)
     FROM user_profiles
     GROUP BY email
   );

   -- Fill NULL auth_providers (default to 'google')
   UPDATE user_profiles
   SET auth_provider = 'google'
   WHERE auth_provider IS NULL;

   -- Fix negative counts
   UPDATE usage_records
   SET clips_count = 0 WHERE clips_count < 0;
   -- ... similar for other counters
   ```

4. ✅ **Create migration branch**
   ```bash
   git checkout -b migration/vps-schema-optimized
   ```

**Deliverable**: Clean database ready for migration + backup file

---

### **Day 1: Create Backward-Compatible Schema** (8 hours)
**Goal**: Add new tables and virtual columns WITHOUT breaking existing code

**Tasks**:

#### 1.1 Create usage_events Table (30 min)
```sql
-- Migration: 010_create_usage_events.sql
CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  usage_record_id UUID REFERENCES usage_records(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'clip_sent', 'file_uploaded', 'focus_mode_started', 'focus_mode_ended',
    'compact_mode_started', 'compact_mode_ended', 'quota_exceeded',
    'subscription_upgraded', 'subscription_downgraded'
  )),
  feature TEXT NOT NULL CHECK (feature IN ('clips', 'files', 'focus_mode_minutes', 'compact_mode_minutes')),

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_usage_events_user_id_created ON usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_events_event_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_usage_record ON usage_events(usage_record_id);

-- RLS
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events"
  ON usage_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access"
  ON usage_events FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

GRANT ALL ON usage_events TO authenticated;
GRANT ALL ON usage_events TO service_role;
```

#### 1.2 Migrate Existing last_*_at Data to usage_events (1 hour)
```sql
-- Migrate clip events
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

-- Migrate file events
INSERT INTO usage_events (user_id, subscription_id, usage_record_id, event_type, feature, created_at)
SELECT user_id, subscription_id, id, 'file_uploaded', 'files', last_file_upload_at
FROM usage_records
WHERE last_file_upload_at IS NOT NULL;

-- Migrate focus_mode events
INSERT INTO usage_events (user_id, subscription_id, usage_record_id, event_type, feature, created_at)
SELECT user_id, subscription_id, id, 'focus_mode_ended', 'focus_mode_minutes', last_focus_mode_at
FROM usage_records
WHERE last_focus_mode_at IS NOT NULL;

-- Migrate compact_mode events
INSERT INTO usage_events (user_id, subscription_id, usage_record_id, event_type, feature, created_at)
SELECT user_id, subscription_id, id, 'compact_mode_ended', 'compact_mode_minutes', last_compact_mode_at
FROM usage_records
WHERE last_compact_mode_at IS NOT NULL;

-- Verify migration
SELECT
  (SELECT COUNT(*) FROM usage_records WHERE last_clip_at IS NOT NULL) AS old_clip_count,
  (SELECT COUNT(*) FROM usage_events WHERE event_type = 'clip_sent') AS new_clip_count;
-- Both counts should match
```

#### 1.3 Create Virtual Columns for Backward Compatibility (2 hours)

**Option A: PostgreSQL Views** (Recommended - no data duplication)
```sql
-- Migration: 011_create_backward_compatible_views.sql

-- Create view for usage_records with virtual last_*_at columns
CREATE OR REPLACE VIEW usage_records_with_last_activity AS
SELECT
  ur.*,

  -- Virtual columns computed from usage_events
  (SELECT created_at FROM usage_events
   WHERE usage_record_id = ur.id AND event_type = 'clip_sent'
   ORDER BY created_at DESC LIMIT 1) AS last_clip_at,

  (SELECT created_at FROM usage_events
   WHERE usage_record_id = ur.id AND event_type = 'file_uploaded'
   ORDER BY created_at DESC LIMIT 1) AS last_file_upload_at,

  (SELECT created_at FROM usage_events
   WHERE usage_record_id = ur.id AND event_type IN ('focus_mode_started', 'focus_mode_ended')
   ORDER BY created_at DESC LIMIT 1) AS last_focus_mode_at,

  (SELECT created_at FROM usage_events
   WHERE usage_record_id = ur.id AND event_type IN ('compact_mode_started', 'compact_mode_ended')
   ORDER BY created_at DESC LIMIT 1) AS last_compact_mode_at

FROM usage_records ur;

-- Grant permissions
GRANT SELECT ON usage_records_with_last_activity TO authenticated;
GRANT SELECT ON usage_records_with_last_activity TO service_role;

COMMENT ON VIEW usage_records_with_last_activity IS
'Backward-compatible view of usage_records with virtual last_*_at columns.
Use this during migration period to maintain compatibility with old code.';
```

**Option B: PostgreSQL Generated Columns** (Alternative - slower)
```sql
-- Add virtual columns to subscriptions for is_grace_period
ALTER TABLE subscriptions
  ADD COLUMN is_grace_period_virtual BOOLEAN
  GENERATED ALWAYS AS (tier = 'GRACE_PERIOD' OR tier = 'grace_period') STORED;

-- Create index
CREATE INDEX idx_subscriptions_is_grace_period_virtual
  ON subscriptions(is_grace_period_virtual);
```

#### 1.4 Create Triggers for Dual-Write (1 hour)
```sql
-- Migration: 012_create_dual_write_triggers.sql

-- Trigger: Auto-populate usage_events when usage_records is updated
CREATE OR REPLACE FUNCTION sync_usage_events_on_usage_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If clips_count increased, create clip_sent event
  IF NEW.clips_count > OLD.clips_count THEN
    INSERT INTO usage_events (user_id, subscription_id, usage_record_id, event_type, feature)
    VALUES (NEW.user_id, NEW.subscription_id, NEW.id, 'clip_sent', 'clips');
  END IF;

  -- If files_count increased, create file_uploaded event
  IF NEW.files_count > OLD.files_count THEN
    INSERT INTO usage_events (user_id, subscription_id, usage_record_id, event_type, feature)
    VALUES (NEW.user_id, NEW.subscription_id, NEW.id, 'file_uploaded', 'files');
  END IF;

  -- Similar for focus_mode_minutes and compact_mode_minutes
  IF NEW.focus_mode_minutes > OLD.focus_mode_minutes THEN
    INSERT INTO usage_events (user_id, subscription_id, usage_record_id, event_type, feature,
                             metadata)
    VALUES (NEW.user_id, NEW.subscription_id, NEW.id, 'focus_mode_ended', 'focus_mode_minutes',
           jsonb_build_object('duration_minutes', NEW.focus_mode_minutes - OLD.focus_mode_minutes));
  END IF;

  IF NEW.compact_mode_minutes > OLD.compact_mode_minutes THEN
    INSERT INTO usage_events (user_id, subscription_id, usage_record_id, event_type, feature,
                             metadata)
    VALUES (NEW.user_id, NEW.subscription_id, NEW.id, 'compact_mode_ended', 'compact_mode_minutes',
           jsonb_build_object('duration_minutes', NEW.compact_mode_minutes - OLD.compact_mode_minutes));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_usage_record_updated
  AFTER UPDATE ON usage_records
  FOR EACH ROW
  EXECUTE FUNCTION sync_usage_events_on_usage_update();
```

#### 1.5 Update Constraints (Tier Enum - Accept Both Cases) (30 min)
```sql
-- Migration: 013_update_tier_constraint.sql

-- Temporarily allow BOTH lowercase and uppercase tier values
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS check_tier;

ALTER TABLE subscriptions ADD CONSTRAINT check_tier
  CHECK (tier IN ('free', 'premium', 'grace_period', 'FREE', 'PREMIUM', 'GRACE_PERIOD'));

-- Update QUOTA_LIMITS in Edge Functions to support both (code change)
```

#### 1.6 Add user_profiles Constraints (30 min)
```sql
-- Migration: 014_add_user_profiles_constraints.sql

-- Add UNIQUE constraint on email
ALTER TABLE user_profiles ADD CONSTRAINT uq_email UNIQUE (email);

-- Add NOT NULL to auth_provider
ALTER TABLE user_profiles ALTER COLUMN auth_provider SET NOT NULL;

-- Add CHECK constraint
ALTER TABLE user_profiles ADD CONSTRAINT check_auth_provider
  CHECK (auth_provider IN ('google', 'notion'));
```

#### 1.7 Testing (3 hours)
- ✅ Test backward-compatible view queries
- ✅ Test triggers fire correctly
- ✅ Test old code still works (without changes)
- ✅ Run full integration tests

**Deliverable**: Database supports BOTH old and new schema simultaneously

---

### **Day 2-3: Update Code to Use New Schema** (16 hours)
**Goal**: Update all code to use new schema (while maintaining backward compatibility)

#### 2.1 Update TypeScript Types (1 hour)
**File**: `packages/core-shared/src/types/subscription.types.ts`

```typescript
// ❌ OLD
export interface Subscription {
  tier: SubscriptionTier;
  is_grace_period: boolean;  // REMOVE
  // ...
}

// ✅ NEW
export interface Subscription {
  tier: SubscriptionTier;  // Already uppercase enum
  // is_grace_period removed
  // Add helper method instead
}

// Add helper function
export function isGracePeriod(subscription: Subscription): boolean {
  return subscription.tier === SubscriptionTier.GRACE_PERIOD;
}
```

#### 2.2 Update SubscriptionService (4 hours)
**File**: `packages/core-shared/src/services/subscription.service.ts`

**Changes Required** (18 locations):

```typescript
// ❌ OLD (Line 305)
if (subscription.is_grace_period) {
  // Logic
}

// ✅ NEW
if (subscription.tier === SubscriptionTier.GRACE_PERIOD) {
  // Logic
}

// ❌ OLD (Line 310)
if (subscription.tier === 'free') {
  // Logic
}

// ✅ NEW
if (subscription.tier === SubscriptionTier.FREE) {
  // Logic
}

// ❌ OLD (Line 455) - last_clip_at access
const lastClip = usageRecord.last_clip_at;

// ✅ NEW - Query usage_events
const lastClipEvent = await this.supabaseClient
  .from('usage_events')
  .select('created_at')
  .eq('user_id', userId)
  .eq('event_type', 'clip_sent')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

const lastClip = lastClipEvent?.data?.created_at;
```

#### 2.3 Update QuotaService (2 hours)
**File**: `packages/core-shared/src/services/quota.service.ts`

**Changes Required** (8 locations):
- Replace `tier === 'free'` with `tier === SubscriptionTier.FREE`
- Similar for 'premium' and 'grace_period'

#### 2.4 Update Edge Functions (6 hours)

**File**: `supabase/functions/get-subscription/index.ts`

```typescript
// ❌ OLD (Line 70)
if (subscription.tier === 'free') {
  quotas = QUOTA_LIMITS.free;
}

// ✅ NEW (Backward compatible during migration)
const tierKey = subscription.tier.toLowerCase() as 'free' | 'premium' | 'grace_period';
const quotas = QUOTA_LIMITS[tierKey];

// OR (after full migration)
if (subscription.tier === 'FREE') {
  quotas = QUOTA_LIMITS.FREE;  // Updated constants
}

// ❌ OLD (Line 85)
const isGracePeriod = subscription.is_grace_period;

// ✅ NEW
const isGracePeriod = subscription.tier === 'GRACE_PERIOD' || subscription.tier === 'grace_period';

// ❌ OLD (Line 110) - last_clip_at access
const lastClip = usageRecord.last_clip_at;

// ✅ NEW - Query usage_events
const { data: lastClipEvent } = await supabaseClient
  .from('usage_events')
  .select('created_at')
  .eq('user_id', userId)
  .eq('event_type', 'clip_sent')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

const lastClip = lastClipEvent?.created_at;
```

**File**: `supabase/functions/webhook-stripe/index.ts`

```typescript
// ❌ OLD (Line 95)
subscription.tier = 'premium';

// ✅ NEW
subscription.tier = 'PREMIUM';  // Uppercase

// ❌ OLD (Line 185)
subscription.tier = 'free';

// ✅ NEW
subscription.tier = 'FREE';
```

**File**: `supabase/functions/_shared/constants.ts`

```typescript
// ❌ OLD
export const QUOTA_LIMITS = {
  free: { clips: 100, ... },
  premium: { clips: null, ... },
  grace_period: { clips: 100, ... }
};

// ✅ NEW (Support both during migration)
export const QUOTA_LIMITS = {
  free: { clips: 100, ... },
  premium: { clips: null, ... },
  grace_period: { clips: 100, ... },
  // Add uppercase versions
  FREE: { clips: 100, ... },
  PREMIUM: { clips: null, ... },
  GRACE_PERIOD: { clips: 100, ... }
};

// After migration, remove lowercase versions
```

#### 2.5 Update RPC Functions (1 hour)
**File**: `database/migrations/007_create_get_or_create_usage_record.sql`

```sql
-- ❌ OLD - Function that returns last_*_at columns
CREATE OR REPLACE FUNCTION get_or_create_current_usage_record(...)
RETURNS SETOF usage_records
...

-- ✅ NEW - Function that does NOT reference last_*_at
-- (Returns from base table, not view)
-- OR use VIEW during migration:
CREATE OR REPLACE FUNCTION get_or_create_current_usage_record(...)
RETURNS SETOF usage_records_with_last_activity  -- Use view
...
```

#### 2.6 Update React Components & Hooks (2 hours)
**File**: `packages/ui/src/hooks/core/useAppState.ts`

```typescript
// ❌ OLD
if (subscription.is_grace_period) { ... }
if (subscription.tier === 'free') { ... }

// ✅ NEW
import { isGracePeriod } from '@/types/subscription.types';

if (isGracePeriod(subscription)) { ... }
if (subscription.tier === SubscriptionTier.FREE) { ... }
```

**Deliverable**: All code updated to use new schema (backward compatible)

---

### **Day 4: Data Migration & Schema Finalization** (8 hours)
**Goal**: Migrate all data to uppercase tier, drop old columns

#### 4.1 Final Data Validation (1 hour)
```sql
-- Verify all tier values are valid
SELECT tier, COUNT(*)
FROM subscriptions
GROUP BY tier;

-- Verify usage_events has all data
SELECT
  (SELECT COUNT(DISTINCT user_id) FROM usage_records) AS users_with_records,
  (SELECT COUNT(DISTINCT user_id) FROM usage_events) AS users_with_events;
-- Should be equal or events >= records
```

#### 4.2 Migrate Tier to Uppercase (30 min)
```sql
-- Migration: 015_migrate_tier_to_uppercase.sql

-- Update all tier values to uppercase
UPDATE subscriptions
SET tier = UPPER(tier)
WHERE tier IN ('free', 'premium', 'grace_period');

-- Verify
SELECT tier, COUNT(*)
FROM subscriptions
GROUP BY tier;
-- Expected: 'FREE', 'PREMIUM', 'GRACE_PERIOD' only
```

#### 4.3 Drop is_grace_period Column (15 min)
```sql
-- Migration: 016_drop_is_grace_period.sql

-- Drop virtual column (if created)
ALTER TABLE subscriptions DROP COLUMN IF EXISTS is_grace_period_virtual;

-- Drop original column
ALTER TABLE subscriptions DROP COLUMN IF EXISTS is_grace_period;

-- Verify
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'subscriptions';
-- is_grace_period should NOT appear
```

#### 4.4 Drop last_*_at Columns from usage_records (15 min)
```sql
-- Migration: 017_drop_last_at_columns.sql

-- Drop columns
ALTER TABLE usage_records
  DROP COLUMN IF EXISTS last_clip_at,
  DROP COLUMN IF EXISTS last_file_upload_at,
  DROP COLUMN IF EXISTS last_focus_mode_at,
  DROP COLUMN IF EXISTS last_compact_mode_at;

-- Drop backward-compatible view
DROP VIEW IF EXISTS usage_records_with_last_activity;

-- Verify
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'usage_records';
-- last_*_at columns should NOT appear
```

#### 4.5 Finalize Constraints (30 min)
```sql
-- Migration: 018_finalize_constraints.sql

-- Update tier constraint to only accept uppercase
ALTER TABLE subscriptions DROP CONSTRAINT check_tier;

ALTER TABLE subscriptions ADD CONSTRAINT check_tier
  CHECK (tier IN ('FREE', 'PREMIUM', 'GRACE_PERIOD'));

-- Add non-negative constraints on usage counters
ALTER TABLE usage_records
  ADD CONSTRAINT check_clips_count CHECK (clips_count >= 0),
  ADD CONSTRAINT check_files_count CHECK (files_count >= 0),
  ADD CONSTRAINT check_focus_mode_minutes CHECK (focus_mode_minutes >= 0),
  ADD CONSTRAINT check_compact_mode_minutes CHECK (compact_mode_minutes >= 0);

-- Add period validation
ALTER TABLE usage_records
  ADD CONSTRAINT check_period_dates CHECK (period_end > period_start);
```

#### 4.6 Optimize Indexes (1 hour)
```sql
-- Migration: 019_optimize_indexes.sql

-- Drop old indexes
DROP INDEX IF EXISTS idx_usage_records_user_id;
DROP INDEX IF EXISTS idx_usage_records_subscription_id;

-- Create optimized indexes
CREATE INDEX idx_usage_records_user_id_period
  ON usage_records(user_id, year DESC, month DESC);

CREATE INDEX idx_usage_records_subscription_id
  ON usage_records(subscription_id)
  WHERE subscription_id IS NOT NULL;  -- Partial index

CREATE INDEX idx_subscriptions_tier_status
  ON subscriptions(tier, status);  -- Composite for analytics

-- Update existing indexes to UNIQUE where appropriate
DROP INDEX IF EXISTS idx_subscriptions_user_id;
CREATE UNIQUE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
```

#### 4.7 Remove Dual-Write Triggers (15 min)
```sql
-- Migration: 020_remove_dual_write_triggers.sql

-- Drop trigger
DROP TRIGGER IF EXISTS on_usage_record_updated ON usage_records;

-- Drop function
DROP FUNCTION IF EXISTS sync_usage_events_on_usage_update();

COMMENT ON TRIGGER on_usage_record_updated IS 'REMOVED: Dual-write migration completed.';
```

#### 4.8 Final Testing (4 hours)
- ✅ Test all services with new schema
- ✅ Test Edge Functions
- ✅ Test quota enforcement
- ✅ Test Stripe webhooks
- ✅ Test usage tracking
- ✅ Run full E2E tests

**Deliverable**: Fully migrated schema with NO backward compatibility code

---

### **Day 5: Cleanup & Validation** (4 hours)
**Goal**: Remove all backward compatibility code, validate migration

#### 5.1 Remove Backward Compatibility Code (2 hours)

**File**: `supabase/functions/_shared/constants.ts`
```typescript
// Remove lowercase QUOTA_LIMITS
export const QUOTA_LIMITS = {
  // Remove: free, premium, grace_period
  FREE: { clips: 100, ... },
  PREMIUM: { clips: null, ... },
  GRACE_PERIOD: { clips: 100, ... }
};
```

**File**: Edge Functions (all)
- Remove `.toLowerCase()` tier conversions
- Remove `is_grace_period` fallback checks

#### 5.2 Final Database Cleanup (30 min)
```sql
-- Remove old backup tables (if any)
DROP TABLE IF EXISTS subscriptions_backup;
DROP TABLE IF EXISTS usage_records_backup;

-- Remove old migration comments
COMMENT ON TABLE subscriptions IS 'User subscription tiers and Stripe integration (Migrated 2025-11-18)';
COMMENT ON TABLE usage_records IS 'Monthly usage tracking (Migrated 2025-11-18)';
COMMENT ON TABLE usage_events IS 'Detailed usage event tracking (Created 2025-11-18)';
```

#### 5.3 Post-Migration Validation (1 hour)
```sql
-- Validation Query 1: Verify tier values
SELECT tier, COUNT(*)
FROM subscriptions
GROUP BY tier;
-- Expected: Only 'FREE', 'PREMIUM', 'GRACE_PERIOD'

-- Validation Query 2: Verify no is_grace_period column
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'subscriptions' AND column_name = 'is_grace_period';
-- Expected: 0 rows

-- Validation Query 3: Verify usage_events has data
SELECT COUNT(*) FROM usage_events;
-- Expected: > 0

-- Validation Query 4: Verify no last_*_at columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'usage_records' AND column_name LIKE 'last_%';
-- Expected: 0 rows

-- Validation Query 5: Verify constraints
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'subscriptions'::regclass;
-- Expected: check_tier with uppercase values only
```

#### 5.4 Create Final Migration Report (30 min)
```markdown
# Migration Report - VPS Schema Optimization

**Date**: 2025-11-XX
**Status**: ✅ COMPLETED
**Downtime**: 0 minutes
**Data Loss**: 0 records

## Changes Summary

### Tables Modified
- `subscriptions`: tier enum uppercase, is_grace_period removed
- `usage_records`: last_*_at columns removed
- `user_profiles`: email UNIQUE, auth_provider NOT NULL

### Tables Created
- `usage_events`: New detailed event tracking table

### Data Migration
- Migrated XXXX usage events from usage_records to usage_events
- Updated XXXX subscriptions tier to uppercase
- No data loss

### Code Changes
- Updated 23 files
- 127 integration points modified
- All tests passing

## Rollback Plan
Backup file: `backup_pre_migration_YYYYMMDD.sql`
Rollback time: < 5 minutes

## Validation
✅ All tier values uppercase
✅ No is_grace_period column
✅ usage_events populated
✅ All tests passing
✅ E2E tests passing
```

**Deliverable**: Fully migrated, validated, production-ready schema

---

## 🔄 ROLLBACK PROCEDURES

### Scenario 1: Rollback During Day 1-2 (Dual-Write Period)
**Impact**: LOW - Old code still works
**Time**: < 5 minutes

```sql
-- 1. Restore from backup
psql -U postgres -d notionClipper < backup_pre_migration_YYYYMMDD.sql

-- 2. Drop new tables
DROP TABLE IF EXISTS usage_events CASCADE;
DROP VIEW IF EXISTS usage_records_with_last_activity;

-- 3. Revert to old code
git checkout main
```

### Scenario 2: Rollback During Day 3-4 (After Data Migration)
**Impact**: MEDIUM - Need to restore old columns
**Time**: < 10 minutes

```sql
-- 1. Re-add is_grace_period column
ALTER TABLE subscriptions
  ADD COLUMN is_grace_period BOOLEAN DEFAULT false;

UPDATE subscriptions
SET is_grace_period = (tier = 'GRACE_PERIOD' OR tier = 'grace_period');

-- 2. Re-add last_*_at columns
ALTER TABLE usage_records
  ADD COLUMN last_clip_at TIMESTAMPTZ,
  ADD COLUMN last_file_upload_at TIMESTAMPTZ,
  ADD COLUMN last_focus_mode_at TIMESTAMPTZ,
  ADD COLUMN last_compact_mode_at TIMESTAMPTZ;

-- Populate from usage_events
UPDATE usage_records ur
SET last_clip_at = (
  SELECT created_at FROM usage_events
  WHERE usage_record_id = ur.id AND event_type = 'clip_sent'
  ORDER BY created_at DESC LIMIT 1
);
-- Similar for other columns

-- 3. Revert tier to lowercase
UPDATE subscriptions SET tier = LOWER(tier);

-- 4. Revert code
git checkout main
```

### Scenario 3: Critical Failure (Nuclear Option)
**Impact**: HIGH - Full database restore
**Time**: < 30 minutes

```sql
-- 1. Full database restore from backup
psql -U postgres -d notionClipper < backup_pre_migration_YYYYMMDD.sql

-- 2. Revert all code
git checkout main

-- 3. Rebuild Electron app
npm run build
```

---

## ✅ TESTING STRATEGY

### 1. Unit Tests
**Target**: All services updated
**Coverage**: > 90%

```bash
# Run unit tests
npm test -- --coverage

# Specific services
npm test subscription.service.spec.ts
npm test quota.service.spec.ts
npm test usage-tracking.service.spec.ts
```

### 2. Integration Tests
**Target**: Edge Functions + Database

```bash
# Test Edge Functions
cd supabase/functions
deno test --allow-all

# Test specific function
deno test get-subscription/index.test.ts
```

### 3. E2E Tests
**Target**: Full user flows

**Test Cases**:
1. ✅ **FREE user flow**
   - Create FREE subscription
   - Send clips until quota reached
   - Verify quota blocked

2. ✅ **PREMIUM upgrade flow**
   - Upgrade FREE → PREMIUM
   - Verify unlimited quota
   - Send 200 clips (exceeds FREE limit)

3. ✅ **GRACE_PERIOD flow**
   - Downgrade PREMIUM → FREE
   - Verify grace period active
   - Verify quota still available during grace

4. ✅ **Usage tracking flow**
   - Track clips, files, focus_mode, compact_mode
   - Verify usage_events created
   - Verify usage_records updated

### 4. Performance Tests
**Target**: Query performance

```sql
-- Test query performance (should be < 100ms)
EXPLAIN ANALYZE
SELECT * FROM usage_records
WHERE user_id = '...'
ORDER BY year DESC, month DESC
LIMIT 1;

-- Test usage_events query
EXPLAIN ANALYZE
SELECT created_at FROM usage_events
WHERE user_id = '...' AND event_type = 'clip_sent'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 📊 RISK ASSESSMENT

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | LOW | CRITICAL | Full backup before migration |
| Breaking change missed | MEDIUM | HIGH | Comprehensive integration points analysis (Phase 3) |
| Rollback fails | LOW | CRITICAL | Test rollback procedure in staging |
| Performance degradation | LOW | MEDIUM | Test queries with EXPLAIN ANALYZE |
| User sessions lost | MEDIUM | LOW | Use dual-write period for smooth transition |
| Stripe webhook failure | LOW | CRITICAL | Test webhook with Stripe CLI |

---

## ✅ SUCCESS CRITERIA

1. **Zero Downtime**: App remains functional throughout migration
2. **Zero Data Loss**: All data migrated successfully
3. **Zero Breaking Changes** (for users): No user-facing errors
4. **Performance Maintained**: Query times < 200ms (p95)
5. **All Tests Pass**: Unit, integration, E2E tests pass
6. **Rollback Tested**: Rollback procedure validated in staging

---

## 📝 CHECKLIST BEFORE DEPLOYMENT

### Pre-Migration
- [ ] Full database backup created
- [ ] Data validation queries run (no issues found)
- [ ] Migration branch created
- [ ] Staging environment tested
- [ ] Rollback procedure tested in staging

### During Migration
- [ ] Day 1: Backward-compatible schema deployed
- [ ] Day 2-3: Code updated and tested
- [ ] Day 4: Data migrated, old columns dropped
- [ ] Day 5: Cleanup completed

### Post-Migration
- [ ] Validation queries run (all pass)
- [ ] E2E tests pass
- [ ] Performance tests pass
- [ ] Monitoring alerts configured
- [ ] Migration report created

---

**Status**: Phase 4 COMPLETED ✅
**Next Phase**: Phase 5 - Implementation (when approved by user)
**Timeline**: 5 days
**Risk Level**: MEDIUM (mitigated with dual-write strategy)
