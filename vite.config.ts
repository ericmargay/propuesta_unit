import { defineConfig } from 'vite';

// Se publica en GitHub Pages bajo /propuesta_unit/
export default defineConfig({
  base: '/propuesta_unit/',
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
