-- ⚠️ ATTENTION : Ce script supprime TOUS les utilisateurs et leurs données
-- Exécutez dans le SQL Editor : https://supabase.com/dashboard/project/rijjtngbgahxdjflfyhi/sql/new

-- 1. Supprimer toutes les subscriptions
TRUNCATE public.subscriptions CASCADE;

-- 2. Supprimer tous les profils utilisateurs
TRUNCATE public.user_profiles CASCADE;

-- 3. Supprimer tous les utilisateurs auth
-- Note: Cette requête nécessite les privilèges service_role
DELETE FROM auth.users;

-- 4. Vérifier que tout est vide
SELECT 'Subscriptions restantes:' as info, COUNT(*) as count FROM public.subscriptions
UNION ALL
SELECT 'Profils restants:', COUNT(*) FROM public.user_profiles
UNION ALL
SELECT 'Utilisateurs restants:', COUNT(*) FROM auth.users;
