import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'E-posta adresi gerekli' })
    .email('Gecerli bir e-posta adresi giriniz')
    .transform((val) => val.toLocaleLowerCase('tr-TR'))
    .pipe(z.string().trim()),
  password: z
    .string({ required_error: 'Sifre gerekli' })
    .min(8, 'Sifre en az 8 karakter olmali')
    .max(128, 'Sifre en fazla 128 karakter olmali')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Sifre en az bir kucuk harf, bir buyuk harf ve bir rakam icermeli'
    ),
  first_name: z
    .string({ required_error: 'Ad gerekli' })
    .min(2, 'Ad en az 2 karakter olmali')
    .max(50, 'Ad en fazla 50 karakter olmali')
    .trim(),
  last_name: z
    .string({ required_error: 'Soyad gerekli' })
    .min(2, 'Soyad en az 2 karakter olmali')
    .max(50, 'Soyad en fazla 50 karakter olmali')
    .trim(),
  phone: z
    .string()
    .regex(/^(\+90|0)?[0-9]{10}$/, 'Gecerli bir telefon numarasi giriniz')
    .optional(),
  office_invitation_code: z.string().optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'E-posta adresi gerekli' })
    .email('Gecerli bir e-posta adresi giriniz')
    .transform((val) => val.toLocaleLowerCase('tr-TR'))
    .pipe(z.string().trim()),
  password: z
    .string({ required_error: 'Sifre gerekli' })
    .min(1, 'Sifre gerekli'),
});

export const refreshTokenSchema = z.object({
  refresh_token: z
    .string({ required_error: 'Yenileme tokeni gerekli' })
    .min(1, 'Yenileme tokeni gerekli'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'E-posta adresi gerekli' })
    .email('Gecerli bir e-posta adresi giriniz')
    .transform((val) => val.toLocaleLowerCase('tr-TR'))
    .pipe(z.string().trim()),
});

export const resetPasswordSchema = z.object({
  token: z
    .string({ required_error: 'Sifirlama tokeni gerekli' })
    .min(1, 'Sifirlama tokeni gerekli'),
  password: z
    .string({ required_error: 'Yeni sifre gerekli' })
    .min(8, 'Sifre en az 8 karakter olmali')
    .max(128, 'Sifre en fazla 128 karakter olmali')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Sifre en az bir kucuk harf, bir buyuk harf ve bir rakam icermeli'
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
