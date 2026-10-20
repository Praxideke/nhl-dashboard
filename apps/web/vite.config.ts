import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nhl/shared': path.resolve(__dirname, '../../packages/shared/src/types.ts'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
