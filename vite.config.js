// SPDX-License-Identifier: PMPL-1.0-or-later
import { defineConfig } from 'vite';

export default defineConfig({
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/target/**', '**/kernel/**'],
    },
  },
  envPrefix: ['VITE_', 'GOSSAMER_'],
  build: {
    target: 'esnext',
    minify: !process.env.GOSSAMER_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.GOSSAMER_DEBUG,
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
