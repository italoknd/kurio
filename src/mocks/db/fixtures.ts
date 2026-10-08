import { mulEth, percentOfEth, type EthAmount } from '@/lib/eth'
import {
  EDITION_LABELS,
  NFT_CATEGORIES,
  type EditionId,
  type NftCategory,
  type NftEdition,
  type NftNetwork,
} from '@/types/nft'
import type { CouponRecord, DbState, NftRecord, UserRecord, WalletRecord } from '@/mocks/db/types'

/**
 * Fixtures determinísticas: o mesmo cenário conhecido é restaurado em todo reset.
 * Credenciais fictícias (documentadas no README):
 *   ana@kurio.dev   / Colecione#1  — tem carteiras, favoritos e carrinho
 *   bruno@kurio.dev / Colecione#2  — conta sem carteiras
 */

const IMAGES = {
  ape: { src: '/nfts/emerald-ape.webp', alt: 'Macaco de pelo castanho com óculos redondos e jaqueta verde de colégio' },
  nomad: { src: '/nfts/sage-nomad.webp', alt: 'Gorila grisalho com chapéu bucket verde e moletom roxo' },
  baron: { src: '/nfts/neon-vessel.webp', alt: 'Chimpanzé de pelo escuro com blazer bege e gola alta verde' },
  beat: { src: '/nfts/golden-beat.webp', alt: 'Orangotango dourado com fones de ouvido verdes e jaqueta clara' },
} as const

type ImageKey = keyof typeof IMAGES

const COLLECTIONS: Record<ImageKey, string> = {
  ape: 'Kurio Apes',
  nomad: 'Nomad Club',
  baron: 'Baron Society',
  beat: 'Golden Frequencies',
}

interface NftSeed {
  name: string
  image: ImageKey
  price: EthAmount
  previousPrice?: EthAmount
  category: NftCategory
  network: NftNetwork
  rare?: boolean
  /** Sobrescreve a disponibilidade de edições específicas. */
  availability?: Partial<Record<EditionId, number>>
  /** Edições oferecidas (padrão: todas). */
  editions?: EditionId[]
}

/** NFTs que aparecem no Figma, com os mesmos nomes e preços. */
const FIGMA_SEEDS: NftSeed[] = [
  { name: 'Emerald Ape #042', image: 'ape', price: '1.19', category: 'arte-digital', network: 'ethereum', rare: true, availability: { '1-1': 0 } },
  { name: 'Sage Nomad #009', image: 'nomad', price: '1.69', category: 'fotografia', network: 'polygon' },
  { name: 'Neon Vessel #552', image: 'baron', price: '1.99', previousPrice: '2.29', category: 'musica', network: 'ethereum', availability: { '1-10': 2 } },
  { name: 'Cosmic Bloom #118', image: 'nomad', price: '1.29', category: 'arte-3d', network: 'ethereum' },
  { name: 'Violet Nomad #314', image: 'nomad', price: '1.39', category: 'colecionaveis', network: 'polygon' },
  { name: 'Ivory Baron #088', image: 'baron', price: '1.79', category: 'generativa', network: 'ethereum', rare: true },
  { name: 'Golden Beat #207', image: 'beat', price: '0.99', category: 'jogos', network: 'solana' },
  { name: 'Golden Frequency #071', image: 'beat', price: '0.89', category: 'musica', network: 'polygon', availability: { '1-1': 0, '1-10': 0, '1-50': 0, aberta: 0 } },
  { name: 'Golden Signal #160', image: 'beat', price: '0.39', category: 'utilidade', network: 'ethereum' },
]

const ADJECTIVES = [
  'Amber', 'Crimson', 'Lunar', 'Solar', 'Velvet', 'Copper', 'Onyx', 'Jade', 'Azure',
  'Rust', 'Pearl', 'Obsidian', 'Saffron', 'Cobalt', 'Ember', 'Frost', 'Mosaic', 'Quartz',
  'Scarlet', 'Silver', 'Indigo', 'Opal', 'Coral', 'Bronze', 'Shadow', 'Prism', 'Nova',
]
const NOUNS: Record<ImageKey, string> = { ape: 'Ape', nomad: 'Nomad', baron: 'Baron', beat: 'Beat' }
const IMAGE_CYCLE: ImageKey[] = ['ape', 'nomad', 'baron', 'beat']
const CATEGORY_CYCLE = Object.keys(NFT_CATEGORIES) as NftCategory[]
const NETWORK_CYCLE: NftNetwork[] = ['ethereum', 'polygon', 'ethereum', 'solana']
const PRICE_CYCLE: EthAmount[] = [
  '0.02', '0.15', '0.45', '0.75', '1.05', '1.49', '2.10', '2.85', '3.40',
  '4.20', '5.75', '6.30', '7.10', '8.45', '9.99', '12.30',
]

