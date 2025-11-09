# Supabase Migrations - NotionClipper Freemium System

Ce dossier contient les migrations SQL pour le système freemium/premium de NotionClipper.

## 📋 Liste des migrations

### 001_create_subscriptions_tables.sql
**Date:** 2025-11-09
**Description:** Création du système de subscriptions et usage tracking

**Tables créées:**
- `subscriptions` - Gestion des abonnements utilisateurs
- `usage_records` - Tracking mensuel de l'usage
- `usage_events` - Log détaillé des événements
- `mode_sessions` - Sessions Focus/Compact mode

**Fonctions créées:**
- `get_or_create_current_usage_record()` - Récupère/crée l'usage du mois
- `increment_usage_counter()` - Incrémente les compteurs atomiquement
- `migrate_existing_users_to_grace_period()` - Migration utilisateurs existants

## 🚀 Application des migrations

### Via Supabase CLI (Recommandé)

```bash
# 1. Installer Supabase CLI
npm install -g supabase

# 2. Lier votre projet
supabase link --project-ref your-project-ref

# 3. Appliquer les migrations
supabase db push
```

### Via Supabase Dashboard

1. Allez dans votre projet Supabase
2. Ouvrez l'éditeur SQL
3. Copiez-collez le contenu de `001_create_subscriptions_tables.sql`
4. Exécutez la requête

### Via API Supabase (Programmatique)

```typescript
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const migration = readFileSync('./001_create_subscriptions_tables.sql', 'utf-8');
await supabase.rpc('exec', { sql: migration });
```

## 🔄 Migration des utilisateurs existants

Après avoir appliqué la migration, exécutez cette fonction pour donner 30 jours de période de grâce aux utilisateurs existants :

```sql
SELECT migrate_existing_users_to_grace_period();
```

Cette fonction :
- ✅ Crée une subscription `grace_period` pour tous les utilisateurs existants
- ✅ Donne 30 jours d'accès premium gratuit
- ✅ Ne touche pas aux utilisateurs ayant déjà une subscription

## 📊 Schéma des données

### subscriptions
```
id                      UUID (PK)
user_id                 UUID (FK → auth.users)
tier                    TEXT ('free', 'premium', 'grace_period')
status                  TEXT ('active', 'canceled', etc.)
stripe_customer_id      TEXT (unique)
stripe_subscription_id  TEXT (unique)
current_period_start    TIMESTAMPTZ
current_period_end      TIMESTAMPTZ
grace_period_ends_at    TIMESTAMPTZ
is_grace_period         BOOLEAN
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

### usage_records
```
id                      UUID (PK)
user_id                 UUID (FK → auth.users)
subscription_id         UUID (FK → subscriptions)
year                    INTEGER
month                   INTEGER (1-12)
clips_count             INTEGER
files_count             INTEGER
focus_mode_minutes      INTEGER
compact_mode_minutes    INTEGER
period_start            TIMESTAMPTZ
period_end              TIMESTAMPTZ
created_at              TIMESTAMPTZ
updated_at              TIMESTAMPTZ
```

## 🔒 Row Level Security (RLS)

Toutes les tables ont RLS activé avec les policies suivantes :
- ✅ Les utilisateurs ne peuvent voir que leurs propres données
- ✅ Les utilisateurs ne peuvent modifier que leurs propres données
- ✅ Sécurité au niveau base de données

## 🧪 Tests des migrations

### Test 1: Créer une subscription gratuite
```sql
INSERT INTO subscriptions (user_id, tier, status)
VALUES (auth.uid(), 'free', 'active');
```

### Test 2: Incrémenter un compteur d'usage
```sql
SELECT increment_usage_counter(auth.uid(), 'clips', 1);
```

### Test 3: Récupérer l'usage du mois
```sql
SELECT * FROM usage_records
WHERE user_id = auth.uid()
  AND year = EXTRACT(YEAR FROM NOW())
  AND month = EXTRACT(MONTH FROM NOW());
```

## 🔄 Rollback

Pour annuler la migration :

```sql
DROP TABLE IF EXISTS mode_sessions CASCADE;
DROP TABLE IF EXISTS usage_events CASCADE;
DROP TABLE IF EXISTS usage_records CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP FUNCTION IF EXISTS migrate_existing_users_to_grace_period;
DROP FUNCTION IF EXISTS increment_usage_counter;
DROP FUNCTION IF EXISTS get_or_create_current_usage_record;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

⚠️ **Attention:** Le rollback supprime toutes les données de subscription et d'usage !

## 📝 Variables d'environnement requises

Ajoutez ces variables à votre `.env` :

```bash
# Supabase (déjà existant)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Stripe (nouveau)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🎯 Prochaines étapes

Après l'application des migrations :

1. ✅ Implémenter les services TypeScript (SubscriptionService, QuotaService)
2. ✅ Intégrer Stripe pour les paiements
3. ✅ Créer les composants UI (compteurs, modals)
4. ✅ Ajouter les vérifications de quotas dans l'app
5. ✅ Tester le flow complet

## 📚 Documentation

- [Supabase Database](https://supabase.com/docs/guides/database)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
