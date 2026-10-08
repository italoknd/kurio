import { toast } from 'sonner'

/**
 * Feedback para ações fora do escopo da entrega (páginas editoriais, suporte,
 * newsletter etc.). Nunca aparenta sucesso funcional.
 */
export function notifyUnavailable(feature: string) {
  toast.info(`${feature} não está disponível nesta demonstração.`)
}
