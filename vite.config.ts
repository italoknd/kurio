import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Chunks carregados por import dinâmico no `main.tsx` (app e, com mocks, o MSW) começam
 * a ser baixados já com o HTML (modulepreload), em vez de só quando o import executa.
 */
function preloadEntries(entries: string[]): Plugin {
  return {
    name: 'kurio:preload-entries',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const chunks = Object.values(ctx.bundle ?? {}).filter(
          (item) => item.type === 'chunk' && entries.some((entry) => item.facadeModuleId?.replaceAll('\\', '/').endsWith(entry)),
        )
        return chunks.map((chunk) => ({
          tag: 'link',
          attrs: { rel: 'modulepreload', crossorigin: '', href: `/${chunk.fileName}` },
          injectTo: 'head' as const,
        }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      preloadEntries(env.VITE_ENABLE_MOCKS === 'false' ? ['/src/app.tsx'] : ['/src/app.tsx', '/src/mocks/browser.ts']),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        // Cookies não são simulados: evita o tough-cookie + tldts no chunk dos mocks.
        'tough-cookie': fileURLToPath(new URL('./src/mocks/stubs/tough-cookie.ts', import.meta.url)),
      },
    },
  }
})