const GENERATED_SEEDS: NftSeed[] = ADJECTIVES.map((adjective, index) => {
  const image = IMAGE_CYCLE[index % IMAGE_CYCLE.length]
  const number = String(((index * 37 + 11) % 900) + 1).padStart(3, '0')
  return {
    name: `${adjective} ${NOUNS[image]} #${number}`,
    image,
    price: PRICE_CYCLE[index % PRICE_CYCLE.length],
    previousPrice: index % 7 === 3 ? mulEth(PRICE_CYCLE[index % PRICE_CYCLE.length], 2) : undefined,
    category: CATEGORY_CYCLE[(index + 2) % CATEGORY_CYCLE.length],
    network: NETWORK_CYCLE[index % NETWORK_CYCLE.length],
    rare: index % 5 === 0,
    editions: index % 6 === 5 ? ['1-10', '1-50', 'aberta'] : undefined,
  }
})

const EDITION_SPECS: Record<EditionId, { supply: number | null; available: number; maxPerOrder: number }> = {
  '1-1': { supply: 1, available: 1, maxPerOrder: 1 },
  '1-10': { supply: 10, available: 7, maxPerOrder: 5 },
  '1-50': { supply: 50, available: 32, maxPerOrder: 10 },
  aberta: { supply: null, available: 999, maxPerOrder: 20 },
}

/** Preço de cada edição a partir do preço base (edição 1/50). */
function editionPrice(base: EthAmount, edition: EditionId): EthAmount {
  switch (edition) {
    case '1-1':
      return mulEth(base, 5)
    case '1-10':
      return mulEth(base, 2)
    case 'aberta':
      return percentOfEth(base, 50)
    default:
      return base
  }
}

