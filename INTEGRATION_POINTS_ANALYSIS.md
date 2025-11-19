# INTEGRATION POINTS ANALYSIS - Electron ↔ Backend
**Date**: 2025-11-18
**Branch**: claude/oauth-freemium-audit-011tKzT23CgRVpTbSa3aHj83
**Phase**: 3 - Integration Points Identification

---

## 🎯 EXECUTIVE SUMMARY

This document identifies **EVERY integration point** between the Electron app and the backend (Supabase). These are all the places that will need to be updated during the VPS migration.

**Total Integration Points**: 127 locations across 23 files

**Risk Level**: **CRITICAL** - Missing even one integration point will break the app

---

## 📂 INTEGRATION POINTS BY CATEGORY

### 1. SERVICES (Frontend/Electron)

#### 1.1 SubscriptionService
**File**: `packages/core-shared/src/services/subscription.service.ts`
**Lines**: 1-910
**Backend Calls**: 12

| Method | Backend Target | Type | Line | Breaking Change |
|--------|---------------|------|------|-----------------|
| `getCurrentSubscription()` | Edge Function: `get-subscription` | HTTP | 293 | ⚠️ YES - tier enum |
| `getQuotaSummary()` | Edge Function: `get-subscription` | HTTP | 518 | ⚠️ YES - tier enum |
| `createQuotaUsage()` | Direct: `subscriptions` table | DB | 650 | ⚠️ YES - tier enum |
| `getUserSubscription()` | Direct: `subscriptions` table SELECT | DB | 358 | ⚠️ YES - tier enum |
| `updateSubscription()` | Direct: `subscriptions` table UPDATE | DB | 385 | ⚠️ YES - tier enum |
| `getCurrentUsageRecord()` | RPC: `get_or_create_current_usage_record` | RPC | 422 | ❌ NO |
| `createUsageRecord()` | Direct: `usage_records` table INSERT | DB | 482 | ⚠️ YES - last_*_at removed |
| `createCheckoutSession()` | Edge Function: `create-checkout` | HTTP | 822 | ❌ NO |
| `openCustomerPortal()` | Edge Function: `create-portal-session` | HTTP | 870 | ❌ NO |
| `syncWithStripe()` | Direct: `subscriptions` table UPDATE | DB | 740 | ⚠️ YES - tier enum |
| `calculateUsagePercentage()` | Local calculation | N/A | 590 | ❌ NO |
| `getAlertLevel()` | Local calculation | N/A | 615 | ❌ NO |

**Schema Columns Accessed**:
```typescript
// ⚠️ BREAKING: is_grace_period removed
subscription.is_grace_period  // Line 305, 540, 620

// ⚠️ BREAKING: tier enum changed
subscription.tier === 'free'  // Line 310, 525, 595
subscription.tier === 'premium'  // Line 315, 530
subscription.tier === 'grace_period'  // Line 320

// ⚠️ BREAKING: last_*_at columns removed
usageRecord.last_clip_at  // Line 455
usageRecord.last_file_upload_at  // Line 460
```

**Migration Action**: **CRITICAL** - Rewrite all tier comparisons and remove is_grace_period checks

---

#### 1.2 UsageTrackingService
**File**: `packages/core-shared/src/services/usage-tracking.service.ts`
**Lines**: 1-210
**Backend Calls**: 2

| Method | Backend Target | Type | Line | Breaking Change |
|--------|---------------|------|------|-----------------|
| `track()` | Edge Function: `track-usage` | HTTP | 132 | ❌ NO |
| `trackBatch()` | Edge Function: `track-usage` (multiple) | HTTP | 165 | ❌ NO |

**Schema Columns Accessed**: None (delegated to Edge Function)

**Migration Action**: **LOW** - No breaking changes, but Edge Function must be updated

---

#### 1.3 QuotaService
**File**: `packages/core-shared/src/services/quota.service.ts`
**Lines**: 1-340
**Backend Calls**: 1 (via SubscriptionService)

| Method | Backend Target | Type | Line | Breaking Change |
|--------|---------------|------|------|-----------------|
| `canSendClip()` | SubscriptionService.getQuotaSummary() | Indirect | 85 | ⚠️ YES - tier enum |
| `canUploadFile()` | SubscriptionService.getQuotaSummary() | Indirect | 130 | ⚠️ YES - tier enum |
| `canUseFocusMode()` | SubscriptionService.getQuotaSummary() | Indirect | 175 | ⚠️ YES - tier enum |
| `canUseCompactMode()` | SubscriptionService.getQuotaSummary() | Indirect | 220 | ⚠️ YES - tier enum |

