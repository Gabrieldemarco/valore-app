import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      srcDir: 'src',
      filename: 'sw.ts',
      strategies: 'injectManifest',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: false,
    }),
  ],
  optimizeDeps: {
    exclude: ['@fullcalendar/core', '@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction', '@fullcalendar/list', 'fullcalendar'],
  },
  build: {
    outDir: '../frontend/dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) return 'vendor';
          if (id.includes('@fullcalendar')) return 'calendar';
        },
      },
    },
  },
  server: {
    port: 5173,
    allowedHosts: ['nexo-dev.com'],
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
      '/p': {
        target: 'http://localhost:3000',
        bypass: (req) => {
          const segments = (req.url || '').split('/').filter(Boolean);
          if (segments.length === 2) return null; // /p/:slug → SSR landing page
          if (segments[2] === 'manage') return req.url; // /p/:slug/manage/* → React Router
          return null; // all other /p/:slug/* (services, availability, staff, appointments, landing) → API
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
