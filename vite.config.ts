import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',

        // Assets to include in the precache manifest
        includeAssets: [
          'favicon.ico',
          'logo-icon.png',
          'logo-main.png',
          'logo.svg',
          'apple-touch-icon.png',
          'icon-192.png',
          'icon-512.png',
          'og-image.png',
          'whatsapp-icon.png',
          'telegram-icon.png',
        ],

        manifest: {
          name: '9ija Escrow',
          short_name: '9ijaEscrow',
          description: "Nigeria's Premier P2P NGN/USDT Escrow Platform",
          start_url: '/',
          display: 'standalone',
          background_color: '#F7FAF8',
          theme_color: '#008751',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },

        workbox: {
          // Precache all JS/CSS/HTML chunks plus the images listed in includeAssets
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff,woff2}'],

          // Don't precache huge chunks — let runtime caching handle them
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB

          runtimeCaching: [
            // ── Images: cache-first, serve from cache instantly ──────────
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: '9ija-images-v1',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            // ── Fonts: cache-first ────────────────────────────────────────
            {
              urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: '9ija-fonts-v1',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },

            // ── App shell (HTML + JS + CSS): network-first so users always
            //    get fresh code, fall back to cache when offline ───────────
            {
              urlPattern: /^https:\/\/9ijaescrow\.com\.ng\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: '9ija-app-shell-v1',
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@assets': path.resolve(__dirname, 'attached_assets'),
      },
    },

    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true as true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
