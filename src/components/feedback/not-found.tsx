import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <section className="container-site flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-5xl font-bold text-primary">404</p>
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">O endereço acessado não existe ou foi removido.</p>
      <Link
        to="/"
        className="mt-2 inline-flex h-10 items-center rounded-md bg-primary px-4 font-bold text-primary-foreground hover:bg-primary-hover"
      >
        Voltar para o início
      </Link>
    </section>
  )
}
