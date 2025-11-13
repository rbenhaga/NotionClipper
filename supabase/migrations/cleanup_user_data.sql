-- ⚠️ ATTENTION : Ce script supprime TOUS les utilisateurs et leurs données
-- Utilisez-le uniquement en développement pour nettoyer la base
-- Exécutez dans le SQL Editor : https://supabase.com/dashboard/project/rijjtngbgahxdjflfyhi/sql/new

-- 🧹 NETTOYAGE COMPLET DE LA BASE DE DONNÉES

-- 1. Supprimer toutes les subscriptions
TRUNCATE public.subscriptions CASCADE;

-- 2. Supprimer tous les enregistrements d'usage
TRUNCATE public.usage_records CASCADE;

-- 3. Supprimer tous les tokens utilisateur
TRUNCATE public.user_tokens CASCADE;

-- 4. Supprimer toutes les connexions Notion
TRUNCATE public.notion_connections CASCADE;

-- 5. Supprimer tous les profils utilisateurs
TRUNCATE public.user_profiles CASCADE;

-- 6. Supprimer tous les utilisateurs auth
-- Note: Cette requête nécessite les privilèges service_role
DELETE FROM auth.users;

-- 7. Réinitialiser les séquences (optionnel)
-- ALTER SEQUENCE IF EXISTS subscriptions_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS usage_records_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS user_tokens_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS notion_connections_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS user_profiles_id_seq RESTART WITH 1;

-- 8. Vérifier que tout est vide
SELECT 'Subscriptions restantes:' as info, COUNT(*) as count FROM public.subscriptions
UNION ALL
SELECT 'Usage records restants:', COUNT(*) FROM public.usage_records
UNION ALL
SELECT 'User tokens restants:', COUNT(*) FROM public.user_tokens
UNION ALL
SELECT 'Connexions Notion restantes:', COUNT(*) FROM public.notion_connections
UNION ALL
SELECT 'Profils restants:', COUNT(*) FROM public.user_profiles
UNION ALL
SELECT 'Utilisateurs auth restants:', COUNT(*) FROM auth.users;

-- ✅ Si tous les counts sont à 0, la base est propre !
-- 🎯 Vous pouvez maintenant tester le flow d'authentification avec des tokens fraîchement chiffrés
