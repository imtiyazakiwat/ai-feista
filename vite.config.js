import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          motion: ['framer-motion'],
          markdown: ['marked', 'highlight.js']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
