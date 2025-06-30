const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let pythonProcess;
let tray;

// Démarrer le backend Python
function startPythonBackend() {
  const script = path.join(__dirname, 'notion_backend.py');
  
  // Utiliser python ou python3 selon la disponibilité
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  pythonProcess = spawn(pythonCmd, [script]);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
  });
  
  pythonProcess.on('error', (error) => {
    console.error(`Failed to start Python backend: ${error}`);
  });
}

function createWindow() {
  // Fenêtre principale - format horizontal
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 700,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    frame: false, // Fenêtre sans bordure pour un look moderne
    transparent: false, // Désactivé pour éviter les problèmes
    backgroundColor: '#ffffff',
    resizable: true,
    icon: path.join(__dirname, 'assets/icon.png'), // Optionnel
    show: false // Ne pas montrer immédiatement
  });

  // Montrer la fenêtre quand elle est prête
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // En mode dev, créer un fichier HTML simple
  const isDev = process.argv.includes('--dev') || !fs.existsSync(path.join(__dirname, 'build/index.html'));
  
  if (isDev) {
    // Charger directement l'app React
    mainWindow.loadFile(path.join(__dirname, 'public/index.html'));
    
    // Injecter le script React après chargement
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.executeJavaScript(`
        // Charger React et l'app
        const script = document.createElement('script');
        script.src = '../src/index.js';
        script.type = 'module';
        document.body.appendChild(script);
      `);
    });
    
    // NE PAS ouvrir les devtools automatiquement
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('build/index.html');
  }

  // Gérer la fermeture
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Créer l'icône dans la barre système (si possible)
function createTray() {
  // Essayer plusieurs chemins pour l'icône
  const possiblePaths = [
    path.join(__dirname, 'public', 'tray-icon.png'),
    path.join(__dirname, 'public', 'icon.png'),
    path.join(__dirname, 'assets', 'tray-icon.png'),
    path.join(__dirname, 'assets', 'icon.png'),
    path.join(__dirname, 'tray-icon.png'),
    path.join(__dirname, 'icon.png')
  ];
  
  let trayIconPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      trayIconPath = p;
      console.log(`Found tray icon at: ${p}`);
      break;
    }
  }
  
  if (!trayIconPath) {
    console.log('Tray icon not found in any location, skipping tray creation');
    console.log('Searched paths:', possiblePaths);
    return;
  }
  
  try {
    tray = new Tray(trayIconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Ouvrir Notion Clipper', 
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        }
      },
      { type: 'separator' },
      { 
        label: 'Rafraîchir le cache', 
        click: () => {
          mainWindow?.webContents.send('refresh-cache');
        }
      },
      { type: 'separator' },
      { 
        label: 'Quitter', 
        click: () => {
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('Notion Clipper Pro');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
}

// IPC pour la communication avec le renderer
ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.hide();
});

// Fonction pour enregistrer le raccourci global
function registerGlobalShortcut() {
  // Liste des raccourcis à essayer
  const shortcuts = [
    process.platform === 'darwin' ? 'Command+Shift+N' : 'Ctrl+Shift+N',
    process.platform === 'darwin' ? 'Command+Shift+C' : 'Ctrl+Shift+C',
    process.platform === 'darwin' ? 'Command+Alt+N' : 'Ctrl+Alt+N',
    process.platform === 'darwin' ? 'Command+Alt+C' : 'Ctrl+Alt+C'
  ];
  
  let registered = false;
  let registeredShortcut = null;
  
  // Essayer d'enregistrer chaque raccourci
  for (const shortcut of shortcuts) {
    try {
      // D'abord désenregistrer si déjà pris
      if (globalShortcut.isRegistered(shortcut)) {
        console.log(`Shortcut ${shortcut} is already registered, trying to unregister...`);
        globalShortcut.unregister(shortcut);
      }
      
      const success = globalShortcut.register(shortcut, () => {
        console.log('Global shortcut triggered');
        
        if (mainWindow) {
          if (mainWindow.isVisible() && mainWindow.isFocused()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.moveTop();
            // Sur Windows, forcer au premier plan
            if (process.platform === 'win32') {
              mainWindow.setAlwaysOnTop(true);
              setTimeout(() => mainWindow.setAlwaysOnTop(false), 100);
            }
          }
        } else {
          createWindow();
        }
      });
      
      if (success) {
        console.log(`✅ Global shortcut ${shortcut} registered successfully`);
        registered = true;
        registeredShortcut = shortcut;
        
        // Afficher une notification si ce n'est pas le raccourci par défaut
        if (shortcut !== shortcuts[0] && mainWindow) {
          mainWindow.webContents.executeJavaScript(`
            console.log('Raccourci enregistré: ${shortcut}');
            if (window.showNotification) {
              window.showNotification('Raccourci: ${shortcut}', 'info');
            }
          `);
        }
        break;
      }
    } catch (error) {
      console.error(`Failed to register ${shortcut}:`, error);
    }
  }
  
  if (!registered) {
    console.error('❌ Failed to register any global shortcut');
    console.log('All shortcuts might be in use by other applications');
    
    // Créer quand même un menu dans la barre système pour accéder à l'app
    if (tray) {
      console.log('You can still access the app from the system tray');
    }
  }
  
  return registeredShortcut;
}

// Démarrage de l'application
app.whenReady().then(() => {
  // Attendre un peu que le backend Python démarre
  setTimeout(() => {
    createWindow();
    createTray();
    registerGlobalShortcut();
  }, 2000);
  
  startPythonBackend();
});

app.on('window-all-closed', () => {
  // Sur macOS, garder l'app active même sans fenêtre
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
  // Nettoyer
  globalShortcut.unregisterAll();
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// Gérer les erreurs non interceptées
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});