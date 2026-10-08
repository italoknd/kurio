import type { EthAmount } from '@/lib/eth'
import type { Paginated } from '@/types/api'

export const NFT_CATEGORIES = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
} as const

export type NftCategory = keyof typeof NFT_CATEGORIES

export const NFT_NETWORKS = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
} as const

export type NftNetwork = keyof typeof NFT_NETWORKS

export const EDITION_LABELS = {
  '1-1': '1/1',
  '1-10': '1/10',
  '1-50': '1/50',
  aberta: 'ABERTA',
} as const

export type EditionId = keyof typeof EDITION_LABELS

export interface NftEdition {
  id: EditionId
  label: string
  price: EthAmount
  /** Preço anterior quando houve redução (exibido riscado). */
  previousPrice: EthAmount | null
  /** Tiragem total; `null` para edição aberta. */
  supply: number | null
  /** Unidades disponíveis para compra agora. */
  available: number
  /** Limite de unidades por pedido. */
  maxPerOrder: number
}

/** Item do catálogo (listagens e cards). */
export interface NftSummary {
  id: string
  name: string
  tokenId: string
  image: string
  imageAlt: string
  collection: string
  category: NftCategory
  network: NftNetwork
  /** Preço da edição padrão. */
  price: EthAmount
  previousPrice: EthAmount | null
  rare: boolean
  /** Existe ao menos uma edição com unidades disponíveis. */
  available: boolean
  /** Versão do recurso; incrementada a cada alteração de preço/disponibilidade. */
  version: number
}

export interface NftDetail extends NftSummary {
  images: { src: string; alt: string }[]
  description: string
  details: string[]
  attributes: string[]
  creator: string
  royaltyPercent: number
  contract: { address: string; standard: 'ERC-721' | 'ERC-1155' | 'SPL' }
  rating: { average: number; count: number }
  editions: NftEdition[]
  defaultEditionId: EditionId
}

export type NftTab = 'todos' | 'novos' | 'em-alta'
export type NftSort = 'recentes' | 'preco-asc' | 'preco-desc' | 'nome'

/** Parâmetros de GET /nfts (também representados na URL do catálogo). */
export interface NftListParams {
  q?: string
  categories?: NftCategory[]
  networks?: NftNetwork[]
  minPrice?: EthAmount
  maxPrice?: EthAmount
  collection?: string
  tab?: NftTab
  sort?: NftSort
  page?: number
  pageSize?: number
}

export interface FacetCount<T extends string> {
  id: T
  label: string
  count: number
}

export interface NftListResponse extends Paginated<NftSummary> {
  facets: {
    categories: FacetCount<NftCategory>[]
    networks: FacetCount<NftNetwork>[]
    priceRange: { min: EthAmount; max: EthAmount }
  }
}

/** GET /nfts/destaques — carrossel do topo e card "NFT em destaque". */
export interface FeaturedNfts {
  hero: NftSummary[]
  spotlight: NftSummary
}
