-- ============================================================================
-- Migration 001: Create Subscriptions & Usage Tracking Tables
-- ============================================================================
-- Description: Création du système de subscriptions freemium/premium
-- Date: 2025-11-09
-- Author: NotionClipper Team
--
-- Design Philosophy (Apple/Notion):
-- - Performance optimale avec indexes appropriés
-- - Intégrité des données avec contraintes
-- - Audibilité complète (created_at, updated_at)
-- - Sécurité RLS (Row Level Security)
-- ============================================================================

-- ============================================================================
-- Table: subscriptions
-- Description: Gestion des abonnements utilisateurs (Free/Premium/Grace)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    -- Identifiants
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Plan & Status
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'grace_period')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',
        'trialing',
        'past_due',
        'canceled',
        'unpaid',
        'grace_period',
        'incomplete',
        'incomplete_expired'
    )),

    -- Stripe Integration
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,

    -- Période d'abonnement
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),

    -- Annulation
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,

    -- Période de grâce (migration utilisateurs existants)
    grace_period_ends_at TIMESTAMPTZ,
    is_grace_period BOOLEAN NOT NULL DEFAULT false,

    -- Métadonnées (JSONB pour flexibilité)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT one_subscription_per_user UNIQUE (user_id)
);

-- Indexes pour performance
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_subscriptions_grace_period ON subscriptions(is_grace_period) WHERE is_grace_period = true;

-- ============================================================================
-- Table: usage_records
-- Description: Tracking mensuel de l'usage par utilisateur
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_records (
    -- Identifiants
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

    -- Période (mois calendaire)
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

    -- Compteurs d'usage
    clips_count INTEGER NOT NULL DEFAULT 0 CHECK (clips_count >= 0),
    files_count INTEGER NOT NULL DEFAULT 0 CHECK (files_count >= 0),
    focus_mode_minutes INTEGER NOT NULL DEFAULT 0 CHECK (focus_mode_minutes >= 0),
    compact_mode_minutes INTEGER NOT NULL DEFAULT 0 CHECK (compact_mode_minutes >= 0),

    -- Dernières activités (pour analytics)
    last_clip_at TIMESTAMPTZ,
    last_file_upload_at TIMESTAMPTZ,
    last_focus_mode_at TIMESTAMPTZ,
    last_compact_mode_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Contraintes
    CONSTRAINT one_record_per_user_per_month UNIQUE (user_id, year, month)
);

-- Indexes pour performance
CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_subscription_id ON usage_records(subscription_id);
CREATE INDEX idx_usage_records_period ON usage_records(year, month);
CREATE INDEX idx_usage_records_current_month ON usage_records(period_start, period_end)
    WHERE period_end >= NOW();

