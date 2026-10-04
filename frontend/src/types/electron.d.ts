export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NativeWindowState {
  mode: 'pet' | 'compact' | 'fullscreen';
  maximized: boolean;
}

export interface HamsterDeskAPI {
  window: {
    minimize: () => void;
    close: () => void;
    quit: () => void;
    toggleAlwaysOnTop: () => void;
    setMode: (mode: 'minimized' | 'pet' | 'compact' | 'fullscreen') => void;
    moveBy: (deltaX: number, deltaY: number) => void;
    startDrag: () => void;
    updateBuddy?: (info: { type: string; name: string; emoji: string }) => void;
    // Optional so an older preload script keeps working.
    getBounds?: () => Promise<WindowBounds | null>;
    setBounds?: (bounds: WindowBounds & { edge?: string }) => void;
    toggleMaximize?: () => void;
    getState?: () => Promise<NativeWindowState>;
    onState?: (callback: (state: NativeWindowState) => void) => () => void;
  };
  platform: string;
  isElectron: boolean;
  selectDirectory: () => Promise<string | null>;
  selectFile: (filters?: Array<{ name: string; extensions: string[] }>) => Promise<string | null>;
  voice: {
    speakNative: (text: string) => Promise<void>;
    stopSpeaking: () => void;
  };
}

declare global {
  interface Window {
    hamsterDesk?: HamsterDeskAPI;
  }
}
