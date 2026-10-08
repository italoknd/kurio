/** Marcador temporário das telas ainda não implementadas. */
export function PagePlaceholder({ title, frame }: { title: string; frame: string }) {
  return (
    <section className="container-site py-12">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">
        Tela em construção. Referência visual: <code className="text-primary">docs/figma/{frame}</code>
      </p>
    </section>
  )
}
