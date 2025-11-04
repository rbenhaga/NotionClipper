#!/usr/bin/env node

/**
 * Script de reset complet et test du Mode Focus
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔄 Reset complet du Mode Focus...\n');

// Fonction pour trouver et supprimer le fichier de config
function resetConfig() {
  const appName = 'notion-clipper-config';
  let configDir;
  
  if (process.platform === 'win32') {
    configDir = path.join(os.homedir(), 'AppData', 'Roaming', 'notion-clipper-app');
  } else if (process.platform === 'darwin') {
    configDir = path.join(os.homedir(), 'Library', 'Application Support', 'notion-clipper-app');
  } else {
    configDir = path.join(os.homedir(), '.config', 'notion-clipper-app');
  }
  
  const configFile = path.join(configDir, `${appName}.json`);
  
  console.log('🗂️  Configuration Electron Store:');
  console.log(`   Dossier: ${configDir}`);
  console.log(`   Fichier: ${configFile}`);
  
  if (fs.existsSync(configFile)) {
    try {
      fs.unlinkSync(configFile);
      console.log('✅ Fichier de config supprimé');
    } catch (error) {
      console.log('⚠️  Erreur lors de la suppression:', error.message);
    }
  } else {
    console.log('ℹ️  Aucun fichier de config trouvé');
  }
}

// Reset de la config
resetConfig();

console.log('\n📋 Vérifications avant test:');

// Vérifier bubble.html
const bubblePublic = path.resolve('apps/notion-clipper-app/src/react/public/bubble.html');
const bubbleRoot = path.resolve('apps/notion-clipper-app/src/react/bubble.html');

console.log(`📄 bubble.html (public): ${fs.existsSync(bubblePublic) ? '✅' : '❌'}`);
console.log(`📄 bubble.html (root): ${fs.existsSync(bubbleRoot) ? '✅' : '❌'}`);

// Vérifier les builds
const uiBuild = path.resolve('packages/ui/dist/style.css');
const electronBuild = path.resolve('apps/notion-clipper-app/dist/main.js');

console.log(`🏗️  UI Build: ${fs.existsSync(uiBuild) ? '✅' : '❌'}`);
console.log(`⚡ Electron Build: ${fs.existsSync(electronBuild) ? '✅' : '❌'}`);

console.log('\n🧪 Instructions de test:');
console.log('1. Lancez: pnpm dev:app');
console.log('2. Attendez le chargement complet');
console.log('3. Activez le Mode Focus sur une page');
console.log('4. Vérifiez:');
console.log('   ✅ L\'intro s\'affiche UNE SEULE FOIS');
console.log('   ✅ La bulle flottante apparaît');
console.log('   ✅ Pas d\'erreurs dans la console');
console.log('   ✅ Les DevTools de la bulle s\'ouvrent');

console.log('\n🔍 Logs à surveiller:');
console.log('   [FocusMode] Emitting focus-mode:enabled event');
console.log('   [App] Current dismissed status: false');
console.log('   [FloatingBubble] Loading from dev server');
console.log('   [FloatingBubble] ✅ Window created');

console.log('\n🚀 Prêt pour le test !');