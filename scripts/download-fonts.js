const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '../src/react/assets/fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}
const fonts = [
  { weight: '300', name: 'Light' },
  { weight: '400', name: 'Regular' },
  { weight: '500', name: 'Medium' },
  { weight: '600', name: 'SemiBold' },
  { weight: '700', name: 'Bold' }
];
console.log('📥 Téléchargement des fonts Inter...');
fonts.forEach(({ weight, name }) => {
  const url = `https://github.com/rsms/inter/raw/master/docs/font-files/Inter-${name}.woff2`;
  const filepath = path.join(fontsDir, `Inter-${name}.woff2`);
  if (fs.existsSync(filepath)) {
    console.log(`✓ Inter-${name}.woff2 existe déjà`);
    return;
  }
  const file = fs.createWriteStream(filepath);
  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`✅ Téléchargé Inter-${name}.woff2`);
    });
  }).on('error', (err) => {
    fs.unlink(filepath, () => {});
    console.error(`❌ Erreur téléchargement Inter-${name}.woff2:`, err.message);
  });
}); 