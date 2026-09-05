import React from 'react';
import styles from './krishna.module.css';
import { FACE } from './characterAnchors';

export interface KrishnaEyeProps {
  isBlinking?: boolean;
}

export const KrishnaLeftEye: React.FC<KrishnaEyeProps> = ({ isBlinking = false }) => {
  return (
    <g id="leftEyeGroup" transform={`translate(${FACE.leftEye.x}, ${FACE.leftEye.y})`}>
      <clipPath id="kLeftEyeClip">
        <path d="M -1 16.2 C 6 -1.5, 33 -1.5, 46 17.8 C 35 36.5, 10 36.0, -1 16.2 Z" />
      </clipPath>

      {/* Eye Socket Ambient Shadow */}
      <path d="M -3 15.2 C 4 -3.0, 35 -3.0, 48 16.8 C 37 38.5, 8 38.0, -3 15.2 Z" fill="#1E3A8A" opacity="0.12" />

      {/* Sclera */}
      <path d="M -1 16.2 C 6 -1.5, 33 -1.5, 46 17.8 C 35 36.5, 10 36.0, -1 16.2 Z" fill="#F6F9FC" />

      {/* Eyeball Core (Clipped) */}
      <g clipPath="url(#kLeftEyeClip)">
        <path d="M -1 16.2 C 6 -1.5, 33 -1.5, 46 17.8 C 33 11.0, 6 11.0, -1 16.2 Z" fill="#1E3A8A" opacity="0.18" />

        {/* Iris */}
        <g className={styles.iris}>
          <circle cx="22.5" cy="17.5" r="16.0" fill="url(#kIrisGrad)" />
          <circle cx="22.5" cy="17.5" r="16.0" fill="none" stroke="#1A0802" strokeWidth="1.0" opacity="0.8" />
          <circle cx="22.5" cy="17.5" r="9.3" fill="url(#kPupilGrad)" />
          <circle cx="22.5" cy="17.5" r="7.8" fill="#0A0402" />
          <ellipse cx="22.5" cy="24.8" rx="8.5" ry="2.8" fill="#FBBF24" opacity="0.55" />
          <circle cx="26.8" cy="12.5" r="4.2" fill="#FFFFFF" opacity="0.98" />
          <circle cx="17.2" cy="22.2" r="1.9" fill="#FFFFFF" opacity="0.8" />
          <circle cx="28.2" cy="19.5" r="1.1" fill="#FFFFFF" opacity="0.55" />
        </g>

        {/* Tear Duct */}
        <circle cx="44.5" cy="17.8" r="2.2" fill="#FDA4AF" opacity="0.35" />

        {/* Animated Upper Eyelid */}
        <path d="M -4 -6 H 50 V 38 H -4 Z" fill="#5B9AFA" className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`} />
      </g>

      {/* Double-Eyelid Crease */}
      <path d="M 3 6 C 12 -4, 30 -4, 40 5" fill="none" stroke="#255BB5" strokeWidth="1.1" strokeLinecap="round" opacity="0.32" />
      {/* Lower Lid Crinkle */}
      <path d="M 6 38.5 C 16 41.5, 28 41.5, 37 38.5" fill="none" stroke="#255BB5" strokeWidth="0.8" opacity="0.22" strokeLinecap="round" />
      {/* Upper Lash Line */}
      <path d="M -2 16.2 C 5 -3.0, 34 -3.0, 47 17.8" fill="none" stroke="#0F172A" strokeWidth="3.6" strokeLinecap="round" />
      {/* Lower Lash Contour */}
      <path d="M 46 17.8 C 35 36.5, 10 36.0, -1 16.2" fill="none" stroke="#1E293B" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" />
    </g>
  );
};

export const KrishnaRightEye: React.FC<KrishnaEyeProps> = ({ isBlinking = false }) => {
  return (
    <g id="rightEyeGroup" transform={`translate(${FACE.rightEye.x}, ${FACE.rightEye.y})`}>
      <clipPath id="kRightEyeClip">
        <path d="M -1 17.8 C 12 -1.5, 39 -1.5, 46 16.2 C 35 36.0, 10 36.5, -1 17.8 Z" />
      </clipPath>

      <path d="M -3 16.8 C 10 -3.0, 41 -3.0, 48 15.2 C 37 38.0, 8 38.5, -3 16.8 Z" fill="#1E3A8A" opacity="0.12" />
      <path d="M -1 17.8 C 12 -1.5, 39 -1.5, 46 16.2 C 35 36.0, 10 36.5, -1 17.8 Z" fill="#F6F9FC" />

      <g clipPath="url(#kRightEyeClip)">
        <path d="M -1 17.8 C 12 -1.5, 39 -1.5, 46 16.2 C 39 11.0, 12 11.0, -1 17.8 Z" fill="#1E3A8A" opacity="0.18" />

        <g className={styles.iris}>
          <circle cx="22.5" cy="17.5" r="16.0" fill="url(#kIrisGrad)" />
          <circle cx="22.5" cy="17.5" r="16.0" fill="none" stroke="#1A0802" strokeWidth="1.0" opacity="0.8" />
          <circle cx="22.5" cy="17.5" r="9.3" fill="url(#kPupilGrad)" />
          <circle cx="22.5" cy="17.5" r="7.8" fill="#0A0402" />
          <ellipse cx="22.5" cy="24.8" rx="8.5" ry="2.8" fill="#FBBF24" opacity="0.55" />
          <circle cx="26.8" cy="12.5" r="4.2" fill="#FFFFFF" opacity="0.98" />
          <circle cx="17.2" cy="22.2" r="1.9" fill="#FFFFFF" opacity="0.8" />
          <circle cx="28.2" cy="19.5" r="1.1" fill="#FFFFFF" opacity="0.55" />
        </g>

        <circle cx="0.5" cy="17.8" r="2.2" fill="#FDA4AF" opacity="0.35" />
        <path d="M -4 -6 H 50 V 38 H -4 Z" fill="#5B9AFA" className={`${styles.eyelidUpper} ${isBlinking ? styles.blinkActive : ''}`} />
      </g>

      <path d="M 5 5 C 15 -4, 33 -4, 42 6" fill="none" stroke="#255BB5" strokeWidth="1.1" strokeLinecap="round" opacity="0.32" />
      <path d="M 8 38.5 C 17 41.5, 29 41.5, 39 38.5" fill="none" stroke="#255BB5" strokeWidth="0.8" opacity="0.22" strokeLinecap="round" />
      <path d="M -2 17.8 C 11 -3.0, 40 -3.0, 47 16.2" fill="none" stroke="#0F172A" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M -1 17.8 C 10 36.5, 35 36.0, 46 16.2" fill="none" stroke="#1E293B" strokeWidth="1.1" strokeLinecap="round" opacity="0.35" />
    </g>
  );
};

export interface KrishnaEyesProps {
  isBlinking?: boolean;
  renderSide?: 'left' | 'right' | 'both';
}

export const KrishnaEyes: React.FC<KrishnaEyesProps> = ({
  isBlinking = false,
  renderSide = 'both',
}) => {
  if (renderSide === 'left') return <KrishnaLeftEye isBlinking={isBlinking} />;
  if (renderSide === 'right') return <KrishnaRightEye isBlinking={isBlinking} />;
  return (
    <>
      <KrishnaLeftEye isBlinking={isBlinking} />
      <KrishnaRightEye isBlinking={isBlinking} />
    </>
  );
};

export default KrishnaEyes;
