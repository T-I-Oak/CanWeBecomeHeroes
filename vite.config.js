import { defineConfig } from 'vite';

export default defineConfig({
  // https://t-i-oak.github.io/CanWeBecomeHeroes/ で公開する。
  base: '/CanWeBecomeHeroes/',
  build: {
    rollupOptions: { input: ['index.html', 'tests/manual/record-rotation.html'] },
  },
});
