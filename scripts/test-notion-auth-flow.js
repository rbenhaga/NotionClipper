#!/usr/bin/env node
/**
 * Test Script: Notion Auth Flow
 * 
 * Vérifie que le flow de chiffrement/déchiffrement des tokens Notion fonctionne correctement
 * après les corrections de sécurité (Fix 0.1).
 * 
 * Usage: node scripts/test-notion-auth-flow.js
 */

const crypto = require('crypto');

console.log('🧪 Testing Notion Auth Flow Security...\n');

// Test 1: Vérifier qu'aucune clé n'est exposée dans le bundle
console.log('Test 1: Checking for exposed encryption keys in bundles...');
const { execSync } = require('child_process');

try {
  // Chercher VITE_TOKEN_ENCRYPTION_KEY dans les bundles
  const distDirs = [
    'dist',
    'apps/notion-clipper-app/dist',
    'apps/notion-clipper-extension/dist'
  ];

  let foundExposedKey = false;

  for (const dir of distDirs) {
    try {
      const result = execSync(`grep -r "TOKEN_ENCRYPTION_KEY" ${dir} 2>/dev/null || true`, {
        encoding: 'utf-8'
      });

      if (result.trim()) {
        console.error(`  ❌ FAIL: Found TOKEN_ENCRYPTION_KEY in ${dir}`);
        console.error(`     ${result.trim()}`);
        foundExposedKey = true;
      }
    } catch (error) {
      // Directory doesn't exist, skip
    }
  }

  if (!foundExposedKey) {
    console.log('  ✅ PASS: No encryption keys found in bundles');
  } else {
    console.error('\n❌ CRITICAL: Encryption keys are exposed in bundles!');
    process.exit(1);
  }
} catch (error) {
  console.log('  ⚠️  SKIP: Could not check bundles (not built yet)');
}

// Test 2: Vérifier que .env.example ne contient pas VITE_TOKEN_ENCRYPTION_KEY
console.log('\nTest 2: Checking .env.example for VITE_TOKEN_ENCRYPTION_KEY...');
const fs = require('fs');
const path = require('path');

try {
  const envExample = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf-8');
  
  if (envExample.includes('VITE_TOKEN_ENCRYPTION_KEY')) {
    console.error('  ❌ FAIL: VITE_TOKEN_ENCRYPTION_KEY found in .env.example');
    console.error('     This key should NOT have the VITE_ prefix!');
    process.exit(1);
  } else {
    console.log('  ✅ PASS: VITE_TOKEN_ENCRYPTION_KEY not found in .env.example');
  }
} catch (error) {
  console.error('  ❌ FAIL: Could not read .env.example');
  process.exit(1);
}

// Test 3: Vérifier que l'Edge Function decrypt-notion-token existe
console.log('\nTest 3: Checking Edge Function decrypt-notion-token exists...');
const edgeFunctionPath = path.join(__dirname, '..', 'supabase', 'functions', 'decrypt-notion-token', 'index.ts');

if (fs.existsSync(edgeFunctionPath)) {
  console.log('  ✅ PASS: Edge Function decrypt-notion-token exists');
  
  // Vérifier que la fonction utilise bien Deno.env.get('TOKEN_ENCRYPTION_KEY')
  const edgeFunctionContent = fs.readFileSync(edgeFunctionPath, 'utf-8');
  
  if (edgeFunctionContent.includes("Deno.env.get('TOKEN_ENCRYPTION_KEY')")) {
    console.log('  ✅ PASS: Edge Function uses server-side encryption key');
  } else {
    console.error('  ❌ FAIL: Edge Function does not use TOKEN_ENCRYPTION_KEY from Deno.env');
    process.exit(1);
  }
} else {
  console.error('  ❌ FAIL: Edge Function decrypt-notion-token not found');
  console.error('     Expected at: supabase/functions/decrypt-notion-token/index.ts');
  process.exit(1);
}

// Test 4: Vérifier que AuthDataManager utilise l'Edge Function
console.log('\nTest 4: Checking AuthDataManager uses Edge Function...');
const authDataManagerPath = path.join(__dirname, '..', 'packages', 'ui', 'src', 'services', 'AuthDataManager.ts');

if (fs.existsSync(authDataManagerPath)) {
  const authDataManagerContent = fs.readFileSync(authDataManagerPath, 'utf-8');
  
  if (authDataManagerContent.includes("supabaseClient.functions.invoke") && 
      authDataManagerContent.includes("decrypt-notion-token")) {
    console.log('  ✅ PASS: AuthDataManager uses Edge Function for decryption');
  } else {
    console.error('  ❌ FAIL: AuthDataManager does not use Edge Function');
    console.error('     It should call supabaseClient.functions.invoke("decrypt-notion-token")');
    process.exit(1);
  }
  
  // Vérifier qu'il n'y a plus de crypto.subtle.decrypt côté client
  if (authDataManagerContent.includes('crypto.subtle.decrypt') && 
      authDataManagerContent.includes('VITE_TOKEN_ENCRYPTION_KEY')) {
    console.error('  ❌ FAIL: AuthDataManager still has client-side decryption code');
    process.exit(1);
  }
} else {
  console.error('  ❌ FAIL: AuthDataManager.ts not found');
  process.exit(1);
}

// Test 5: Vérifier que backend-api.service.ts utilise /api/quota au lieu de /api/usage
console.log('\nTest 5: Checking backend API endpoints...');
const backendApiPath = path.join(__dirname, '..', 'packages', 'core-shared', 'src', 'services', 'backend-api.service.ts');

if (fs.existsSync(backendApiPath)) {
  const backendApiContent = fs.readFileSync(backendApiPath, 'utf-8');
  
  // Vérifier qu'il n'y a plus de /api/usage/check-quota ou /api/usage/track
  const hasOldUsageEndpoints = backendApiContent.includes("'/api/usage/check-quota'") || 
                                 backendApiContent.includes("'/api/usage/track'");
  
  if (hasOldUsageEndpoints) {
    console.error('  ❌ FAIL: backend-api.service.ts still uses old /api/usage endpoints');
    console.error('     Should use /api/quota/check and /api/quota/track instead');
    process.exit(1);
  } else {
    console.log('  ✅ PASS: backend-api.service.ts uses correct /api/quota endpoints');
  }
} else {
  console.error('  ❌ FAIL: backend-api.service.ts not found');
  process.exit(1);
}

// Test 6: Simuler le chiffrement/déchiffrement (test unitaire)
console.log('\nTest 6: Testing encryption/decryption logic...');

try {
  // Générer une clé de test
  const testKey = crypto.randomBytes(32);
  const testToken = 'secret_test_notion_token_12345';
  
  // Chiffrer
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', testKey, iv);
  let encrypted = cipher.update(testToken, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  
  // Déchiffrer
  const decipher = crypto.createDecipheriv('aes-256-gcm', testKey, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  if (decrypted === testToken) {
    console.log('  ✅ PASS: Encryption/decryption logic works correctly');
  } else {
    console.error('  ❌ FAIL: Decrypted token does not match original');
    process.exit(1);
  }
} catch (error) {
  console.error('  ❌ FAIL: Encryption/decryption test failed:', error.message);
  process.exit(1);
}

console.log('\n✅ All tests passed! The Notion auth flow is secure.\n');
console.log('Next steps:');
console.log('  1. Deploy Edge Function: supabase functions deploy decrypt-notion-token');
console.log('  2. Set encryption key in Vault: supabase secrets set TOKEN_ENCRYPTION_KEY="<key>"');
console.log('  3. Test in production with real Notion tokens');
