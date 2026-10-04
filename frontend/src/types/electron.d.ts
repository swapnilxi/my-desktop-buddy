export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HamsterDeskAPI {
  window: {
    minimize: () => void;
    close: () => void;
    quit: () => void;
    toggleAlwaysOnTop: () => void;
    setMode: (mode: 'minimized' | 'pet' | 'compact' | 'fullscreen') => void;
    setClickThrough?: (enabled: boolean) => void;
    toggleMaximize?: () => void;
    onModeRequest?: (cb: (mode: string) => void) => (() => void) | undefined;
    isMaximized?: () => Promise<boolean>;
    getAlwaysOnTop?: () => Promise<boolean>;
    moveBy: (deltaX: number, deltaY: number) => void;
    startDrag: () => void;
    updateBuddy?: (info: { type: string; name: string; emoji: string }) => void;
    // Custom resize grips (optional so an older preload script keeps working).
    getBounds?: () => Promise<WindowBounds | null>;
    setBounds?: (bounds: WindowBounds & { edge?: string }) => void;
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
