/**
 * HamsterDesk — Electron Preload Script
 *
 * Exposes safe APIs to the renderer process via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hamsterDesk', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    quit: () => ipcRenderer.send('window:quit'),
    toggleAlwaysOnTop: () => ipcRenderer.send('window:toggle-always-on-top'),
    setMode: (mode) => ipcRenderer.send('window:set-mode', mode), // 'minimized' | 'pet' | 'compact' | 'fullscreen'
    setClickThrough: (enabled) => ipcRenderer.send('window:set-click-through', enabled),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    /** Subscribe to View-mode picks from the tray / dock menu. Returns an unsubscribe. */
    onModeRequest: (callback) => {
      const handler = (_event, mode) => callback(mode);
      ipcRenderer.on('mode:request', handler);
      return () => ipcRenderer.removeListener('mode:request', handler);
    },
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    getAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
    moveBy: (deltaX, deltaY) => ipcRenderer.send('window:move-by', { deltaX, deltaY }),
    startDrag: () => ipcRenderer.send('window:start-drag'),
    updateBuddy: (buddyInfo) => ipcRenderer.send('buddy:update', buddyInfo),
  },

  // Platform info
  platform: process.platform,
  isElectron: true,

  // Native file dialog
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  selectFile: (filters) => ipcRenderer.invoke('dialog:select-file', filters),

  // Voice (native bridge)
  voice: {
    speakNative: (text) => ipcRenderer.invoke('voice:speak-native', text),
    stopSpeaking: () => ipcRenderer.send('voice:stop-speaking'),
  },
});
