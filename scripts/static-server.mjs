/**
 * Servidor estático mínimo para o build (`dist/`), usado nas auditorias: gzip,
 * cache imutável para `/assets` e fallback de SPA para as rotas do app.
 *
 * Não usa o `vite preview` de propósito: extensões do editor (ex.: Console Ninja)
 * injetam scripts no HTML servido pelo Vite, o que distorce as medições.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { createGzip } from 'node:zlib'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt'])

export function startStaticServer(root, port) {
  const base = resolve(root)
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    let file = normalize(join(base, decodeURIComponent(url.pathname)))
    if (!file.startsWith(base)) {
      res.writeHead(403).end()
      return
    }
    if (!existsSync(file) || statSync(file).isDirectory()) {
      // Rotas do SPA (acesso direto/refresh) recebem o index.html; arquivos ausentes, 404.
      if (extname(url.pathname)) {
        res.writeHead(404).end()
        return
      }
      file = join(base, 'index.html')
    }
    const ext = extname(file)
    const headers = {
      'Content-Type': TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': url.pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    }
    // O worker do MSW precisa controlar o escopo raiz.
    if (url.pathname === '/mockServiceWorker.js') headers['Service-Worker-Allowed'] = '/'
    const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')
    if (gzip) headers['Content-Encoding'] = 'gzip'
    res.writeHead(200, headers)
    const stream = createReadStream(file)
    ;(gzip ? stream.pipe(createGzip()) : stream).pipe(res)
  })
  return new Promise((resolvePromise) => server.listen(port, () => resolvePromise(server)))
}
