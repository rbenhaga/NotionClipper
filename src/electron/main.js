const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, shell, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = process.argv.includes('--dev');

let mainWindow;
let pythonProcess;
let tray;

// Configuration du backend Python
function startPythonBackend() {
  const script = path.resolve('notion_backend.py');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  // En production, masquer la console Python
  const options = isDev ? {} : { 
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'ignore']
  };
  
  pythonProcess = spawn(pythonCmd, [script], options);
  
  if (isDev) {
    pythonProcess.stdout?.on('data', (data) => {
      console.log(`🐍 Backend: ${data}`);
    });
    
    pythonProcess.stderr?.on('data', (data) => {
      console.error(`❌ Backend Error: ${data}`);
    });
  }
  
  pythonProcess.on('error', (error) => {
    console.error(`❌ Failed to start Python backend: ${error}`);
  });
}

function createWindow() {
  // Obtenir les dimensions de l'écran principal
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  
  // Calculer la position centrée avec taille plus petite
  const windowWidth = 900;
  const windowHeight = 600;
  const x = Math.round((screenWidth - windowWidth) / 2);
  const y = Math.round((screenHeight - windowHeight) / 2);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 900,
    minHeight: 600,
    x: x,
    y: y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    backgroundColor: '#f7f6f3',
    titleBarStyle: 'hidden',
    resizable: true,
    show: false,
    skipTaskbar: false,
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  // Chargement intelligent selon le mode
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Dev tools désactivés par défaut
    // mainWindow.webContents.openDevTools();
  } else {
    const buildPath = path.join(__dirname, '../react/build/index.html');
    mainWindow.loadFile(buildPath);
  }

  // Affichage élégant
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    
    // S'assurer que la fenêtre est visible et pas cachée derrière la barre des tâches
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.setVisibleOnAllWorkspaces(false);
  });

  // Gestion des liens externes
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Events de la fenêtre
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Empêcher la fenêtre de se cacher derrière d'autres apps
  mainWindow.on('show', () => {
    mainWindow.focus();
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png');
  
  if (fs.existsSync(iconPath)) {
    tray = new Tray(iconPath);
    
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
        label: 'Raccourci: Ctrl+Shift+C',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Quitter',
        click: () => {
          app.quit();
        }
      }
    ]);
    
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Notion Clipper Pro');
    
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
  }
}

function registerGlobalShortcuts() {
  // Raccourci principal changé vers Ctrl+Shift+C
  const shortcut = globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        // Si l'app est visible, la mettre au premier plan et rafraîchir
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();
        
        // Envoyer un signal de rafraîchissement à l'app React
        mainWindow.webContents.send('refresh-app');
      } else {
        // Si l'app est cachée, la montrer
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();
      }
    } else {
      createWindow();
    }
  });

  if (!shortcut) {
    console.error('❌ Failed to register global shortcut');
  } else {
    console.log('✅ Global shortcut registered: Ctrl+Shift+C');
  }
}

// IPC Handlers pour la communication avec le renderer
ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('close-window', () => mainWindow?.hide());

// Lifecycle de l'application
app.whenReady().then(() => {
  console.log('🚀 Starting Notion Clipper Pro...');
  
  // Démarrer le backend en premier
  startPythonBackend();
  
  // Attendre un peu puis créer l'interface
  setTimeout(() => {
    createWindow();
    createTray();
    registerGlobalShortcuts();
  }, isDev ? 3000 : 1000);
});

app.on('window-all-closed', () => {
  // Garder l'app en arrière-plan sur toutes les plateformes
  console.log('🔄 App running in background');
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', (event) => {
  // Nettoyage propre
  globalShortcut.unregisterAll();
  
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM');
  }
  
  if (tray) {
    tray.destroy();
  }
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});