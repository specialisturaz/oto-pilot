import { z } from 'zod';

export const contactTypeEnum = z.enum(['buyer', 'seller', 'tenant', 'landlord', 'both'], {
  errorMap: () => ({ message: 'Gecerli bir musteri tipi seciniz' }),
});

export const contactSourceEnum = z.enum(
  ['website', 'sahibinden', 'hepsiemlak', 'emlakjet', 'referral', 'walk_in', 'phone', 'whatsapp', 'social_media', 'other'],
  { errorMap: () => ({ message: 'Gecerli bir kaynak seciniz' }) }
);

export const createContactSchema = z.object({
  first_name: z
    .string({ required_error: 'Ad gerekli' })
    .min(2, 'Ad en az 2 karakter olmali')
    .max(50)
    .trim(),
  last_name: z
    .string({ required_error: 'Soyad gerekli' })
    .min(2, 'Soyad en az 2 karakter olmali')
    .max(50)
    .trim(),
  email: z.string().email('Gecerli bir e-posta giriniz').transform((val) => val.toLocaleLowerCase('tr-TR').trim()).optional().nullable(),
  phone: z
    .string({ required_error: 'Telefon numarasi gerekli' })
    .regex(/^(\+90|0)?[0-9]{10}$/, 'Gecerli bir telefon numarasi giriniz'),
  secondary_phone: z
    .string()
    .regex(/^(\+90|0)?[0-9]{10}$/, 'Gecerli bir telefon numarasi giriniz')
    .optional()
    .nullable(),
  contact_type: contactTypeEnum,
  source: contactSourceEnum.optional(),
  tc_kimlik_no: z
    .string()
    .length(11, 'TC Kimlik No 11 haneli olmali')
    .regex(/^\d+$/, 'TC Kimlik No sadece rakamlardan olusmali')
    .optional()
    .nullable(),
  company_name: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(50).optional().nullable(),
  district: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  budget_min: z.number().min(0).optional().nullable(),
  budget_max: z.number().min(0).optional().nullable(),
  preferred_locations: z.array(z.string()).optional(),
  preferred_property_types: z.array(z.string()).optional(),
});

export const updateContactSchema = createContactSchema.partial();

export const contactFilterSchema = z.object({
  search: z.string().optional(),
  contact_type: contactTypeEnum.optional(),
  source: contactSourceEnum.optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  assigned_to: z.string().optional(),
  created_from: z.string().datetime().optional(),
  created_to: z.string().datetime().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const createNoteSchema = z.object({
  content: z
    .string({ required_error: 'Not icerigi gerekli' })
    .min(1, 'Not icerigi bos olamaz')
    .max(5000),
  is_private: z.boolean().optional().default(false),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Gecersiz ID formati'),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactFilterInput = z.infer<typeof contactFilterSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
