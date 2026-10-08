import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="space-y-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-slate-600">Página não encontrada.</p>
      <Link to="/" className="font-medium text-indigo-600 hover:underline">
        Voltar para o início
      </Link>
    </section>
  )
}
