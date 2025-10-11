/**
 * Script pour convertir les imports .js en .js pour ESM
 */

const fs = require('fs');
const path = require('path');

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Remplacer les imports .js par .js (pas de changement nécessaire pour ESM)
      // Le contenu est déjà correct
      
      fs.writeFileSync(filePath, content);
    }
  }
}

const distEsmDir = path.join(__dirname, '..', 'dist-esm');
if (fs.existsSync(distEsmDir)) {
  processDirectory(distEsmDir);
  console.log('ESM build completed successfully');
} else {
  console.error('dist-esm directory not found');
  process.exit(1);
}