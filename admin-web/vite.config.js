import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const here = dirname(fileURLToPath(import.meta.url))

/**
 * The Flutter student portal lives in public/student/ as a second, self-contained
 * app. Vite's SPA fallback would answer a bare `/student/` with the React
 * index.html, so the iframe would boot the admin app instead of the portal.
 * Serve the portal's own index.html for that directory URL.
 */
function studentPortalIndex() {
  const indexPath = resolve(here, 'public/student/index.html')

  function middleware(req, res, next) {
    const path = (req.url || '').split('?')[0]
    if (path !== '/student' && path !== '/student/') return next()
    let html
    try {
      html = readFileSync(indexPath)
    } catch {
      return next() // not built yet — let the normal 404/fallback happen
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(html)
  }

  return {
    name: 'student-portal-index',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), studentPortalIndex()],
})