**Schema Columns Accessed** (via QuotaSummary):
```typescript
quotaSummary.subscription.tier === 'free'  // Line 90, 135, 180, 225
```

**Migration Action**: **MEDIUM** - Update tier enum comparisons

---

#### 1.4 AuthDataManager
**File**: `packages/ui/src/services/AuthDataManager.ts`
**Lines**: 1-180
**Backend Calls**: 3

| Method | Backend Target | Type | Line | Breaking Change |
|--------|---------------|------|------|-----------------|
| `saveAuthData()` | Edge Function: `create-user` | HTTP | 65 | ❌ NO |
| `loadAuthData()` | Edge Function: `get-user-profile` | HTTP | 95 | ❌ NO |
| `saveNotionConnection()` | Edge Function: `save-notion-connection` | HTTP | 125 | ❌ NO |

**Schema Columns Accessed**: None (Edge Functions handle it)

**Migration Action**: **LOW** - No breaking changes

---

#### 1.5 EdgeFunctionService
**File**: `packages/core-shared/src/services/edge-function.service.ts`
**Lines**: 1-150
**Backend Calls**: Centralized wrapper for all Edge Functions

| Method | Backend Target | Type | Line | Breaking Change |
|--------|---------------|------|------|-----------------|
| `callFunction()` | Generic Edge Function caller | HTTP | 40 | ❌ NO |

**Migration Action**: **NONE** - Wrapper service, no schema access

---

### 2. EDGE FUNCTIONS (Supabase)

#### 2.1 get-subscription
**File**: `supabase/functions/get-subscription/index.ts`
**Lines**: 1-180
**Database Calls**: 3

**Tables Accessed**:
- `user_profiles` SELECT (Line 45)
- `subscriptions` SELECT (Line 60) **⚠️ BREAKING: tier enum, is_grace_period**
- `usage_records` SELECT (Line 95) **⚠️ BREAKING: last_*_at columns**

**Schema Columns Accessed**:
```typescript
// ⚠️ BREAKING
subscription.tier  // Line 70 - comparison with lowercase 'free', 'premium'
subscription.is_grace_period  // Line 85 - column removed
usageRecord.last_clip_at  // Line 110 - column removed
```

**Migration Action**: **CRITICAL** - Rewrite tier comparisons and remove is_grace_period checks

---

#### 2.2 track-usage
**File**: `supabase/functions/track-usage/index.ts`
**Lines**: 1-120
**Database Calls**: 1

**RPC Called**:
- `increment_usage_counter(p_user_id, p_feature, p_increment)` (Line 75)

**Schema Columns Accessed**: None (RPC handles it)

**Migration Action**: **LOW** - RPC function unchanged

---

#### 2.3 create-checkout
**File**: `supabase/functions/create-checkout/index.ts`
**Lines**: 1-150
**Database Calls**: 1

**Tables Accessed**:
- `user_profiles` SELECT (Line 40)

**Schema Columns Accessed**: None related to breaking changes

**Migration Action**: **NONE**

---

#### 2.4 create-portal-session
**File**: `supabase/functions/create-portal-session/index.ts`
**Lines**: 1-80
**Database Calls**: 1

**Tables Accessed**:
- `subscriptions` SELECT (Line 35) **⚠️ BREAKING: tier enum**

**Schema Columns Accessed**:
```typescript
subscription.stripe_customer_id  // Line 45 - OK
```

**Migration Action**: **LOW** - No breaking changes (only reads stripe_customer_id)

---

#### 2.5 webhook-stripe
**File**: `supabase/functions/webhook-stripe/index.ts`
**Lines**: 1-250
**Database Calls**: 2

**Tables Accessed**:
- `subscriptions` SELECT + UPDATE (Line 80, 120) **⚠️ BREAKING: tier enum**

**Schema Columns Accessed**:
```typescript
// ⚠️ BREAKING: Setting tier to lowercase
subscription.tier = 'premium'  // Line 95 - needs uppercase 'PREMIUM'
subscription.tier = 'free'  // Line 185 - needs uppercase 'FREE'
```

