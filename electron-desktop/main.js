/**
 * HamsterDesk — Electron Main Process
 *
 * Creates a frameless, always-on-top floating window anchored to the
 * right edge of the macOS screen. Manages tray icon and FastAPI sidecar.
 */

const { app, BrowserWindow, Tray, Menu, screen, nativeImage, ipcMain, session, systemPreferences } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let backendProcess = null;

const IS_DEV = process.env.ELECTRON_DEV === 'true';
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '8000', 10);
const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT || '3000', 10);
const FRONTEND_URL = IS_DEV ? `http://localhost:${FRONTEND_PORT}` : `file://${path.join(__dirname, '../frontend/out/index.html')}`;

// Dimensions for modes
const PET_WIDTH = 340;
const PET_HEIGHT = 540;
const COMPACT_WIDTH = 380;
const COMPACT_HEIGHT = 680;
const DASHBOARD_WIDTH = 1100;
const DASHBOARD_HEIGHT = 760;

// Smallest sizes a user can resize each resizable mode to (pet mode is fixed-size).
const MIN_SIZE = {
  compact: { width: 340, height: 520 },
  fullscreen: { width: 760, height: 520 },
};
const MODE_ALIASES = { small: 'pet', sidebar: 'compact', dashboard: 'fullscreen' };

let lastPetPosition = { x: null, y: null };
let currentMode = 'pet';
let maximized = false;
let preMaximizeBounds = null;
// Last size/position the user chose for each resizable mode, restored on re-entry.
const savedBounds = { compact: null, fullscreen: null };

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
    // Native maximize / fullscreen break a frameless transparent window on macOS
    // (black backdrop, no way back, setBounds ignored). "Fill screen" is handled
    // by the window:toggle-maximize IPC instead.
    maximizable: false,
    fullscreenable: false,
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

  // Forward renderer console logs & errors directly to the terminal stdout/stderr
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const srcBasename = sourceId ? path.basename(sourceId) : '';
    if (level >= 2) {
      console.error(`[Renderer ERROR] ${message} (${srcBasename}:${line})`);
    } else if (level === 1) {
      console.warn(`[Renderer WARN] ${message}`);
    } else {
      console.log(`[Renderer LOG] ${message}`);
    }
  });

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

// ── Window Mode & Bounds Helpers ─────────────────────────────────

function workAreaFor(bounds) {
  return screen.getDisplayMatching(bounds).workArea;
}

// Keep a rect fully inside the work area (shrinking it if it is larger).
function fitToArea(b, area) {
  const width = Math.min(b.width, area.width);
  const height = Math.min(b.height, area.height);
  const x = Math.min(Math.max(b.x, area.x), area.x + area.width - width);
  const y = Math.min(Math.max(b.y, area.y), area.y + area.height - height);
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

function sendWindowState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('window:state', { mode: currentMode, maximized });
  }
}

// macOS ignores setBounds while a window is in native fullscreen / maximized,
// so leave those states before applying a new size.
function withNormalWindow(fn) {
  if (mainWindow.isFullScreen()) {
    mainWindow.once('leave-full-screen', () => fn());
    mainWindow.setFullScreen(false);
    return;
  }
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  fn();
}

function targetBoundsFor(mode, current) {
  const area = workAreaFor(current);
  if (mode === 'pet') {
    const x = lastPetPosition.x ?? current.x + current.width - PET_WIDTH;
    const y = lastPetPosition.y ?? current.y;
    return fitToArea({ x, y, width: PET_WIDTH, height: PET_HEIGHT }, area);
  }
  if (mode === 'compact') {
    if (savedBounds.compact) return fitToArea(savedBounds.compact, area);
    // Grow out of the pet's spot, keeping its right edge so it stays docked.
    const x = current.x + current.width - COMPACT_WIDTH;
    return fitToArea({ x, y: current.y, width: COMPACT_WIDTH, height: COMPACT_HEIGHT }, area);
  }
  if (savedBounds.fullscreen) return fitToArea(savedBounds.fullscreen, area);
  const width = Math.min(DASHBOARD_WIDTH, area.width - 40);
  const height = Math.min(DASHBOARD_HEIGHT, area.height - 40);
  return {
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    width,
    height,
  };
}

