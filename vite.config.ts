import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      __APP_DEV__: JSON.stringify(mode !== 'production'),
      __APP_PROD__: JSON.stringify(mode === 'production'),
      __VITE_ZAKI_BACKEND_URL__: JSON.stringify(env.VITE_ZAKI_BACKEND_URL ?? ''),
      __VITE_API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL ?? ''),
    },
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // Proxy removed — all nullalis traffic now flows through the BFF.
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/') || id.includes('/scheduler/')) {
              return 'vendor-react';
            }
            if (id.includes('/@tanstack/') || id.includes('/zustand/') || id.includes('/i18next/') || id.includes('/react-i18next/')) {
              return 'vendor-state';
            }
            if (id.includes('/@sentry/')) {
              return 'vendor-observability';
            }
            if (id.includes('/three/')) {
              return 'vendor-three';
            }
            if (id.includes('/troika-three-text/') || id.includes('/d3-force/') || id.includes('/d3-force-3d/')) {
              return 'vendor-brain-graph';
            }
            if (id.includes('/@mui/') || id.includes('/@emotion/') || id.includes('/@popperjs/')) {
              return 'vendor-mui';
            }
            if (id.includes('/@radix-ui/') || id.includes('/vaul/') || id.includes('/cmdk/') || id.includes('/input-otp/')) {
              return 'vendor-ui';
            }
            if (
              id.includes('/react-markdown/') ||
              id.includes('/remark-gfm/') ||
              id.includes('/rehype-highlight/') ||
              id.includes('/highlight.js/') ||
              id.includes('/unified/') ||
              id.includes('/micromark') ||
              id.includes('/mdast') ||
              id.includes('/hast') ||
              id.includes('/vfile') ||
              id.includes('/unist')
            ) {
              return 'vendor-markdown';
            }
            if (id.includes('/recharts/')) {
              return 'vendor-charts';
            }
            if (id.includes('/lucide-react/')) {
              return 'vendor-icons';
            }
            if (id.includes('/motion/')) {
              return 'vendor-motion';
            }
            if (id.includes('/react-dnd/') || id.includes('/react-dnd-html5-backend/') || id.includes('/dnd-core/')) {
              return 'vendor-dnd';
            }
            if (id.includes('/embla-carousel-react/') || id.includes('/react-slick/')) {
              return 'vendor-carousel';
            }
            return;
          },
        },
      },
    },
  }
})
