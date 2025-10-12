// scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icons/sparkles-gradient-512.svg');
const outputDir = path.join(__dirname, '../assets/icons');

async function generateIcons() {
  // Vérifier que le fichier SVG existe
  if (!fs.existsSync(svgPath)) {
    console.error('❌ SVG source file not found:', svgPath);
    process.exit(1);
  }

  // Créer le dossier de sortie s'il n'existe pas
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sizes = [16, 32, 48, 64, 128, 256, 512];

  console.log('🎨 Generating PNG icons from SVG...');

  for (const size of sizes) {
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `app-icon-${size}.png`));

      console.log(`✅ Generated app-icon-${size}.png`);
    } catch (error) {
      console.error(`❌ Error generating app-icon-${size}.png:`, error.message);
    }
  }

  // Icône tray spécifique (16x16)
  try {
    await sharp(svgPath)
      .resize(16, 16)
      .png()
      .toFile(path.join(outputDir, 'tray-icon-16.png'));

    console.log('✅ Generated tray-icon-16.png');
  } catch (error) {
    console.error('❌ Error generating tray-icon-16.png:', error.message);
  }

  console.log('✨ All icons generated successfully!');
}

generateIcons().catch(console.error);