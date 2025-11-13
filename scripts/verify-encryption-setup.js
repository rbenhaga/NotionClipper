#!/usr/bin/env node
/**
 * Script de vérification de la configuration du chiffrement
 * Vérifie que TOKEN_ENCRYPTION_KEY est correctement configurée partout
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Vérification de la configuration du chiffrement...\n');

let hasErrors = false;

// 1. Vérifier .env racine
console.log('1️⃣ Vérification du .env racine...');
const rootEnvPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(rootEnvPath)) {
  console.error('   ❌ Fichier .env introuvable');
  hasErrors = true;
} else {
  const rootEnv = fs.readFileSync(rootEnvPath, 'utf-8');
  if (rootEnv.includes('VITE_TOKEN_ENCRYPTION_KEY=')) {
    const match = rootEnv.match(/VITE_TOKEN_ENCRYPTION_KEY=(.+)/);
    if (match && match[1] && match[1].length > 20) {
      console.log('   ✅ VITE_TOKEN_ENCRYPTION_KEY présente');
    } else {
      console.error('   ❌ VITE_TOKEN_ENCRYPTION_KEY invalide ou vide');
      hasErrors = true;
    }
  } else {
    console.error('   ❌ VITE_TOKEN_ENCRYPTION_KEY manquante');
    hasErrors = true;
  }
}

// 2. Vérifier .env React
console.log('\n2️⃣ Vérification du .env React...');
const reactEnvPath = path.join(__dirname, '..', 'apps', 'notion-clipper-app', 'src', 'react', '.env');
if (!fs.existsSync(reactEnvPath)) {
  console.error('   ❌ Fichier .env React introuvable');
  hasErrors = true;
} else {
  const reactEnv = fs.readFileSync(reactEnvPath, 'utf-8');
  if (reactEnv.includes('VITE_TOKEN_ENCRYPTION_KEY=')) {
    const match = reactEnv.match(/VITE_TOKEN_ENCRYPTION_KEY=(.+)/);
    if (match && match[1] && match[1].length > 20) {
      console.log('   ✅ VITE_TOKEN_ENCRYPTION_KEY présente');
    } else {
      console.error('   ❌ VITE_TOKEN_ENCRYPTION_KEY invalide ou vide');
      hasErrors = true;
    }
  } else {
    console.error('   ❌ VITE_TOKEN_ENCRYPTION_KEY manquante');
    hasErrors = true;
  }
}

// 3. Vérifier Supabase Vault
console.log('\n3️⃣ Vérification de Supabase Vault...');
try {
  const output = execSync('supabase secrets list', { encoding: 'utf-8' });
  if (output.includes('TOKEN_ENCRYPTION_KEY')) {
    console.log('   ✅ TOKEN_ENCRYPTION_KEY présente dans Supabase Vault');
  } else {
    console.error('   ❌ TOKEN_ENCRYPTION_KEY manquante dans Supabase Vault');
    hasErrors = true;
  }
} catch (error) {
  console.error('   ❌ Impossible de vérifier Supabase Vault');
  console.error('   💡 Assurez-vous que Supabase CLI est installé et configuré');
  hasErrors = true;
}

// 4. Vérifier que les clés sont identiques
console.log('\n4️⃣ Vérification de la synchronisation des clés...');
try {
  const rootEnv = fs.readFileSync(rootEnvPath, 'utf-8');
  const reactEnv = fs.readFileSync(reactEnvPath, 'utf-8');
  
  const rootKey = rootEnv.match(/VITE_TOKEN_ENCRYPTION_KEY=(.+)/)?.[1]?.trim();
  const reactKey = reactEnv.match(/VITE_TOKEN_ENCRYPTION_KEY=(.+)/)?.[1]?.trim();
  
  if (rootKey && reactKey && rootKey === reactKey) {
    console.log('   ✅ Les clés locales sont synchronisées');
  } else {
    console.error('   ❌ Les clés locales ne correspondent pas');
    console.error('   💡 Root .env:', rootKey?.substring(0, 20) + '...');
    console.error('   💡 React .env:', reactKey?.substring(0, 20) + '...');
    hasErrors = true;
  }
} catch (error) {
  console.error('   ❌ Impossible de comparer les clés');
  hasErrors = true;
}

// Résumé
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ Configuration incomplète ou incorrecte');
  console.log('\n💡 Pour corriger :');
  console.log('   1. Générer une clé : node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
  console.log('   2. Ajouter à .env : VITE_TOKEN_ENCRYPTION_KEY=votre_clé');
  console.log('   3. Ajouter à React .env : VITE_TOKEN_ENCRYPTION_KEY=votre_clé');
  console.log('   4. Ajouter à Supabase : supabase secrets set TOKEN_ENCRYPTION_KEY="votre_clé"');
  process.exit(1);
} else {
  console.log('✅ Configuration du chiffrement correcte !');
  console.log('\n🚀 Vous pouvez maintenant :');
  console.log('   - Démarrer l\'application : pnpm dev');
  console.log('   - Tester l\'authentification Notion');
  console.log('   - Vérifier les logs pour "Token decrypted successfully"');
  process.exit(0);
}
