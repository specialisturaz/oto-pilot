import { z } from 'zod';

export const messageChannelEnum = z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'INTERNAL'], {
  errorMap: () => ({ message: 'Gecerli bir kanal seciniz' }),
});

export const conversationStatusEnum = z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'], {
  errorMap: () => ({ message: 'Gecerli bir durum seciniz' }),
});

export const createConversationSchema = z.object({
  contact_id: z.string().uuid('Gecersiz musteri ID'),
  channel: messageChannelEnum,
  assigned_user_id: z.string().uuid('Gecersiz kullanici ID').optional().nullable(),
});

export const updateConversationSchema = z.object({
  status: conversationStatusEnum.optional(),
  assigned_user_id: z.string().uuid('Gecersiz kullanici ID').optional().nullable(),
});

export const sendMessageSchema = z.object({
  conversation_id: z.string().uuid('Gecersiz konusma ID').optional(),
  contact_id: z.string().uuid('Gecersiz musteri ID').optional(),
  channel: messageChannelEnum,
  content: z.string().min(1, 'Mesaj icerigi gerekli').max(4096, 'Mesaj cok uzun'),
  media_url: z.string().url('Gecersiz medya URL').optional().nullable(),
  media_type: z.string().max(50).optional().nullable(),
  template_id: z.string().uuid('Gecersiz sablon ID').optional().nullable(),
}).refine(
  (data) => data.conversation_id || data.contact_id,
  { message: 'Konusma ID veya musteri ID gerekli', path: ['conversation_id'] }
);

export const conversationFilterSchema = z.object({
  search: z.string().optional(),
  channel: z.string().optional(),
  status: z.string().optional(),
  assigned_user_id: z.string().optional(),
  contact_id: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const messageFilterSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const conversationIdParamSchema = z.object({
  id: z.string().uuid('Gecersiz ID formati'),
});

export const whatsappWebhookSchema = z.object({
  object: z.string().optional(),
  entry: z.array(z.any()).optional(),
}).passthrough();

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ConversationFilterInput = z.infer<typeof conversationFilterSchema>;
export type MessageFilterInput = z.infer<typeof messageFilterSchema>;
