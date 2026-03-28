import { z } from 'zod';

export const dealStageEnum = z.enum(
  ['lead', 'viewing_scheduled', 'viewing_done', 'negotiation', 'offer_made', 'offer_accepted', 'contract_prep', 'contract_signed', 'title_transfer', 'completed', 'lost'],
  { errorMap: () => ({ message: 'Gecerli bir asama seciniz' }) }
);

export const dealTypeEnum = z.enum(['sale', 'rental'], {
  errorMap: () => ({ message: 'Gecerli bir islem tipi seciniz' }),
});

export const createDealSchema = z.object({
  title: z
    .string({ required_error: 'Anlasmaya bir baslik gerekli' })
    .min(5, 'Baslik en az 5 karakter olmali')
    .max(200)
    .trim(),
  deal_type: dealTypeEnum,
  stage: dealStageEnum.optional().default('lead'),
  property_id: z.string().uuid('Gecersiz emlak ID').optional().nullable(),
  buyer_id: z.string().uuid('Gecersiz alici ID').optional().nullable(),
  seller_id: z.string().uuid('Gecersiz satici ID').optional().nullable(),
  assigned_to_id: z.string().uuid('Gecersiz danisan ID').optional().nullable(),

  // Financials
  expected_price: z.number().min(0).optional().nullable(),
  offer_price: z.number().min(0).optional().nullable(),
  final_price: z.number().min(0).optional().nullable(),
  currency: z.enum(['TRY', 'USD', 'EUR', 'GBP']).optional().default('TRY'),

  // Commission
  commission_rate: z.number().min(0).max(100, 'Komisyon orani %100\'den fazla olamaz').optional().nullable(),
  commission_amount: z.number().min(0).optional().nullable(),
  commission_type: z.enum(['percentage', 'fixed']).optional().default('percentage'),

  // Dates
  expected_close_date: z.string().datetime().optional().nullable(),
  viewing_date: z.string().datetime().optional().nullable(),

  // Notes
  notes: z.string().max(5000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  tags: z.array(z.string().max(30)).max(20).optional(),
});

export const updateDealSchema = createDealSchema.partial();

export const updateDealStageSchema = z.object({
  stage: dealStageEnum,
  notes: z.string().max(1000).optional(),
  lost_reason: z.string().max(500).optional().nullable(),
});

export const dealFilterSchema = z.object({
  search: z.string().optional(),
  deal_type: z.string().optional(),
  stage: z.string().optional(), // comma-separated for multiple stages
  assigned_to: z.string().optional(),
  buyer_id: z.string().optional(),
  seller_id: z.string().optional(),
  property_id: z.string().optional(),
  priority: z.string().optional(),
  price_min: z.string().optional(),
  price_max: z.string().optional(),
  created_from: z.string().optional(),
  created_to: z.string().optional(),
  expected_close_from: z.string().optional(),
  expected_close_to: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const dealIdParamSchema = z.object({
  id: z.string().uuid('Gecersiz ID formati'),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type UpdateDealStageInput = z.infer<typeof updateDealStageSchema>;
export type DealFilterInput = z.infer<typeof dealFilterSchema>;