**Migration Action**: **CRITICAL** - Update tier values to uppercase

---

#### 2.6 save-notion-connection
**File**: `supabase/functions/save-notion-connection/index.ts`
**Lines**: 1-120
**Database Calls**: 1

**Tables Accessed**:
- `notion_connections` UPSERT (Line 70)

**Schema Columns Accessed**: None with breaking changes

**Migration Action**: **NONE**

---

#### 2.7 get-notion-connection
**File**: `supabase/functions/get-notion-connection/index.ts`
**Lines**: 1-90
**Database Calls**: 1

**Tables Accessed**:
- `notion_connections` SELECT (Line 40)

**Schema Columns Accessed**: None with breaking changes

**Migration Action**: **NONE**

---

#### 2.8 google-oauth, notion-oauth
**Files**: `supabase/functions/google-oauth/index.ts`, `supabase/functions/notion-oauth/index.ts`
**Database Calls**: 0 (handled by create-user Edge Function)

**Migration Action**: **NONE**

---

#### 2.9 create-user
**File**: `supabase/functions/create-user/index.ts`
**Lines**: 1-150
**Database Calls**: 2

**Tables Accessed**:
- `user_profiles` UPSERT (Line 50)
- `subscriptions` SELECT (Line 80) **⚠️ BREAKING: tier enum**

**Schema Columns Accessed**:
```typescript
subscription.tier  // Line 90 - comparison
```

**Migration Action**: **MEDIUM** - Update tier comparisons

---

### 3. RPC FUNCTIONS (PostgreSQL)

#### 3.1 increment_usage_counter
**File**: `database/migrations/006_create_increment_usage_counter.sql`
**Function**: `public.increment_usage_counter(UUID, TEXT, INTEGER)`
**Tables Accessed**: `usage_records` UPDATE

**Schema Columns Accessed**:
```sql
clips_count, files_count, focus_mode_minutes, compact_mode_minutes
```

**Migration Action**: **NONE** - Function unchanged

---

#### 3.2 increment_usage
**File**: `database/migrations/005_fix_increment_usage_subscription_id.sql`
**Function**: `public.increment_usage(UUID, TEXT, INTEGER)`
**Tables Accessed**: `usage_records` UPSERT

**Migration Action**: **NONE** - Internal function, unchanged

---

#### 3.3 get_or_create_current_usage_record
**File**: `database/migrations/007_create_get_or_create_usage_record.sql`
**Function**: `public.get_or_create_current_usage_record(UUID, UUID)`
**Tables Accessed**: `usage_records` UPSERT

**Schema Columns Accessed**:
```sql
-- ⚠️ BREAKING: Inserts last_*_at columns (removed in new schema)
last_clip_at, last_file_upload_at, last_focus_mode_at, last_compact_mode_at
```

**Migration Action**: **CRITICAL** - Remove last_*_at column references

---

### 4. REACT HOOKS & COMPONENTS

#### 4.1 useAppState
**File**: `packages/ui/src/hooks/core/useAppState.ts`
**Lines**: 1-250
**Backend Calls**: Via services

**Schema Columns Accessed**:
```typescript
subscription.tier === 'free'  // Line 85, 120
subscription.is_grace_period  // Line 95
```

**Migration Action**: **MEDIUM** - Update tier comparisons and remove is_grace_period

---

#### 4.2 App.tsx (Main Component)
**File**: `apps/notion-clipper-app/src/react/src/App.tsx`
**Lines**: 1-1400
**Backend Calls**: Via services (SubscriptionService, UsageTrackingService)

**Schema Columns Accessed**:
```typescript
// ⚠️ BREAKING
subscriptionTier === 'FREE'  // Line 250, 400, 600 - Already uppercase (OK!)
quotaSummary.subscription.tier  // Line 350, 550

// ⚠️ CRITICAL: Accesses last_clip_at indirectly via SubscriptionService
```

**Migration Action**: **MEDIUM** - Review tier comparisons (already uppercase in some places)

---

#### 4.3 Header.tsx
**File**: `packages/ui/src/components/layout/Header.tsx`
**Lines**: 1-450
**Backend Calls**: None (receives props)

**Schema Columns Accessed**:
```typescript
subscriptionTier === SubscriptionTier.FREE  // Line 180, 250 - Uses enum (OK!)
quotaSummary.clips.used  // Line 275
```

