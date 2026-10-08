import { isEthAmount, type EthAmount } from '@/lib/eth'
import {
  NFT_CATEGORIES,
  NFT_NETWORKS,
  type NftCategory,
  type NftListParams,
  type NftNetwork,
  type NftSort,
  type NftTab,
} from '@/types/nft'

/**
 * Estado do catálogo na URL da página inicial. Valores padrão ficam fora da URL;
 * listas usam vírgula (`?categoria=musica,jogos`) para a URL continuar legível.
 */
export interface CatalogSearch {
  q?: string
  categoria?: string
  rede?: string
  precoMin?: EthAmount
  precoMax?: EthAmount
  aba?: NftTab
  ordem?: NftSort
  pagina?: number
}

export const PAGE_SIZE = 9

export const TABS: { id: NftTab; label: string }[] = [
  { id: 'todos', label: 'Todos os NFTs' },
  { id: 'novos', label: 'Novos lançamentos' },
  { id: 'em-alta', label: 'Em alta' },
]

export const SORTS: { id: NftSort; label: string }[] = [
  { id: 'recentes', label: 'Listados recentemente' },
  { id: 'preco-asc', label: 'Menor preço' },
  { id: 'preco-desc', label: 'Maior preço' },
  { id: 'nome', label: 'Nome (A–Z)' },
]

function parseList<T extends string>(value: unknown, allowed: Record<T, string>): T[] {
  if (typeof value !== 'string') return []
  return [...new Set(value.split(','))].filter((item): item is T => item in allowed)
}

export function categoriesOf(search: CatalogSearch) {
  return parseList<NftCategory>(search.categoria, NFT_CATEGORIES)
}

export function networksOf(search: CatalogSearch) {
  return parseList<NftNetwork>(search.rede, NFT_NETWORKS)
}

/** Serializa uma lista para a URL (vazia → parâmetro removido). */
export function joinList(items: string[]) {
  return items.length > 0 ? items.join(',') : undefined
}

export function validateCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const categories = parseList<NftCategory>(raw.categoria, NFT_CATEGORIES)
  const networks = parseList<NftNetwork>(raw.rede, NFT_NETWORKS)
  const page = Number(raw.pagina)
  const precoMin = String(raw.precoMin ?? '')
  const precoMax = String(raw.precoMax ?? '')
  const q = typeof raw.q === 'string' ? raw.q.trim().slice(0, 80) : ''

  return {
    q: q || undefined,
    categoria: joinList(categories),
    rede: joinList(networks),
    precoMin: isEthAmount(precoMin) ? precoMin : undefined,
    precoMax: isEthAmount(precoMax) ? precoMax : undefined,
    aba: TABS.some((t) => t.id === raw.aba && t.id !== 'todos') ? (raw.aba as NftTab) : undefined,
    ordem: SORTS.some((s) => s.id === raw.ordem && s.id !== 'recentes') ? (raw.ordem as NftSort) : undefined,
    pagina: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}

/** Converte o estado da URL nos parâmetros de GET /nfts. */
export function toListParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q,
    categories: categoriesOf(search),
    networks: networksOf(search),
    minPrice: search.precoMin,
    maxPrice: search.precoMax,
    tab: search.aba ?? 'todos',
    sort: search.ordem ?? 'recentes',
    page: search.pagina ?? 1,
    pageSize: PAGE_SIZE,
  }
}

export function hasActiveFilters(search: CatalogSearch) {
  return Boolean(search.q || search.categoria || search.rede || search.precoMin || search.precoMax)
}
