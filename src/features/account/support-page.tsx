import { useId } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { SelectField } from '@/components/forms/select-field'
import { TextField } from '@/components/forms/text-field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTicket, useOrders, useTickets } from '@/features/account/queries'
import { applyServerErrors, errorMessage, zodResolver } from '@/lib/forms'
import { usePageTitle } from '@/lib/use-page-title'
import { cn } from '@/lib/utils'
import { TICKET_CATEGORIES, type SupportTicket, type TicketCategory } from '@/types/account'

const NO_ORDER = 'nenhum'

/** Regras espelhadas da API (mocks/handlers/account.ts). */
const ticketSchema = z.object({
  category: z.union([z.enum(Object.keys(TICKET_CATEGORIES) as [TicketCategory, ...TicketCategory[]]), z.literal('')]).refine((v) => v !== '', 'Selecione o assunto do chamado.'),
  orderId: z.string(),
  subject: z.string().trim().min(5, 'Descreva o assunto com pelo menos 5 caracteres.').max(80, 'Use no máximo 80 caracteres no assunto.'),
  message: z.string().trim().min(20, 'Conte o que aconteceu com pelo menos 20 caracteres.').max(2000, 'Use no máximo 2000 caracteres.'),
})

type TicketValues = z.input<typeof ticketSchema>
type TicketOutput = z.output<typeof ticketSchema>

