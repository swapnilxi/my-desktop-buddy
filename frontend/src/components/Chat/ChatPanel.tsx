'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, HamsterMood } from '@/lib/api';
import { sendChatMessage, transcribeAudio, getClientSavedConfig } from '@/lib/api';
import { speak, stopSpeaking } from '@/lib/speech';
import { createBrowserSpeechRecognition, isSpeechRecognitionSupported } from '@/lib/speechRecognition';
import type { BuddyDefinition, BuddyType } from '../Buddies/types';
import { getBuddyDefinition } from '../Buddies/registry';

interface ChatPanelProps {
  onMoodChange: (mood: HamsterMood) => void;
  buddyType?: BuddyType | string;
  buddyName?: string;
  buddyDef?: BuddyDefinition;
}

export default function ChatPanel({
  onMoodChange,
  buddyType = 'hamster',
  buddyName,
  buddyDef,
}: ChatPanelProps) {
  const effectiveDef = buddyDef || getBuddyDefinition(buddyType);
  const effectiveName = buddyName || effectiveDef.defaultName;
  const effectiveEmoji = effectiveDef.emoji;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    setError(null);
    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);
    onMoodChange('thinking');

    try {
      const response = await sendChatMessage(trimmed, messages, useRag);
      const assistantMessage: ChatMessage = { role: 'assistant', content: response.response };
      setMessages([...updatedMessages, assistantMessage]);
      onMoodChange('speaking');

      // Speak the reply aloud; return to idle when speech finishes.
      speak(response.response, {
        buddyType: buddyType as string,
        onStart: () => onMoodChange('speaking'),
        onEnd: () => onMoodChange('idle'),
      });

      // Safety net in case speech events never fire (e.g. muted/unavailable)
      setTimeout(() => onMoodChange('idle'), 15000);
    } catch (err) {
      console.error('[Chat Error]', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMsg);
      onMoodChange('idle');
    } finally {
      setIsLoading(false);
    }
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
        console.log('[Voice] Recorded audio blob size:', blob.size, 'bytes');
        if (blob.size < 1000) {
          const msg = "Didn't catch that — try speaking a bit longer!";
          console.warn('[Voice]', msg);
          setError(msg);
          onMoodChange('idle');
          return;
        }
        setIsTranscribing(true);
        onMoodChange('thinking');
        try {
          console.log('[Voice] Transcribing audio with STT...');
          const { transcript } = await transcribeAudio(blob);
          console.log('[Voice] Transcript result:', transcript);
          setIsTranscribing(false);
          await handleSend(transcript);
        } catch (err) {
          console.error('[Voice STT Error]', err);
          setIsTranscribing(false);
          setError(err instanceof Error ? err.message : 'Voice transcription failed');
          onMoodChange('idle');
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

    // 1. Try Apple / Browser Native Speech Recognition first if preferred
    if (sttPref === 'apple' && isSpeechRecognitionSupported()) {
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
          console.warn('[Apple Speech Recognition fallback to MediaRecorder]', err);
          if (!receivedResult) {
            startMediaRecording();
          }
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

  return (
    <div className="chat-panel">
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-emoji">{effectiveEmoji}</span>
            <h3>Hey there! I&apos;m {effectiveName}!</h3>
            <p>Your personal AI {effectiveDef.name.toLowerCase()} companion. Ask me anything, or tell me about your day!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : effectiveEmoji}
              </div>
              <div className="message-bubble">
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-avatar">{effectiveEmoji}</div>
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
            <div className="message-avatar">{effectiveEmoji}</div>
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
              <span>Understanding what you said…</span>
            </>
          )}
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
