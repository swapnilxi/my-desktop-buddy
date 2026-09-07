'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { HamsterMood } from '@/lib/api';
import { getClientSavedConfig } from '@/lib/api';
import { useLiveVoice } from '@/lib/useLiveVoice';
import { stopSpeaking } from '@/lib/speech';
import { createBrowserSpeechRecognition, isSpeechRecognitionSupported } from '@/lib/speechRecognition';
import type { BuddyDefinition, BuddyType } from '../Buddies/types';
import { getBuddyDefinition } from '../Buddies/registry';
import BuddyGlyph from '../Buddies/BuddyGlyph';
import type { ConversationHandle } from '@/lib/useConversation';
import type { RequestStateFn } from '@/lib/useKrishnaCharacterState';

interface ChatPanelProps {
  onMoodChange: (mood: HamsterMood) => void;
  buddyType?: BuddyType | string;
  buddyName?: string;
  buddyDef?: BuddyDefinition;
  /**
   * Conversation state owned by the page, so switching window mode no longer
   * unmounts this panel and throws the history away.
   */
  conversation: ConversationHandle;
  /**
   * Krishna's richer character-state channel (useKrishnaCharacterState's
   * `requestState`), owned by app/page.tsx and threaded down here so the
   * live-voice hook — instantiated inside this panel — can feed it too.
   * Optional: Hamster/Panda panels simply never call it.
   */
  requestState?: RequestStateFn;
}