-- ============================================================================
-- Table: usage_events
-- Description: Log détaillé des événements d'usage
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_events (
    -- Identifiants
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    usage_record_id UUID NOT NULL REFERENCES usage_records(id) ON DELETE CASCADE,

    -- Type d'événement
    event_type TEXT NOT NULL CHECK (event_type IN (
        'clip_sent',
        'file_uploaded',
        'focus_mode_started',
        'focus_mode_ended',
        'compact_mode_started',
        'compact_mode_ended',
        'quota_limit_reached',
        'upgrade_prompt_shown',
        'upgrade_clicked'
    )),

    feature TEXT NOT NULL CHECK (feature IN (
        'clips',
        'files',
        'words_per_clip',
        'focus_mode_time',
        'compact_mode_time',
        'multiple_selections'
    )),

    -- Métadonnées de l'événement
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes pour performance et analytics
CREATE INDEX idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX idx_usage_events_usage_record_id ON usage_events(usage_record_id);
CREATE INDEX idx_usage_events_event_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_feature ON usage_events(feature);
CREATE INDEX idx_usage_events_created_at ON usage_events(created_at DESC);

-- Index composé pour analytics
CREATE INDEX idx_usage_events_analytics ON usage_events(user_id, event_type, created_at DESC);

-- ============================================================================
-- Table: mode_sessions
-- Description: Sessions des modes Focus et Compact
-- ============================================================================

CREATE TABLE IF NOT EXISTS mode_sessions (
    -- Identifiants
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    usage_record_id UUID NOT NULL REFERENCES usage_records(id) ON DELETE CASCADE,

    -- Type de mode
    mode_type TEXT NOT NULL CHECK (mode_type IN ('focus', 'compact')),

    -- Session
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    was_interrupted BOOLEAN NOT NULL DEFAULT false,

    -- Métadonnées
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX idx_mode_sessions_user_id ON mode_sessions(user_id);
CREATE INDEX idx_mode_sessions_active ON mode_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_mode_sessions_usage_record ON mode_sessions(usage_record_id);
CREATE INDEX idx_mode_sessions_mode_type ON mode_sessions(mode_type);

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Fonction: Mise à jour automatique du timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_records_updated_at
    BEFORE UPDATE ON usage_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mode_sessions_updated_at
    BEFORE UPDATE ON mode_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Fonction: Créer ou récupérer l'usage record du mois en cours
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_current_usage_record(
    p_user_id UUID,
    p_subscription_id UUID
)
RETURNS usage_records AS $$
DECLARE
    v_record usage_records;
    v_current_year INTEGER;
    v_current_month INTEGER;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
BEGIN
    -- Calculer la période du mois en cours
    v_current_year := EXTRACT(YEAR FROM NOW());
    v_current_month := EXTRACT(MONTH FROM NOW());
    v_period_start := DATE_TRUNC('month', NOW());
    v_period_end := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month');

    -- Chercher ou créer le record
    INSERT INTO usage_records (
        user_id,
        subscription_id,
        period_start,
        period_end,
        year,
        month
    )
    VALUES (
        p_user_id,
        p_subscription_id,
        v_period_start,
        v_period_end,
        v_current_year,
        v_current_month
    )
    ON CONFLICT (user_id, year, month)
    DO UPDATE SET updated_at = NOW()
    RETURNING * INTO v_record;

    RETURN v_record;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Fonction: Incrémenter un compteur d'usage
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_usage_counter(
    p_user_id UUID,
    p_feature TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS usage_records AS $$
DECLARE
    v_subscription subscriptions;
    v_usage_record usage_records;
BEGIN
    -- Récupérer la subscription
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No subscription found for user %', p_user_id;
    END IF;

    -- Récupérer ou créer l'usage record du mois
    v_usage_record := get_or_create_current_usage_record(p_user_id, v_subscription.id);

    -- Incrémenter le bon compteur
    CASE p_feature
        WHEN 'clips' THEN
            UPDATE usage_records
            SET clips_count = clips_count + p_increment,
                last_clip_at = NOW()
            WHERE id = v_usage_record.id
            RETURNING * INTO v_usage_record;

        WHEN 'files' THEN
            UPDATE usage_records
            SET files_count = files_count + p_increment,
                last_file_upload_at = NOW()
            WHERE id = v_usage_record.id
            RETURNING * INTO v_usage_record;

        WHEN 'focus_mode_time' THEN
            UPDATE usage_records
            SET focus_mode_minutes = focus_mode_minutes + p_increment,
                last_focus_mode_at = NOW()
            WHERE id = v_usage_record.id
            RETURNING * INTO v_usage_record;

        WHEN 'compact_mode_time' THEN
            UPDATE usage_records
            SET compact_mode_minutes = compact_mode_minutes + p_increment,
                last_compact_mode_at = NOW()
            WHERE id = v_usage_record.id
            RETURNING * INTO v_usage_record;

        ELSE
            RAISE EXCEPTION 'Unknown feature: %', p_feature;
    END CASE;

    RETURN v_usage_record;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_sessions ENABLE ROW LEVEL SECURITY;

-- Policies pour subscriptions
CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
    ON subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies pour usage_records
CREATE POLICY "Users can view their own usage records"
    ON usage_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage records"
    ON usage_records FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies pour usage_events
CREATE POLICY "Users can view their own usage events"
    ON usage_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage events"
    ON usage_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies pour mode_sessions
CREATE POLICY "Users can view their own mode sessions"
    ON mode_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mode sessions"
    ON mode_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mode sessions"
    ON mode_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- Initial Data: Créer les subscriptions pour les utilisateurs existants
-- ============================================================================

-- Cette fonction sera appelée pour migrer les utilisateurs existants
CREATE OR REPLACE FUNCTION migrate_existing_users_to_grace_period()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_grace_period_end TIMESTAMPTZ;
BEGIN
    -- 30 jours de période de grâce
    v_grace_period_end := NOW() + INTERVAL '30 days';

    -- Créer des subscriptions pour tous les utilisateurs existants sans subscription
    INSERT INTO subscriptions (
        user_id,
        tier,
        status,
        is_grace_period,
        grace_period_ends_at,
        current_period_start,
        current_period_end
    )
    SELECT
        id as user_id,
        'grace_period' as tier,
        'grace_period' as status,
        true as is_grace_period,
        v_grace_period_end as grace_period_ends_at,
        NOW() as current_period_start,
        v_grace_period_end as current_period_end
    FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM subscriptions)
    ON CONFLICT (user_id) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments (Documentation)
-- ============================================================================

COMMENT ON TABLE subscriptions IS 'Gestion des abonnements utilisateurs (Free/Premium/Grace Period)';
COMMENT ON TABLE usage_records IS 'Tracking mensuel de l''usage par utilisateur';
COMMENT ON TABLE usage_events IS 'Log détaillé des événements d''usage pour analytics';
COMMENT ON TABLE mode_sessions IS 'Sessions des modes Focus et Compact avec tracking du temps';

COMMENT ON FUNCTION get_or_create_current_usage_record IS 'Récupère ou crée l''usage record du mois en cours';
COMMENT ON FUNCTION increment_usage_counter IS 'Incrémente un compteur d''usage de manière atomique';
COMMENT ON FUNCTION migrate_existing_users_to_grace_period IS 'Migre les utilisateurs existants vers une période de grâce de 30 jours';
