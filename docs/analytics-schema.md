# NotionClipper Analytics Database Schema

> **Design Philosophy**: Apple-level attention to detail, Notion-level simplicity
>
> **Privacy**: RGPD compliant, no content tracking, IP anonymization
> **Performance**: Indexed time-series, daily aggregations, partition-ready
> **Business**: Optimized for freemium limits analysis & acquisition metrics

---

## Core Principles

1. **No Content Tracking**: Never store clip content, only metadata
2. **Anonymized Data**: IP addresses hashed, optional user anonymization
3. **Time-Series Optimized**: Efficient queries for trends and cohorts
4. **Aggregation-First**: Pre-compute daily metrics for dashboard speed
5. **Audit Trail**: All events immutable with retention policy

---

## Table Architecture

### 1. `analytics_events` - Raw Event Stream
**Purpose**: Immutable event log (time-series data)
**Retention**: 90 days (RGPD compliant)
**Volume**: ~1M events/month at 10k MAU

```sql
CREATE TABLE analytics_events (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User Context
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID NOT NULL,
  anonymous_id VARCHAR(64), -- For non-authenticated users

  -- Event Data
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL, -- 'app', 'clip', 'notion', 'workspace', 'subscription'

  -- Platform Context
  platform VARCHAR(20) NOT NULL, -- 'electron-windows', 'electron-macos', 'electron-linux', 'chrome-extension', 'firefox-extension'
  app_version VARCHAR(20) NOT NULL,
  os_version VARCHAR(50),

  -- Geographic (anonymized)
  country_code CHAR(2), -- ISO 3166-1 alpha-2
  timezone VARCHAR(50),

  -- Event Properties (JSONB for flexibility)
  properties JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  ip_hash VARCHAR(64), -- SHA-256 hashed IP (not reversible)
  user_agent_hash VARCHAR(64) -- Hashed for privacy
);

-- Indexes for performance
CREATE INDEX idx_events_user_created ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_events_name_created ON analytics_events(event_name, created_at DESC);
CREATE INDEX idx_events_platform ON analytics_events(platform, created_at DESC);
CREATE INDEX idx_events_category ON analytics_events(event_category, created_at DESC);
CREATE INDEX idx_events_created ON analytics_events(created_at DESC);

-- GIN index for JSONB queries
CREATE INDEX idx_events_properties ON analytics_events USING GIN(properties);

-- Partition by month (future optimization for scaling)
-- ALTER TABLE analytics_events PARTITION BY RANGE (created_at);
```

### 2. `user_metrics_daily` - Daily User Aggregations
**Purpose**: Pre-aggregated daily metrics per user (fast dashboard queries)
**Update**: Calculated daily via cron job

```sql
CREATE TABLE user_metrics_daily (
  -- Composite Primary Key
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Activity Metrics
  sessions_count INT DEFAULT 0,
  total_events INT DEFAULT 0,
  active_duration_seconds INT DEFAULT 0, -- Total time app was active

  -- Clip Metrics (KEY FOR FREEMIUM LIMITS)
  clips_sent INT DEFAULT 0,
  files_attached INT DEFAULT 0,
  images_attached INT DEFAULT 0,

  -- Content Type Distribution
  text_clips INT DEFAULT 0,
  code_clips INT DEFAULT 0,
  html_clips INT DEFAULT 0,
  url_clips INT DEFAULT 0,

  -- Notion Activity
  pages_used INT DEFAULT 0, -- Distinct pages used
  workspaces_used INT DEFAULT 0, -- Distinct workspaces

  -- Platform Used
  platforms_used VARCHAR(50)[], -- ['electron-macos', 'chrome-extension']

  -- Engagement Score (calculated)
  engagement_score DECIMAL(5,2) DEFAULT 0, -- 0-100 composite score

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, date)
);

-- Indexes
CREATE INDEX idx_user_metrics_date ON user_metrics_daily(date DESC);
CREATE INDEX idx_user_metrics_clips ON user_metrics_daily(clips_sent DESC);
CREATE INDEX idx_user_metrics_engagement ON user_metrics_daily(engagement_score DESC);
```

### 3. `platform_metrics_daily` - Platform Distribution
**Purpose**: Aggregate metrics by platform (Windows vs Mac vs Extension)

