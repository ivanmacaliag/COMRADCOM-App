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
      registerType: 'autoUpdate',
      includeAssets: ['comradcom_logo.png', 'comradcom-logo.png', 'pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'COMRADCOM Network Philippines',
        short_name: 'COMRADCOM',
        description: 'COMRADCOM Network Philippines operations and communications',
        theme_color: '#003F87',
        background_color: '#F0F2F5',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'comradcom_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
