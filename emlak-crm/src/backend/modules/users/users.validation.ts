import { z } from 'zod';

export const userRoleEnum = z.enum(['ADMIN', 'MANAGER', 'AGENT', 'SECRETARY', 'VIEWER'], {
  errorMap: () => ({ message: 'Gecerli bir rol seciniz' }),
});

export const createUserSchema = z.object({
  email: z
    .string({ required_error: 'E-posta adresi gerekli' })
    .email('Gecerli bir e-posta adresi giriniz')
    .max(200),
  password: z
    .string({ required_error: 'Sifre gerekli' })
    .min(8, 'Sifre en az 8 karakter olmali')
    .max(100),
  first_name: z
    .string({ required_error: 'Ad gerekli' })
    .min(2, 'Ad en az 2 karakter olmali')
    .max(100)
    .trim(),
  last_name: z
    .string({ required_error: 'Soyad gerekli' })
    .min(2, 'Soyad en az 2 karakter olmali')
    .max(100)
    .trim(),
  phone: z.string().max(20).optional().nullable(),
  role: userRoleEnum.optional().default('AGENT'),
  title: z.string().max(100).optional().nullable(),
  tc_kimlik_no: z
    .string()
    .length(11, 'TC Kimlik No 11 haneli olmali')
    .regex(/^\d+$/, 'TC Kimlik No sadece rakam icermeli')
    .optional()
    .nullable(),
  avatar_url: z.string().url('Gecersiz URL').optional().nullable(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Gecerli bir e-posta adresi giriniz').max(200).optional(),
  first_name: z.string().min(2).max(100).trim().optional(),
  last_name: z.string().min(2).max(100).trim().optional(),
  phone: z.string().max(20).optional().nullable(),
  role: userRoleEnum.optional(),
  title: z.string().max(100).optional().nullable(),
  tc_kimlik_no: z
    .string()
    .length(11)
    .regex(/^\d+$/)
    .optional()
    .nullable(),
  avatar_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional(),
  notification_preferences: z.record(z.unknown()).optional(),
});

export const updateProfileSchema = z.object({
  first_name: z.string().min(2).max(100).trim().optional(),
  last_name: z.string().min(2).max(100).trim().optional(),
  phone: z.string().max(20).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  notification_preferences: z.record(z.unknown()).optional(),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string({ required_error: 'Mevcut sifre gerekli' }),
    new_password: z
      .string({ required_error: 'Yeni sifre gerekli' })
      .min(8, 'Yeni sifre en az 8 karakter olmali')
      .max(100),
    confirm_password: z.string({ required_error: 'Sifre tekrari gerekli' }),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Sifreler eslesmiyoR',
    path: ['confirm_password'],
  });

export const userFilterSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  is_active: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string({ required_error: 'ID gerekli' }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserFilterInput = z.infer<typeof userFilterSchema>;
