# Database Migrations

Ce dossier contient les migrations SQL pour la base de données Supabase de NotionClipper.

## Ordre d'application

Les migrations doivent être appliquées dans l'ordre suivant :

1. `001_create_user_profiles.sql` - Profils utilisateurs
2. `002_create_notion_connections.sql` - Connexions Notion
3. `003_create_subscriptions_and_usage.sql` - Système Premium/Freemium

## Comment appliquer une migration

### Via Supabase Dashboard (Recommandé)

1. Connectez-vous à votre [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet NotionClipper
3. Dans le menu de gauche, cliquez sur **SQL Editor**
4. Cliquez sur **New query** (ou **+ New Query**)
5. Copiez-collez le contenu complet du fichier de migration
6. Cliquez sur **Run** pour exécuter la migration
7. Vérifiez qu'il n'y a pas d'erreurs dans la console

### Via Supabase CLI

Si vous utilisez la CLI Supabase :

```bash
# Depuis la racine du projet
supabase db push
```

Ou pour appliquer une migration spécifique :

```bash
supabase db push database/migrations/003_create_subscriptions_and_usage.sql
```

## Migration 003 : Subscriptions et Usage

Cette migration crée le système premium/freemium complet :

### Tables créées

#### `subscriptions`
- Gère les abonnements utilisateurs (free, premium, grace_period)
- Stocke les IDs Stripe (customer, subscription, price)
- Gère les périodes de billing et les trials
- Supporte les grace periods pour les abonnements expirés

#### `usage_records`
- Enregistre l'usage mensuel par utilisateur
- Tracks : clips_count, files_count, focus_mode_minutes, compact_mode_minutes
- Contrainte unique : un record par utilisateur/période

### Fonctions créées

#### `increment_usage(p_user_id, p_action, p_amount)`
Incrémente l'usage pour une action donnée.

**Paramètres :**
- `p_user_id` : UUID de l'utilisateur
- `p_action` : Type d'action ('clip', 'file', 'focus_mode', 'compact_mode')
- `p_amount` : Quantité à incrémenter (défaut: 1)

**Exemple d'utilisation :**
```sql
SELECT increment_usage('user-uuid-here', 'clip', 1);
SELECT increment_usage('user-uuid-here', 'file', 3);
```

#### `check_quota(p_user_id, p_action, p_amount)`
Vérifie si l'utilisateur peut effectuer une action sans dépasser son quota.

**Paramètres :**
- `p_user_id` : UUID de l'utilisateur
- `p_action` : Type d'action ('clip', 'file', 'focus_mode', 'compact_mode')
- `p_amount` : Quantité à vérifier (défaut: 1)

**Retour :**
- `true` : Action autorisée (quota disponible ou utilisateur premium)
- `false` : Action refusée (quota dépassé)

**Exemple d'utilisation :**
```sql
-- Vérifier si l'utilisateur peut créer un clip
SELECT check_quota('user-uuid-here', 'clip', 1);

-- Vérifier si l'utilisateur peut uploader 5 fichiers
SELECT check_quota('user-uuid-here', 'file', 5);
```

### Quotas par défaut (FREE tier)

| Action | Limite mensuelle |
|--------|------------------|
| Clips | 100 clips |
| Fichiers | 10 fichiers |
| Focus Mode | 60 minutes |
| Compact Mode | 60 minutes |

**Note :** Les utilisateurs Premium et en Grace Period ont des quotas illimités.

### Row Level Security (RLS)

Toutes les tables ont RLS activé :

#### Subscriptions
- **SELECT** : Les utilisateurs peuvent voir leur propre abonnement
- **INSERT/UPDATE** : Seul le service role peut modifier

#### Usage Records
- **SELECT** : Les utilisateurs peuvent voir leur propre usage
- **ALL** : Seul le service role peut modifier

### Vérification post-migration

Après avoir appliqué la migration, vérifiez que tout fonctionne :

```sql
-- 1. Vérifier que les tables existent
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('subscriptions', 'usage_records');

-- 2. Vérifier que les fonctions existent
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('increment_usage', 'check_quota');

-- 3. Tester les fonctions avec un utilisateur test
-- (Remplacez 'user-uuid' par un vrai UUID)
SELECT check_quota('user-uuid', 'clip', 1);
```

## Rollback

Si vous devez annuler la migration 003 :

```sql
-- Supprimer les fonctions
DROP FUNCTION IF EXISTS public.check_quota(UUID, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.increment_usage(UUID, TEXT, INTEGER);

-- Supprimer les tables (ATTENTION : supprime toutes les données)
DROP TABLE IF EXISTS public.usage_records CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
```

## Support

En cas de problème avec les migrations :

1. Vérifiez les logs d'erreur dans Supabase Dashboard
2. Consultez la documentation Supabase : https://supabase.com/docs
3. Ouvrez une issue sur le repo GitHub du projet

## Notes importantes

- ⚠️ **BACKUP** : Faites toujours un backup avant d'appliquer une migration en production
- ⚠️ **ENVIRONNEMENT** : Testez d'abord dans un environnement de développement
- ⚠️ **DONNÉES** : Les migrations peuvent contenir des opérations destructives (DROP TABLE, etc.)
