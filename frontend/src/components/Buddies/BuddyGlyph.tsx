import krishnaLogoImg from './Krishna/krishna-logo.png';
import type { BuddyType } from './types';

interface BuddyGlyphProps {
  buddyType: BuddyType | string;
  emoji: string;
  size?: number;
}

/**
 * A buddy's icon wherever the UI shows one inline (switch buttons, chat empty
 * state, dashboard header): Krishna gets his real logo image, everyone else
 * still gets their emoji glyph, since only Krishna has a dedicated image asset.
 */
export default function BuddyGlyph({ buddyType, emoji, size = 20 }: BuddyGlyphProps) {
  if (buddyType === 'krishna') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fixed decorative buddy glyph, not a content image worth next/image's overhead
      <img
        src={krishnaLogoImg.src}
        alt=""
        aria-hidden="true"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
      />
    );
  }
  return <span aria-hidden="true">{emoji}</span>;
}
