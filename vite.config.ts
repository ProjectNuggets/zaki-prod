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
  }
})
