'use client';

export default function SpeechTrainingPanel() {
  return (
    <div className="speech-panel">
      <span style={{ fontSize: '4rem' }}>🎙️</span>
      <h2 className="speech-coming-soon">Speech Training</h2>
      <p className="speech-subtitle">
        Train Hammy to understand your voice patterns, custom commands, and preferred communication style.
        This feature is coming soon!
      </p>

      <div className="speech-scaffold">
        <div className="speech-scaffold-label">Custom Training Prompts</div>
        <textarea
          placeholder="Training prompt templates will appear here..."
          disabled
        />
      </div>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        🐹 Hammy is excited to learn your voice!
      </p>
    </div>
  );
}
