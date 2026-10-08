import { useEffect } from 'react'

const SITE = 'Kurio'

/** Título da aba por página ("Emerald Ape #042 | Kurio"), anunciado por leitores de tela. */
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : `${SITE} — Marketplace de NFTs`
  }, [title])
}
