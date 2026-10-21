import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'logo192.png', 'logo512.png'],
      manifest: {
        short_name: 'RoombaZoomba',
        name: 'Roomba Zoomba',
        description: 'Roomba Zoomba - Simple clean-the-floor roomba browser game',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#282c34',
        background_color: '#282c34',
        categories: ['games', 'entertainment'],
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
          {
            src: '/logo192.png',
            type: 'image/png',
            sizes: '192x192',
            purpose: 'any maskable',
          },
          {
            src: '/logo512.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
});
