// vite.config.ts  (or .js)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  /**
   * When you open http://clinic3.localhost:5173 Vite will bind to that host
   * (`host: true`) and this proxy will forward /api → http://clinic3.localhost:3001.
   *
   * If you use more than one tenant sub‑domain during dev, just put the one you’re
   * testing in VITE_TENANT_HOST before you run `vite`.
   */
  const tenant = process.env.VITE_TENANT_HOST || 'localhost';

  return {
    plugins: [react()],

    // ─── Dev‑server ──────────────────────────────────────────────────────────────
    server: {
      host: true,           // bind to 0.0.0.0 and accept any Host header
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://${tenant}:3001`,
          changeOrigin: true,   // sets Host header to localhost:3001
          secure: false,
        },
      },
    },

    // ─── Paths & other build tweaks ─────────────────────────────────────────────
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
    },

    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
    },
  };
});
