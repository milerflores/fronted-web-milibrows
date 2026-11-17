import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const app = mode === 'admin' ? 'admin' : 'client'

  return {
    root: resolve(import.meta.dirname, 'src', app),
    publicDir: resolve(import.meta.dirname, 'public'),
    plugins: [react(), tailwindcss()],
    build: {
      outDir: resolve(import.meta.dirname, 'dist', app),
      emptyOutDir: true,
    },
  }
})