function slugify(name: string) {
  return name.toLowerCase().replace(/#/g, '').trim().replace(/\s+/g, '-')
}

function buildNft(seed: NftSeed, index: number): NftRecord {
  const image = IMAGES[seed.image]
  const tokenNumber = seed.name.split('#')[1]
  const editionIds = seed.editions ?? (Object.keys(EDITION_LABELS) as EditionId[])
  const editions: NftEdition[] = editionIds.map((id) => ({
    id,
    label: EDITION_LABELS[id],
    price: editionPrice(seed.price, id),
    previousPrice: seed.previousPrice ? editionPrice(seed.previousPrice, id) : null,
    supply: EDITION_SPECS[id].supply,
    available: seed.availability?.[id] ?? EDITION_SPECS[id].available,
    maxPerOrder: EDITION_SPECS[id].maxPerOrder,
  }))
  const defaultEditionId: EditionId = editionIds.includes('1-50') ? '1-50' : editionIds[0]
  const collection = COLLECTIONS[seed.image]
  const listedAt = new Date(Date.UTC(2026, 8, 30) - index * 86_400_000 * 1.5).toISOString()

  return {
    id: slugify(seed.name),
    name: seed.name,
    tokenId: `#0${tokenNumber}`,
    image: image.src,
    imageAlt: `${seed.name}: ${image.alt}`,
    collection,
    category: seed.category,
    network: seed.network,
    price: seed.price,
    previousPrice: seed.previousPrice ?? null,
    rare: seed.rare ?? false,
    available: editions.some((edition) => edition.available > 0),
    version: 1,
    images: [1, 2, 3, 4].map((view) => ({ src: image.src, alt: `${seed.name}, vista ${view} de 4: ${image.alt}` })),
    description: `Um colecionável digital finalizado à mão da coleção ${collection}, verificado na ${seed.network === 'ethereum' ? 'Ethereum' : seed.network === 'polygon' ? 'Polygon' : 'Solana'}, com arte desbloqueável e acesso para colecionadores.`,
    details: [
      `${seed.name} é uma obra digital finalizada à mão da coleção ${collection}. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
    ],
    attributes: seed.rare ? ['Óculos', 'Esmeralda', 'Raro'] : ['Retrato', 'Edição limitada'],
    creator: 'Nova Sato',
    royaltyPercent: 5,
    contract: {
      address: `0x7A42${String(index).padStart(4, '0')}C3D19E8`,
      standard: seed.network === 'solana' ? 'SPL' : 'ERC-721',
    },
    rating: { average: 4 + ((index * 3) % 10) / 10, count: 7 + ((index * 11) % 40) },
    editions,
    defaultEditionId,
    listedAt,
    trending: (index * 53) % 100,
  }
}

export const NETWORK_FEES: Record<NftNetwork, EthAmount> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}

const USERS: UserRecord[] = [
  {
    id: 'usr_ana',
    username: 'ana.coleciona',
    displayName: 'Ana Ribeiro',
    email: 'ana@kurio.dev',
    ensName: 'ana',
    walletNickname: 'Cofre da Ana',
    avatarUrl: null,
    passwordSalt: 's4lt-ana-01',
    passwordHash: '6aa9a79b9362bd45380a251f06d77cee651c2f25b9238f12c8766e5202e203a2',
  },
  {
    id: 'usr_bruno',
    username: 'bruno.nft',
    displayName: 'Bruno Lima',
    email: 'bruno@kurio.dev',
    ensName: null,
    walletNickname: null,
    avatarUrl: null,
    passwordSalt: 's4lt-bruno-02',
    passwordHash: '6b7a11496c102fb9a9969a1460dda3ea7ff54cf88118d9580a9514f276641392',
  },
]

const WALLETS: WalletRecord[] = [
  {
    id: 'wal_ana_principal',
    userId: 'usr_ana',
    role: 'primary',
    displayName: 'Ana Ribeiro',
    nickname: 'Principal',
    profileName: 'ana.coleciona',
    network: 'ethereum',
    address: '0xa91f4b2c8d3e5f60718293a4b5c6d7e8f901e82c',
    secondaryAddress: null,
    type: 'metamask',
    referralCode: 'KURIO-ANA',
    email: 'ana@kurio.dev',
    ensName: 'ana',
  },
  {
    id: 'wal_ana_reserva',
    userId: 'usr_ana',
    role: 'secondary',
    displayName: 'Ana Ribeiro',
    nickname: 'Reserva',
    profileName: 'ana.coleciona',
    network: 'polygon',
    address: '0x3c7d9e1f2a4b6c8d0e1f2a3b4c5d6e7f8a9b0c1d',
    secondaryAddress: 'nova.kurio.eth',
    type: 'coinbase',
    referralCode: 'KURIO-ANA',
    email: 'ana@kurio.dev',
    ensName: 'nova.kurio',
  },
]

const COUPONS: CouponRecord[] = [
  { code: 'KURIO10', description: '10% de desconto', percent: 10, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'LANCAMENTO', description: 'Desconto do lançamento (5%)', percent: 5, expiresAt: '2099-12-31T23:59:59.000Z' },
  { code: 'EXPIRADO', description: 'Cupom de 2025', percent: 20, expiresAt: '2025-01-01T00:00:00.000Z' },
]

/** Estado inicial completo do banco simulado. */
export function createSeedState(): DbState {
  const nfts = [...FIGMA_SEEDS, ...GENERATED_SEEDS].map(buildNft)
  return {
    schemaVersion: 1,
    users: structuredClone(USERS),
    sessions: [],
    nfts,
    favorites: { usr_ana: ['emerald-ape-042', 'ivory-baron-088'], usr_bruno: [] },
    carts: [
      {
        id: 'cart_ana',
        userId: 'usr_ana',
        items: [
          { id: 'item_ana_1', nftId: 'emerald-ape-042', editionId: '1-50', quantity: 2 },
          { id: 'item_ana_2', nftId: 'violet-nomad-314', editionId: '1-50', quantity: 6 },
          { id: 'item_ana_3', nftId: 'ivory-baron-088', editionId: '1-50', quantity: 9 },
        ],
        couponCode: null,
        version: 1,
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
    ],
    wallets: structuredClone(WALLETS),
    coupons: structuredClone(COUPONS),
    orders: [],
    idempotency: [],
    eventSeq: 0,
  }
}