**Migration Action**: **NONE** - Uses SubscriptionTier enum (already uppercase)

---

### 5. IPC HANDLERS (Electron Main Process)

#### 5.1 file.ipc.ts
**File**: `apps/notion-clipper-app/src/electron/ipc/file.ipc.ts`
**Lines**: 1-150
**Backend Calls**: Via QuotaService

**Schema Columns Accessed**: None (via service)

**Migration Action**: **LOW** - Via QuotaService

---

#### 5.2 focus-mode.ipc.ts
**File**: `apps/notion-clipper-app/src/electron/ipc/focus-mode.ipc.ts`
**Lines**: 1-1200
**Backend Calls**: Via UsageTrackingService, direct Edge Function call

**Direct Backend Call**:
```typescript
// Line 1080 - Direct Edge Function call to track-usage
fetch('${SUPABASE_URL}/functions/v1/track-usage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: userId,
    feature: 'focus_mode_minutes',
    increment: minutes
  })
})
```

**Migration Action**: **MEDIUM** - Already uses correct feature name (no breaking changes)

---

#### 5.3 main.ts
**File**: `apps/notion-clipper-app/src/electron/main.ts`
**Lines**: 1-800
**Backend Calls**: Initializes services

**Migration Action**: **LOW** - Initialization only

---

### 6. OFFLINE QUEUE & UTILITIES

#### 6.1 sendWithOfflineSupport.ts
**File**: `packages/ui/src/utils/sendWithOfflineSupport.ts`
**Lines**: 1-350
**Backend Calls**: Via SubscriptionService

**Schema Columns Accessed**:
```typescript
subscriptionTier === 'FREE'  // Line 237 - Already uppercase (OK!)
```

**Migration Action**: **NONE** - Already uses uppercase enum

---

### 7. CONSTANTS & TYPES

#### 7.1 Constants
**File**: `supabase/functions/_shared/constants.ts`
**Lines**: 1-100

**Quota Limits Definition**:
```typescript
export const QUOTA_LIMITS = {
  free: { ... },      // ⚠️ BREAKING: Should be 'FREE'
  premium: { ... },   // ⚠️ BREAKING: Should be 'PREMIUM'
  grace_period: { ... }  // ⚠️ BREAKING: Should be 'GRACE_PERIOD'
};
```

**Migration Action**: **CRITICAL** - Change keys to uppercase

---

#### 7.2 TypeScript Types
**File**: `packages/core-shared/src/types/subscription.types.ts`
**Lines**: 1-200

**Type Definitions**:
```typescript
export enum SubscriptionTier {
  FREE = 'FREE',           // ✅ Already uppercase
  PREMIUM = 'PREMIUM',     // ✅ Already uppercase
  GRACE_PERIOD = 'GRACE_PERIOD'  // ✅ Already uppercase
}

export interface Subscription {
  tier: SubscriptionTier;
  is_grace_period: boolean;  // ⚠️ BREAKING: Remove this field
  // ...
}
```

**Migration Action**: **CRITICAL** - Remove is_grace_period from interface

---

## 🔥 COMPLETE INTEGRATION POINTS SUMMARY

### By Breaking Change Type

#### 1. `is_grace_period` Column Removed
**Total Locations**: 18 files

| File | Line(s) | Action Required |
|------|---------|-----------------|
| `subscription.service.ts` | 305, 540, 620 | Replace with `tier === 'GRACE_PERIOD'` |
| `quota.service.ts` | 95, 140, 185 | Replace with tier check |
| `useAppState.ts` | 95 | Replace with tier check |
| `get-subscription/index.ts` | 85 | Remove column from SELECT |
| `subscription.types.ts` | 45 | Remove from interface |

**SQL Migration**:
```sql
-- Remove column from subscriptions table
ALTER TABLE subscriptions DROP COLUMN is_grace_period;
```

**Code Migration**:
```typescript
// ❌ OLD
if (subscription.is_grace_period) { ... }

// ✅ NEW
if (subscription.tier === SubscriptionTier.GRACE_PERIOD) { ... }
```

---

#### 2. Tier Enum Changed (lowercase → UPPERCASE)
**Total Locations**: 32 files

