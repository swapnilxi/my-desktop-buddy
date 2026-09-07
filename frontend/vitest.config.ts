import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Minimal config for the pure-logic library tests under src/lib — no jsdom
 * environment needed, since none of the tested modules (krishnaCharacterState,
 * krishnaStateMachine, ...) touch the DOM.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
