/**
 * Script d'analyse de la base de données Supabase existante
 *
 * Ce script va :
 * 1. Se connecter à Supabase
 * 2. Lister toutes les tables existantes
 * 3. Analyser les schémas
 * 4. Vérifier si nos tables subscription existent déjà
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const SUPABASE_URL = 'https://rijjtngbgahxdjflfyhi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpamp0bmdiZ2FoeGRqZmxmeWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODk3OTIsImV4cCI6MjA3NzA2NTc5Mn0.eyutWzAghQ5cz1fLFc8cKwQnvwCRUw3QBsm7ixFzna0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function analyzeDatabase() {
  console.log('🔍 Analyse de la base de données Supabase...\n');
  console.log(`📍 URL: ${SUPABASE_URL}\n`);

  // Essayer de récupérer les tables via une requête SQL
  try {
    // Liste des tables à vérifier
    const tablesToCheck = [
      'subscriptions',
      'usage_records',
      'usage_events',
      'mode_sessions',
      // Autres tables possibles
      'users',
      'profiles',
      'clips',
      'pages',
    ];

    console.log('📋 Vérification des tables...\n');

    for (const tableName of tablesToCheck) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('not found')) {
            console.log(`❌ ${tableName}: N'EXISTE PAS`);
          } else {
            console.log(`⚠️  ${tableName}: Erreur - ${error.message}`);
          }
        } else {
          console.log(`✅ ${tableName}: EXISTE (${count || 0} lignes)`);
        }
      } catch (err) {
        console.log(`⚠️  ${tableName}: Erreur - ${err.message}`);
      }
    }

    console.log('\n');

    // Tester la connexion auth
    console.log('🔐 Test de l\'authentification...\n');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.log('❌ Pas d\'utilisateur authentifié (normal pour clé publique)');
      console.log(`   Message: ${authError.message}\n`);
    } else if (user) {
      console.log('✅ Utilisateur authentifié:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}\n`);
    }

    // Essayer de lire une table existante pour voir le schéma
    console.log('📊 Analyse du schéma des tables existantes...\n');

    const existingTables = ['subscriptions', 'usage_records'];

    for (const tableName of existingTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error && data && data.length > 0) {
          console.log(`✅ Schéma de ${tableName}:`);
          console.log(JSON.stringify(Object.keys(data[0]), null, 2));
          console.log('');
        }
      } catch (err) {
        // Ignore
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
  }

  console.log('\n✨ Analyse terminée!\n');
  console.log('📝 Prochaines étapes:');
  console.log('   1. Si les tables n\'existent pas, exécuter la migration SQL');
  console.log('   2. Configurer les variables d\'environnement');
  console.log('   3. Créer le produit Stripe');
  console.log('   4. Intégrer dans l\'application\n');
}

analyzeDatabase().catch(console.error);