function applyMode(mode) {
  const current = mainWindow.getBounds();
  if (mode === currentMode) {
    sendWindowState();
    return;
  }
  // Remember where the user left things before switching away.
  if (currentMode === 'pet') {
    lastPetPosition = { x: current.x, y: current.y };
  } else {
    savedBounds[currentMode] = maximized ? preMaximizeBounds : current;
  }
  const target = targetBoundsFor(mode, current);
  currentMode = mode;
  maximized = false;
  preMaximizeBounds = null;
  mainWindow.setAlwaysOnTop(mode !== 'fullscreen');
  // No animation: animated resizes left the UI drawn at the old size mid-switch.
  mainWindow.setBounds(target, false);
  if (mode === 'fullscreen') mainWindow.focus();
  sendWindowState();
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
    if (maximized) {
      // Dragging a filled window "un-fills" it.
      maximized = false;
      preMaximizeBounds = null;
      sendWindowState();
    }
  });

  ipcMain.on('window:start-drag', () => {
    // No-op acknowledgement — renderer uses this to signal drag start
  });

  // 4 Window Modes: 'minimized' | 'pet' | 'compact' | 'fullscreen'
  ipcMain.on('window:set-mode', (_event, rawMode) => {
    if (!mainWindow) return;
    const mode = MODE_ALIASES[rawMode] || rawMode;
    if (mode === 'minimized') {
      mainWindow.minimize();
      return;
    }
    if (!['pet', 'compact', 'fullscreen'].includes(mode)) return;
    withNormalWindow(() => applyMode(mode));
  });

  // Custom edge/corner resizing (frameless transparent windows can't be resized natively).
  ipcMain.on('window:set-bounds', (_event, b) => {
    if (!mainWindow || currentMode === 'pet' || !b) return;
    if (![b.x, b.y, b.width, b.height].every(Number.isFinite)) return;
    const min = MIN_SIZE[currentMode];
    const area = workAreaFor(mainWindow.getBounds());
    const width = Math.round(Math.min(Math.max(b.width, min.width), area.width));
    const height = Math.round(Math.min(Math.max(b.height, min.height), area.height));
    const edge = String(b.edge || '');
    // When a size is clamped, keep the edge opposite the dragged one pinned in place.
    const x = Math.round(edge.includes('w') ? b.x + b.width - width : b.x);
    const y = Math.round(edge.includes('n') ? b.y + b.height - height : b.y);
    const next = { x, y, width, height };
    mainWindow.setBounds(next, false);
    savedBounds[currentMode] = next;
    if (maximized) {
      maximized = false;
      preMaximizeBounds = null;
      sendWindowState();
    }
  });

  // "Fill screen": dashboard fills the work area, sidebar fills the screen height.
  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow || currentMode === 'pet') return;
    withNormalWindow(() => {
      const current = mainWindow.getBounds();
      const area = workAreaFor(current);
      if (maximized) {
        mainWindow.setBounds(fitToArea(preMaximizeBounds || targetBoundsFor(currentMode, current), area), false);
        maximized = false;
        preMaximizeBounds = null;
      } else {
        preMaximizeBounds = current;
        const target = currentMode === 'compact'
          ? fitToArea({ x: current.x, y: area.y, width: current.width, height: area.height }, area)
          : { x: area.x, y: area.y, width: area.width, height: area.height };
        mainWindow.setBounds(target, false);
        maximized = true;
      }
      sendWindowState();
    });
  });

  ipcMain.handle('window:get-bounds', () => (mainWindow ? mainWindow.getBounds() : null));
  ipcMain.handle('window:get-state', () => ({ mode: currentMode, maximized }));

  ipcMain.on('buddy:update', (_event, buddyInfo) => {
    if (!buddyInfo) return;
    const { name, emoji } = buddyInfo;
    updateTrayMenu(name, emoji);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(`${emoji || '🐾'} ${name || 'Desktop Buddy'}`);
    }
  });
}

let trayAnimTimer = null;
let dockAnimTimer = null;
let currentBuddyName = 'Hammy';
let currentBuddyEmoji = '🐹';

function updateTrayMenu(name, emoji) {
  if (name) currentBuddyName = name;
  if (emoji) currentBuddyEmoji = emoji;
  if (!tray || tray.isDestroyed()) return;

  tray.setToolTip(`${currentBuddyName} — Desktop Buddy ${currentBuddyEmoji}`);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Show ${currentBuddyName} ${currentBuddyEmoji}`,
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
      label: `Quit ${currentBuddyName}`,
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);
}

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
  updateTrayMenu(currentBuddyName, currentBuddyEmoji);

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

function setupMediaPermissions() {
  const allowed = new Set(['media', 'audioCapture', 'microphone']);

  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowed.has(permission));
  });

  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    return allowed.has(permission);
  });

  if (process.platform === 'darwin' && systemPreferences) {
    try {
      const status = systemPreferences.getMediaAccessStatus ? systemPreferences.getMediaAccessStatus('microphone') : 'unknown';
      console.log(`[Mic] Current macOS microphone status: ${status}`);
      if (status !== 'granted' && systemPreferences.askForMediaAccess) {
        systemPreferences.askForMediaAccess('microphone').then((granted) => {
          console.log(`[Mic] macOS microphone access request result: ${granted ? 'GRANTED ✅' : 'DENIED ❌'}`);
        }).catch((err) => {
          console.error('[Mic] macOS microphone request error:', err);
        });
      }
    } catch (err) {
      console.error('[Mic] Error checking systemPreferences:', err);
    }
  }
}

app.whenReady().then(() => {
  if (IS_DEV) {
    console.log('🐹 Starting HamsterDesk in development mode...');
  }

  setupMediaPermissions();

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
