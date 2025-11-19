-- Migration: Rotate Encryption Key
-- Date: 2025-11-20
-- Description: Migration pour rechiffrer tous les tokens Notion avec une nouvelle clé
-- 
-- ⚠️ CRITIQUE: Cette migration nécessite un downtime de 15-30 minutes
-- ⚠️ BACKUP: Faire un backup complet de la DB avant d'exécuter cette migration
--
-- Procédure:
-- 1. Backup: supabase db dump -f backup_pre_rotation_$(date +%Y%m%d).sql
-- 2. Générer nouvelle clé: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
-- 3. Mettre à jour Vault: supabase secrets set TOKEN_ENCRYPTION_KEY="<nouvelle_clé>"
-- 4. Exécuter cette migration: supabase db push
-- 5. Vérifier: SELECT COUNT(*) FROM notion_connections WHERE is_active = true;
--
-- Rollback Plan:
-- Si problème, restaurer l'ancienne clé et le backup:
--   supabase secrets set TOKEN_ENCRYPTION_KEY="<ancienne_clé>"
--   psql < backup_pre_rotation_YYYYMMDD.sql

-- Cette migration est un placeholder car le rechiffrement doit se faire via Edge Function
-- pour avoir accès aux clés de chiffrement (ancienne et nouvelle)

-- Créer une table temporaire pour tracker la migration
CREATE TABLE IF NOT EXISTS encryption_key_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_key_hash TEXT NOT NULL, -- Hash SHA256 de l'ancienne clé (pour vérification)
  new_key_hash TEXT NOT NULL, -- Hash SHA256 de la nouvelle clé
  tokens_migrated INTEGER NOT NULL DEFAULT 0,
  tokens_failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed', 'rolled_back')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Ajouter un commentaire sur la table notion_connections
COMMENT ON TABLE notion_connections IS 'Stores encrypted Notion OAuth tokens. Tokens are encrypted with AES-256-GCM using TOKEN_ENCRYPTION_KEY from Supabase Vault.';

-- Ajouter un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_notion_connections_user_active 
ON notion_connections(user_id, is_active) 
WHERE is_active = true;

-- Log de la migration
INSERT INTO encryption_key_rotation_log (
  old_key_hash,
  new_key_hash,
  status
) VALUES (
  'placeholder_old_key_hash',
  'placeholder_new_key_hash',
  'in_progress'
);

-- Note: Le rechiffrement réel des tokens doit être fait via une Edge Function
-- qui a accès aux deux clés (ancienne et nouvelle) via Supabase Vault.
-- 
-- Créer l'Edge Function: supabase/functions/rotate-encryption-key/index.ts
-- Puis l'appeler: curl -X POST <supabase_url>/functions/v1/rotate-encryption-key
