// src/electron/main.js
const { app, BrowserWindow, ipcMain, shell, globalShortcut, Tray, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let tray = null;
let backendProcess = null;

// Configuration de la fenêtre
const WINDOW_CONFIG = {
  width: 1000,
  height: 700,
  minWidth: 800,
  minHeight: 600,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    webSecurity: true
  },
  frame: false,
  show: false,
  icon: path.join(__dirname, '../../assets/icon.png'),
  backgroundColor: '#1a1b26',
  titleBarStyle: 'hidden',
  trafficLightPosition: { x: 20, y: 20 }
};

// Créer la fenêtre principale
function createWindow() {
  mainWindow = new BrowserWindow(WINDOW_CONFIG);

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../react/build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Raccourci global pour afficher/masquer
  const shortcut = process.platform === 'darwin' ? 
    'Command+Shift+C' : 'Ctrl+Shift+C';
  const ret = globalShortcut.register(shortcut, () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  if (!ret) {
    console.log('Échec de l\'enregistrement du raccourci global');
  }

  // Gérer le refresh de l'app
  ipcMain.on('refresh-app', () => {
    if (mainWindow) {
      mainWindow.webContents.send('refresh-app');
    }
  });

  // Gestion du tray (toujours visible)
  if (!tray) {
    tray = new Tray(path.join(__dirname, '../../assets/tray-icon.png'));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Afficher',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Fermer la fenêtre',
        click: () => {
          if (mainWindow) {
            mainWindow.hide();
          }
        }
      },
      {
        label: 'Quitter l\'application',
        click: () => {
          quitApplication();
        }
      }
    ]);
    tray.setToolTip('Notion Clipper Pro');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }

  // Quand on clique sur la croix, on cache la fenêtre par défaut
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

// Fonction pour quitter proprement l'application
function quitApplication() {
  app.isQuiting = true;
  
  // Arrêter le backend
  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (e) {
      console.error('Erreur lors de l\'arrêt du backend :', e);
    }
  }
  
  // Essayer de tuer via le PID file
  const pidFile = path.join(process.cwd(), 'notion_backend.pid');
  if (fs.existsSync(pidFile)) {
    try {
      const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'), 10);
      if (pid && !isNaN(pid)) {
        process.kill(pid, 'SIGTERM');
      }
      fs.unlinkSync(pidFile);
    } catch (e) {
      console.error('Erreur lors du kill via PID file :', e);
    }
  }
  
  // Fermer toutes les fenêtres et quitter
  if (mainWindow) {
    mainWindow.destroy();
  }
  
  setTimeout(() => {
    app.quit();
  }, 500);
}

// Démarrer le backend Python
function startBackend() {
  if (isDev) {
    console.log('Mode développement - Backend doit être lancé séparément');
    return;
  }

  const backendPath = path.join(process.resourcesPath, 'app', 'notion_backend.py');
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';

  backendProcess = spawn(pythonPath, [backendPath], {
    cwd: path.dirname(backendPath),
    env: { ...process.env, PYTHONUNBUFFERED: '1' }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    // Redémarrer si crash
    if (code !== 0 && code !== null && !app.isQuiting) {
      setTimeout(startBackend, 5000);
    }
  });
}

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('open-external', async (event, url) => {
  // Validation de l'URL pour la sécurité
  if (url.startsWith('http://') || url.startsWith('https://')) {
    await shell.openExternal(url);
  }
});

ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.hide();
});

// Nouveau handler pour quitter l'application
ipcMain.handle('app-quit', () => {
  quitApplication();
});

// Application Events
app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (backendProcess) {
    backendProcess.kill();
  }
});

// Empêcher la navigation externe
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
  
  contents.on('new-window', async (event, navigationUrl) => {
    event.preventDefault();
    await shell.openExternal(navigationUrl);
  });
});