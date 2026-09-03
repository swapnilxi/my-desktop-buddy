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

// Smallest window that still shows its own navigation controls. Below this the
// mode switcher and window buttons get clipped with no way to scroll to them.
const MIN_WIDTH = 300;
const MIN_HEIGHT = 260;

const MODE_SIZES = {
  pet: { width: PET_WIDTH, height: PET_HEIGHT },
  compact: { width: COMPACT_WIDTH, height: COMPACT_HEIGHT },
  fullscreen: { width: DASHBOARD_WIDTH, height: DASHBOARD_HEIGHT },
};

// Remember where the user put each mode, so switching away and back does not
// discard their position or their resize.
const savedBounds = { pet: null, compact: null, fullscreen: null };
let currentMode = 'pet';
// User preference, so mode switches stop silently re-pinning a window the user
// deliberately un-pinned. The dashboard overrides it to false either way.
let userWantsAlwaysOnTop = true;

// Mirrors MODES in frontend/src/components/Shell/WindowChrome.tsx.
const MODE_MENU = [
  { id: 'pet', label: 'Pet \u2014 floating buddy' },
  { id: 'compact', label: 'Sidebar \u2014 chat & tasks' },
  { id: 'fullscreen', label: 'Dashboard \u2014 full workspace' },
];

/**
 * Ask the renderer to switch mode, then reveal the window.
 *
 * The renderer decides which mode is rendered, so a native menu cannot simply
 * resize the window — it has to tell React or the two disagree.
 */
function requestMode(mode) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('mode:request', mode);
  revealWindow();
}

/** The work area of the display the window actually sits on (not always the primary). */
function currentWorkArea() {
  const bounds = mainWindow ? mainWindow.getBounds() : null;
  const display = bounds
    ? screen.getDisplayMatching(bounds)
    : screen.getPrimaryDisplay();
  // workArea includes the origin, so this respects the macOS menu bar, the
  // dock, and any secondary monitor's offset — workAreaSize alone does not.
  return display.workArea;
}

/** Fit width/height inside the work area and keep the whole window on-screen. */
function fitToWorkArea(area, width, height, x, y) {
  const w = Math.max(MIN_WIDTH, Math.min(width, area.width));
  const h = Math.max(MIN_HEIGHT, Math.min(height, area.height));
  const maxX = area.x + area.width - w;
  const maxY = area.y + area.height - h;
  return {
    width: w,
    height: h,
    x: Math.round(Math.min(Math.max(x, area.x), Math.max(area.x, maxX))),
    y: Math.round(Math.min(Math.max(y, area.y), Math.max(area.y, maxY))),
  };
}

// ── Window Creation ──────────────────────────────────────────────

