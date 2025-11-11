/**
 * Script d'exécution de migration Supabase
 *
 * Ce script va :
 * 1. Se connecter à Supabase avec la clé service_role
 * 2. Exécuter la migration SQL pour créer les tables subscription
 * 3. Vérifier que les tables ont été créées
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/run-supabase-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.log('\n📝 Ajoutez dans votre .env:');
  console.log('   SUPABASE_URL=https://your-project.supabase.co');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=eyJ...\n');
  console.log('💡 Trouvez votre service_role key sur:');
  console.log('   https://supabase.com/dashboard/project/_/settings/api\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🗄️  Migration Supabase - Tables Subscription\n');
  console.log(`📍 URL: ${SUPABASE_URL}\n`);

  try {
    // 1. Lire le fichier de migration
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/20251111_create_subscription_tables.sql'
    );

    console.log('📄 Lecture du fichier de migration...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`   Taille: ${migrationSQL.length} caractères\n`);

    // 2. Exécuter la migration
    console.log('🚀 Exécution de la migration SQL...');
    console.log('   (Cela peut prendre quelques secondes)\n');

    // Note: Supabase ne permet pas d'exécuter du SQL brut via l'API client
    // Il faut utiliser le SQL Editor dans le dashboard ou l'API Management
    console.log('⚠️  IMPORTANT: Exécution manuelle requise\n');
    console.log('Pour exécuter cette migration:');
    console.log('1. Ouvrez le SQL Editor de Supabase:');
    console.log(`   ${SUPABASE_URL.replace('.supabase.co', '')}/project/_/sql/new\n`);
    console.log('2. Copiez-collez le contenu de:');
    console.log('   supabase/migrations/20251111_create_subscription_tables.sql\n');
    console.log('3. Cliquez sur "Run" pour exécuter\n');

    // Alternative: Afficher le SQL à copier
    console.log('═'.repeat(60));
    console.log('📋 SQL à exécuter (copier dans SQL Editor):\n');
    console.log(migrationSQL.substring(0, 500) + '...\n');
    console.log('═'.repeat(60) + '\n');

    // 3. Vérifier si les tables existent (approximatif)
    console.log('🔍 Vérification des tables...\n');

    const tables = [
      'subscriptions',
      'usage_records',
      'usage_events',
      'mode_sessions',
    ];

    for (const tableName of tables) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ ${tableName}: N'existe pas encore`);
        } else {
          console.log(`✅ ${tableName}: Existe`);
        }
      } catch (err) {
        console.log(`⚠️  ${tableName}: Erreur - ${err.message}`);
      }
    }

    console.log('\n✨ Vérification terminée!\n');

    console.log('📝 Prochaines étapes:');
    console.log('   1. Exécuter la migration dans le SQL Editor');
    console.log('   2. Vérifier que les tables sont créées');
    console.log('   3. Tester la connexion depuis l\'app\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

runMigration().catch(console.error);
