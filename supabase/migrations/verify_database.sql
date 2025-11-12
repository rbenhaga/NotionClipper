-- Script de vérification de la base de données
-- Exécute ce script dans Supabase SQL Editor pour vérifier que tout est OK

-- ============================================
-- 1. Vérifier les tables
-- ============================================
SELECT 
  'Tables' as check_type,
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'notion_connections', 'subscriptions')
ORDER BY table_name;

-- ============================================
-- 2. Vérifier les colonnes de user_profiles
-- ============================================
SELECT 
  'user_profiles columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ============================================
-- 3. Vérifier les colonnes de notion_connections
-- ============================================
SELECT 
  'notion_connections columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notion_connections'
ORDER BY ordinal_position;

-- ============================================
-- 4. Vérifier les colonnes de subscriptions
-- ============================================
SELECT 
  'subscriptions columns' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscriptions'
ORDER BY ordinal_position;

-- ============================================
-- 5. Vérifier les index
-- ============================================
SELECT 
  'Indexes' as check_type,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'notion_connections', 'subscriptions', 'usage_tracking')
ORDER BY tablename, indexname;

-- ============================================
-- 6. Vérifier les politiques RLS
-- ============================================
SELECT 
  'RLS Policies' as check_type,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'notion_connections', 'subscriptions', 'usage_tracking')
ORDER BY tablename, policyname;

-- ============================================
-- 7. Vérifier les fonctions
-- ============================================
SELECT 
  'Functions' as check_type,
  routine_name as function_name,
  routine_type as type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'update_updated_at')
ORDER BY routine_name;

-- ============================================
-- 8. Vérifier les triggers
-- ============================================
SELECT 
  'Triggers' as check_type,
  trigger_name,
  event_object_table as table_name,
  action_timing as timing,
  event_manipulation as event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('user_profiles', 'notion_connections', 'subscriptions')
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 9. Vérifier que RLS est activé
-- ============================================
SELECT 
  'RLS Status' as check_type,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'ENABLED'
    ELSE 'DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'notion_connections', 'subscriptions', 'usage_tracking')
ORDER BY tablename;

-- ============================================
-- 10. Compter les enregistrements (devrait être 0 pour l'instant)
-- ============================================
SELECT 'Record Counts' as check_type, 'user_profiles' as table_name, COUNT(*) as count FROM user_profiles
UNION ALL
SELECT 'Record Counts', 'notion_connections', COUNT(*) FROM notion_connections
UNION ALL
SELECT 'Record Counts', 'subscriptions', COUNT(*) FROM subscriptions;
