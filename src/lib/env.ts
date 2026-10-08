/**
 * Configuração de ambiente (variáveis VITE_*). Ver .env.example.
 */
export const env = {
  /** Base das rotas REST. Relativa para que o MSW intercepte na mesma origem. */
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  /** Origem do servidor Socket.IO. Vazio = mesma origem da aplicação. */
  socketUrl: import.meta.env.VITE_SOCKET_URL || window.location.origin,
  /** Ativa a camada de mocks (MSW REST + Socket.IO). Padrão: ativada. */
  enableMocks: import.meta.env.VITE_ENABLE_MOCKS !== 'false',
  /** Timeout das requisições REST, em ms. */
  httpTimeout: Number(import.meta.env.VITE_HTTP_TIMEOUT ?? 10_000),
} as const
