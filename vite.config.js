import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: { port: 5173, strictPort: false },
  build: { outDir: 'dist', emptyOutDir: true },
});
