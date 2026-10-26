import { defineConfig } from 'vite';

export default defineConfig({
  // https://t-i-oak.github.io/CanWeBecomeHeroes/ で公開する。
  base: '/CanWeBecomeHeroes/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: id => id.replaceAll('\\', '/').endsWith('/src/chips/image-levels.json') ? 'image-levels' : undefined,
      },
    },
  },
});
