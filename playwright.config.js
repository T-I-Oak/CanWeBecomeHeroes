import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.pw.js',
  workers: 1,
  timeout: 45000,
  use: { channel: process.env.PLAYWRIGHT_CHANNEL, viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort', url: 'http://127.0.0.1:4174/CanWeBecomeHeroes/', reuseExistingServer: false },
    { command: 'npm run build && npm exec vite preview -- --host 127.0.0.1 --port 4175 --strictPort', url: 'http://127.0.0.1:4175/CanWeBecomeHeroes/', reuseExistingServer: false },
  ],
});
