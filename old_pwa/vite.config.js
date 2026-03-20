import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          chartjs: ['chart.js'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
