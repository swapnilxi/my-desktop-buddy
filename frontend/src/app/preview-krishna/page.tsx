'use client';

import { useState } from 'react';
import LittleKrishna from '@/components/Buddies/Krishna/KrishnaSprite';
import type { KrishnaState } from '@/components/Buddies/Krishna/KrishnaSprite';

const STATES: KrishnaState[] = [
    'idle',
    'protector',
    'thinking',
    'happy',
    'motivation',
    'relax',
    'greeting',
    'clicked',
];

export default function PreviewKrishnaPage() {
    const [state, setState] = useState<KrishnaState>('protector');
    const [showBubbles, setShowBubbles] = useState(false);

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'radial-gradient(circle at 50% 30%, #1a2a55 0%, #0f1b3d 60%, #070c1c 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                padding: 24,
                fontFamily: 'Outfit, Inter, sans-serif',
            }}
        >
            <h1 style={{ color: '#FFC83D', margin: 0, fontSize: 22, letterSpacing: 1 }}>
                🪶 Little Krishna — Face Preview
            </h1>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,200,61,0.25)',
                    borderRadius: 20,
                    padding: '60px 40px 10px',
                    minHeight: 460,
                }}
            >
                <LittleKrishna
                    size="lg"
                    state={state}
                    mood="idle"
                    greeting={showBubbles ? 'Radhe Radhe! ✨🪶' : ''}
                    pose="chakra"
                />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 640 }}>
                {STATES.map((s) => (
                    <button
                        key={s}
                        onClick={() => setState(s)}
                        style={{
                            background: state === s ? '#FFC83D' : 'rgba(255,255,255,0.1)',
                            color: state === s ? '#0F1B3D' : '#E2EFFF',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: 13,
                        }}
                    >
                        {s}
                    </button>
                ))}
            </div>

            <label style={{ color: '#E2EFFF', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={showBubbles} onChange={(e) => setShowBubbles(e.target.checked)} />
                Show speech bubble
            </label>
        </div>
    );
}
