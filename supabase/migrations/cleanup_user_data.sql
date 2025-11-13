-- ⚠️ ATTENTION : Ce script supprime TOUS les utilisateurs et leurs données
-- Utilisez-le uniquement en développement pour nettoyer la base
-- Exécutez dans le SQL Editor : https://supabase.com/dashboard/project/rijjtngbgahxdjflfyhi/sql/new

-- 🧹 NETTOYAGE COMPLET DE LA BASE DE DONNÉES

-- 1. Supprimer toutes les subscriptions (si la table existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    TRUNCATE public.subscriptions CASCADE;
    RAISE NOTICE 'Subscriptions supprimées';
  END IF;
END $$;

-- 2. Supprimer tous les enregistrements d'usage (si la table existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_records') THEN
    TRUNCATE public.usage_records CASCADE;
    RAISE NOTICE 'Usage records supprimés';
  END IF;
END $$;

-- 3. Supprimer toutes les connexions Notion (IMPORTANT - contient les tokens chiffrés)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notion_connections') THEN
    TRUNCATE public.notion_connections CASCADE;
    RAISE NOTICE 'Connexions Notion supprimées';
  END IF;
END $$;

-- 4. Supprimer tous les profils utilisateurs (si la table existe)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    TRUNCATE public.user_profiles CASCADE;
    RAISE NOTICE 'Profils utilisateurs supprimés';
  END IF;
END $$;

-- 5. Supprimer tous les utilisateurs auth
-- Note: Cette requête nécessite les privilèges service_role
DELETE FROM auth.users;

-- 6. Vérifier que tout est vide
DO $$
DECLARE
  subscriptions_count INTEGER := 0;
  usage_records_count INTEGER := 0;
  notion_connections_count INTEGER := 0;
  user_profiles_count INTEGER := 0;
  auth_users_count INTEGER := 0;
BEGIN
  -- Compter seulement si les tables existent
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    SELECT COUNT(*) INTO subscriptions_count FROM public.subscriptions;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_records') THEN
    SELECT COUNT(*) INTO usage_records_count FROM public.usage_records;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notion_connections') THEN
    SELECT COUNT(*) INTO notion_connections_count FROM public.notion_connections;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    SELECT COUNT(*) INTO user_profiles_count FROM public.user_profiles;
  END IF;
  
  SELECT COUNT(*) INTO auth_users_count FROM auth.users;
  
  -- Afficher les résultats
  RAISE NOTICE '=== RÉSULTATS DU NETTOYAGE ===';
  RAISE NOTICE 'Subscriptions restantes: %', subscriptions_count;
  RAISE NOTICE 'Usage records restants: %', usage_records_count;
  RAISE NOTICE 'Connexions Notion restantes: %', notion_connections_count;
  RAISE NOTICE 'Profils restants: %', user_profiles_count;
  RAISE NOTICE 'Utilisateurs auth restants: %', auth_users_count;
  
  IF subscriptions_count = 0 AND usage_records_count = 0 AND notion_connections_count = 0 AND user_profiles_count = 0 AND auth_users_count = 0 THEN
    RAISE NOTICE '✅ Base de données nettoyée avec succès !';
  ELSE
    RAISE WARNING '⚠️ Certaines données n''ont pas été supprimées';
  END IF;
END $$;

-- ✅ Si tous les counts sont à 0, la base est propre !
-- 🎯 Vous pouvez maintenant tester le flow d'authentification avec des tokens fraîchement chiffrés
