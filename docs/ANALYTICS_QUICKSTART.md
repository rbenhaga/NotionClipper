# Analytics Quickstart Guide

> Get NotionClipper analytics up and running in 15 minutes

---

## Prerequisites

- ✅ Supabase account
- ✅ Node.js 20+
- ✅ pnpm installed

---

## Step 1: Database Setup (5 min)

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your **Project URL** and **anon key**

### 1.2 Run Migrations

```bash
# Navigate to project root
cd NotionClipper

# Apply analytics migrations
supabase db push
```

This creates:
- 7 analytics tables
- Materialized views
- Helper functions
- RLS policies

### 1.3 Set Up Hourly Refresh (Optional)

In Supabase SQL Editor:

```sql
SELECT cron.schedule(
  'refresh-analytics-views',
  '0 * * * *',
  $$SELECT refresh_analytics_views()$$
);
```

---

## Step 2: Install Dependencies (2 min)

```bash
# Install analytics dependencies
cd packages/core-shared
pnpm install

cd ../../packages/adapters/supabase
pnpm install

cd ../../apps/analytics-dashboard
pnpm install
```

---

## Step 3: Configure Dashboard (3 min)

### 3.1 Create Environment File

```bash
cd apps/analytics-dashboard
cp .env.local.example .env.local
```

### 3.2 Add Supabase Credentials

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Get from Supabase Settings → API
```

---

## Step 4: Launch Dashboard (1 min)

```bash
cd apps/analytics-dashboard
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001)

You should see:
- Quick stats cards (all zeros initially)
- Empty charts (no data yet)

---

## Step 5: Test Analytics (4 min)

### 5.1 Send Test Event

Open Node.js REPL or create `test-analytics.ts`:

```typescript
import { AnalyticsService } from '@notion-clipper/core-shared';
import { AnalyticsSupabaseAdapter } from '@notion-clipper/adapters-supabase';

const adapter = new AnalyticsSupabaseAdapter();
const analytics = new AnalyticsService(adapter);

await analytics.initialize({
  supabaseUrl: 'https://xxxxx.supabase.co',
  supabaseKey: 'your-anon-key',
  platform: 'electron-macos',
  app_version: '1.0.0',
  batch_size: 1, // Immediate flush for testing
  batch_interval_ms: 1000,
  offline_queue_max_size: 100,
  anonymize_ip: true,
  respect_do_not_track: false
});

// Identify user
await analytics.identify('test-user-123', { plan: 'free' });

// Send test events
await analytics.trackAppOpened();
await analytics.trackClipSent({
  content_type: 'html',
  file_count: 1,
  word_count: 250,
  source: 'clipboard'
});

await analytics.flush();

console.log('✅ Test events sent!');
```

Run:
```bash
ts-node test-analytics.ts
```

### 5.2 Verify in Supabase

1. Go to Supabase → Table Editor
2. Open `analytics_events` table
3. You should see 2 events: `app_opened` and `clip_sent`

### 5.3 Refresh Dashboard

```bash
# In Supabase SQL Editor, manually refresh views
SELECT refresh_analytics_views();
```

Reload dashboard at `http://localhost:3001` → You should see:
- DAU: 1
- Clips Today: 1

---

## Step 6: Integrate into App (Pending)

Next steps (to be implemented):

### Electron App

1. Initialize analytics service in `main.ts`
2. Track `app_opened` on launch
3. Track `clip_sent` on successful Notion send
4. Track `app_closed` on quit

### Browser Extension

1. Initialize in `background.ts`
2. Track events via message passing
3. Use `chrome.storage.local` for offline queue

---

## Verification Checklist

- [ ] Supabase migrations applied successfully
- [ ] Dashboard loads at `http://localhost:3001`
- [ ] Test events visible in `analytics_events` table
- [ ] Dashboard shows non-zero stats after refresh
- [ ] No console errors in dashboard

---

## Troubleshooting

### Dashboard shows all zeros

**Cause**: No data or views not refreshed

**Fix**:
```sql
-- In Supabase SQL Editor
SELECT refresh_analytics_views();
```

### "Missing Supabase environment variables"

**Cause**: `.env.local` not configured

**Fix**:
```bash
cd apps/analytics-dashboard
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

### RPC function "refresh_analytics_views" does not exist

**Cause**: Migrations not applied

**Fix**:
```bash
supabase db push
```

### Events not appearing in database

**Cause**: Batching or offline queue

**Fix**:
```typescript
// Force immediate flush for testing
await analytics.flush();
```

---

## Next Steps

1. **Integrate into Electron App** (see `/docs/ANALYTICS.md`)
2. **Set Up RGPD Consent UI** (privacy settings)
3. **Deploy Dashboard to Vercel**
4. **Configure Stripe** (when ready for premium)

---

## Quick Reference

### Environment Variables

```env
# Dashboard
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App (Electron/Extension)
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

### Useful SQL Queries

```sql
-- Count total events
SELECT COUNT(*) FROM analytics_events;

-- Show recent events
SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 10;

-- Check dashboard stats
SELECT * FROM dashboard_quick_stats;

-- Refresh all views
SELECT refresh_analytics_views();

-- Delete all test data
DELETE FROM analytics_events WHERE user_id = 'test-user-123';
```

### Analytics API

```typescript
// App lifecycle
await analytics.trackAppOpened();
await analytics.trackAppClosed();

// Clips
await analytics.trackClipSent({ content_type: 'html', word_count: 200 });
await analytics.trackClipFailed({ error: 'Network timeout' });

// Notion
await analytics.trackNotionPageSelected(pageId);
await analytics.trackNotionWorkspaceConnected(workspaceId);

// Subscription
await analytics.trackPaywallShown({ limit_type: 'monthly_clips' });
await analytics.trackUpgradeClicked('settings_page');

// User management
await analytics.identify(userId);
await analytics.reset(); // Logout
```

---

**Ready to track! 🚀**

For detailed documentation, see `/docs/ANALYTICS.md`
