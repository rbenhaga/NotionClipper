-- Supprimer les utilisateurs de test
-- Exécutez ce script dans le SQL Editor de Supabase Dashboard
-- https://supabase.com/dashboard/project/rijjtngbgahxdjflfyhi/sql/new

-- 1. Supprimer les données liées dans les tables publiques
DELETE FROM public.subscriptions WHERE user_id IN (
  'e379bebc-b3cc-4d4f-b24a-1d7604535c95',
  '0f80e098-364b-4677-a04b-ef95b03630fb',
  'd7e6bd63-4d0f-474a-acc7-d22770d64f0e'
);

DELETE FROM public.user_profiles WHERE id IN (
  'e379bebc-b3cc-4d4f-b24a-1d7604535c95',
  '0f80e098-364b-4677-a04b-ef95b03630fb',
  'd7e6bd63-4d0f-474a-acc7-d22770d64f0e'
);

-- 2. Supprimer les utilisateurs auth
-- Note: Utilisez la fonction admin pour supprimer les utilisateurs
-- Vous devez avoir les privilèges service_role

-- Pour l'utilisateur Notion
SELECT auth.uid() as current_user;

-- Supprimer via le dashboard ou via cette requête si vous avez les droits :
-- DELETE FROM auth.users WHERE id = 'e379bebc-b3cc-4d4f-b24a-1d7604535c95';
-- DELETE FROM auth.users WHERE id = '0f80e098-364b-4677-a04b-ef95b03630fb';
-- DELETE FROM auth.users WHERE id = 'd7e6bd63-4d0f-474a-acc7-d22770d64f0e';

-- Alternative : Supprimer TOUS les utilisateurs (⚠️ ATTENTION)
-- DELETE FROM public.subscriptions;
-- DELETE FROM public.user_profiles;
-- DELETE FROM auth.users;

-- Vérifier qu'il ne reste plus d'utilisateurs
SELECT id, email, created_at FROM auth.users;
