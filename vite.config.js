import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Alias @ apunta a /src para imports limpios
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Optimizar dependencias pesadas de Three.js para dev server
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei', 'gsap', 'zustand'],
  },
})
