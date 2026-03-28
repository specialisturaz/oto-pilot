import { z } from 'zod';

export const commissionTypeEnum = z.enum(['BUYER_SIDE', 'SELLER_SIDE', 'REFERRAL'], {
  errorMap: () => ({ message: 'Gecerli bir komisyon tipi seciniz' }),
});

export const commissionStatusEnum = z.enum(['PENDING', 'INVOICED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'], {
  errorMap: () => ({ message: 'Gecerli bir durum seciniz' }),
});

export const createCommissionSchema = z.object({
  deal_id: z.string().uuid('Gecersiz anlasma ID'),
  agent_id: z.string().uuid('Gecersiz danisMan ID'),
  type: commissionTypeEnum,
  rate: z
    .number()
    .min(0, 'Oran 0\'dan kucuk olamaz')
    .max(100, 'Oran %100\'den buyuk olamaz')
    .optional()
    .nullable(),
  amount: z
    .number({ required_error: 'Komisyon tutari gerekli' })
    .min(0, 'Tutar 0\'dan kucuk olamaz'),
  agent_share_rate: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable()
    .describe('Danismanin komisyon payi yuzdesi'),
  invoice_no: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateCommissionSchema = createCommissionSchema.partial();

export const calculateCommissionSchema = z.object({
  deal_id: z.string().uuid('Gecersiz anlasma ID'),
  sale_price: z
    .number({ required_error: 'Satis fiyati gerekli' })
    .min(0, 'Fiyat 0\'dan kucuk olamaz'),
  buyer_commission_rate: z.number().min(0).max(100).optional().default(2),
  seller_commission_rate: z.number().min(0).max(100).optional().default(2),
  agent_share_rate: z.number().min(0).max(100).optional().default(50),
  include_kdv: z.boolean().optional().default(true),
});

export const approveCommissionSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const markPaidSchema = z.object({
  payment_date: z.string().datetime({ message: 'Gecersiz odeme tarihi' }).optional(),
  invoice_no: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional(),
});

export const commissionFilterSchema = z.object({
  search: z.string().optional(),
  deal_id: z.string().optional(),
  agent_id: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const commissionIdParamSchema = z.object({
  id: z.string().uuid('Gecersiz ID formati'),
});

export type CreateCommissionInput = z.infer<typeof createCommissionSchema>;
export type UpdateCommissionInput = z.infer<typeof updateCommissionSchema>;
export type CalculateCommissionInput = z.infer<typeof calculateCommissionSchema>;
export type ApproveCommissionInput = z.infer<typeof approveCommissionSchema>;
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
export type CommissionFilterInput = z.infer<typeof commissionFilterSchema>;
