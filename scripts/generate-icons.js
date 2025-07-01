const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const toIco = require('to-ico');

async function generateIcons() {
  const assetsDir = path.join(__dirname, '../assets');
  
  console.log('🎨 Génération des icônes...');
  
  // 1. Logo principal (violet)
  const mainLogoPath = path.join(assetsDir, 'sparkles-logo.svg');
  
  // PNG principal
  await sharp(mainLogoPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  
  // 2. Icône barre système (noir sur blanc)
  const trayIconPath = path.join(assetsDir, 'tray-icon-template.svg');
  
  // Versions PNG pour la barre système
  await sharp(trayIconPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(assetsDir, 'tray-icon.png'));
  
  await sharp(trayIconPath)
    .resize(16, 16)
    .png()
    .toFile(path.join(assetsDir, 'tray-icon-16.png'));
  
  // @2x pour macOS
  await sharp(trayIconPath)
    .resize(64, 64)
    .png()
    .toFile(path.join(assetsDir, 'tray-icon@2x.png'));
  
  // 3. Générer .ico pour Windows
  console.log('🪟 Génération du fichier .ico...');
  
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const iconBuffers = [];
  
  for (const size of sizes) {
    const buffer = await sharp(mainLogoPath)
      .resize(size, size)
      .png()
      .toBuffer();
    iconBuffers.push(buffer);
  }
  
  const icoBuffer = await toIco(iconBuffers);
  await fs.writeFile(path.join(assetsDir, 'icon.ico'), icoBuffer);
  
  console.log('✅ Toutes les icônes ont été générées !');
}

generateIcons().catch(console.error);