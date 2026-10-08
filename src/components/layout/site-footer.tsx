import { Link } from '@tanstack/react-router'
import type { FormEvent } from 'react'
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from '@/components/icons/brand-icons'
import { notifyUnavailable } from '@/lib/unavailable'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const SOCIALS = [
  { label: 'Facebook', href: 'https://facebook.com', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://instagram.com', Icon: InstagramIcon },
  { label: 'Twitter', href: 'https://twitter.com', Icon: TwitterIcon },
  { label: 'LinkedIn', href: 'https://linkedin.com', Icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://youtube.com', Icon: YoutubeIcon },
]

const COLLECTIONS = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade']

export function SiteFooter({ className }: { className?: string }) {
  function handleNewsletter(event: FormEvent) {
    event.preventDefault()
    notifyUnavailable('A newsletter')
  }

  return (
    <footer className={cn('mt-16 pb-20 md:mt-24 md:pb-0', className)}>
      <div className="container-site">
        <section
          aria-label="Destaques da Kurio"
          className="grid gap-8 bg-card px-6 py-8 md:grid-cols-2 md:px-12 lg:grid-cols-4"
        >
          {FEATURES.map((feature) => (
            <div key={feature.letter} className="lg:border-r lg:border-primary lg:pr-6">
              <span
                aria-hidden="true"
                className="flex size-[74px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
              >
                {feature.letter}
              </span>
              <h2 className="mt-5 text-lg font-bold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-[22px] text-muted-foreground">{feature.text}</p>
            </div>
          ))}

          <form onSubmit={handleNewsletter} className="flex flex-col gap-4" noValidate>
            <h2 className="text-lg leading-4 font-bold">Antecipe-se ao próximo lançamento</h2>
            <div className="flex">
              <label htmlFor="newsletter-email" className="sr-only">
                E-mail para receber novidades
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="digite seu e-mail..."
                autoComplete="email"
                className="h-10 min-w-0 flex-1 rounded-l-md bg-surface-strong px-3 text-sm placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                className="h-10 rounded-r-md bg-primary px-4 text-lg font-bold text-primary-foreground hover:bg-primary-hover"
              >
                Enviar
              </button>
            </div>
            <p className="text-xs leading-[22px] text-muted-foreground">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </form>
        </section>

        <div className="grid gap-4 bg-surface-strong px-6 py-6 text-sm sm:grid-cols-2 md:px-8 lg:grid-cols-4 lg:items-center">
          <span className="font-bold tracking-wider">KURIO</span>
          <span className="leading-[22px]">Feito para colecionadores, criadores e cultura</span>
          <a href="mailto:contato@email.com" className="hover:text-primary">
            contato@email.com
          </a>
          <a href="tel:+551140028922" className="hover:text-primary">
            +55 11 4002 8922
          </a>
        </div>

        <nav aria-label="Rodapé" className="grid gap-8 bg-card px-6 py-8 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
          <FooterColumn title="Meu perfil">
            <li>
              <Link to="/perfil" className="hover:text-primary">
                Meu perfil
              </Link>
            </li>
            <FooterButton feature="A coleção do usuário">Minha coleção</FooterButton>
            <FooterButton feature="A página de atividade">Atividade</FooterButton>
            <FooterButton feature="O estúdio do criador">Estúdio do criador</FooterButton>
            <FooterButton feature="A lista de interesse">Lista de interesse</FooterButton>
          </FooterColumn>
          <FooterColumn title="Central de ajuda">
            <FooterButton feature="A central de ajuda">Central de ajuda</FooterButton>
            <FooterButton feature="O guia de compra">Como comprar NFTs</FooterButton>
            <FooterButton feature="O guia de segurança">Carteira e segurança</FooterButton>
            <FooterButton feature="A política do mercado">Política do mercado</FooterButton>
            <FooterButton feature="A denúncia de itens">Denunciar item</FooterButton>
          </FooterColumn>
          <FooterColumn title="Coleções">
            {COLLECTIONS.map((name) => (
              <li key={name}>
                <Link to="/" hash="catalogo" className="hover:text-primary">
                  {name}
                </Link>
              </li>
            ))}
          </FooterColumn>
          <div>
            <h2 className="text-lg font-bold">Redes sociais</h2>
            <ul className="mt-3 flex gap-2">
              {SOCIALS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (abre em nova aba)`}
                    className="flex size-8 items-center justify-center rounded-sm border border-primary text-primary hover:bg-primary/10"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-lg font-bold">Carteiras compatíveis</h2>
            <p className="mt-3 inline-block rounded-md border border-border bg-surface-strong px-2.5 py-1.5 text-[10px] font-bold text-primary">
              METAMASK • WALLETCONNECT • COINBASE
            </p>
          </div>
        </nav>
      </div>

      <p className="py-4 text-center text-sm">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="mt-2 space-y-2 text-sm">{children}</ul>
    </div>
  )
}

function FooterButton({ feature, children }: { feature: string; children: React.ReactNode }) {
  return (
    <li>
      <button type="button" onClick={() => notifyUnavailable(feature)} className="text-left hover:text-primary">
        {children}
      </button>
    </li>
  )
}
