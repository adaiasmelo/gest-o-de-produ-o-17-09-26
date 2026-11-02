import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildTime = new Date().toISOString();
const buildTimestamp = Date.now();
const buildTag = `v${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}-${buildTimestamp.toString().slice(-4)}`;
const versionData = {
  version: buildTimestamp,
  buildTime: buildTime,
  timestamp: buildTimestamp,
  tag: buildTag
};

function versionPlugin() {
  return {
    name: 'generate-version-file',
    buildStart() {
      try {
        const publicDir = path.resolve(__dirname, 'public');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        fs.writeFileSync(
          path.resolve(publicDir, 'version.json'),
          JSON.stringify(versionData, null, 2),
          'utf-8'
        );
      } catch (e) {
        console.warn('Could not write public/version.json', e);
      }
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(versionData, null, 2)
      });
    }
  };
}

export default defineConfig({
  define: {
    'process.env': {},
    '__APP_BUILD_TIME__': JSON.stringify(buildTime),
    '__APP_BUILD_TIMESTAMP__': JSON.stringify(buildTimestamp),
    '__APP_BUILD_TAG__': JSON.stringify(buildTag),
  },
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      overlay: false
    }
  },
  plugins: [
    versionPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'maskable-icon.png'],
      manifest: {
        name: 'Manupackaging - Controle de Produção',
        short_name: 'Manupackaging',
        description: 'Sistema de Gestão Industrial e Controle de Produção',
        theme_color: '#1e3a8a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        id: 'manupackaging-industrial-pwa',
        categories: ['productivity', 'industrial'],
        lang: 'pt-br',
        dir: 'ltr',
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        importScripts: ['/firebase-messaging-sw.js'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [/^\/api\//, /^\/version\.json/],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('version.json') || url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'motion/react', 'recharts', 'lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        tv: path.resolve(__dirname, 'tv.html'),
        projecao: path.resolve(__dirname, 'projecao.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('jspdf-autotable')) {
              return 'vendor-pdf';
            }
            if (id.includes('pptxgenjs')) {
              return 'vendor-pptx';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('motion') || id.includes('framer-motion')) {
              return 'vendor-motion';
            }
          }
        }
      }
    },
  },
});
