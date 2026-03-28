import { z } from 'zod';

export const portalIdParamSchema = z.object({
  id: z.string().min(1, 'Portal ID gerekli'),
});

export const portalListingParamSchema = z.object({
  portalId: z.string().min(1, 'Portal ID gerekli'),
  listingId: z.string().min(1, 'Listing ID gerekli'),
});

export const updatePortalSchema = z.object({
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
});

export const publishToPortalsSchema = z.object({
  propertyId: z.string().min(1, 'Emlak ID gerekli'),
  portalSlugs: z
    .array(z.enum(['sahibinden', 'hepsiemlak', 'emlakjet']))
    .min(1, 'En az bir portal seciniz'),
});

export type UpdatePortalInput = z.infer<typeof updatePortalSchema>;
export type PublishToPortalsInput = z.infer<typeof publishToPortalsSchema>;
