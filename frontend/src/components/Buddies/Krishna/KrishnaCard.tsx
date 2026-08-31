import React, { useState } from 'react';
import KrishnaSprite from './KrishnaSprite';
import PoseSelector from './PoseSelector';
import styles from './krishnaCard.module.css';

type Pose = 'base' | 'chakra' | 'crossed';

interface KrishnaCardProps {
  pose: Pose;
  mood?: 'idle' | 'happy' | 'wave' | 'chakra' | any;
  onPoseChange: (pose: Pose) => void;
}

export default function KrishnaCard({ pose, mood = 'idle', onPoseChange }: KrishnaCardProps) {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Little Krishna</h2>
      <p className={styles.description}>Your divine desktop companion</p>
      <div className={styles.avatarWrapper}>
        <KrishnaSprite
          pose={pose}
          mood={mood}
          // other required props can use defaults
        />
      </div>
      <PoseSelector currentPose={pose} onChange={onPoseChange} />
    </div>
  );
}
