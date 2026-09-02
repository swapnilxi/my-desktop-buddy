/**
 * Browser / Apple Speech Recognition (Web Speech API)
 * Provides native on-device / browser speech recognition
 * (Apple Dictation on Safari / macOS WebKit, Chromium Speech on Chrome).
 */

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export interface BrowserRecognitionHandlers {
  onStart?: () => void;
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export function createBrowserSpeechRecognition(handlers: BrowserRecognitionHandlers) {
  if (!isSpeechRecognitionSupported()) return null;

  try {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      handlers.onStart?.();
    };

    recognition.onresult = (event: any) => {
      try {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          handlers.onResult(transcript);
        }
      } catch (e) {
        console.error('[SpeechRecognition result error]', e);
      }
    };

    recognition.onerror = (event: any) => {
      const errorMsg = event.error || 'Speech recognition error';
      console.warn('[SpeechRecognition error]', errorMsg);
      handlers.onError?.(errorMsg);
    };

    recognition.onend = () => {
      handlers.onEnd?.();
    };

    return recognition;
  } catch (err) {
    console.error('[createBrowserSpeechRecognition error]', err);
    return null;
  }
}
