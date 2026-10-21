/// <reference types="vitest/config" />
import { createHash } from 'node:crypto'
import { readdirSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Política de segurança de conteúdo (especificação, secção 6). Só no build: o modo dev usa scripts inline.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob: https://i.ytimg.com",
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function seguranca(): Plugin {
  return {
    name: 'csp',
    apply: 'build',
    transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  }
}

/** Service worker gerado no build com a lista exata de ficheiros, para a app funcionar offline. */
function trabalhadorOffline(): Plugin {
  return {
    name: 'service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const ficheiros = ['./', ...Object.keys(bundle), ...readdirSync('public')].filter((f) => f !== 'sw.js')
      const versao = createHash('sha256').update(ficheiros.join()).digest('hex').slice(0, 12)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const CACHE = 'treino-${versao}'
const FICHEIROS = ${JSON.stringify(ficheiros)}
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHEIROS)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('./').then((r) => r || fetch(e.request)))
    return
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)))
})
`,
      })
    },
  }
}

export default defineConfig({
  base: '/app-treino/',
  plugins: [react(), seguranca(), trabalhadorOffline()],
  build: { sourcemap: false },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
