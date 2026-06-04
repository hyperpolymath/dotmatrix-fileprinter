// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Jonathan D.A. Jewell <j.d.a.jewell@open.ac.uk>
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