```sql
CREATE TABLE platform_metrics_daily (
  -- Composite Primary Key
  platform VARCHAR(20) NOT NULL,
  date DATE NOT NULL,

  -- User Metrics
  active_users INT DEFAULT 0,
  new_users INT DEFAULT 0,

  -- Activity Metrics
  total_sessions INT DEFAULT 0,
  total_clips INT DEFAULT 0,
  total_events INT DEFAULT 0,

  -- Avg per User
  avg_clips_per_user DECIMAL(10,2) DEFAULT 0,
  avg_session_duration DECIMAL(10,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (platform, date)
);

CREATE INDEX idx_platform_metrics_date ON platform_metrics_daily(date DESC);
```

### 4. `retention_cohorts` - Cohort Analysis
**Purpose**: Track user retention by signup cohort (critical for acquisition pitch)

```sql
CREATE TABLE retention_cohorts (
  -- Cohort Definition
  cohort_month DATE NOT NULL, -- First day of signup month
  platform VARCHAR(20) NOT NULL,

  -- Cohort Size
  users_count INT NOT NULL,

  -- Retention Rates (%)
  day_1_retention DECIMAL(5,2),
  day_7_retention DECIMAL(5,2),
  day_30_retention DECIMAL(5,2),
  day_90_retention DECIMAL(5,2),

  -- Activity Retention (users who sent at least 1 clip)
  day_1_active_retention DECIMAL(5,2),
  day_7_active_retention DECIMAL(5,2),
  day_30_active_retention DECIMAL(5,2),

  -- Conversion Metrics (for when premium exists)
  conversion_rate DECIMAL(5,2),
  avg_days_to_conversion DECIMAL(10,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (cohort_month, platform)
);

CREATE INDEX idx_retention_cohort_month ON retention_cohorts(cohort_month DESC);
```

### 5. `feature_usage` - Feature Adoption Tracking
**Purpose**: Understand which features are used (inform roadmap & freemium limits)

```sql
CREATE TABLE feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  feature_name VARCHAR(100) NOT NULL,

  -- Usage Metrics
  total_users INT DEFAULT 0, -- Users who used this feature
  total_usage_count INT DEFAULT 0, -- Total times used

  -- User Segments
  free_users INT DEFAULT 0,
  premium_users INT DEFAULT 0,

  -- Platform Distribution
  platform_distribution JSONB DEFAULT '{}'::jsonb, -- {"electron": 100, "extension": 50}

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date, feature_name)
);

CREATE INDEX idx_feature_usage_date ON feature_usage(date DESC);
CREATE INDEX idx_feature_usage_feature ON feature_usage(feature_name);
```

### 6. `user_subscription_status` - Subscription Tracking (Future Stripe Integration)
**Purpose**: Track subscription lifecycle (ready for $2.99/month plan)

```sql
CREATE TABLE user_subscription_status (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Subscription State
  plan_type VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free', 'premium'
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'trialing'

  -- Stripe Integration (future)
  stripe_customer_id VARCHAR(100) UNIQUE,
  stripe_subscription_id VARCHAR(100) UNIQUE,

  -- Billing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Usage Limits (for freemium enforcement)
  monthly_clips_limit INT DEFAULT 50, -- Example: 50 clips/month free
  monthly_clips_used INT DEFAULT 0,
  limit_reset_at TIMESTAMPTZ,

  -- Metadata
  upgraded_at TIMESTAMPTZ, -- When user went premium
  downgraded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_plan ON user_subscription_status(plan_type);
CREATE INDEX idx_subscription_status ON user_subscription_status(status);
```

### 7. `analytics_settings` - User Privacy Preferences
**Purpose**: RGPD consent & privacy preferences

