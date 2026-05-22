import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tsConfigPaths(),
  ],
  resolve: {
    alias: {
      'node:async_hooks': path.resolve('./src/lib/async-hooks-stub.ts'),
    },
  },
  server: { host: '0.0.0.0', port: 3000 },
});
