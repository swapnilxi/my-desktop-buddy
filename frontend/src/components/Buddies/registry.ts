import { BuddyDefinition, BuddyType } from './types';

export const BUDDY_REGISTRY: Record<BuddyType, BuddyDefinition> = {
  hamster: {
    id: 'hamster',
    name: 'Hamster',
    title: 'Hammy the Hamster',
    emoji: '🐹',
    description: 'Energetic, cheerful, and loves crunching sunflower seeds!',
    defaultName: 'Hammy',
    defaultColor: '#F4A460',
    colors: [
      { name: 'Classic Golden', hex: '#F4A460', light: '#E89C46', dark: '#DF8B34' },
      { name: 'Cream Butter', hex: '#FFE4C4', light: '#F5D3A9', dark: '#E0BC90' },
      { name: 'Warm Chestnut', hex: '#C4732E', light: '#B36422', dark: '#9C5318' },
      { name: 'Silver Gray', hex: '#A9A9A9', light: '#989898', dark: '#808080' },
      { name: 'Honey Amber', hex: '#DAA520', light: '#C89410', dark: '#B58200' },
      { name: 'Sakura Pink', hex: '#FFB6C1', light: '#FFA2B0', dark: '#E68595' },
      { name: 'Lavender Mist', hex: '#B39DDB', light: '#9F86CE', dark: '#876BBF' },
      { name: 'Mint Green', hex: '#80CBC4', light: '#66BDB5', dark: '#4DAAA1' },
    ],
    favoriteSnack: 'Sunflower Seed',
    snackEmoji: '🌻',
    eatMessage: 'Nom nom nom! So yummy! 🌰',
    fullMessage: 'That was delicious! 😋',
    greetings: [
      "Squeak! Let's code together! 🚀",
      "Crunching sunflower seeds! 🌻",
      "You've got this! ✨",
      "Whiskers twitching with ideas! 🐾",
      "Watching you build! 💻",
      "Need a quick stretch? 🧘",
      "Your code looks awesome! 🐹",
      "Tiny hamster, big dreams! 🌟",
      "Always in your corner! 💛",
      "Ready when you are! ⚡",
    ],
    systemTraits:
      'You are a cheerful, playful, and encouraging pet hamster. You love sunflower seeds, spinning in wheels, and celebrating user victories.',
  },
  panda: {
    id: 'panda',
    name: 'Panda',
    title: 'Bambu the Panda',
    emoji: '🐼',
    description: 'Chill, wise, and peaceful with fresh green bamboo shoots!',
    defaultName: 'Bambu',
    defaultColor: '#2D3748',
    colors: [
      { name: 'Classic Charcoal', hex: '#2D3748', light: '#4A5568', dark: '#1A202C' },
      { name: 'Midnight Ink', hex: '#1E293B', light: '#334155', dark: '#0F172A' },
      { name: 'Bamboo Forest', hex: '#2E5A36', light: '#3D7347', dark: '#1E3E24' },
      { name: 'Chocolate Brown', hex: '#5C3A21', light: '#784D2D', dark: '#422814' },
      { name: 'Berry Plum', hex: '#4A2545', light: '#63335D', dark: '#33172F' },
      { name: 'Slate Blue', hex: '#334E68', light: '#486581', dark: '#243B53' },
      { name: 'Teal Shadow', hex: '#1D4E5B', light: '#286877', dark: '#13353E' },
      { name: 'Rose Quartz', hex: '#633A44', light: '#7E4C58', dark: '#482730' },
    ],
    favoriteSnack: 'Fresh Bamboo',
    snackEmoji: '🎋',
    eatMessage: 'Crunch, crunch... Fresh bamboo is the best! 🎋',
    fullMessage: 'Mmm, peaceful and full! 🐼💚',
    greetings: [
      "Peaceful focus mode on! 🎋",
      "Crunching fresh bamboo! 🐼",
      "Take a deep breath, you got this! 🌿",
      "Stay calm and keep building! 💚",
      "Sending big panda hugs! 🐼✨",
      "One step at a time! 🐾",
      "Zen vibes for your day! 🧘",
      "Bamboo power activated! 🎋⚡",
      "Chilling right beside you! 🍃",
      "Happy moments ahead! 🌟",
    ],
    systemTraits:
      'You are a sweet, peaceful, calming, and adorable pet panda who loves bamboo, mindful productivity, relaxed focus, and giving warm cozy support.',
  },
};

export const DEFAULT_BUDDY: BuddyType = 'hamster';

export function getBuddyDefinition(type: BuddyType | string): BuddyDefinition {
  return BUDDY_REGISTRY[type as BuddyType] || BUDDY_REGISTRY.hamster;
}