```sql
CREATE TABLE analytics_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Consent
  analytics_enabled BOOLEAN DEFAULT TRUE,
  consent_given_at TIMESTAMPTZ,
  consent_version VARCHAR(10) DEFAULT '1.0',

  -- Privacy Options
  share_platform_info BOOLEAN DEFAULT TRUE,
  share_location_info BOOLEAN DEFAULT TRUE, -- Country only

  -- Data Retention
  data_retention_days INT DEFAULT 90,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Event Taxonomy

### Event Categories & Names

#### `app` - Application Lifecycle
- `app_opened` - App launched
- `app_closed` - App quit
- `app_updated` - New version installed
- `app_error` - Critical error occurred

**Properties Example**:
```json
{
  "startup_time_ms": 1200,
  "previous_version": "1.2.0"
}
```

#### `clip` - Clipping Actions (CORE FREEMIUM METRIC)
- `clip_created` - Content clipped
- `clip_sent` - Sent to Notion successfully
- `clip_failed` - Failed to send
- `clip_queued` - Added to offline queue

**Properties Example**:
```json
{
  "content_type": "html",
  "file_count": 2,
  "image_count": 1,
  "word_count": 350,
  "has_code_block": true,
  "source": "focus_mode" // or "clipboard", "selection", "drag_drop"
}
```

#### `notion` - Notion Integration
- `notion_page_selected` - User selected target page
- `notion_workspace_connected` - OAuth workspace added
- `notion_sync_completed` - Pages/databases synced

**Properties Example**:
```json
{
  "workspace_count": 2,
  "page_count": 15,
  "database_count": 3
}
```

#### `workspace` - Multi-workspace
- `workspace_switched` - Changed active workspace
- `workspace_added` - New workspace connected
- `workspace_removed` - Workspace disconnected

#### `subscription` - Monetization (Future)
- `paywall_shown` - User hit freemium limit
- `upgrade_clicked` - Clicked upgrade CTA
- `checkout_started` - Initiated Stripe checkout
- `subscription_created` - Successfully subscribed
- `subscription_cancelled` - Cancelled subscription

**Properties Example**:
```json
{
  "limit_type": "monthly_clips",
  "current_usage": 50,
  "limit": 50,
  "cta_location": "clip_dialog"
}
```

---

## Key Metrics for Dashboard

### 🎯 Acquisition Pitch Metrics
1. **Monthly Active Users (MAU)**: Unique users who sent ≥1 clip
2. **Daily Active Users (DAU)**: Daily active users
3. **DAU/MAU Ratio**: Stickiness metric (target: >20%)
4. **Clips per User**: Median & P90 (show usage depth)
5. **Retention**: D1, D7, D30 cohorts
6. **Platform Distribution**: Desktop vs Extension split
7. **Geographic Reach**: Countries with users

### 💰 Freemium Optimization Metrics
1. **Usage Distribution Histogram**: How many users send X clips/month?
2. **Power Users**: % of users sending >50 clips/month
3. **Feature Adoption**: Which features drive retention?
4. **Upgrade Intent**: % hitting free limits
5. **Conversion Rate**: Free → Premium (when Stripe live)

### 📊 Product Health Metrics
1. **Session Duration**: Average time per session
2. **Error Rate**: % of failed clips
3. **Offline Queue Usage**: % using offline mode
4. **Time to First Clip**: Onboarding efficiency

---

## Data Retention & RGPD

### Retention Policy
- **Raw Events**: 90 days (then deleted)
- **Daily Aggregations**: 2 years
- **Cohort Data**: Indefinite (anonymized)

### User Rights (RGPD)
- **Right to Access**: Export all user events as JSON
- **Right to Deletion**: Hard delete all user data
- **Right to Opt-out**: Disable tracking via settings

### Implementation
```sql
-- Delete old events (run daily)
DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';

-- Export user data (RGPD request)
SELECT * FROM analytics_events WHERE user_id = $1;

-- Delete user data (RGPD request)
DELETE FROM analytics_events WHERE user_id = $1;
DELETE FROM user_metrics_daily WHERE user_id = $1;
```

---

## Performance Optimization

### Indexing Strategy
- **Time-series queries**: B-tree indexes on `created_at`
- **User queries**: Composite indexes on `(user_id, created_at)`
- **JSONB queries**: GIN indexes on `properties`

### Materialized Views (Dashboard Speed)
```sql
-- Real-time dashboard overview
CREATE MATERIALIZED VIEW analytics_overview AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(DISTINCT user_id) as dau,
  COUNT(*) FILTER (WHERE event_name = 'clip_sent') as total_clips,
  COUNT(DISTINCT platform) as platforms_used
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date;

-- Refresh hourly
REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_overview;
```

### Partitioning (Future Scaling)
When events > 10M, partition by month:
```sql
CREATE TABLE analytics_events_2025_01 PARTITION OF analytics_events
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

## Database Setup Checklist

- [ ] Create tables in Supabase
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create indexes
- [ ] Set up automated aggregation cron jobs
- [ ] Configure data retention policy
- [ ] Test queries performance
- [ ] Create backup strategy

---

**Next Steps**:
1. Create Supabase migration files
2. Build analytics service in TypeScript
3. Design dashboard UI/UX
