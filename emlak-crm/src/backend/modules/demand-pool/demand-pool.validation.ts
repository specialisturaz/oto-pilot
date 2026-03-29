import { z } from 'zod';

export const demandTypeEnum = z.enum(['DEMAND', 'OFFER'], {
  errorMap: () => ({ message: 'Gecerli bir talep tipi seciniz (DEMAND veya OFFER)' }),
});

export const listingTypeEnum = z.enum(['SALE', 'RENT'], {
  errorMap: () => ({ message: 'Gecerli bir ilan tipi seciniz (SALE veya RENT)' }),
});

export const createDemandSchema = z.object({
  type: demandTypeEnum.optional().default('DEMAND'),
  property_type: z.string().max(50).optional().nullable(),
  listing_type: listingTypeEnum.optional().nullable(),
  il_id: z.string().optional().nullable(),
  ilce_id: z.string().optional().nullable(),
  mahalle_id: z.string().optional().nullable(),
  budget_min: z.number().min(0).optional().nullable(),
  budget_max: z.number().min(0).optional().nullable(),
  room_count: z.string().max(20).optional().nullable(),
  min_sqm: z.number().int().min(0).optional().nullable(),
  max_sqm: z.number().int().min(0).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  contact_name: z.string().max(100).optional().nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  is_public: z.boolean().optional().default(true),
  expires_at: z.string().datetime().optional().nullable(),
});

export const updateDemandSchema = createDemandSchema.partial();

export const demandFilterSchema = z.object({
  type: demandTypeEnum.optional(),
  property_type: z.string().optional(),
  listing_type: listingTypeEnum.optional(),
  il_id: z.string().optional(),
  ilce_id: z.string().optional(),
  budget_min: z.string().optional(),
  budget_max: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const respondDemandSchema = z.object({
  message: z
    .string({ required_error: 'Yanit mesaji gerekli' })
    .min(1, 'Yanit mesaji bos olamaz')
    .max(2000),
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID gerekli'),
});

export type CreateDemandInput = z.infer<typeof createDemandSchema>;
export type UpdateDemandInput = z.infer<typeof updateDemandSchema>;
export type DemandFilterInput = z.infer<typeof demandFilterSchema>;
export type RespondDemandInput = z.infer<typeof respondDemandSchema>;
