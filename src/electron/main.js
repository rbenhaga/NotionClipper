// src/electron/main.js - Version complète et sécurisée

const { app, BrowserWindow, ipcMain, globalShortcut, shell, Tray, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');
const fs = require('fs');

let mainWindow;
let backendProcess;
let tray = null;
let viteProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 20, y: 20 },
    backgroundColor: '#1a1a1a',
    show: false,
    skipTaskbar: false,
  });

  // Configuration CSP pour le développement uniquement
  if (isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' http://localhost:* ws://localhost:*; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "img-src 'self' data: https: http:; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "connect-src 'self' http://localhost:* ws://localhost:* https:;"
          ]
        }
      });
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Ouvrir DevTools uniquement si nécessaire
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../react/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Enregistrer le raccourci global
  const shortcut = process.platform === 'darwin' ? 'Command+Shift+C' : 'Ctrl+Shift+C';
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
        label: 'Quitter',
        click: () => {
          app.isQuiting = true;
          let killed = false;
          if (backendProcess) {
            try {
              backendProcess.kill();
              killed = true;
            } catch (e) {
              console.error('Erreur lors de l\'arrêt du backend :', e);
            }
          }
          const pidFile = path.join(process.cwd(), 'notion_backend.pid');
          if (!killed && fs.existsSync(pidFile)) {
            try {
              const pid = parseInt(fs.readFileSync(pidFile, 'utf-8'), 10);
              if (pid && !isNaN(pid)) {
                process.kill(pid, 'SIGTERM');
              }
            } catch (e) {
              console.error('Erreur lors du kill via PID file :', e);
            }
          }
          setTimeout(() => {
            if (mainWindow) mainWindow.destroy();
            app.quit();
          }, 2000);
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

  // Quand on clique sur la croix, on cache la fenêtre (elle disparaît de la barre des tâches)
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
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
    if (code !== 0 && code !== null) {
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
  if (mainWindow) mainWindow.close();
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