/**
 * Serve o build (`dist/`) com o servidor estático das auditorias.
 * Uso: node scripts/serve.mjs [--port 4173]
 */
import { startStaticServer } from './static-server.mjs'

const index = process.argv.indexOf('--port')
const port = index > -1 ? Number(process.argv[index + 1]) : 4173
await startStaticServer('dist', port)
console.log(`Servindo dist/ em http://localhost:${port}`)
