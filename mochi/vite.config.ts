import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Run from the repo root: `vite mochi` / `vite build mochi` (this folder is the Vite root).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