function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;

  // Start in Pet / Small mode by default, clamped so it fits even on a small
  // or scaled display rather than hanging off the bottom of the screen.
  const startWidth = Math.min(PET_WIDTH, area.width - 20);
  const startHeight = Math.min(PET_HEIGHT, area.height - 20);

  const iconPath = path.join(__dirname, 'assets', 'icon.png');

  mainWindow = new BrowserWindow({
    width: startWidth,
    height: startHeight,
    x: area.x + Math.max(0, area.width - startWidth - 30),
    y: area.y + Math.max(0, Math.round((area.height - startHeight) / 2)),
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
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

  savedBounds.pet = mainWindow.getBounds();

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

  // A missing dev server or an unbuilt static export used to show nothing at
  // all — a transparent, frameless, empty window with no error anywhere.
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // aborted by a subsequent navigation
    console.error(`[Window] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    const hint = IS_DEV
      ? `Start the Next.js dev server first:<br><code>cd frontend &amp;&amp; npm run dev</code>`
      : `Build the frontend first:<br><code>cd frontend &amp;&amp; npm run build</code>`;
    mainWindow.webContents.loadURL(
      'data:text/html;charset=utf-8,' +
      encodeURIComponent(`<!doctype html><meta charset="utf-8">
        <body style="margin:0;display:grid;place-items:center;height:100vh;
          font:14px/1.6 -apple-system,system-ui,sans-serif;
          background:#140d09;color:#fffbf2;text-align:center">
          <div style="max-width:30rem;padding:2rem">
            <div style="font-size:2.5rem">\u{1F43E}</div>
            <h1 style="font-size:1.1rem;margin:.5rem 0">Desktop Buddy could not load its interface</h1>
            <p style="color:#d9c7b8">${hint}</p>
            <p style="color:#8c7665;font-size:12px">${errorDescription} \u2014 ${validatedURL}</p>
          </div>
        </body>`)
    );
  });

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
    if (!mainWindow) return;
    userWantsAlwaysOnTop = !userWantsAlwaysOnTop;
    // The dashboard is never pinned, so honour the preference only elsewhere.
    mainWindow.setAlwaysOnTop(currentMode !== 'fullscreen' && userWantsAlwaysOnTop);
  });

  ipcMain.handle('window:get-always-on-top', () => userWantsAlwaysOnTop);

  // The mode is called 'fullscreen' but was a hard-capped 1100x760 window with
  // no way to fill the screen. Maximize (rather than setFullScreen, which is
  // unreliable on a transparent frameless macOS window) gives it one.
  ipcMain.on('window:toggle-maximize', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      // Remember the pre-maximize bounds so restoring returns to them.
      savedBounds[currentMode] = mainWindow.getBounds();
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:is-maximized', () =>
    !!mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized());

  // Smooth pointer-driven window dragging from the renderer
  ipcMain.on('window:move-by', (event, { deltaX, deltaY }) => {
    if (!mainWindow) return;
    const b = mainWindow.getBounds();
    const nextX = Math.round(b.x + deltaX);
    const nextY = Math.round(b.y + deltaY);

    // Union of every display, so dragging across monitors still works, but the
    // window can never be pushed somewhere its own controls are unreachable.
    const displays = screen.getAllDisplays();
    const minX = Math.min(...displays.map((d) => d.workArea.x));
    const maxX = Math.max(...displays.map((d) => d.workArea.x + d.workArea.width));
    const minY = Math.min(...displays.map((d) => d.workArea.y));
    const maxY = Math.max(...displays.map((d) => d.workArea.y + d.workArea.height));

    // Always leave a grabbable strip of the window on screen.
    const KEEP_VISIBLE = 80;
    mainWindow.setPosition(
      Math.min(Math.max(nextX, minX - b.width + KEEP_VISIBLE), maxX - KEEP_VISIBLE),
      Math.min(Math.max(nextY, minY), maxY - KEEP_VISIBLE)
    );
  });

  ipcMain.on('window:start-drag', () => {
    // No-op acknowledgement — renderer uses this to signal drag start
  });

  // Pet mode is a transparent 340x540 rectangle sitting above every other app.
  // Without click-through, all of that empty space around the buddy silently
  // swallowed desktop clicks. The renderer turns this on while the pointer is
  // over the transparent backdrop and off again over the buddy and controls.
  ipcMain.on('window:set-click-through', (_event, enabled) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // forward:true keeps mousemove flowing so the renderer can tell when the
    // pointer re-enters an interactive element.
    mainWindow.setIgnoreMouseEvents(!!enabled, { forward: true });
  });

  // 4 Window Modes: 'minimized' | 'pet' | 'compact' | 'fullscreen'
  ipcMain.on('window:set-mode', (event, rawMode) => {
    if (!mainWindow) return;

    // Accept the historical aliases the renderer used to send.
    const aliases = { small: 'pet', sidebar: 'compact', dashboard: 'fullscreen' };
    const mode = aliases[rawMode] || rawMode;

    if (mode === 'minimized') {
      mainWindow.minimize();
      return;
    }

    const size = MODE_SIZES[mode];
    if (!size) return;

    // setBounds is ignored (or fights the OS) on a maximized window.
    if (mainWindow.isMaximized()) mainWindow.unmaximize();

    // Remember the outgoing mode's bounds, including any resize the user made,
    // so returning to it restores what they left rather than a canned rectangle.
    if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
      savedBounds[currentMode] = mainWindow.getBounds();
    }

    const area = currentWorkArea();
    const remembered = savedBounds[mode];
    const previous = savedBounds[currentMode] || mainWindow.getBounds();

    let target;
    if (remembered) {
      target = fitToWorkArea(area, remembered.width, remembered.height, remembered.x, remembered.y);
    } else if (mode === 'fullscreen') {
      // First visit to the dashboard: centre it on the current display.
      const w = Math.min(size.width, area.width - 40);
      const h = Math.min(size.height, area.height - 40);
      target = fitToWorkArea(
        area, w, h,
        area.x + Math.round((area.width - w) / 2),
        area.y + Math.round((area.height - h) / 2)
      );
    } else {
      // Keep the floating modes anchored where the user last had the window.
      target = fitToWorkArea(area, size.width, size.height, previous.x, previous.y);
    }

    // The dashboard is a workspace you focus on, so it must not sit above every
    // other app; the floating modes are companions, so they stay pinned unless
    // the user has explicitly unpinned them.
    mainWindow.setAlwaysOnTop(mode !== 'fullscreen' && userWantsAlwaysOnTop);

    currentMode = mode;
    savedBounds[mode] = target;
    // Refresh the tray/dock radio ticks so they reflect the new mode.
    updateTrayMenu();
    // Leaving click-through on outside pet mode would make the panel unusable.
    if (mode !== 'pet') mainWindow.setIgnoreMouseEvents(false);

    // Only the floating companion modes should follow the user across Spaces
    // and draw over full-screen apps; the dashboard is a normal workspace.
    mainWindow.setVisibleOnAllWorkspaces(mode !== 'fullscreen', {
      visibleOnFullScreen: mode !== 'fullscreen',
    });
    // animate:false — an animated resize races the renderer's instant DOM swap,
    // which showed the incoming mode stretched into the outgoing window size.
    mainWindow.setBounds(target, false);
  });

  ipcMain.on('buddy:update', (_event, buddyInfo) => {
    if (!buddyInfo) return;
    const { name, emoji } = buddyInfo;
    updateTrayMenu(name, emoji);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(`${emoji || '🐾'} ${name || 'Desktop Buddy'}`);
    }
  });
}

/** The one correct way to bring the buddy back — used by tray, dock and activate. */
function revealWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  // restore() first: a minimized window that is only show()n on macOS can stay
  // in the dock, which made the tray icon look broken.
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  // Minimizing drops the pin, so re-apply the user's preference on the way back.
  mainWindow.setAlwaysOnTop(currentMode !== 'fullscreen' && userWantsAlwaysOnTop);
}

let trayAnimTimer = null;
let dockAnimTimer = null;
let currentBuddyName = 'Hammy';
let currentBuddyEmoji = '🐹';

function updateTrayMenu(name, emoji) {
  if (name) currentBuddyName = name;
  if (emoji) currentBuddyEmoji = emoji;
  if (!tray || tray.isDestroyed()) {
    updateDockMenu();
    return;
  }

  tray.setToolTip(`${currentBuddyName} — Desktop Buddy ${currentBuddyEmoji}`);
  updateDockMenu();
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Show ${currentBuddyName} ${currentBuddyEmoji}`,
      click: revealWindow,
    },
    {
      // While the window is hidden or minimized the tray is the only way back,
      // and it could previously only Show/Hide — never return to a chosen mode.
      label: 'View mode',
      submenu: MODE_MENU.map((m) => ({
        label: m.label,
        type: 'radio',
        checked: currentMode === m.id,
        click: () => requestMode(m.id),
      })),
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
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // Only hide when the window is genuinely up front. When it is minimized or
    // just behind another app, a blind visible/hidden toggle hid it instead of
    // bringing it back — the opposite of what the click was for.
    if (mainWindow.isVisible() && !mainWindow.isMinimized() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      revealWindow();
    }
  });
}

