import { z } from 'zod';

export const taskTypeEnum = z.enum(
  ['CALL', 'MEETING', 'SHOWING', 'FOLLOWUP', 'DOCUMENT', 'INSPECTION', 'CONTRACT', 'PAYMENT', 'OTHER'],
  { errorMap: () => ({ message: 'Gecerli bir gorev tipi seciniz' }) }
);

export const taskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'], {
  errorMap: () => ({ message: 'Gecerli bir oncelik seciniz' }),
});

export const taskStatusEnum = z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
  errorMap: () => ({ message: 'Gecerli bir durum seciniz' }),
});

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: 'Gorev basligi gerekli' })
    .min(3, 'Baslik en az 3 karakter olmali')
    .max(200)
    .trim(),
  description: z.string().max(2000).optional().nullable(),
  type: taskTypeEnum.optional().default('OTHER'),
  priority: taskPriorityEnum.optional().default('MEDIUM'),
  status: taskStatusEnum.optional().default('TODO'),
  assigned_to_id: z.string().uuid('Gecersiz kullanici ID').optional().nullable(),
  contact_id: z.string().uuid('Gecersiz musteri ID').optional().nullable(),
  property_id: z.string().uuid('Gecersiz emlak ID').optional().nullable(),
  deal_id: z.string().uuid('Gecersiz anlasma ID').optional().nullable(),
  due_date: z.string().datetime({ message: 'Gecersiz tarih formati' }).optional().nullable(),
  reminder_at: z.string().datetime({ message: 'Gecersiz hatirlatma tarihi' }).optional().nullable(),
  is_recurring: z.boolean().optional().default(false),
  recurrence_rule: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .describe('iCal RRULE formati: FREQ=DAILY;INTERVAL=1'),
});

export const updateTaskSchema = createTaskSchema.partial();

export const completeTaskSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const taskFilterSchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  assigned_to_id: z.string().optional(),
  contact_id: z.string().optional(),
  property_id: z.string().optional(),
  deal_id: z.string().optional(),
  due_from: z.string().optional(),
  due_to: z.string().optional(),
  is_overdue: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const taskIdParamSchema = z.object({
  id: z.string().uuid('Gecersiz ID formati'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
