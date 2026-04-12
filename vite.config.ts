import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  // spark plugins removed (multi-trip refactor) – icons can be imported directly now
  ],
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
      // Mock SWA auth endpoint for local dev (no user signed in)
      '/.auth/me': {
        target: 'http://localhost:5173',
        selfHandleResponse: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, _req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ clientPrincipal: null }));
          });
        },
      },
    },
    watch: {
      ignored: ['**/.azurite/**'],
    },
  },
});
