export type BuddyType = 'hamster' | 'panda';

export type BuddyMood =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'sleeping'
  | 'eating'
  | 'waving'
  | 'excited'
  | 'dragged';

export interface ColorOption {
  name: string;
  hex: string;
  light?: string;
  dark?: string;
}

export interface BuddyDefinition {
  id: BuddyType;
  name: string;
  title: string;
  emoji: string;
  description: string;
  defaultName: string;
  defaultColor: string;
  colors: ColorOption[];
  favoriteSnack: string;
  snackEmoji: string;
  eatMessage: string;
  fullMessage: string;
  greetings: string[];
  systemTraits: string;
}

export interface BuddySpriteProps {
  mood: BuddyMood;
  color?: string;
  name?: string;
  greeting?: string;
  isDragging?: boolean;
  petStreak?: number;
  onClick?: () => void;
  onRefreshGreeting?: () => void;
  onFeed?: () => void;
}
