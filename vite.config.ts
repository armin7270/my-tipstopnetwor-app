import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Set BASE_PATH when deploying under a sub-path (e.g. GitHub Pages project sites).
const base = process.env.BASE_PATH ?? '/';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
  build: {
    target: 'es2022',
    cssTarget: 'chrome111',
    reportCompressedSize: true,
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
  preview: {
    port: 4173,
    host: '127.0.0.1',
  },
});
