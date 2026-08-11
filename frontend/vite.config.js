import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174
  },
  build: {
    // Split the heavy libraries into their own cacheable chunks so the initial
    // bundle stays small. three + vanta only ship in the 3D-graph chunk, which
    // is lazy-loaded, so most visitors never download them at all.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('three') || id.includes('vanta')) return 'three'
          if (id.includes('gsap')) return 'gsap'
          if (id.includes('motion') || id.includes('framer')) return 'motion'
          if (id.includes('gl-matrix')) return 'glmatrix'
          if (id.includes('react-router')) return 'router'
          if (id.includes('react') || id.includes('scheduler')) return 'react'
          return 'vendor'
        }
      }
    },
    chunkSizeWarningLimit: 900
  }
})
