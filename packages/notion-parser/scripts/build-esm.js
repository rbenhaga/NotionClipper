const fs = require('fs');
const path = require('path');

// Copy ESM build to main dist folder with .esm.js extension
function copyEsmFiles(srcDir, destDir) {
  const files = fs.readdirSync(srcDir, { withFileTypes: true });
  
  for (const file of files) {
    const srcPath = path.join(srcDir, file.name);
    const destPath = path.join(destDir, file.name.replace('.js', '.esm.js'));
    
    if (file.isDirectory()) {
      if (!fs.existsSync(destPath.replace('.esm.js', ''))) {
        fs.mkdirSync(destPath.replace('.esm.js', ''), { recursive: true });
      }
      copyEsmFiles(srcPath, destPath.replace('.esm.js', ''));
    } else if (file.name.endsWith('.js')) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy ESM files
copyEsmFiles('dist-esm', 'dist');

// Clean up temporary dist-esm directory
fs.rmSync('dist-esm', { recursive: true, force: true });

console.log('ESM build completed successfully');