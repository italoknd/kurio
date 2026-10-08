/**
 * Aritmética de ETH sem ponto flutuante. Valores trafegam como strings decimais
 * (`EthAmount`, ex.: "1.19") e os cálculos usam BigInt em wei (18 casas).
 * Usado tanto pela interface quanto pelos mocks, para que ambos concordem nos valores.
 */

/** Valor em ETH como string decimal canônica (ex.: "26.846"). */
export type EthAmount = string

const DECIMALS = 18
const WEI_PER_ETH = 10n ** BigInt(DECIMALS)
const ETH_PATTERN = /^\d+(\.\d{1,18})?$/

export function isEthAmount(value: unknown): value is EthAmount {
  return typeof value === 'string' && ETH_PATTERN.test(value)
}

/** Converte uma string decimal em wei. Lança erro para formatos inválidos. */
export function toWei(amount: EthAmount): bigint {
  if (!isEthAmount(amount)) throw new Error(`Valor ETH inválido: "${amount}"`)
  const [whole, fraction = ''] = amount.split('.')
  return BigInt(whole) * WEI_PER_ETH + BigInt(fraction.padEnd(DECIMALS, '0'))
}

/** Converte wei em string decimal canônica, sem zeros à direita (mínimo de 2 casas). */
export function fromWei(wei: bigint, minDecimals = 2): EthAmount {
  const negative = wei < 0n
  const abs = negative ? -wei : wei
  const whole = abs / WEI_PER_ETH
  let fraction = (abs % WEI_PER_ETH).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  if (fraction.length < minDecimals) fraction = fraction.padEnd(minDecimals, '0')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

/** Normaliza uma string ETH para a forma canônica (ex.: "1.190" → "1.19"). */
export function normalizeEth(amount: EthAmount): EthAmount {
  return fromWei(toWei(amount))
}

export function addEth(...amounts: EthAmount[]): EthAmount {
  return fromWei(amounts.reduce((sum, amount) => sum + toWei(amount), 0n))
}

export function subEth(a: EthAmount, b: EthAmount): EthAmount {
  return fromWei(toWei(a) - toWei(b))
}

/** Multiplica por uma quantidade inteira. */
export function mulEth(amount: EthAmount, quantity: number): EthAmount {
  if (!Number.isInteger(quantity)) throw new Error('Quantidade deve ser inteira')
  return fromWei(toWei(amount) * BigInt(quantity))
}

/** Percentual inteiro de um valor, arredondado para baixo no wei. */
export function percentOfEth(amount: EthAmount, percent: number): EthAmount {
  if (!Number.isInteger(percent)) throw new Error('Percentual deve ser inteiro')
  return fromWei((toWei(amount) * BigInt(percent)) / 100n)
}

export function compareEth(a: EthAmount, b: EthAmount): -1 | 0 | 1 {
  const diff = toWei(a) - toWei(b)
  return diff === 0n ? 0 : diff < 0n ? -1 : 1
}

export function minEth(a: EthAmount, b: EthAmount): EthAmount {
  return compareEth(a, b) <= 0 ? a : b
}

/** Texto para exibição: "1.19 ETH". */
export function formatEth(amount: EthAmount): string {
  return `${normalizeEth(amount)} ETH`
}
