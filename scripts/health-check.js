#!/usr/bin/env node

/**
 * Script de vérification de santé du projet Notion Clipper
 * Vérifie que tous les composants essentiels sont en place
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de santé du projet Notion Clipper...\n');

const checks = [
  {
    name: 'Package UI - style.css',
    path: 'packages/ui/dist/style.css',
    required: true
  },
  {
    name: 'App Icons - app.ico',
    path: 'apps/notion-clipper-app/assets/icons/app.ico',
    required: true
  },
  {
    name: 'App Icons - app-icon-256.png',
    path: 'apps/notion-clipper-app/assets/icons/app-icon-256.png',
    required: true
  },
  {
    name: 'Tray Icon',
    path: 'apps/notion-clipper-app/assets/icons/tray-icon-32.png',
    required: true
  },
  {
    name: 'Electron Main Build',
    path: 'apps/notion-clipper-app/dist/main.js',
    required: true
  },
  {
    name: 'React Vite Config',
    path: 'apps/notion-clipper-app/src/react/vite.config.js',
    required: true
  }
];

let allPassed = true;

checks.forEach(check => {
  const fullPath = path.resolve(check.path);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    console.log(`✅ ${check.name}: OK (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`❌ ${check.name}: MANQUANT`);
    if (check.required) {
      allPassed = false;
    }
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 Tous les contrôles sont passés avec succès !');
  console.log('✅ L\'application est prête à être utilisée.');
} else {
  console.log('⚠️  Certains contrôles ont échoué.');
  console.log('❌ Veuillez corriger les problèmes avant de continuer.');
  process.exit(1);
}

console.log('\n📋 Commandes utiles :');
console.log('  pnpm dev:app          - Démarrer l\'application complète');
console.log('  pnpm build            - Construire pour la production');
console.log('  pnpm --filter @notion-clipper/ui build - Reconstruire le package UI');