export default function ChatPanel({
  onMoodChange,
  buddyType = 'hamster',
  buddyName,
  buddyDef,
  conversation,
  requestState,
}: ChatPanelProps) {
  const effectiveDef = buddyDef || getBuddyDefinition(buddyType);
  const effectiveName = buddyName || effectiveDef.defaultName;
  const effectiveEmoji = effectiveDef.emoji;

  const {
    messages,
    input,
    setInput,
    isSending: isLoading,
    error,
    setError,
    voiceNotice,
    setVoiceNotice,
    useRag,
    setUseRag,
    send,
    sendVoice,
    appendLiveTurn,
    rememberSession,
    newSession,
    conversationId,
    gitaContext,
    removeVerseFromContext,
    clearVerseContext,
    explainVerse,
  } = conversation;

  // Streaming voice. Separate from the mic button on purpose: tap-to-talk is
  // one question and one answer, this is an open line you can interrupt.
  const live = useLiveVoice({
    conversationId,
    buddyName: effectiveName,
    onTurn: appendLiveTurn,
    onConversationId: rememberSession,
    onStatusChange: (s) => {
      if (s === 'speaking') onMoodChange('speaking');
      else if (s === 'thinking') onMoodChange('thinking');
      else if (s === 'listening') onMoodChange('listening');
      else onMoodChange('idle');
    },
    onPresentation: requestState,
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (overrideText?: string) => {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || isLoading) return;
    // Clear the draft only for typed sends; a transcript never sat in the box.
    if (overrideText === undefined) setInput('');
    await send(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const recognitionRef = useRef<any>(null);

  // ── Voice Input: record → Apple Speech or Gemini/Deepgram STT ──────────────
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
      recognitionRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
  }, []);

  const startMediaRecording = async () => {
    try {
      console.log('[Voice] Requesting microphone stream...');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err1) {
        console.warn('[Voice] Default getUserMedia({ audio: true }) failed:', err1);
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        console.log('[Voice] Enumerated media devices:', devices);
        const audioInputs = devices.filter((d) => d.kind === 'audioinput');
        if (audioInputs.length > 0) {
          const deviceId = audioInputs[0].deviceId;
          console.log('[Voice] Attempting getUserMedia with deviceId:', deviceId);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          });
        } else {
          throw err1;
        }
      }

      console.log('[Voice] Microphone stream acquired successfully!');
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        if (blob.size < 1000) {
          setError("Didn't catch that — try speaking a bit longer!");
          onMoodChange('idle');
          return;
        }
        // One request does transcribe → orchestrated reply → speech, instead
        // of three sequential round trips. The transcript comes back with the
        // reply, so nothing is appended to the chat until it is real.
        setIsTranscribing(true);
        try {
          await sendVoice(blob);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      onMoodChange('listening');
    } catch (err) {
      console.error('[Voice Microphone Error]', err);
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setError(`Microphone error: ${msg}. Check System Settings → Privacy & Security → Microphone.`);
      onMoodChange('idle');
    }
  };

  const startRecording = async () => {
    if (isRecording || isLoading || isTranscribing) return;
    setError(null);

    const saved = getClientSavedConfig();
    const sttPref = saved?.voice?.stt_provider || 'apple';

    // 1. Try Apple / Browser Native Speech Recognition first if preferred.
    //    Skipped in Electron, whose Chromium has no speech key — see
    //    useVoiceRecorder for the same guard.
    const inElectron = typeof window !== 'undefined' && !!window.hamsterDesk?.isElectron;
    if (sttPref === 'apple' && !inElectron && isSpeechRecognitionSupported()) {
      let receivedResult = false;
      const rec = createBrowserSpeechRecognition({
        onStart: () => {
          setIsRecording(true);
          onMoodChange('listening');
        },
        onResult: (transcript) => {
          receivedResult = true;
          setIsRecording(false);
          handleSend(transcript);
        },
        onError: (err) => {
          const benign = err === 'aborted' || err === 'no-speech';
          if (receivedResult || benign) {
            setIsRecording(false);
            if (benign && !receivedResult) {
              setError("Didn't catch that — try speaking a bit longer!");
              onMoodChange('idle');
            }
            return;
          }
          console.warn('[Speech Recognition unavailable, using MediaRecorder]', err);
          startMediaRecording();
        },
        onEnd: () => {
          setIsRecording(false);
          recognitionRef.current = null;
        },
      });

      if (rec) {
        recognitionRef.current = rec;
        return;
      }
    }

    // 2. Fallback to MediaRecorder + backend transcription (Gemini / Deepgram)
    await startMediaRecording();
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Stop recording & speech when unmounting
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      stopSpeaking();
    };
  }, []);

  const handleNewSession = async () => {
    if (isLoading || isRecording || isTranscribing) return;
    await newSession();
    inputRef.current?.focus();
  };

  return (
    <div className="chat-panel">
      {/* Session bar — a way back to a blank slate without losing the app */}
      <div className="chat-session-bar">
        <span className="chat-session-label">
          {messages.length === 0
            ? 'New conversation'
            : `${messages.length} message${messages.length === 1 ? '' : 's'}`}
        </span>
        <div className="chat-session-actions">
          <button
            type="button"
            className={`chat-live-btn ${live.isActive ? 'active' : ''}`}
            onClick={live.toggle}
            disabled={isLoading || isRecording || isTranscribing}
            title={live.isActive
              ? 'End the live conversation'
              : 'Live voice — open mic, and you can interrupt mid-reply'}
            aria-pressed={live.isActive}
          >
            <span aria-hidden="true">{live.isActive ? '🔴' : '📡'}</span>
            <span>{live.isActive ? 'End live' : 'Live'}</span>
          </button>
          <button
            type="button"
            className="chat-new-session-btn"
            onClick={handleNewSession}
            disabled={isLoading || isRecording || isTranscribing || live.isActive}
            title="Start a fresh conversation (your earlier chats are kept)"
            aria-label="Start a new conversation"
          >
            <span aria-hidden="true">✨</span>
            <span>New chat</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-emoji">
              <BuddyGlyph buddyType={buddyType} emoji={effectiveEmoji} size={48} />
            </span>
            <h3>Hey there! I&apos;m {effectiveName}!</h3>
            <p>Your personal AI {effectiveDef.name.toLowerCase()} companion. Ask me anything, or tell me about your day!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : <BuddyGlyph buddyType={buddyType} emoji={effectiveEmoji} size={28} />}
              </div>
              <div className="message-bubble">
                {msg.content}
                {msg.role === 'assistant' && msg.meta?.kind === 'gita_explain' && idx === messages.length - 1 && (
                  <div className="chat-followups">
                    {(['simple', 'detailed', 'deep_gita', 'modern_example'] as const)
                      .filter((d) => d !== msg.meta!.depth)
                      .map((d) => (
                        <button
                          key={d}
                          type="button"
                          className="chat-followup-btn"
                          onClick={() => explainVerse(msg.meta!.chapter, msg.meta!.verse, d, msg.meta!.language)}
                          disabled={isLoading}
                        >
                          {d === 'simple' ? 'Simple'
                            : d === 'detailed' ? 'Detailed'
                            : d === 'deep_gita' ? 'Deep Gita'
                            : 'Modern Example'}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-avatar"><BuddyGlyph buddyType={buddyType} emoji={effectiveEmoji} size={28} /></div>
            <div className="message-bubble">
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="message message-assistant">
            <div className="message-avatar"><BuddyGlyph buddyType={buddyType} emoji={effectiveEmoji} size={28} /></div>
            <div className="message-bubble" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
              Oops! {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Listening / Transcribing banner */}
      {(isRecording || isTranscribing) && (
        <div className={`voice-status-banner ${isRecording ? 'recording' : 'transcribing'}`}>
          {isRecording ? (
            <>
              <span className="voice-pulse-dot" />
              <span>Listening… speak now (click 🎙️ again to send)</span>
            </>
          ) : (
            <>
              <span className="voice-spinner" />
              <span>Listening back and thinking…</span>
            </>
          )}
        </div>
      )}

      {/* Live session state. Shows the partial transcripts as they stream, so
          the user can see they are being heard before the reply starts. */}
      {live.isActive && (
        <div className="live-banner">
          <span className={`live-dot ${live.status}`} aria-hidden="true" />
          <div className="live-banner-body">
            <span className="live-banner-status">
              {live.status === 'connecting' && 'Connecting…'}
              {live.status === 'listening' && (live.muted ? 'Muted' : 'Listening — just talk')}
              {live.status === 'thinking' && 'Thinking…'}
              {live.status === 'speaking' && `${effectiveName} is speaking — say anything to interrupt`}
            </span>
            {(live.partialHeard || live.partialSaid) && (
              <span className="live-banner-transcript">
                {live.partialHeard && <em>“{live.partialHeard}”</em>}
                {live.partialSaid && <span> · {live.partialSaid}</span>}
              </span>
            )}
          </div>
          <div className="live-meter" aria-hidden="true">
            <span className="live-meter-fill" style={{ width: `${Math.min(100, live.micLevel * 160)}%` }} />
          </div>
          <button
            type="button"
            className="live-mute-btn"
            onClick={live.toggleMute}
            title={live.muted ? 'Unmute the microphone' : 'Mute the microphone'}
            aria-pressed={live.muted}
          >
            {live.muted ? '🔇' : '🎙️'}
          </button>
        </div>
      )}

      {live.error && (
        <div className="voice-status-banner notice">
          <span aria-hidden="true">📡</span>
          <span>{live.error}</span>
          <button
            type="button"
            className="voice-notice-dismiss"
            onClick={() => live.setError(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* The reply arrived but could not be spoken. Not an error — the answer
          is on screen — so it gets its own quieter treatment. */}
      {voiceNotice && !isRecording && !isTranscribing && (
        <div className="voice-status-banner notice">
          <span aria-hidden="true">🔇</span>
          <span>Reply is above — couldn&apos;t speak it: {voiceNotice}</span>
          <button
            type="button"
            className="voice-notice-dismiss"
            onClick={() => setVoiceNotice(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Gita Verse Context — visible, removable, never silent */}
      {gitaContext.length > 0 && (
        <div className="gita-context-bar">
          <span aria-hidden="true">📖</span>
          <span>Gita context active:</span>
          {gitaContext.map((r) => (
            <span key={r.reference} className="gita-context-chip">
              {r.reference}
              <button
                type="button"
                onClick={() => removeVerseFromContext(r.chapter, r.verse)}
                aria-label={`Remove Bhagavad Gita ${r.reference} from context`}
              >
                ×
              </button>
            </span>
          ))}
          <button type="button" className="gita-context-clear" onClick={clearVerseContext}>
            Clear
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder={
                isRecording ? 'Listening…' : isTranscribing ? 'Transcribing…' : `Talk to ${effectiveName}...`
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading || isRecording || isTranscribing}
            />
          </div>
          <button
            className={`btn-icon btn-voice ${isRecording ? 'recording' : ''}`}
            aria-label={isRecording ? 'Stop recording and send' : 'Record a voice message'}
            aria-pressed={isRecording}
            title={isRecording ? 'Stop & send' : 'Voice input'}
            onClick={toggleRecording}
            disabled={isLoading || isTranscribing}
          >
            {isRecording ? '⏹' : '🎙️'}
          </button>
          <button
            className="btn-icon btn-send"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading || isRecording || isTranscribing}
            aria-label="Send message"
            title="Send message"
          >
            ↑
          </button>
        </div>
        <div className="chat-controls">
          <label className="rag-toggle">
            <input
              type="checkbox"
              checked={useRag}
              onChange={(e) => setUseRag(e.target.checked)}
            />
            <span className="rag-switch" />
            <span>📚 Knowledge Base</span>
          </label>
        </div>
      </div>
    </div>
  );
}
