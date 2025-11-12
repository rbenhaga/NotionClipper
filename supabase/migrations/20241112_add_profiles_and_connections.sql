-- Migration: Système d'authentification complet
-- Création des tables user_profiles et notion_connections

-- ============================================
-- Table: user_profiles
-- Stocke les informations du profil utilisateur
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  auth_provider text NOT NULL, -- 'google', 'apple', 'email'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour recherche rapide par email
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON user_profiles(email);

-- RLS pour user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- Table: notion_connections
-- Stocke les connexions Notion (workspaces) liées aux utilisateurs
-- ============================================
CREATE TABLE IF NOT EXISTS notion_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id text NOT NULL,
  workspace_name text,
  workspace_icon text,
  access_token_encrypted text NOT NULL, -- Token Notion chiffré
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(user_id, workspace_id)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS notion_connections_user_id_idx ON notion_connections(user_id);
CREATE INDEX IF NOT EXISTS notion_connections_workspace_id_idx ON notion_connections(workspace_id);

-- RLS pour notion_connections
ALTER TABLE notion_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
  ON notion_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON notion_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON notion_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON notion_connections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Fonction: Créer automatiquement le profil après inscription
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, avatar_url, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'provider', 'email')
  );

  -- Créer aussi la subscription FREE par défaut
  INSERT INTO subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer le profil automatiquement
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Fonction: Mettre à jour updated_at automatiquement
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notion_connections_updated_at
  BEFORE UPDATE ON notion_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
