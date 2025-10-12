// scripts/copy-extension-icons.js
const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../assets/icons');
const targetDir = path.join(__dirname, '../apps/notion-clipper-extension/public/icons');

// Créer le dossier de destination s'il n'existe pas
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copier les icônes d'extension
const extensionIcons = [
  'extension-icon-16.png',
  'extension-icon-32.png', 
  'extension-icon-48.png',
  'extension-icon-128.png'
];

console.log('📋 Copying extension icons...');

extensionIcons.forEach(icon => {
  const sourcePath = path.join(sourceDir, icon);
  const targetPath = path.join(targetDir, icon);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✅ Copied ${icon}`);
  } else {
    console.error(`❌ Source not found: ${icon}`);
  }
});

console.log('✨ Extension icons copied successfully!');