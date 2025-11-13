#!/usr/bin/env node
/**
 * DIAGNOSTIC COMPLET DU FLOW D'AUTHENTIFICATION
 *
 * Ce script vérifie TOUS les composants nécessaires au bon fonctionnement
 * de l'authentification Notion.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 DIAGNOSTIC COMPLET DU FLOW D\'AUTHENTIFICATION NOTION\n');
console.log('=' .repeat(80));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// ============================================================================
// 1. VÉRIFICATION DES VARIABLES D'ENVIRONNEMENT
// ============================================================================
console.log('\n1️⃣ VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT');
console.log('-'.repeat(80));

const checkEnvVar = (filePath, varName, description) => {
  try {
    if (!fs.existsSync(filePath)) {
      results.failed.push(`❌ Fichier ${filePath} n'existe pas`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const regex = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = content.match(regex);

    if (!match) {
      results.failed.push(`❌ ${varName} manquante dans ${filePath}`);
      console.log(`   ❌ ${description}: MANQUANT`);
      return false;
    }

    const value = match[1].trim();
    if (value.includes('your-') || value.includes('TODO') || value.length < 10) {
      results.warnings.push(`⚠️  ${varName} dans ${filePath} semble être une valeur placeholder`);
      console.log(`   ⚠️  ${description}: PLACEHOLDER DÉTECTÉ`);
      return false;
    }

    results.passed.push(`✅ ${varName} configurée dans ${filePath}`);
    console.log(`   ✅ ${description}: OK`);
    return true;
  } catch (error) {
    results.failed.push(`❌ Erreur lecture ${filePath}: ${error.message}`);
    console.log(`   ❌ ${description}: ERREUR (${error.message})`);
    return false;
  }
};

// Vérifier .env racine
checkEnvVar('.env', 'VITE_TOKEN_ENCRYPTION_KEY', 'Clé de chiffrement client');
checkEnvVar('.env', 'SUPABASE_URL', 'URL Supabase');
checkEnvVar('.env', 'SUPABASE_ANON_KEY', 'Clé anonyme Supabase');

// Vérifier .env React
checkEnvVar('apps/notion-clipper-app/src/react/.env', 'VITE_TOKEN_ENCRYPTION_KEY', 'Clé de chiffrement React');

// ============================================================================
// 2. VÉRIFICATION DES EDGE FUNCTIONS
// ============================================================================
console.log('\n2️⃣ VÉRIFICATION DES EDGE FUNCTIONS');
console.log('-'.repeat(80));

const checkEdgeFunction = (name) => {
  const dirPath = path.join('supabase', 'functions', name);
  const indexPath = path.join(dirPath, 'index.ts');

  if (!fs.existsSync(dirPath)) {
    results.failed.push(`❌ Edge Function ${name} n'existe pas`);
    console.log(`   ❌ ${name}: MANQUANTE`);
    return false;
  }

  if (!fs.existsSync(indexPath)) {
    results.failed.push(`❌ ${name}/index.ts n'existe pas`);
    console.log(`   ❌ ${name}/index.ts: MANQUANT`);
    return false;
  }

  results.passed.push(`✅ Edge Function ${name} trouvée`);
  console.log(`   ✅ ${name}: TROUVÉE`);
  return true;
};

checkEdgeFunction('save-notion-connection');
checkEdgeFunction('get-notion-token');
checkEdgeFunction('create-user');

// ============================================================================
// 3. VÉRIFICATION DU CODE AUTHDATAMANAGER
// ============================================================================
console.log('\n3️⃣ VÉRIFICATION DU CODE AUTHDATAMANAGER');
console.log('-'.repeat(80));

const authDataManagerPath = 'packages/ui/src/services/AuthDataManager.ts';

if (!fs.existsSync(authDataManagerPath)) {
  results.failed.push('❌ AuthDataManager.ts introuvable');
  console.log('   ❌ Fichier introuvable');
} else {
  const code = fs.readFileSync(authDataManagerPath, 'utf8');

  // Vérifier que loadNotionConnection utilise l'Edge Function
  if (code.includes('get-notion-token') && code.includes('fetchWithRetry')) {
    results.passed.push('✅ loadNotionConnection() utilise l\'Edge Function');
    console.log('   ✅ loadNotionConnection() utilise l\'Edge Function get-notion-token');
  } else if (code.includes('notion_connections') && code.includes('.from(')) {
    results.failed.push('❌ loadNotionConnection() utilise encore les requêtes directes (erreur 406)');
    console.log('   ❌ loadNotionConnection() utilise encore les requêtes directes Supabase !');
    console.log('   💡 SOLUTION: Le code doit utiliser l\'Edge Function get-notion-token');
  } else {
    results.warnings.push('⚠️  Impossible de détecter la méthode utilisée par loadNotionConnection');
    console.log('   ⚠️  Impossible de détecter la méthode de chargement');
  }

  // Vérifier que loadAuthData appelle loadNotionConnection
  if (code.includes('loadNotionConnection(electronData.userId)') ||
      code.includes('loadNotionConnection(localData.userId)')) {
    results.passed.push('✅ loadAuthData() appelle loadNotionConnection()');
    console.log('   ✅ loadAuthData() charge le token depuis la base de données');
  } else {
    results.failed.push('❌ loadAuthData() ne charge PAS le token depuis la base de données');
    console.log('   ❌ loadAuthData() ne charge PAS le token depuis la base de données !');
    console.log('   💡 SOLUTION: Ajouter l\'appel à loadNotionConnection() après le chargement depuis Electron/localStorage');
  }

  // Vérifier la méthode de déchiffrement
  if (code.includes('decryptNotionToken')) {
    results.passed.push('✅ Méthode decryptNotionToken() présente');
    console.log('   ✅ Méthode decryptNotionToken() implémentée (fallback client-side)');
  } else {
    results.warnings.push('⚠️  Pas de fallback de déchiffrement client-side');
    console.log('   ⚠️  Pas de fallback de déchiffrement client-side');
  }
}

// ============================================================================
// 4. VÉRIFICATION DE LA BASE DE DONNÉES
// ============================================================================
console.log('\n4️⃣ VÉRIFICATION DE LA STRUCTURE DE LA BASE DE DONNÉES');
console.log('-'.repeat(80));

const migrationDirPath = 'supabase/migrations';
if (!fs.existsSync(migrationDirPath)) {
  results.warnings.push('⚠️  Dossier migrations Supabase introuvable');
  console.log('   ⚠️  Dossier migrations introuvable');
} else {
  const migrations = fs.readdirSync(migrationDirPath).filter(f => f.endsWith('.sql'));
  console.log(`   ℹ️  ${migrations.length} migrations trouvées`);

  // Vérifier si la table notion_connections existe
  let notionConnectionsTableFound = false;
  migrations.forEach(migration => {
    const content = fs.readFileSync(path.join(migrationDirPath, migration), 'utf8');
    if (content.includes('CREATE TABLE') && content.includes('notion_connections')) {
      notionConnectionsTableFound = true;
    }
  });

  if (notionConnectionsTableFound) {
    results.passed.push('✅ Table notion_connections définie dans les migrations');
    console.log('   ✅ Table notion_connections: TROUVÉE');
  } else {
    results.failed.push('❌ Table notion_connections introuvable dans les migrations');
    console.log('   ❌ Table notion_connections: INTROUVABLE');
  }
}

// ============================================================================
// 5. VÉRIFICATION DES SECRETS SUPABASE
// ============================================================================
console.log('\n5️⃣ VÉRIFICATION DES SECRETS SUPABASE');
console.log('-'.repeat(80));

try {
  // Essayer de lister les secrets (nécessite supabase CLI)
  const secretsList = execSync('supabase secrets list 2>&1', { encoding: 'utf8' });

  if (secretsList.includes('TOKEN_ENCRYPTION_KEY')) {
    results.passed.push('✅ TOKEN_ENCRYPTION_KEY configurée dans Supabase Vault');
    console.log('   ✅ TOKEN_ENCRYPTION_KEY: CONFIGURÉE');
  } else {
    results.failed.push('❌ TOKEN_ENCRYPTION_KEY manquante dans Supabase Vault');
    console.log('   ❌ TOKEN_ENCRYPTION_KEY: MANQUANTE');
    console.log('   💡 SOLUTION: supabase secrets set TOKEN_ENCRYPTION_KEY="votre_clé"');
  }

  if (secretsList.includes('NOTION_CLIENT_ID') && secretsList.includes('NOTION_CLIENT_SECRET')) {
    results.passed.push('✅ Secrets Notion OAuth configurés');
    console.log('   ✅ NOTION_CLIENT_ID & NOTION_CLIENT_SECRET: CONFIGURÉS');
  } else {
    results.failed.push('❌ Secrets Notion OAuth manquants');
    console.log('   ❌ Secrets Notion OAuth: MANQUANTS');
  }
} catch (error) {
  results.warnings.push('⚠️  Impossible de vérifier les secrets Supabase (CLI non installée ou non connectée)');
  console.log('   ⚠️  Impossible de vérifier (Supabase CLI requis)');
  console.log(`   💡 Erreur: ${error.message}`);
}

// ============================================================================
// 6. VÉRIFICATION DES IMPORTS ET DÉPENDANCES
// ============================================================================
console.log('\n6️⃣ VÉRIFICATION DES IMPORTS ET DÉPENDANCES');
console.log('-'.repeat(80));

const packageJsonPath = 'package.json';
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const checkDep = (name) => {
    const version = packageJson.dependencies?.[name] || packageJson.devDependencies?.[name];
    if (version) {
      results.passed.push(`✅ ${name}@${version}`);
      console.log(`   ✅ ${name}: ${version}`);
      return true;
    } else {
      results.failed.push(`❌ ${name} non installé`);
      console.log(`   ❌ ${name}: NON INSTALLÉ`);
      return false;
    }
  };

  checkDep('@supabase/supabase-js');
} else {
  results.warnings.push('⚠️  package.json introuvable');
  console.log('   ⚠️  package.json introuvable');
}

// ============================================================================
// RÉSUMÉ FINAL
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('📊 RÉSUMÉ DU DIAGNOSTIC');
console.log('='.repeat(80));

console.log(`\n✅ TESTS RÉUSSIS: ${results.passed.length}`);
results.passed.forEach(msg => console.log(`   ${msg}`));

if (results.warnings.length > 0) {
  console.log(`\n⚠️  AVERTISSEMENTS: ${results.warnings.length}`);
  results.warnings.forEach(msg => console.log(`   ${msg}`));
}

if (results.failed.length > 0) {
  console.log(`\n❌ TESTS ÉCHOUÉS: ${results.failed.length}`);
  results.failed.forEach(msg => console.log(`   ${msg}`));
}

// ============================================================================
// ACTIONS RECOMMANDÉES
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('🔧 ACTIONS RECOMMANDÉES');
console.log('='.repeat(80));

if (results.failed.length === 0 && results.warnings.length === 0) {
  console.log('\n🎉 Tous les tests sont passés ! Le système devrait fonctionner correctement.');
  console.log('\n💡 Si vous rencontrez toujours des problèmes:');
  console.log('   1. Redémarrez le serveur dev: pnpm dev:app');
  console.log('   2. Videz le cache du navigateur (Ctrl+Shift+Delete)');
  console.log('   3. Déployez les Edge Functions: supabase functions deploy get-notion-token');
  process.exit(0);
} else {
  console.log('\n⚠️  DES PROBLÈMES ONT ÉTÉ DÉTECTÉS. Actions à entreprendre:\n');

  if (results.failed.some(f => f.includes('VITE_TOKEN_ENCRYPTION_KEY'))) {
    console.log('🔑 1. CONFIGURER LA CLÉ DE CHIFFREMENT:');
    console.log('   # Générer une clé');
    console.log('   KEY=$(node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))")');
    console.log('   ');
    console.log('   # Ajouter au .env racine');
    console.log('   echo "VITE_TOKEN_ENCRYPTION_KEY=$KEY" >> .env');
    console.log('   ');
    console.log('   # Ajouter au .env React');
    console.log('   echo "VITE_TOKEN_ENCRYPTION_KEY=$KEY" >> apps/notion-clipper-app/src/react/.env');
    console.log('   ');
    console.log('   # Configurer dans Supabase');
    console.log('   supabase secrets set TOKEN_ENCRYPTION_KEY="$KEY"\n');
  }

  if (results.failed.some(f => f.includes('Edge Function'))) {
    console.log('📦 2. DÉPLOYER LES EDGE FUNCTIONS:');
    console.log('   supabase functions deploy save-notion-connection');
    console.log('   supabase functions deploy get-notion-token');
    console.log('   supabase functions deploy create-user\n');
  }

  if (results.failed.some(f => f.includes('loadNotionConnection'))) {
    console.log('💻 3. CORRIGER LE CODE AUTHDATAMANAGER:');
    console.log('   Le code doit utiliser l\'Edge Function get-notion-token');
    console.log('   au lieu des requêtes directes à la table notion_connections.\n');
  }

  if (results.failed.some(f => f.includes('loadAuthData'))) {
    console.log('💻 4. CORRIGER loadAuthData():');
    console.log('   Ajouter l\'appel à loadNotionConnection() après le chargement');
    console.log('   depuis Electron config ou localStorage.\n');
  }

  console.log('🔄 5. REDÉMARRER LE SERVEUR DEV:');
  console.log('   pnpm dev:app\n');

  console.log('🧹 6. VIDER LE CACHE DU NAVIGATEUR:');
  console.log('   Ctrl+Shift+Delete → Tout effacer\n');

  process.exit(1);
}
