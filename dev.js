const { spawn } = require('child_process');
const path = require('path');

// Lancer le backend Python
const backend = spawn('python', ['notion_backend.py'], {
  stdio: 'inherit',
  shell: true
});

// Lancer Vite
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'src/react'),
  stdio: 'inherit',
  shell: true
});

// Attendre que Vite soit prêt puis lancer Electron
setTimeout(() => {
  const electron = spawn('electron', ['.', '--dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });
}, 5000); 