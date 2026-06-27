import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import prerender from 'vite-plugin-prerender'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const Renderer = prerender.PuppeteerRenderer

export default defineConfig({
  plugins: [
    react(),
    prerender({
      staticDir: path.join(__dirname, 'dist'),
      routes: [
        '/',                  // landing page
        // '/how-it-works',    // add later when page exists
        // '/changelog',       // add later when page exists
      ],
      renderer: new Renderer({
        renderAfterTime: 2000,  // wait for canvas animation
      }),
    }),
  ],
})