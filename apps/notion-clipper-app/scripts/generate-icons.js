/**
 * Script de génération des icônes pour Clipper Pro
 * 
 * Ce script génère toutes les icônes nécessaires à partir du SVG source:
 * - PNG aux différentes tailles (16, 32, 48, 64, 128, 256, 512)
 * - ICO pour Windows
 * - ICNS pour macOS
 * - Icônes tray (normales et mono)
 * 
 * Prérequis: npm install sharp png-to-ico
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ICONS_DIR = path.join(__dirname, '../assets/icons');
const SVG_SOURCE = path.join(ICONS_DIR, 'app-icon.svg');

// Tailles pour les icônes d'application
const APP_ICON_SIZES = [16, 32, 48, 64, 128, 256, 512];

// Tailles pour les icônes d'extension
const EXTENSION_ICON_SIZES = [16, 32, 48, 128];

// Tailles pour les icônes tray
const TRAY_ICON_SIZES = [16, 32];

// SVG pour les icônes tray (version simplifiée avec fond transparent)
const TRAY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <defs>
    <linearGradient id="trayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
  </defs>
  <path 
    d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
    fill="url(#trayGradient)"
    stroke="url(#trayGradient)"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <path d="M20 3v4" stroke="url(#trayGradient)" stroke-width="1.5" stroke-linecap="round" />
  <path d="M22 5h-4" stroke="url(#trayGradient)" stroke-width="1.5" stroke-linecap="round" />
  <path d="M4 17v2" stroke="url(#trayGradient)" stroke-width="1.5" stroke-linecap="round" />
  <path d="M5 18H3" stroke="url(#trayGradient)" stroke-width="1.5" stroke-linecap="round" />
</svg>`;

// SVG pour les icônes tray mono (macOS Template)
const TRAY_MONO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path 
    d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
    fill="#000000"
    stroke="#000000"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <path d="M20 3v4" stroke="#000000" stroke-width="1.5" stroke-linecap="round" />
  <path d="M22 5h-4" stroke="#000000" stroke-width="1.5" stroke-linecap="round" />
  <path d="M4 17v2" stroke="#000000" stroke-width="1.5" stroke-linecap="round" />
  <path d="M5 18H3" stroke="#000000" stroke-width="1.5" stroke-linecap="round" />
</svg>`;

// SVG pour les icônes d'extension (sparkles sans fond)
const EXTENSION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <defs>
    <linearGradient id="extGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
  </defs>
  <path 
    d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
    fill="none"
    stroke="url(#extGradient)"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <path d="M20 3v4" stroke="url(#extGradient)" stroke-width="1.5" stroke-linecap="round" />
  <path d="M22 5h-4" stroke="url(#extGradient)" stroke-width="1.5" stroke-linecap="round" />
  <path d="M4 17v2" stroke="url(#extGradient)" stroke-width="1.5" stroke-linecap="round" />
  <path d="M5 18H3" stroke="url(#extGradient)" stroke-width="1.5" stroke-linecap="round" />
</svg>`;

async function generateAppIcons() {
  console.log('📱 Generating app icons...');
  
  const svgBuffer = fs.readFileSync(SVG_SOURCE);
  
  for (const size of APP_ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, `app-icon-${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`  ✅ app-icon-${size}.png`);
  }
}

async function generateTrayIcons() {
  console.log('🔔 Generating tray icons...');
  
  for (const size of TRAY_ICON_SIZES) {
    // Icône tray normale (colorée)
    const trayPath = path.join(ICONS_DIR, `tray-icon-${size}.png`);
    await sharp(Buffer.from(TRAY_SVG))
      .resize(size, size)
      .png()
      .toFile(trayPath);
    console.log(`  ✅ tray-icon-${size}.png`);
    
    // Icône tray mono (pour macOS Template)
    const monoPath = path.join(ICONS_DIR, `tray-icon-mono-${size}.png`);
    await sharp(Buffer.from(TRAY_MONO_SVG))
      .resize(size, size)
      .png()
      .toFile(monoPath);
    console.log(`  ✅ tray-icon-mono-${size}.png`);
  }
}

async function generateExtensionIcons() {
  console.log('🧩 Generating extension icons...');
  
  for (const size of EXTENSION_ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, `extension-icon-${size}.png`);
    
    await sharp(Buffer.from(EXTENSION_SVG))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`  ✅ extension-icon-${size}.png`);
  }
}

async function generateIco() {
  console.log('🪟 Generating Windows ICO...');
  
  try {
    // png-to-ico peut être une fonction ou un objet avec une méthode
    let pngToIcoModule = require('png-to-ico');
    let pngToIco = typeof pngToIcoModule === 'function' 
      ? pngToIcoModule 
      : (pngToIcoModule.default || pngToIcoModule.convert);
    
    if (!pngToIco) {
      // Essayer avec to-ico comme alternative
      try {
        const toIco = require('to-ico');
        
        // Utiliser les tailles standard pour ICO
        const icoSizes = [16, 32, 48, 256];
        const pngBuffers = icoSizes.map(size => {
          const pngPath = path.join(ICONS_DIR, `app-icon-${size}.png`);
          return fs.readFileSync(pngPath);
        });
        
        const icoBuffer = await toIco(pngBuffers);
        fs.writeFileSync(path.join(ICONS_DIR, 'app.ico'), icoBuffer);
        console.log('  ✅ app.ico (via to-ico)');
        
        fs.writeFileSync(path.join(ICONS_DIR, 'installer.ico'), icoBuffer);
        console.log('  ✅ installer.ico');
        return;
      } catch (e) {
        console.log('  ⚠️  to-ico not available either');
      }
      
      throw new Error('No ICO converter available');
    }
    
    // Utiliser les tailles standard pour ICO
    const icoSizes = [16, 32, 48, 64, 128, 256];
    const pngPaths = icoSizes.map(size => path.join(ICONS_DIR, `app-icon-${size}.png`));
    
    // Vérifier que tous les fichiers existent
    for (const pngPath of pngPaths) {
      if (!fs.existsSync(pngPath)) {
        console.error(`  ❌ Missing: ${pngPath}`);
        return;
      }
    }
    
    const icoBuffer = await pngToIco(pngPaths);
    fs.writeFileSync(path.join(ICONS_DIR, 'app.ico'), icoBuffer);
    console.log('  ✅ app.ico');
    
    // Créer aussi installer.ico (même fichier)
    fs.writeFileSync(path.join(ICONS_DIR, 'installer.ico'), icoBuffer);
    console.log('  ✅ installer.ico');
    
  } catch (error) {
    console.error('  ❌ Error generating ICO:', error.message);
    console.log('  💡 Try: npm install to-ico');
  }
}

async function generateIcns() {
  console.log('🍎 Generating macOS ICNS...');
  console.log('  ⚠️  ICNS generation requires macOS iconutil or a third-party tool');
  console.log('  💡 On macOS, run: iconutil -c icns iconset.iconset');
  console.log('  💡 Or use: npm install png2icons');
  
  try {
    // Essayer avec png2icons si disponible
    const png2icons = require('png2icons');
    
    const png512 = fs.readFileSync(path.join(ICONS_DIR, 'app-icon-512.png'));
    const icnsBuffer = png2icons.createICNS(png512, png2icons.BICUBIC, 0);
    
    if (icnsBuffer) {
      fs.writeFileSync(path.join(ICONS_DIR, 'app.icns'), icnsBuffer);
      console.log('  ✅ app.icns');
    }
  } catch (error) {
    console.log('  ⚠️  png2icons not available, skipping ICNS generation');
    console.log('  💡 Install: npm install png2icons');
  }
}

async function main() {
  console.log('🎨 Clipper Pro Icon Generator');
  console.log('============================\n');
  
  // Vérifier que le SVG source existe
  if (!fs.existsSync(SVG_SOURCE)) {
    console.error('❌ SVG source not found:', SVG_SOURCE);
    process.exit(1);
  }
  
  console.log('📂 Source:', SVG_SOURCE);
  console.log('📂 Output:', ICONS_DIR);
  console.log('');
  
  try {
    await generateAppIcons();
    console.log('');
    
    await generateTrayIcons();
    console.log('');
    
    await generateExtensionIcons();
    console.log('');
    
    await generateIco();
    console.log('');
    
    await generateIcns();
    console.log('');
    
    console.log('✅ Icon generation complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
