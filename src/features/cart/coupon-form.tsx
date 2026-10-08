import { X } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApplyCoupon, useRemoveCoupon } from '@/features/cart/use-cart'
import { applyServerErrors, errorMessage, zodResolver } from '@/lib/forms'

const couponSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código do cupom.').max(32, 'Código muito longo.'),
})

type CouponValues = z.infer<typeof couponSchema>

interface CouponFormProps {
  /** Cupom gravado no carrinho. */
  appliedCode: string | null
  /** Cupom considerado na cotação (com a descrição do desconto). */
  coupon: { code: string; description: string } | null
}

/** Aplicação e remoção de cupom; a validade é sempre decidida pela API. */
export function CouponForm({ appliedCode, coupon }: CouponFormProps) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const inputId = useId()
  const errorId = `${inputId}-erro`
  const form = useForm<CouponValues>({ resolver: zodResolver(couponSchema), defaultValues: { code: '' } })
  const error = form.formState.errors.code?.message

  const submit = form.handleSubmit(({ code }) =>
    apply.mutate(code, {
      onSuccess: (cart) => {
        form.reset({ code: '' })
        toast.success(`Cupom ${cart.couponCode} aplicado.`)
      },
      onError: (err) => {
        if (!applyServerErrors(err, form.setError, ['code'])) form.setError('code', { type: 'server', message: errorMessage(err) })
      },
    }),
  )

  if (appliedCode) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold">Código promocional</p>
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary px-3 py-2">
          <p className="min-w-0 text-sm">
            <span className="font-bold text-primary">{appliedCode}</span>
            {coupon && <span className="block text-muted-foreground">{coupon.description}</span>}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              remove.mutate(undefined, {
                onSuccess: () => toast.success('Cupom removido.'),
                onError: (err) => toast.error(errorMessage(err)),
              })
            }
            disabled={remove.isPending}
            className="text-primary"
            aria-label={`Remover cupom ${appliedCode}`}
          >
            <X aria-hidden="true" />
            {remove.isPending ? 'Removendo…' : 'Remover'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Cupom de desconto" className="flex flex-col gap-2">
      <label htmlFor={inputId} className="sr-only text-sm font-bold md:not-sr-only">
        Código promocional
      </label>
      <div className="flex rounded-full bg-background md:rounded-none">
        <Input
          id={inputId}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Digite o código promocional..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-12 min-w-0 flex-1 rounded-l-full rounded-r-none border-r-0 pl-4 text-xs md:h-10 md:rounded-l-md"
          {...form.register('code')}
        />
        <Button
          type="submit"
          disabled={apply.isPending}
          className="h-12 rounded-l-none rounded-r-full px-5 text-base md:h-10 md:rounded-r-md"
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
