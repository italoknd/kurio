import { compareEth, isEthAmount, type EthAmount } from '@/lib/eth'
import { commit, db } from '@/mocks/db/store'
import type { NftRecord } from '@/mocks/db/types'
import { publishNftUpdated } from '@/mocks/realtime'
import { refreshDerived, toNftSummary } from '@/mocks/serializers'
import {
  NFT_CATEGORIES,
  NFT_NETWORKS,
  type EditionId,
  type FeaturedNfts,
  type NftCategory,
  type NftListParams,
  type NftListResponse,
  type NftNetwork,
  type NftSort,
  type NftTab,
} from '@/types/nft'

export const DEFAULT_PAGE_SIZE = 9
const MAX_PAGE_SIZE = 48

export function findNft(id: string) {
  return db.state.nfts.find((nft) => nft.id === id)
}

/** Lê e valida os parâmetros de busca da URL de GET /nfts. */
export function parseListParams(url: URL): NftListParams {
  const params = url.searchParams
  const categories = params.getAll('category').filter((c): c is NftCategory => c in NFT_CATEGORIES)
  const networks = params.getAll('network').filter((n): n is NftNetwork => n in NFT_NETWORKS)
  const minPrice = params.get('minPrice')
  const maxPrice = params.get('maxPrice')
  const tab = params.get('tab')
  const sort = params.get('sort')
  const page = Number(params.get('page') ?? 1)
  const pageSize = Number(params.get('pageSize') ?? DEFAULT_PAGE_SIZE)

  return {
    q: params.get('q')?.trim() || undefined,
    categories,
    networks,
    minPrice: minPrice && isEthAmount(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice && isEthAmount(maxPrice) ? maxPrice : undefined,
    collection: params.get('collection') || undefined,
    tab: (['todos', 'novos', 'em-alta'] as NftTab[]).includes(tab as NftTab) ? (tab as NftTab) : 'todos',
    sort: (['recentes', 'preco-asc', 'preco-desc', 'nome'] as NftSort[]).includes(sort as NftSort)
      ? (sort as NftSort)
      : 'recentes',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE,
  }
}

const NEW_RELEASE_COUNT = 12

function matchesText(nft: NftRecord, q: string | undefined) {
  if (!q) return true
  const needle = q.toLowerCase()
  return [nft.name, nft.collection, nft.tokenId, nft.creator].some((field) => field.toLowerCase().includes(needle))
}

/** Filtro de preço pelo preço listado (edição padrão), o mesmo exibido no card. */
function inPriceRange(nft: NftRecord, min?: EthAmount, max?: EthAmount) {
  const price = nft.price
  if (min && compareEth(price, min) < 0) return false
  if (max && compareEth(price, max) > 0) return false
  return true
}

function sortNfts(items: NftRecord[], sort: NftSort, tab: NftTab) {
  const byRecent = (a: NftRecord, b: NftRecord) => b.listedAt.localeCompare(a.listedAt) || a.id.localeCompare(b.id)
  const sorted = [...items]
  if (tab === 'em-alta' && sort === 'recentes') return sorted.sort((a, b) => b.trending - a.trending || byRecent(a, b))
  switch (sort) {
    case 'preco-asc':
      return sorted.sort((a, b) => compareEth(a.price, b.price) || byRecent(a, b))
    case 'preco-desc':
      return sorted.sort((a, b) => compareEth(b.price, a.price) || byRecent(a, b))
    case 'nome':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    default:
      return sorted.sort(byRecent)
  }
}

/** Executa a consulta do catálogo: busca, filtros combináveis, ordenação e paginação. */
export function listNfts(params: NftListParams): NftListResponse {
  const { q, categories = [], networks = [], minPrice, maxPrice, collection, tab = 'todos', sort = 'recentes' } = params
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE

  const newest = new Set(
    [...db.state.nfts].sort((a, b) => b.listedAt.localeCompare(a.listedAt)).slice(0, NEW_RELEASE_COUNT).map((n) => n.id),
  )

  // Base para as contagens das facetas: busca + aba + coleção (sem os próprios filtros de faceta).
  const base = db.state.nfts.filter(
    (nft) =>
      matchesText(nft, q) &&
      (!collection || nft.collection === collection) &&
      (tab !== 'novos' || newest.has(nft.id)) &&
      (tab !== 'em-alta' || nft.trending >= 50),
  )

  const filtered = base.filter(
    (nft) =>
      (categories.length === 0 || categories.includes(nft.category)) &&
      (networks.length === 0 || networks.includes(nft.network)) &&
      inPriceRange(nft, minPrice, maxPrice),
  )

  const sorted = sortNfts(filtered, sort, tab)
  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const items = sorted.slice((page - 1) * pageSize, page * pageSize).map(toNftSummary)

  const prices = db.state.nfts.map((nft) => nft.price).sort(compareEth)

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    facets: {
      categories: (Object.keys(NFT_CATEGORIES) as NftCategory[]).map((id) => ({
        id,
        label: NFT_CATEGORIES[id],
        count: base.filter((nft) => nft.category === id).length,
      })),
      networks: (Object.keys(NFT_NETWORKS) as NftNetwork[]).map((id) => ({
        id,
        label: NFT_NETWORKS[id],
        count: base.filter((nft) => nft.network === id).length,
      })),
      priceRange: { min: prices[0], max: prices[prices.length - 1] },
    },
  }
}

export function featuredNfts(): FeaturedNfts {
  const pick = (id: string) => toNftSummary(findNft(id)!)
  return {
    hero: ['emerald-ape-042', 'neon-vessel-552', 'golden-beat-207'].map(pick),
    spotlight: pick('cosmic-bloom-118'),
  }
}

export interface NftEditionPatch {
  editionId?: EditionId
  price?: EthAmount
  available?: number
}

/**
 * Altera preço e/ou disponibilidade de uma edição (ou de todas, sem `editionId`),
 * incrementa a versão e publica `nft.updated`. Usado pelos cenários e pelos pedidos.
 */
export function updateNft(nftId: string, patch: NftEditionPatch) {
  const nft = findNft(nftId)
  if (!nft) throw new Error(`NFT ${nftId} não encontrado`)
  for (const edition of nft.editions) {
    if (patch.editionId && edition.id !== patch.editionId) continue
    if (patch.price !== undefined) {
      edition.previousPrice = compareEth(patch.price, edition.price) < 0 ? edition.price : null
      edition.price = patch.price
    }
    if (patch.available !== undefined) edition.available = Math.max(0, patch.available)
  }
  refreshDerived(nft)
  nft.version += 1
  commit()
  return publishNftUpdated(nft)
}
