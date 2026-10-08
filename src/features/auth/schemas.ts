import { z } from 'zod'

/** Regras espelhadas da API (mocks/handlers/auth.ts), para feedback imediato. */

const email = z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.')

const password = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .regex(/[a-zA-Z]/, 'A senha deve conter letras e números.')
  .regex(/\d/, 'A senha deve conter letras e números.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
})

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._]{3,20}$/, 'Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou sublinhado.'),
    email,
    password,
    confirmPassword: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
