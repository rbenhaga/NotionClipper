const fs = require('fs');
const path = require('path');

// Copier le dossier assets vers dist
const sourceDir = path.join(__dirname, '../assets');
const targetDir = path.join(__dirname, '../dist/assets');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('📦 Copying assets to dist...');
copyRecursiveSync(sourceDir, targetDir);
console.log('✅ Assets copied successfully!');
