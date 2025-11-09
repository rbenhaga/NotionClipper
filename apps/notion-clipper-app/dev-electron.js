// Script de démarrage rapide pour le développement
// Charge .env une seule fois avant de lancer Electron
const path = require('path');
const { spawn } = require('child_process');

// Charger .env rapidement
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Trouver le chemin d'electron dans node_modules
const electronPath = require('electron');

// Lancer Electron avec les variables d'environnement déjà chargées
const electron = spawn(electronPath, ['dist/main.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' }
});

electron.on('close', (code) => {
  process.exit(code);
});
