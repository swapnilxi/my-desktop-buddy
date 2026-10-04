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
    setMode: (mode) => ipcRenderer.send('window:set-mode', mode), // 'pet' | 'compact' | 'fullscreen' | 'minimized'
    moveBy: (deltaX, deltaY) => ipcRenderer.send('window:move-by', { deltaX, deltaY }),
    startDrag: () => ipcRenderer.send('window:start-drag'),
    updateBuddy: (buddyInfo) => ipcRenderer.send('buddy:update', buddyInfo),
    getBounds: () => ipcRenderer.invoke('window:get-bounds'),
    setBounds: (bounds) => ipcRenderer.send('window:set-bounds', bounds),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
    getState: () => ipcRenderer.invoke('window:get-state'),
    onState: (callback) => {
      const handler = (_event, state) => callback(state);
      ipcRenderer.on('window:state', handler);
      return () => ipcRenderer.removeListener('window:state', handler);
    },
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
