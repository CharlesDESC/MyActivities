import { z } from 'zod';

const passwordRule = z
  .string()
  .min(8)
  .regex(/[A-Z]/, 'Doit contenir au moins 1 majuscule')
  .regex(/[0-9]/, 'Doit contenir au moins 1 chiffre');

export const RegisterSchema = z.object({
  email: z.string().email(),
  pseudo: z.string().min(3).max(30),
  password: passwordRule,
  // Fourni lors de l'inscription d'un organisateur : le service vérifie
  // ensuite l'existence et l'activité de l'établissement avant d'accorder le rôle.
  siret: z.string().regex(/^\d{14}$/, 'Le SIRET doit comporter 14 chiffres').optional(),
});

export const LoginSchema = z.object({
  pseudo: z.string().min(3).max(30),
  password: z.string().min(1),
  rememberMe: z.boolean().default(false),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordRule,
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Inferred types ────────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type LogoutInput = z.infer<typeof LogoutSchema>;
