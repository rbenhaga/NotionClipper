// scripts/generate-icons.js - Générateur d'icônes depuis les SVG
const fs = require('fs');
const path = require('path');

// SVG du nouveau logo principal
const logoSVG = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9333EA" />
      <stop offset="50%" stop-color="#7C3AED" />
      <stop offset="100%" stop-color="#2563EB" />
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#logoGradient)" />
  <g transform="translate(6, 6)">
    <rect x="2" y="2" width="14" height="16" rx="1" fill="white" fill-opacity="0.3" />
    <rect x="4" y="0" width="14" height="16" rx="1" fill="white" fill-opacity="0.9" />
    <rect x="6" y="3" width="8" height="1.5" rx="0.5" fill="url(#logoGradient)" fill-opacity="0.7" />
    <rect x="6" y="6" width="10" height="1.5" rx="0.5" fill="url(#logoGradient)" fill-opacity="0.5" />
    <rect x="6" y="9" width="6" height="1.5" rx="0.5" fill="url(#logoGradient)" fill-opacity="0.3" />
    <path d="M14 0 L18 0 L18 7 L16 5 L14 7 Z" fill="#FCD34D" stroke="white" stroke-width="0.5" />
  </g>
</svg>`;

// SVG de l'icône tray colorée
const trayColorSVG = `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="trayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9333EA" />
      <stop offset="100%" stop-color="#2563EB" />
    </linearGradient>
  </defs>
  <rect width="16" height="16" rx="3" fill="url(#trayGrad)" />
  <g transform="translate(3, 3)">
    <rect x="1" y="1" width="7" height="8" rx="0.5" fill="white" fill-opacity="0.4" />
    <rect x="2" y="0" width="7" height="8" rx="0.5" fill="white" fill-opacity="0.9" />
    <path d="M7 0 L9 0 L9 3.5 L8 2.5 L7 3.5 Z" fill="#FCD34D" />
  </g>
</svg>`;

// SVG de l'icône tray monochrome (pour macOS)
const trayMonoSVG = `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <g fill="currentColor">
    <rect x="3" y="4" width="8" height="9" rx="1" fill-opacity="0.4" />
    <rect x="5" y="3" width="8" height="9" rx="1" />
    <path d="M11 3 L13 3 L13 6.5 L12 5.5 L11 6.5 Z" />
  </g>
</svg>`;

// Fonction pour sauvegarder les SVG
function saveSVG(svgContent, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, svgContent);
  console.log(`✅ SVG sauvegardé: ${filePath}`);
}

// Sauvegarder les icônes
console.log('🎨 Génération des icônes...\n');

// App desktop - Logo principal
saveSVG(logoSVG, 'apps/notion-clipper-app/assets/logo.svg');

// App desktop - Icônes tray
saveSVG(trayColorSVG, 'apps/notion-clipper-app/assets/tray/tray-color.svg');
saveSVG(trayMonoSVG, 'apps/notion-clipper-app/assets/tray/tray-mono.svg');

// Extension - Icônes (versions redimensionnées du logo)
const extensionSizes = [16, 32, 48, 128];
extensionSizes.forEach(size => {
  const scaledLogo = logoSVG.replace('viewBox="0 0 32 32"', `viewBox="0 0 32 32" width="${size}" height="${size}"`);
  saveSVG(scaledLogo, `apps/notion-clipper-extension/public/icons/icon-${size}.svg`);
});

console.log('\n🎯 Instructions pour finaliser:');
console.log('1. Convertir les SVG en PNG avec un outil comme Inkscape ou un service en ligne');
console.log('2. Remplacer les anciens fichiers PNG par les nouveaux');
console.log('3. Pour Windows: convertir icon.png en icon.ico');
console.log('4. Pour macOS: convertir icon.png en icon.icns');
console.log('\n📁 Fichiers générés:');
console.log('- apps/notion-clipper-app/assets/logo.svg');
console.log('- apps/notion-clipper-app/assets/tray/tray-*.svg');
console.log('- apps/notion-clipper-extension/public/icons/icon-*.svg');