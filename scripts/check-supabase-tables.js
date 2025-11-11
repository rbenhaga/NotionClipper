/**
 * Script pour vérifier l'état des tables Supabase
 *
 * Usage:
 * node scripts/check-supabase-tables.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
  console.log('🔍 Vérification des tables Supabase...\n');

  const tablesToCheck = [
    // Tables existantes
    'users',
    'notion_workspaces',
    'notion_api_keys',
    'user_favorites',
    'clip_history',
    // Nouvelles tables subscription
    'subscriptions',
    'usage_records',
    'usage_events',
    'mode_sessions'
  ];

  const results = {
    existing: [],
    missing: []
  };

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          // Table does not exist
          results.missing.push(table);
          console.log(`❌ Table "${table}" n'existe PAS`);
        } else {
          console.log(`⚠️  Table "${table}" - Erreur: ${error.message}`);
        }
      } else {
        results.existing.push({ table, count: count || 0 });
        console.log(`✅ Table "${table}" existe (${count || 0} lignes)`);
      }
    } catch (error) {
      console.log(`⚠️  Table "${table}" - Erreur: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  console.log(`✅ Tables existantes: ${results.existing.length}`);
  results.existing.forEach(({ table, count }) => {
    console.log(`   - ${table} (${count} lignes)`);
  });

  if (results.missing.length > 0) {
    console.log(`\n❌ Tables manquantes: ${results.missing.length}`);
    results.missing.forEach(table => {
      console.log(`   - ${table}`);
    });
    console.log('\n💡 Pour créer les tables manquantes:');
    console.log('   1. Ouvrir Supabase SQL Editor');
    console.log('   2. Copier le contenu de supabase/migrations/20251111_create_subscription_tables.sql');
    console.log('   3. Exécuter le script');
  } else {
    console.log('\n✅ Toutes les tables sont présentes !');
  }

  console.log('='.repeat(60) + '\n');
}

checkTables().catch(error => {
  console.error('❌ Erreur:', error);
  process.exit(1);
});
