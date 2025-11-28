import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        },
        '/market-api': {
          target: env.VITE_MARKET_API_URL || 'http://localhost:8081/api',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/market-api/, '')
        }
      }
    }
  };
});
