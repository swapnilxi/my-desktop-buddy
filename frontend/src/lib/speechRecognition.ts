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

    // Actually begin listening. Without this the recognizer is wired up but
    // never activates, which makes Tap-to-Talk a silent no-op.
    try {
      recognition.start();
    } catch (err) {
      // start() throws InvalidStateError if a session is already running.
      // Return null rather than firing onError: callers treat null as
      // "unavailable" and fall back to MediaRecorder themselves, so firing
      // onError here would start two recorders.
      console.warn('[SpeechRecognition start error]', err);
      return null;
    }

    return recognition;
  } catch (err) {
    console.error('[createBrowserSpeechRecognition error]', err);
    return null;
  }
}
