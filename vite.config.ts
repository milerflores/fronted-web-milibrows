import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const app = mode === 'admin' ? 'admin' : 'client'
  const env = loadEnv(mode, import.meta.dirname, '')
  const target = env.API_PROXY_TARGET || 'http://localhost:8000'

  return {
    base: './',
    root: resolve(import.meta.dirname, 'src', app),
    envDir: import.meta.dirname,
    publicDir: resolve(import.meta.dirname, 'public'),
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyReq', (request) => {
              request.setHeader('Origin', new URL(target).origin)
              request.setHeader('Referer', `${new URL(target).origin}/`)
            })
          },
        },
      },
    },
    build: {
      outDir: resolve(import.meta.dirname, 'dist', app),
      emptyOutDir: true,
    },
  }
})