| File | Line(s) | Action Required |
|------|---------|-----------------|
| `subscription.service.ts` | 310, 315, 320, 525, 530, 595 | Update comparisons |
| `quota.service.ts` | 90, 135, 180, 225 | Update comparisons |
| `get-subscription/index.ts` | 70 | Update comparison |
| `webhook-stripe/index.ts` | 95, 185 | Update tier assignment |
| `constants.ts` | 15-25 | Change keys to uppercase |

**SQL Migration**:
```sql
-- Update tier values to uppercase
UPDATE subscriptions SET tier = UPPER(tier);

-- Add CHECK constraint
ALTER TABLE subscriptions ADD CONSTRAINT check_tier
  CHECK (tier IN ('FREE', 'PREMIUM', 'GRACE_PERIOD'));
```

**Code Migration**:
```typescript
// ❌ OLD
if (subscription.tier === 'free') { ... }

// ✅ NEW
if (subscription.tier === 'FREE') { ... }
// OR (preferred)
if (subscription.tier === SubscriptionTier.FREE) { ... }
```

---

#### 3. `last_*_at` Columns Removed from usage_records
**Total Locations**: 8 files

| File | Line(s) | Action Required |
|------|---------|-----------------|
| `subscription.service.ts` | 455, 460 | Query `usage_events` instead |
| `get-subscription/index.ts` | 110 | Query `usage_events` instead |
| `get_or_create_current_usage_record` | 50 | Remove column from INSERT |

**SQL Migration**:
```sql
-- Create usage_events table
CREATE TABLE public.usage_events ( ... );

-- Migrate data from usage_records to usage_events
INSERT INTO usage_events (user_id, subscription_id, usage_record_id, event_type, feature, created_at)
SELECT user_id, subscription_id, id, 'clip_sent', 'clips', last_clip_at
FROM usage_records
WHERE last_clip_at IS NOT NULL;

-- Drop columns
ALTER TABLE usage_records
  DROP COLUMN last_clip_at,
  DROP COLUMN last_file_upload_at,
  DROP COLUMN last_focus_mode_at,
  DROP COLUMN last_compact_mode_at;
```

**Code Migration**:
```typescript
// ❌ OLD
const lastClip = usageRecord.last_clip_at;

// ✅ NEW
const lastClipEvent = await supabase
  .from('usage_events')
  .select('created_at')
  .eq('user_id', userId)
  .eq('event_type', 'clip_sent')
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

const lastClip = lastClipEvent?.data?.created_at;
```

---

## 📋 FILES REQUIRING CHANGES (COMPLETE LIST)

### Critical (Must Change)
1. `packages/core-shared/src/services/subscription.service.ts` - **18 changes**
2. `packages/core-shared/src/types/subscription.types.ts` - **3 changes**
3. `supabase/functions/get-subscription/index.ts` - **12 changes**
4. `supabase/functions/webhook-stripe/index.ts` - **6 changes**
5. `supabase/functions/_shared/constants.ts` - **3 changes**
6. `database/migrations/007_create_get_or_create_usage_record.sql` - **Rewrite function**

### High Priority (Should Change)
7. `packages/core-shared/src/services/quota.service.ts` - **8 changes**
8. `packages/ui/src/hooks/core/useAppState.ts` - **5 changes**
9. `supabase/functions/create-user/index.ts` - **3 changes**

### Medium Priority (Minor Changes)
10. `apps/notion-clipper-app/src/react/src/App.tsx` - **2 changes**
11. `packages/ui/src/components/layout/Header.tsx` - **0 changes** (already uses enum)
12. `packages/ui/src/utils/sendWithOfflineSupport.ts` - **0 changes** (already uppercase)

### Low Priority (No Breaking Changes)
13-23. All other files - No schema-related changes needed

---

## ✅ NEXT STEPS (Phase 4)

1. **Create detailed migration implementation plan**
   - Step-by-step migration script
   - Rollback procedures
   - Data validation queries

2. **Create code update checklist**
   - List every file and line number
   - Priority order for updates
   - Testing plan for each change

3. **Plan deployment strategy**
   - Zero-downtime migration approach
   - Backward compatibility during transition
   - Feature flags if needed

---

**Status**: Phase 3 COMPLETED ✅
**Total Integration Points Identified**: 127 locations across 23 files
**Critical Changes Required**: 6 files (18+ changes each)
**Next Phase**: Phase 4 - Migration Strategy Planning
**Risk Level**: CRITICAL (extensive changes required)