function startBackend() {
  const http = require('http');
  const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/health`, (res) => {
    if (res.statusCode === 200) {
      console.log(`[Backend] FastAPI is already running on port ${BACKEND_PORT}.`);
    }
    res.resume();
  });
  req.setTimeout(2000, () => req.destroy());

  req.on('error', () => {
    console.log(`[Backend] Launching FastAPI sidecar on port ${BACKEND_PORT}...`);
    const backendDir = path.join(__dirname, '..', 'backend');

    backendProcess = spawn('python3', [
      '-m', 'uvicorn', 'main:app',
      // Loopback only: the sidecar is for this machine, and 0.0.0.0 published
      // the user's chat and API keys to every device on their network.
      '--host', '127.0.0.1',
      '--port', String(BACKEND_PORT),
      '--reload',
    ], {
      cwd: backendDir,
      stdio: 'pipe',
    });

    // Without this, a missing python3 raises an unhandled 'error' event and
    // takes the whole app down instead of just leaving the backend offline.
    backendProcess.on('error', (err) => {
      console.error('[Backend] Failed to launch FastAPI sidecar:', err.message);
      console.error('[Backend] Is python3 on PATH? The app will run with the backend offline.');
      backendProcess = null;
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

function updateDockMenu() {
  if (process.platform !== 'darwin' || !app.dock) return;
  app.dock.setMenu(Menu.buildFromTemplate([
    {
      label: `Show ${currentBuddyName} ${currentBuddyEmoji}`,
      click: revealWindow,
    },
    {
      label: 'View mode',
      submenu: MODE_MENU.map((m) => ({
        label: m.label,
        type: 'radio',
        checked: currentMode === m.id,
        click: () => requestMode(m.id),
      })),
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
  ]));
}

function setupDock() {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show();
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    const dockIcon = nativeImage.createFromPath(iconPath);
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon);
    }
    updateDockMenu();
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
      revealWindow();
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