/** Perguntas frequentes sobre o funcionamento da plataforma. */
const FAQ = [
  {
    question: 'Meu pagamento foi recusado. Fui cobrado?',
    answer: 'Não. Pedidos recusados não transferem valores e os itens continuam no carrinho para uma nova tentativa.',
  },
  {
    question: 'Cliquei em confirmar e a página demorou. Posso tentar de novo?',
    answer:
      'Sim. Cada compra tem uma chave única: se a resposta não chegar, use "Verificar pedido" — ela recupera o mesmo pedido e nunca cria uma compra duplicada.',
  },
  {
    question: 'O preço mudou enquanto eu revisava o pedido. O que acontece?',
    answer: 'O pedido só é enviado com os valores que você revisou. Se algo mudar, mostramos os novos valores e pedimos uma nova confirmação.',
  },
  {
    question: 'Como uso um cupom?',
    answer: 'Aplique o código no resumo do carrinho ou use "Usar no carrinho" na página de Ofertas. O desconto é recalculado a cada alteração.',
  },
  {
    question: 'Onde baixo a arte dos NFTs que comprei?',
    answer: 'Em "Arquivos baixados", assim que o pedido for confirmado na rede.',
  },
]

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Suporte: perguntas frequentes, abertura de chamado e chamados anteriores. */
export function SupportPage() {
  usePageTitle('Suporte')

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="suporte-titulo">
        <h1 id="suporte-titulo" className="text-lg font-bold">Suporte</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tire dúvidas rápidas ou abra um chamado para a equipe Kurio.</p>
        <h2 className="mt-6 text-base font-bold">Perguntas frequentes</h2>
        <div className="mt-3 flex flex-col gap-2">
          {FAQ.map((item) => (
            <details key={item.question} className="group rounded-md border border-border bg-card px-4 py-3">
              <summary className="cursor-pointer text-sm font-bold marker:text-primary">{item.question}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <TicketForm />
      <TicketList />
    </div>
  )
}

function TicketForm() {
  const create = useCreateTicket()
  const orders = useOrders()
  const messageId = useId()
  const form = useForm<TicketValues, unknown, TicketOutput>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { category: '', orderId: NO_ORDER, subject: '', message: '' },
  })
  const { errors } = form.formState
  const messageLength = useWatch({ control: form.control, name: 'message' }).length

  const orderOptions: Record<string, string> = { [NO_ORDER]: 'Nenhum pedido' }
  for (const order of orders.data ?? []) orderOptions[order.id] = `${order.id} · ${new Date(order.createdAt).toLocaleDateString('pt-BR')}`

  const submit = form.handleSubmit((values) =>
    create.mutate(
      {
        category: values.category as TicketCategory,
        subject: values.subject,
        message: values.message,
        orderId: values.orderId === NO_ORDER ? null : values.orderId,
      },
      {
        onSuccess: (ticket) => {
          form.reset()
          toast.success(`Chamado ${ticket.protocol} aberto. Responderemos por aqui.`)
        },
        onError: (error) => {
          if (!applyServerErrors(error, form.setError, ['category', 'subject', 'message', 'orderId'])) toast.error(errorMessage(error))
        },
      },
    ),
  )

  return (
    <section aria-labelledby="novo-chamado">
      <h2 id="novo-chamado" className="text-base font-bold">Abrir chamado</h2>
      <form onSubmit={submit} noValidate aria-labelledby="novo-chamado" className="mt-4 grid gap-x-7 gap-y-5 md:grid-cols-2">
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => (
            <SelectField
              label="Assunto"
              required
              value={(field.value || undefined) as TicketCategory | undefined}
              onChange={field.onChange}
              options={TICKET_CATEGORIES}
              placeholder="Selecione o assunto"
              error={errors.category?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="orderId"
          render={({ field }) => (
            <SelectField
              label="Pedido relacionado (opcional)"
              value={field.value}
              onChange={field.onChange}
              options={orderOptions}
              placeholder="Nenhum pedido"
              error={errors.orderId?.message}
            />
          )}
        />
        <TextField label="Título" required className="md:col-span-2" error={errors.subject?.message} {...form.register('subject')} />
        <div className="flex flex-col gap-2 md:col-span-2">
          <label htmlFor={messageId} className="text-sm">
            Mensagem<span className="ml-0.5 text-required" aria-hidden="true">*</span>
          </label>
          <Textarea
            id={messageId}
            rows={6}
            aria-required
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={`${messageId}-${errors.message ? 'erro' : 'contador'}`}
            {...form.register('message')}
          />
          {errors.message ? (
            <p id={`${messageId}-erro`} className="text-xs text-destructive">{errors.message.message}</p>
          ) : (
            <p id={`${messageId}-contador`} className="text-xs text-muted-foreground">{messageLength}/2000 caracteres (mínimo 20).</p>
          )}
        </div>
        <Button type="submit" disabled={create.isPending} className="w-fit">
          {create.isPending ? 'Enviando…' : 'Enviar chamado'}
        </Button>
      </form>
    </section>
  )
}

function TicketList() {
  const tickets = useTickets()

  return (
    <section aria-labelledby="meus-chamados">
      <h2 id="meus-chamados" className="border-b border-border pb-3 text-base font-bold text-primary">Meus chamados</h2>
      <div className="mt-4">
        {tickets.isError && !tickets.data ? (
          <div role="alert" className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground">{errorMessage(tickets.error)}</p>
            <Button onClick={() => void tickets.refetch()} disabled={tickets.isFetching}>Tentar novamente</Button>
          </div>
        ) : !tickets.data ? (
          <div aria-busy="true" aria-label="Carregando chamados" className="flex flex-col gap-3">
            {[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : tickets.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não abriu nenhum chamado.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tickets.data.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)}
          </ul>
        )}
      </div>
    </section>
  )
}

function TicketRow({ ticket }: { ticket: SupportTicket }) {
  const answered = ticket.status === 'respondido'
  return (
    <li className="flex flex-col gap-2 bg-card p-4" aria-label={`Chamado ${ticket.protocol}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">{ticket.subject}</p>
        <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-bold', answered ? 'border-emerald-400/60 text-emerald-300' : 'border-primary text-primary')}>
          {answered ? 'Respondido' : 'Em análise'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {ticket.protocol} · {TICKET_CATEGORIES[ticket.category]} · {dateFormat.format(new Date(ticket.createdAt))}
        {ticket.orderId && ` · Pedido ${ticket.orderId}`}
      </p>
      <p className="text-sm whitespace-pre-line">{ticket.message}</p>
      {ticket.reply && (
        <div className="mt-1 border-l-2 border-primary pl-3">
          <p className="text-xs font-bold text-primary">
            Resposta da equipe Kurio{ticket.repliedAt && ` · ${dateFormat.format(new Date(ticket.repliedAt))}`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{ticket.reply}</p>
        </div>
      )}
    </li>
  )
}
