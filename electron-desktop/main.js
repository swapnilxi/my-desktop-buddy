/**
 * HamsterDesk — Electron Main Process
 *
 * Creates a frameless, always-on-top floating window anchored to the
 * right edge of the macOS screen. Manages tray icon and FastAPI sidecar.
 */

const { app, BrowserWindow, Tray, Menu, screen, nativeImage, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let backendProcess = null;

const IS_DEV = process.env.ELECTRON_DEV === 'true';
const FRONTEND_URL = IS_DEV ? 'http://localhost:3000' : `file://${path.join(__dirname, '../frontend/out/index.html')}`;
const BACKEND_PORT = 8000;

// Dimensions for modes
const PET_WIDTH = 200;
const PET_HEIGHT = 225;
const COMPACT_WIDTH = 380;
const COMPACT_HEIGHT = 680;
const DASHBOARD_WIDTH = 1100;
const DASHBOARD_HEIGHT = 760;

let lastPetPosition = { x: null, y: null };

// ── Window Creation ──────────────────────────────────────────────

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Start in Pet / Small mode by default
  const startWidth = PET_WIDTH;
  const startHeight = PET_HEIGHT;

  mainWindow = new BrowserWindow({
    width: startWidth,
    height: startHeight,
    x: screenWidth - startWidth - 30,
    y: Math.round((screenHeight - startHeight) / 2),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: true,
    minimizable: true,
    maximizable: true,
    skipTaskbar: false,
    hasShadow: false,
    roundedCorners: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Make Hammy float across all macOS spaces/desktops
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.loadURL(FRONTEND_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Hide on close unless app is quitting
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// ── IPC Handlers ─────────────────────────────────────────────────

function setupIPC() {
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.hide();
  });

  ipcMain.on('window:quit', () => {
    app.isQuitting = true;
    app.quit();
  });

  ipcMain.on('window:toggle-always-on-top', () => {
    if (mainWindow) {
      const isTop = mainWindow.isAlwaysOnTop();
      mainWindow.setAlwaysOnTop(!isTop);
    }
  });

  // Smooth pointer-driven window dragging from the renderer
  ipcMain.on('window:move-by', (event, { deltaX, deltaY }) => {
    if (!mainWindow) return;
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(Math.round(x + deltaX), Math.round(y + deltaY));
  });

  ipcMain.on('window:start-drag', () => {
    // No-op acknowledgement — renderer uses this to signal drag start
  });

  // 4 Window Modes: 'minimized' | 'pet' | 'compact' | 'fullscreen'
  ipcMain.on('window:set-mode', (event, mode) => {
    if (!mainWindow) return;
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const currentBounds = mainWindow.getBounds();

    if (mode === 'minimized') {
      mainWindow.minimize();
    } else if (mode === 'pet' || mode === 'small') {
      // Save or restore position within screen bounds
      let targetX = lastPetPosition.x ?? Math.min(Math.max(10, currentBounds.x), screenWidth - PET_WIDTH - 10);
      let targetY = lastPetPosition.y ?? Math.min(Math.max(10, currentBounds.y), screenHeight - PET_HEIGHT - 10);
      targetX = Math.min(Math.max(10, targetX), screenWidth - PET_WIDTH - 10);
      targetY = Math.min(Math.max(10, targetY), screenHeight - PET_HEIGHT - 10);

      mainWindow.setAlwaysOnTop(true);
      mainWindow.setBounds({
        x: targetX,
        y: targetY,
        width: PET_WIDTH,
        height: PET_HEIGHT,
      }, true);
    } else if (mode === 'compact' || mode === 'sidebar') {
      // Save current pet position before expanding
      if (currentBounds.width === PET_WIDTH) {
        lastPetPosition = { x: currentBounds.x, y: currentBounds.y };
      }

      let targetX = currentBounds.x;
      let targetY = currentBounds.y;

      if (targetX + COMPACT_WIDTH > screenWidth - 10) {
        targetX = screenWidth - COMPACT_WIDTH - 10;
      }
      if (targetY + COMPACT_HEIGHT > screenHeight - 10) {
        targetY = screenHeight - COMPACT_HEIGHT - 10;
      }
      targetX = Math.max(10, targetX);
      targetY = Math.max(10, targetY);

      mainWindow.setAlwaysOnTop(true);
      mainWindow.setBounds({
        x: targetX,
        y: targetY,
        width: COMPACT_WIDTH,
        height: COMPACT_HEIGHT,
      }, true);
    } else if (mode === 'fullscreen' || mode === 'dashboard') {
      // Save pet position before expanding
      if (currentBounds.width === PET_WIDTH) {
        lastPetPosition = { x: currentBounds.x, y: currentBounds.y };
      }

      const targetW = Math.min(DASHBOARD_WIDTH, screenWidth - 40);
      const targetH = Math.min(DASHBOARD_HEIGHT, screenHeight - 60);
      const targetX = Math.round((screenWidth - targetW) / 2);
      const targetY = Math.round((screenHeight - targetH) / 2);

      mainWindow.setAlwaysOnTop(false);
      mainWindow.setBounds({
        x: targetX,
        y: targetY,
        width: targetW,
        height: targetH,
      }, true);
    }
  });
}

// ── Tray Icon ────────────────────────────────────────────────────

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAbwAAAG8B8aLcQwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADOSURBVDiNpZMxDkIhEESHL2BhY6W9nb2NvYfwLPYexMrewkZLS9hYuAaLj/8T0cRJNjszO8MOi5lRj8vhXvENt8Bh+kcAYAPsA9fm/Rl4ArbAMfAInLbSGtcJGAlYOwuHuUgXwEcCJvESOAfuEjCM5/cRsOI9cJyBVbwDTqLpPZCLdAF0gWcbzFJq5fxZBE6B3TT+MgM7CT3oCriId8B5Kt/iD+DCfJzFFdoBu0nMTRD1zPaA63yAOz3Ac/G9Bh8G6YTJt4qv1wBnCfgEPmX/RcAn8cAAAAASUVORK5CYII='
  );
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip('Hammy — HamsterDesk 🐹');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Hammy',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Hide',
      click: () => {
        if (mainWindow) mainWindow.hide();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Hammy',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function startBackend() {
  const http = require('http');
  const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/health`, (res) => {
    if (res.statusCode === 200) {
      console.log(`[Backend] FastAPI is already running on port ${BACKEND_PORT}.`);
    }
  });

  req.on('error', () => {
    console.log(`[Backend] Launching FastAPI sidecar on port ${BACKEND_PORT}...`);
    const backendDir = path.join(__dirname, '..', 'backend');

    backendProcess = spawn('python3', [
      '-m', 'uvicorn', 'main:app',
      '--host', '0.0.0.0',
      '--port', String(BACKEND_PORT),
      '--reload',
    ], {
      cwd: backendDir,
      stdio: 'pipe',
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend] ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`[Backend] Process exited with code ${code}`);
    });
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

// ── App Lifecycle ────────────────────────────────────────────────

function setupDock() {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show();
    const dockMenu = Menu.buildFromTemplate([
      {
        label: 'Show Hammy 🐹',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: 'Hide',
        click: () => {
          if (mainWindow) mainWindow.hide();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Hammy',
        click: () => {
          app.isQuitting = true;
          app.quit();
        },
      },
    ]);
    app.dock.setMenu(dockMenu);
  }
}

app.whenReady().then(() => {
  if (IS_DEV) {
    console.log('🐹 Starting HamsterDesk in development mode...');
  }

  setupIPC();
  setupDock();
  startBackend();
  createTray();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopBackend();
});
