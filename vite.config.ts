import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // FIX: Replace __dirname with a URL-based resolution for ES module compatibility.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
