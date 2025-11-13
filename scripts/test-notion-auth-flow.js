#!/usr/bin/env node
/**
 * Script de test du flow d'authentification Notion
 * Teste le chiffrement/déchiffrement des tokens
 */

const crypto = require('crypto');

console.log('🧪 Test du flow d\'authentification Notion\n');

// 1. Simuler le chiffrement côté serveur (Edge Function)
console.log('1️⃣ Simulation du chiffrement côté serveur...');

const ENCRYPTION_KEY = 'J/xu6C/X1OCIFnOMzSu3xGJfMAboYPWXJ83ScCa/RE0=';
const TEST_TOKEN = 'secret_test_notion_token_12345';

function encryptToken(token, keyBase64) {
  try {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    const result = {
      encrypted: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
    
    console.log('   ✅ Token chiffré avec succès');
    console.log('   📦 Encrypted:', result.encrypted.substring(0, 20) + '...');
    console.log('   🔑 IV:', result.iv);
    console.log('   🔐 AuthTag:', result.authTag);
    
    return result;
  } catch (error) {
    console.error('   ❌ Erreur de chiffrement:', error.message);
    throw error;
  }
}

function decryptToken(encryptedData, keyBase64) {
  try {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const encrypted = encryptedData.encrypted;
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    console.log('   ✅ Token déchiffré avec succès');
    console.log('   🔓 Decrypted:', decrypted);
    
    return decrypted;
  } catch (error) {
    console.error('   ❌ Erreur de déchiffrement:', error.message);
    throw error;
  }
}

// Test du flow complet
try {
  console.log('\n📝 Token original:', TEST_TOKEN);
  
  // Chiffrement (serveur)
  const encrypted = encryptToken(TEST_TOKEN, ENCRYPTION_KEY);
  
  console.log('\n2️⃣ Simulation du déchiffrement côté client...');
  
  // Déchiffrement (client)
  const decrypted = decryptToken(encrypted, ENCRYPTION_KEY);
  
  // Vérification
  console.log('\n3️⃣ Vérification...');
  if (decrypted === TEST_TOKEN) {
    console.log('   ✅ Le token déchiffré correspond au token original');
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test réussi ! Le flow de chiffrement fonctionne correctement');
    console.log('\n💡 Si vous avez toujours des erreurs :');
    console.log('   1. Vérifiez que le serveur dev est redémarré');
    console.log('   2. Reconnectez-vous à Notion (pour générer un nouveau token)');
    console.log('   3. Vérifiez les logs de la console navigateur');
    process.exit(0);
  } else {
    console.error('   ❌ Le token déchiffré ne correspond PAS au token original');
    console.error('   Original:', TEST_TOKEN);
    console.error('   Déchiffré:', decrypted);
    process.exit(1);
  }
} catch (error) {
  console.error('\n❌ Test échoué:', error.message);
  console.error('\n💡 Vérifiez que :');
  console.error('   - VITE_TOKEN_ENCRYPTION_KEY est correctement configurée');
  console.error('   - La clé fait bien 32 bytes en base64');
  console.error('   - Les clés serveur et client sont identiques');
  process.exit(1);
}
