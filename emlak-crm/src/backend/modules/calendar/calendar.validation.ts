import { z } from 'zod';

export const appointmentTypeEnum = z.enum(
  ['SHOWING', 'MEETING', 'APPRAISAL', 'CONTRACT_SIGNING', 'TAPU_APPOINTMENT', 'INSPECTION', 'OTHER'],
  { errorMap: () => ({ message: 'Gecerli bir randevu tipi seciniz' }) }
);

export const appointmentStatusEnum = z.enum(
  ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
  { errorMap: () => ({ message: 'Gecerli bir durum seciniz' }) }
);

export const createAppointmentSchema = z
  .object({
    title: z
      .string({ required_error: 'Randevu basligi gerekli' })
      .min(3, 'Baslik en az 3 karakter olmali')
      .max(200)
      .trim(),
    type: appointmentTypeEnum.optional().default('SHOWING'),
    status: appointmentStatusEnum.optional().default('SCHEDULED'),
    contact_id: z.string().uuid('Gecersiz musteri ID'),
    property_id: z.string().uuid('Gecersiz emlak ID').optional().nullable(),
    deal_id: z.string().uuid('Gecersiz anlasma ID').optional().nullable(),
    start_time: z.string().datetime({ message: 'Gecersiz baslangic tarihi' }),
    end_time: z.string().datetime({ message: 'Gecersiz bitis tarihi' }),
    location: z.string().max(500).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (data) => new Date(data.end_time) > new Date(data.start_time),
    { message: 'Bitis zamani baslangic zamanindan sonra olmali', path: ['end_time'] }
  );

export const updateAppointmentSchema = z.object({
  title: z.string().min(3).max(200).trim().optional(),
  type: appointmentTypeEnum.optional(),
  status: appointmentStatusEnum.optional(),
  contact_id: z.string().uuid('Gecersiz musteri ID').optional(),
  property_id: z.string().uuid('Gecersiz emlak ID').optional().nullable(),
  deal_id: z.string().uuid('Gecersiz anlasma ID').optional().nullable(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  location: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const appointmentFilterSchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  user_id: z.string().optional(),
  contact_id: z.string().optional(),
  property_id: z.string().optional(),
  deal_id: z.string().optional(),
  start_from: z.string().optional(),
  start_to: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const dateRangeSchema = z.object({
  start: z.string().datetime({ message: 'Gecersiz baslangic tarihi' }),
  end: z.string().datetime({ message: 'Gecersiz bitis tarihi' }),
  user_id: z.string().uuid().optional(),
});

export const appointmentIdParamSchema = z.object({
  id: z.string().uuid('Gecersiz ID formati'),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AppointmentFilterInput = z.infer<typeof appointmentFilterSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
