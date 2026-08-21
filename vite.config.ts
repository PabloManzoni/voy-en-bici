import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // En GitHub Pages la app vive en /voy-en-bici/; local sigue en /.
  // El workflow de deploy setea BASE_PATH.
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'logo-96.png'],
      manifest: {
        name: '¿Me mando?',
        short_name: '¿Me mando?',
        description: '¿Salís rodando o mejor no? El clima decide: bici, monopatín, moto.',
        lang: 'es',
        display: 'standalone',
        theme_color: '#14161d',
        background_color: '#14161d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 12 }
            }
          }
        ]
      }
    })
  ],
  server: { port: 5183, strictPort: true }
})
