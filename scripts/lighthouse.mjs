/**
 * Roda o Lighthouse contra o build de produção (com mocks), N vezes por página e
 * formato, e grava os relatórios HTML/JSON de cada medição e um resumo com a
 * mediana (por nota de performance), LCP, CLS e TBT.
 *
 * Uso: npm run audit:lighthouse            (gera o build antes)
 *      npm run audit:lighthouse -- --assert  (falha se alguma mediana ficar abaixo da meta)
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import config from './lighthouse.config.mjs'
import { startStaticServer } from './static-server.mjs'

const assert = process.argv.includes('--assert')
const baseUrl = `http://localhost:${config.port}`
const CATEGORIES = Object.keys(config.targets)

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

async function audit(url, formFactor, port) {
  const flags = { port, output: ['html', 'json'], logLevel: 'error', onlyCategories: CATEGORIES }
  const result = await lighthouse(url, flags, formFactor === 'desktop' ? desktopConfig : undefined)
  const { categories, audits } = result.lhr
  return {
    reports: result.report,
    scores: Object.fromEntries(CATEGORIES.map((id) => [id, Math.round((categories[id]?.score ?? 0) * 100)])),
    lcpMs: Math.round(audits['largest-contentful-paint'].numericValue),
    cls: Number(audits['cumulative-layout-shift'].numericValue.toFixed(3)),
    tbtMs: Math.round(audits['total-blocking-time'].numericValue),
  }
}

async function main() {
  const server = await startStaticServer('dist', config.port)
  const summary = []
  let chrome
  try {
    await mkdir(config.outputDir, { recursive: true })
    chrome = await chromeLauncher.launch({
      chromePath: chromium.executablePath(),
      chromeFlags: ['--headless=new', '--no-sandbox'],
    })

    for (const page of config.pages) {
      for (const formFactor of config.formFactors) {
        const runs = []
        for (let run = 1; run <= config.runs; run++) {
          const result = await audit(`${baseUrl}${page.path}`, formFactor, chrome.port)
          const base = join(config.outputDir, `${page.name}-${formFactor}-${run}`)
          await writeFile(`${base}.html`, result.reports[0])
          await writeFile(`${base}.json`, result.reports[1])
          runs.push(result)
          console.log(`${page.name} ${formFactor} #${run}:`, result.scores, `LCP ${result.lcpMs} ms, CLS ${result.cls}, TBT ${result.tbtMs} ms`)
        }
        // Medição mediana pela nota de performance (relatório representativo).
        const perf = median(runs.map((r) => r.scores.performance))
        const representative = runs.find((r) => r.scores.performance === perf)
        summary.push({
          page: page.name,
          path: page.path,
          formFactor,
          median: Object.fromEntries(CATEGORIES.map((id) => [id, median(runs.map((r) => r.scores[id]))])),
          lcpMs: representative.lcpMs,
          cls: representative.cls,
          tbtMs: representative.tbtMs,
          runs: runs.map(({ scores, lcpMs, cls, tbtMs }) => ({ scores, lcpMs, cls, tbtMs })),
        })
      }
    }
  } finally {
    await chrome?.kill()
    server.closeAllConnections()
    server.close()
  }

  const failures = summary.flatMap((row) =>
    CATEGORIES.filter((id) => row.median[id] < config.targets[id]).map(
      (id) => `${row.page}/${row.formFactor}: ${id} ${row.median[id]} < ${config.targets[id]}`,
    ),
  )
  const lines = [
    '# Lighthouse — mediana de ' + config.runs + ' medições',
    '',
    `| Página | Formato | ${CATEGORIES.join(' | ')} | LCP | CLS | TBT |`,
    `| --- | --- | ${CATEGORIES.map(() => '---').join(' | ')} | --- | --- | --- |`,
    ...summary.map(
      (row) =>
        `| ${row.page} (${row.path}) | ${row.formFactor} | ${CATEGORIES.map((id) => row.median[id]).join(' | ')} | ${(row.lcpMs / 1000).toFixed(2)} s | ${row.cls} | ${row.tbtMs} ms |`,
    ),
    '',
    failures.length ? `Abaixo da meta: ${failures.join('; ')}` : 'Todas as medianas atingem as metas.',
    '',
  ]
  await writeFile(join(config.outputDir, 'summary.json'), JSON.stringify({ targets: config.targets, summary }, null, 2))
  await writeFile(join(config.outputDir, 'summary.md'), lines.join('\n'))
  console.log('\n' + lines.join('\n'))
  if (assert && failures.length) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
