import { Router } from 'express';
import { settingsController } from './settings.controller';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();

// All settings routes require authentication
router.use(requireAuth);

// Office settings (admin/manager only)
router.get(
  '/office',
  settingsController.getOfficeSettings
);

router.put(
  '/office',
  requireRole(['ADMIN', 'MANAGER']),
  validate({
    body: z.object({
      name: z.string().min(2).max(200).optional(),
      phone: z.string().max(20).optional().nullable(),
      email: z.string().email('Gecersiz e-posta').optional().nullable(),
      address: z.string().max(500).optional().nullable(),
      tax_number: z.string().max(20).optional().nullable(),
      tax_office: z.string().max(100).optional().nullable(),
      trade_registry_number: z.string().max(50).optional().nullable(),
      license_number: z.string().max(50).optional().nullable(),
      logo_url: z.string().url('Gecersiz URL').optional().nullable(),
      website: z.string().url('Gecersiz URL').optional().nullable(),
      commission_rate_buy: z.number().min(0).max(100).optional(),
      commission_rate_sell: z.number().min(0).max(100).optional(),
      commission_rate_rent: z.number().min(0).max(100).optional(),
      settings: z.record(z.unknown()).optional(),
    }),
  }),
  settingsController.updateOfficeSettings
);

// Message templates
router.get('/templates', settingsController.listTemplates);

router.get(
  '/templates/:id',
  validate({ params: z.object({ id: z.string().min(1, 'ID gerekli') }) }),
  settingsController.getTemplate
);

router.post(
  '/templates',
  requireRole(['ADMIN', 'MANAGER']),
  validate({
    body: z.object({
      name: z.string({ required_error: 'Sablon adi gerekli' }).min(2).max(100).trim(),
      channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'INTERNAL']),
      category: z.enum(['GREETING', 'FOLLOWUP', 'SHOWING', 'OFFER', 'CONTRACT', 'PAYMENT', 'GENERAL']).optional(),
      subject: z.string().max(200).optional().nullable(),
      content: z.string({ required_error: 'Sablon icerigi gerekli' }).min(1).max(4096),
      variables: z.array(z.string().max(50)).max(20).optional(),
      language: z.string().max(5).optional(),
    }),
  }),
  settingsController.createTemplate
);

router.put(
  '/templates/:id',
  requireRole(['ADMIN', 'MANAGER']),
  validate({
    params: z.object({ id: z.string().min(1, 'ID gerekli') }),
    body: z.object({
      name: z.string().min(2).max(100).trim().optional(),
      channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'INTERNAL']).optional(),
      category: z.enum(['GREETING', 'FOLLOWUP', 'SHOWING', 'OFFER', 'CONTRACT', 'PAYMENT', 'GENERAL']).optional(),
      subject: z.string().max(200).optional().nullable(),
      content: z.string().min(1).max(4096).optional(),
      variables: z.array(z.string().max(50)).max(20).optional(),
      language: z.string().max(5).optional(),
    }),
  }),
  settingsController.updateTemplate
);

router.delete(
  '/templates/:id',
  requireRole(['ADMIN', 'MANAGER']),
  validate({ params: z.object({ id: z.string().min(1, 'ID gerekli') }) }),
  settingsController.deleteTemplate
);

export default router;
