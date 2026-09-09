'use client';

import { useState } from 'react';
import LittleKrishna from '@/components/Buddies/Krishna/KrishnaSprite';
import LittleKrishna2 from '@/components/Buddies/krishna2/Krishna2Sprite';
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
    'speaking',
];

export default function PreviewKrishnaPage() {
    const [characterVersion, setCharacterVersion] = useState<'krishna' | 'krishna2'>('krishna2');
    const [state, setState] = useState<KrishnaState>('protector');
    const [pose, setPose] = useState<'chakra' | 'crossHands' | 'standing'>('chakra');
    const [showBubbles, setShowBubbles] = useState(true);
    const [showDebug, setShowDebug] = useState(false);

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
                🪶 Little Krishna — Master Preview
            </h1>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                    onClick={() => setCharacterVersion('krishna')}
                    style={{
                        background: characterVersion === 'krishna' ? '#6BA7FF' : 'rgba(255,255,255,0.1)',
                        color: characterVersion === 'krishna' ? '#0F1B3D' : '#E2EFFF',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 14,
                    }}
                >
                    Krishna 1 (Full Vector SVG)
                </button>
                <button
                    onClick={() => setCharacterVersion('krishna2')}
                    style={{
                        background: characterVersion === 'krishna2' ? '#6BA7FF' : 'rgba(255,255,255,0.1)',
                        color: characterVersion === 'krishna2' ? '#0F1B3D' : '#E2EFFF',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 14,
                    }}
                >
                    Krishna 2 (Base PNG + Vector Lower Body)
                </button>
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,200,61,0.25)',
                    borderRadius: 20,
                    padding: '110px 40px 20px',
                    minHeight: 560,
                    width: '100%',
                    maxWidth: 720,
                    overflow: 'visible',
                }}
            >
                {characterVersion === 'krishna2' ? (
                    <LittleKrishna2
                        size="lg"
                        state={state}
                        mood="idle"
                        greeting={showBubbles ? 'Radhe Radhe! Krishna 2 active ✨🪶' : ''}
                        pose={pose}
                        showDebugControls={showDebug}
                    />
                ) : (
                    <LittleKrishna
                        size="lg"
                        state={state}
                        mood="idle"
                        greeting={showBubbles ? 'Divine light protects your journey ✨🪶' : ''}
                        pose={pose}
                        showDebugControls={showDebug}
                    />
                )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                {(['chakra', 'crossHands', 'standing'] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPose(p)}
                        style={{
                            background: pose === p ? '#4ADE80' : 'rgba(255,255,255,0.1)',
                            color: pose === p ? '#0F1B3D' : '#E2EFFF',
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: 14,
                        }}
                    >
                        Pose: {p}
                    </button>
                ))}
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

            <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
                <label style={{ color: '#E2EFFF', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={showBubbles} onChange={(e) => setShowBubbles(e.target.checked)} />
                    Show speech bubble
                </label>
                <label style={{ color: '#E2EFFF', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={showDebug} onChange={(e) => setShowDebug(e.target.checked)} />
                    Show Base Reference
                </label>
            </div>
        </div>
    );
}
