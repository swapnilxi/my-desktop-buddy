'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, HamsterMood } from '@/lib/api';
import { sendChatMessage } from '@/lib/api';

interface ChatPanelProps {
  onMoodChange: (mood: HamsterMood) => void;
}

export default function ChatPanel({ onMoodChange }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
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
      onMoodChange(response.hamster_mood as HamsterMood);

      // Return to idle after speaking animation
      setTimeout(() => onMoodChange('idle'), 3000);
    } catch (err) {
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

  return (
    <div className="chat-panel">
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-emoji">🐹</span>
            <h3>Hey there! I&apos;m Hammy!</h3>
            <p>Your personal AI hamster assistant. Ask me anything, or tell me about your day!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`message message-${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🐹'}
              </div>
              <div className="message-bubble">
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-avatar">🐹</div>
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
            <div className="message-avatar">🐹</div>
            <div className="message-bubble" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
              Oops! {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Talk to Hammy..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            className="btn-icon btn-voice"
            title="Voice input (coming soon)"
            onClick={() => onMoodChange('listening')}
          >
            🎤
          </button>
          <button
            className="btn-icon btn-send"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
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
