const { exec } = require('child_process');
const path = require('path');

async function build() {
  console.log('🏗️  Build de Notion Clipper Pro...');
  // 1. Build React
  console.log('⚛️  Build React...');
  exec('cd src/react && npm run build', (err) => {
    if (err) {
      console.error('Erreur build React:', err);
      return;
    }
    // 2. Build Electron
    console.log('⚡ Build Electron...');
    exec('npm run build', (err) => {
      if (err) {
        console.error('Erreur build Electron:', err);
        return;
      }
      console.log('✅ Build terminé! Voir le dossier /dist');
    });
  });
}
build(); 