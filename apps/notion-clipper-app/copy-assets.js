// Script pour copier les assets nécessaires après le build
const fs = require('fs');
const path = require('path');

// Créer le dossier dist/assets s'il n'existe pas
const assetsDir = path.join(__dirname, 'dist', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Copier oauth-success.html seulement si nécessaire
const sourceFile = path.join(__dirname, '../../packages/ui/src/pages/oauth-success.html');
const destFile = path.join(assetsDir, 'oauth-success.html');

try {
  // Vérifier si le fichier existe déjà et est identique
  if (fs.existsSync(destFile)) {
    const sourceStats = fs.statSync(sourceFile);
    const destStats = fs.statSync(destFile);
    
    // Skip si même taille et même date de modification
    if (sourceStats.size === destStats.size && sourceStats.mtime <= destStats.mtime) {
      console.log('⏭️  Assets already up to date');
      process.exit(0);
    }
  }
  
  fs.copyFileSync(sourceFile, destFile);
  console.log('✅ Assets copied successfully');
} catch (error) {
  console.error('❌ Error copying assets:', error.message);
  process.exit(1);
}
