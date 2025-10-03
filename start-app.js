// Script de démarrage pour contourner le problème Electron local
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Démarrage de l\'application avec Electron global...');

const mainPath = path.join(__dirname, 'apps', 'notion-clipper-app', 'src', 'electron', 'main.js');

console.log('📁 Main path:', mainPath);
console.log('🔧 Using global Electron...');

const electronProcess = spawn('electron', [mainPath], {
  stdio: 'inherit',
  cwd: __dirname
});

electronProcess.on('close', (code) => {
  console.log(`👋 Application fermée avec le code: ${code}`);
});

electronProcess.on('error', (error) => {
  console.error('❌ Erreur lors du démarrage:', error.message);
});

console.log('✅ Application démarrée. Vérifiez la fenêtre Electron.');
