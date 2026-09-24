import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 6542,
    strictPort: true
  },
  plugins: [
    react(),
    VitePWA({
      // Use injectManifest so we have our own custom SW with periodicsync & push
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: [
        'comradcom_logo.png',
        'comradcom-logo.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'apple-touch-icon.png',
        'badge.png'
      ],
      devOptions: {
        enabled: true,
        type: 'module'
      },
      manifest: {
        id: '/',
        start_url: '/',
        scope: '/',
        name: 'COMRADCOM Network Philippines',
        short_name: 'COMRADCOM',
        description: 'COMRADCOM Network Philippines – Field Operations & Emergency Communications',
        theme_color: '#003F87',
        background_color: '#F0F2F5',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'en-PH',
        categories: ['communication', 'utilities'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/comradcom-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        // Additional workbox config for injectManifest
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}']
      }
    })
  ],
})
