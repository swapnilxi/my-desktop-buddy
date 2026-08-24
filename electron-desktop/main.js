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

  const iconPath = path.join(__dirname, 'assets', 'icon.png');

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
    icon: iconPath,
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

let trayAnimTimer = null;
let dockAnimTimer = null;

function loadIconFrames(size) {
  const assetsDir = path.join(__dirname, 'assets');
  const framePaths = [
    path.join(assetsDir, 'frame_0.png'),
    path.join(assetsDir, 'frame_1.png'),
    path.join(assetsDir, 'frame_2.png'),
    path.join(assetsDir, 'frame_3.png'),
  ];

  return framePaths.map((p) => {
    let img = nativeImage.createFromPath(p);
    if (!img.isEmpty() && size) {
      img = img.resize({ width: size, height: size });
    }
    return img;
  }).filter((img) => !img.isEmpty());
}

function createTray() {
  const trayFrames = loadIconFrames(20);
  const baseIcon = trayFrames[0] || nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 20, height: 20 });

  tray = new Tray(baseIcon);
  tray.setToolTip('Hammy — HamsterDesk 🐹');

  // Animated Menu Bar Tray Icon Loop (Realistic 3D breathing, blinking & ear flicks)
  let step = 0;
  if (trayAnimTimer) clearInterval(trayAnimTimer);
  trayAnimTimer = setInterval(() => {
    step++;
    if (!tray || tray.isDestroyed() || trayFrames.length === 0) return;

    if (step % 12 === 0) {
      // Blink frame
      tray.setImage(trayFrames[2] || baseIcon);
      setTimeout(() => {
        if (tray && !tray.isDestroyed()) tray.setImage(baseIcon);
      }, 160);
    } else if (step % 7 === 0) {
      // Ear flick / sniff frame
      tray.setImage(trayFrames[3] || baseIcon);
      setTimeout(() => {
        if (tray && !tray.isDestroyed()) tray.setImage(baseIcon);
      }, 200);
    } else if (step % 4 === 0) {
      // Subtle breath frame
      tray.setImage(trayFrames[1] || baseIcon);
      setTimeout(() => {
        if (tray && !tray.isDestroyed()) tray.setImage(baseIcon);
      }, 300);
    }
  }, 800);

  const contextMenu = Menu.buildFromTemplate([
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

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        if (mainWindow.isMinimized()) mainWindow.restore();
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
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const dockIcon = nativeImage.createFromPath(iconPath);
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon);
    }
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
