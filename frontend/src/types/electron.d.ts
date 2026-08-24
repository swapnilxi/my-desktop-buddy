export interface HamsterDeskAPI {
  window: {
    minimize: () => void;
    close: () => void;
    quit: () => void;
    toggleAlwaysOnTop: () => void;
    setMode: (mode: 'compact' | 'expanded') => void;
    moveBy: (deltaX: number, deltaY: number) => void;
    startDrag: () => void;
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
