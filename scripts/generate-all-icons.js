// scripts/generate-all-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Import des composants d'icônes (simulé car on ne peut pas importer React dans Node.js directement)
// On va créer les SVG manuellement basés sur le fichier icons.tsx

const outputDir = path.join(__dirname, '../assets/icons');

// Créer le dossier de sortie s'il n'existe pas
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ========================================
// DÉFINITIONS SVG BASÉES SUR icons.tsx
// ========================================

// SVG pour l'icône de la taskbar (avec fond dégradé)
const createTaskbarSVG = (size) => `
<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="taskbarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
  </defs>
  <!-- Fond arrondi avec dégradé -->
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.21875)}" fill="url(#taskbarGradient)" />
  <!-- Sparkles icon centré -->
  <g transform="translate(${size / 2}, ${size / 2}) scale(${size / 32 * 0.833}) translate(-12, -12)">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
      fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M20 3v4" stroke="white" stroke-width="1.5" stroke-linecap="round" />
    <path d="M22 5h-4" stroke="white" stroke-width="1.5" stroke-linecap="round" />
    <path d="M4 17v2" stroke="white" stroke-width="1.5" stroke-linecap="round" />
    <path d="M5 18H3" stroke="white" stroke-width="1.5" stroke-linecap="round" />
  </g>
</svg>`;

// SVG pour l'icône du tray (coloré, version simplifiée)
const createTrayColorSVG = (size) => `
<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="trayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
  </defs>
  <!-- Version ultra-simplifiée : juste l'étoile principale + stroke épais -->
  <g transform="translate(${size / 2}, ${size / 2}) scale(${size / 16 * 0.7}) translate(-12, -12)">
    <!-- Étoile principale REMPLIE au lieu de stroke pour plus de visibilité -->
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
      fill="url(#trayGradient)" stroke="url(#trayGradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Petites étoiles SUPPRIMÉES pour 16x16 - trop de détails -->
  </g>
</svg>`;

// SVG pour l'icône du tray monochrome (macOS, version simplifiée)
const createTrayMonoSVG = (size) => `
<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Version ultra-simplifiée monochrome -->
  <g transform="translate(${size / 2}, ${size / 2}) scale(${size / 16 * 0.7}) translate(-12, -12)">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
      fill="black" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;

// SVG pour l'extension (fond transparent, dégradé)
const createExtensionSVG = (size) => {
  const scale = size <= 16 ? 0.5 : size <= 32 ? 0.833 : size <= 48 ? 1.5 : 4.5;
  return `
<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="extensionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
  </defs>
  <g transform="translate(${size / 2}, ${size / 2}) scale(${scale}) translate(-12, -12)">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
      fill="none" stroke="url(#extensionGradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M20 3v4" stroke="url(#extensionGradient)" stroke-width="1.5" stroke-linecap="round" />
    <path d="M22 5h-4" stroke="url(#extensionGradient)" stroke-width="1.5" stroke-linecap="round" />
    <path d="M4 17v2" stroke="url(#extensionGradient)" stroke-width="1.5" stroke-linecap="round" />
    <path d="M5 18H3" stroke="url(#extensionGradient)" stroke-width="1.5" stroke-linecap="round" />
  </g>
</svg>`;
};

// ========================================
// FONCTION DE GÉNÉRATION
// ========================================

async function generateIcon(svgContent, filename, size) {
  try {
    const svgBuffer = Buffer.from(svgContent);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, filename));
    console.log(`✅ Generated ${filename}`);
  } catch (error) {
    console.error(`❌ Error generating ${filename}:`, error.message);
  }
}

async function generateIcoFromPng(pngPath, icoPath) {
  try {
    // Sharp ne peut pas générer d'ICO directement, on copie le PNG le plus proche
    // Pour un vrai ICO, il faudrait utiliser une autre librairie comme 'ico-convert'
    const pngBuffer = await sharp(pngPath).resize(32, 32).png().toBuffer();
    fs.writeFileSync(icoPath, pngBuffer);
    console.log(`✅ Generated ${path.basename(icoPath)} (PNG format)`);
  } catch (error) {
    console.error(`❌ Error generating ${path.basename(icoPath)}:`, error.message);
  }
}

async function generateAllIcons() {
  console.log('🎨 Generating all icons from icons.tsx...');

  // ========================================
  // 1. ICÔNES POUR L'APPLICATION DESKTOP
  // ========================================
  console.log('\n📱 Generating desktop app icons...');

  // Tailles pour l'app desktop (taskbar/dock)
  const appSizes = [16, 32, 48, 64, 128, 256, 512];
  for (const size of appSizes) {
    await generateIcon(
      createTaskbarSVG(size),
      `app-icon-${size}.png`,
      size
    );
  }

  // ========================================
  // 2. ICÔNES POUR LE SYSTEM TRAY
  // ========================================
  console.log('\n🔔 Generating system tray icons...');

  // Tray coloré (Windows/Linux)
  await generateIcon(
    createTrayColorSVG(16),
    'tray-icon-16.png',
    16
  );

  await generateIcon(
    createTrayColorSVG(32),
    'tray-icon-32.png',
    32
  );

  // Tray monochrome (macOS)
  await generateIcon(
    createTrayMonoSVG(16),
    'tray-icon-mono-16.png',
    16
  );

  await generateIcon(
    createTrayMonoSVG(32),
    'tray-icon-mono-32.png',
    32
  );

  // ========================================
  // 3. ICÔNES POUR L'EXTENSION BROWSER
  // ========================================
  console.log('\n🌐 Generating browser extension icons...');

  // Tailles standard pour les extensions
  const extensionSizes = [16, 32, 48, 128];
  for (const size of extensionSizes) {
    await generateIcon(
      createExtensionSVG(size),
      `extension-icon-${size}.png`,
      size
    );
  }

  // ========================================
  // 4. FICHIERS ICO POUR WINDOWS
  // ========================================
  console.log('\n🪟 Generating ICO files for Windows...');

  // ICO principal pour l'app
  await generateIcoFromPng(
    path.join(outputDir, 'app-icon-32.png'),
    path.join(outputDir, 'app.ico')
  );

  // ICO pour l'installateur
  await generateIcoFromPng(
    path.join(outputDir, 'app-icon-256.png'),
    path.join(outputDir, 'installer.ico')
  );

  // ========================================
  // 5. FICHIERS ICNS POUR MACOS (simulé avec PNG)
  // ========================================
  console.log('\n🍎 Generating ICNS files for macOS...');

  // Pour un vrai ICNS, il faudrait utiliser 'png2icons' ou similaire
  await generateIcoFromPng(
    path.join(outputDir, 'app-icon-512.png'),
    path.join(outputDir, 'app.icns')
  );

  console.log('\n✨ All icons generated successfully!');
  console.log('\n📁 Generated files:');
  console.log('   Desktop App: app-icon-*.png, app.ico, app.icns');
  console.log('   System Tray: tray-icon-*.png, tray-icon-mono-*.png');
  console.log('   Extension: extension-icon-*.png');
  console.log('\n💡 Note: ICO and ICNS files are in PNG format. For true ICO/ICNS, use specialized tools.');
}

// Exécuter la génération
generateAllIcons().catch(console.error);