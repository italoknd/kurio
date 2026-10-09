/**
 * Auditoria Lighthouse (enunciado §10). Versionada junto com o código: páginas,
 * formatos, número de medições e metas mínimas por categoria (0–100).
 */
export default {
  port: 4174,
  runs: 3,
  pages: [
    { name: 'inicio', path: '/' },
    { name: 'detalhe', path: '/nft/emerald-ape-042' },
  ],
  formFactors: ['mobile', 'desktop'],
  targets: {
    performance: 90,
    accessibility: 95,
    'best-practices': 95,
    seo: 90,
  },
  outputDir: 'reports/lighthouse',
}
