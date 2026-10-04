'use client';

import React, { useState } from 'react';
import KrishnaSprite from './KrishnaSprite';
import type { KrishnaState } from './KrishnaSprite';
import PoseSelector from './PoseSelector';
import styles from './krishnaCard.module.css';

type Pose = 'base' | 'chakra' | 'crossed';

interface KrishnaCardProps {
  pose: Pose;
  mood?: 'idle' | 'happy' | 'wave' | 'chakra' | any;
  greeting?: string;
  isDragging?: boolean;
  onPoseChange: (pose: Pose) => void;
}

export default function KrishnaCard({ pose, mood = 'idle', greeting, isDragging, onPoseChange }: KrishnaCardProps) {
  // null = "Auto": Krishna reacts to what is happening in the app (listening,
  // thinking, speaking, happy...). Picking a state manually pins it until Auto.
  const [manualState, setManualState] = useState<KrishnaState | null>(null);

  const handleSelect = (choice: KrishnaState | 'auto' | Pose) => {
    if (choice === 'chakra' || choice === 'crossed' || choice === 'base') {
      onPoseChange(choice);
    } else if (choice === 'auto') {
      setManualState(null);
    } else {
      setManualState(choice);
    }
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Little Krishna</h2>
      <p className={styles.description}>Your divine desktop companion</p>
      <div className={styles.avatarWrapper}>
        <KrishnaSprite
          pose={pose}
          mood={mood}
          state={manualState ?? undefined}
          greeting={greeting}
          isDragging={isDragging}
        />
      </div>
      <PoseSelector currentPose={pose} currentState={manualState} onChange={handleSelect} />
    </div>
  );
}
