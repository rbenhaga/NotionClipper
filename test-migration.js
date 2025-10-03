// Test simple pour vérifier la migration
const path = require('path');

console.log('🧪 Test de migration...');

try {
  // Test 1: Charger le package core
  console.log('📦 Test du package core...');
  const corePath = path.join(__dirname, 'packages', 'core', 'dist', 'index.js');
  console.log('Core path:', corePath);
  
  // Test 2: Charger les adapters
  console.log('🔌 Test des adapters...');
  const adaptersPath = path.join(__dirname, 'packages', 'adapters', 'electron', 'dist', 'index.js');
  console.log('Adapters path:', adaptersPath);
  
  // Test 3: Vérifier que les fichiers existent
  const fs = require('fs');
  
  if (fs.existsSync(corePath)) {
    console.log('✅ Package core compilé trouvé');
    const core = require(corePath);
    console.log('✅ Package core chargé:', Object.keys(core));
  } else {
    console.log('❌ Package core non trouvé');
  }
  
  if (fs.existsSync(adaptersPath)) {
    console.log('✅ Package adapters compilé trouvé');
    const adapters = require(adaptersPath);
    console.log('✅ Package adapters chargé:', Object.keys(adapters));
  } else {
    console.log('❌ Package adapters non trouvé');
  }
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
}
