const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Démarrage du mode développement...');

// Vérifier si Python est disponible
const checkPython = () => {
  return new Promise((resolve, reject) => {
    const pythonCheck = spawn('python', ['--version'], {
      stdio: 'pipe',
      shell: true
    });
    
    pythonCheck.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Python détecté');
        resolve();
      } else {
        console.error('❌ Python non trouvé. Veuillez installer Python 3.8+');
        reject(new Error('Python not found'));
      }
    });
  });
};

// Installer les dépendances Python si nécessaire
const installPythonDeps = () => {
  return new Promise((resolve, reject) => {
    console.log('📦 Vérification des dépendances Python...');
    const pipInstall = spawn('pip', ['install', '-r', 'requirements.txt'], {
      stdio: 'inherit',
      shell: true
    });
    
    pipInstall.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Dépendances Python installées');
        resolve();
      } else {
        console.error('❌ Erreur lors de l\'installation des dépendances Python');
        reject(new Error('Failed to install Python dependencies'));
      }
    });
  });
};

// Lancer le backend Python
const startBackend = () => {
  return new Promise((resolve, reject) => {
    console.log('🐍 Démarrage du backend Python...');
    
    const backend = spawn('python', ['notion_backend.py'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ELECTRON_RUN: 'true' }
    });
    
    backend.on('error', (error) => {
      console.error('❌ Erreur backend:', error);
      reject(error);
    });
    
    // Attendre un peu pour que le backend démarre
    setTimeout(() => {
      console.log('✅ Backend Python démarré');
      resolve(backend);
    }, 2000);
  });
};

// Lancer Vite
const startFrontend = () => {
  return new Promise((resolve, reject) => {
    console.log('⚡ Démarrage du frontend Vite...');
    
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, 'src/react'),
      stdio: 'inherit',
      shell: true
    });
    
    frontend.on('error', (error) => {
      console.error('❌ Erreur frontend:', error);
      reject(error);
    });
    
    // Attendre que Vite soit prêt
    setTimeout(() => {
      console.log('✅ Frontend Vite démarré');
      resolve(frontend);
    }, 5000);
  });
};

// Lancer Electron
const startElectron = () => {
  return new Promise((resolve, reject) => {
    console.log('🔌 Démarrage d\'Electron...');
    
    const electron = spawn('electron', ['.', '--dev'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });
    
    electron.on('error', (error) => {
      console.error('❌ Erreur Electron:', error);
      reject(error);
    });
    
    console.log('✅ Electron démarré');
    resolve(electron);
  });
};

// Gestion des erreurs et arrêt propre
const handleExit = (processes) => {
  const cleanup = () => {
    console.log('\n🛑 Arrêt des processus...');
    processes.forEach(process => {
      if (process && !process.killed) {
        process.kill('SIGTERM');
      }
    });
    process.exit(0);
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
};

// Séquence de démarrage
async function startDev() {
  try {
    await checkPython();
    await installPythonDeps();
    
    const processes = [];
    
    const backend = await startBackend();
    processes.push(backend);
    
    const frontend = await startFrontend();
    processes.push(frontend);
    
    const electron = await startElectron();
    processes.push(electron);
    
    handleExit(processes);
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error.message);
    process.exit(1);
  }
}

startDev(); 