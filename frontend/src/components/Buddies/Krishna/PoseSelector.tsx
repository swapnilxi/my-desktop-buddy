import React from 'react';
import styles from './poseSelector.module.css';

type Pose = 'base' | 'chakra' | 'crossed';

interface PoseSelectorProps {
  currentPose: Pose;
  onChange: (pose: Pose) => void;
}

export default function PoseSelector({ currentPose, onChange }: PoseSelectorProps) {
  const poses: Pose[] = ['base', 'chakra', 'crossed'];
  return (
    <div className={styles.selector} role="radiogroup" aria-label="Krishna pose selector">
      {poses.map((pose) => (
        <button
          key={pose}
          className={`${styles.poseBtn} ${currentPose === pose ? styles.active : ''}`}
          onClick={() => onChange(pose)}
          aria-pressed={currentPose === pose}
        >
          {pose.charAt(0).toUpperCase() + pose.slice(1)}
        </button>
      ))}
    </div>
  );
}
