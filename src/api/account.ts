import { http } from '@/lib/http'
import type { CreateTicketRequest, DownloadItem, OffersResponse, SupportTicket } from '@/types/account'

export const accountApi = {
  offers: (signal?: AbortSignal) => http.get<OffersResponse>('/offers', { signal }).then((r) => r.data),
  downloads: (signal?: AbortSignal) => http.get<DownloadItem[]>('/downloads', { signal }).then((r) => r.data),
  tickets: (signal?: AbortSignal) => http.get<SupportTicket[]>('/support/tickets', { signal }).then((r) => r.data),
  createTicket: (body: CreateTicketRequest) => http.post<SupportTicket>('/support/tickets', body).then((r) => r.data),
}
