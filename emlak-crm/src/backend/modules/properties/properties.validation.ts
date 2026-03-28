import { z } from 'zod';

export const propertyTypeEnum = z.enum(
  ['daire', 'villa', 'mustakil', 'arsa', 'tarla', 'dukkan', 'ofis', 'depo', 'fabrika', 'otel', 'devremulk', 'kooperatif', 'bina', 'ciftlik_evi'],
  { errorMap: () => ({ message: 'Gecerli bir emlak tipi seciniz' }) }
);

export const listingTypeEnum = z.enum(['satilik', 'kiralik', 'devren_satilik', 'devren_kiralik', 'gunluk_kiralik'], {
  errorMap: () => ({ message: 'Gecerli bir ilan tipi seciniz' }),
});

export const propertyStatusEnum = z.enum(
  ['active', 'pending', 'sold', 'rented', 'withdrawn', 'draft'],
  { errorMap: () => ({ message: 'Gecerli bir durum seciniz' }) }
);

export const heatingTypeEnum = z.enum(
  ['dogalgaz_kombi', 'merkezi', 'soba', 'yerden_isitma', 'klima', 'diger', 'yok'],
  { errorMap: () => ({ message: 'Gecerli bir isitma tipi seciniz' }) }
);

export const createPropertySchema = z.object({
  title: z
    .string({ required_error: 'Ilan basligi gerekli' })
    .min(10, 'Baslik en az 10 karakter olmali')
    .max(200)
    .trim(),
  description: z
    .string()
    .max(5000, 'Aciklama en fazla 5000 karakter olmali')
    .optional()
    .nullable(),
  property_type: propertyTypeEnum,
  listing_type: listingTypeEnum,
  status: propertyStatusEnum.optional().default('draft'),

  // Price
  listing_price: z
    .number({ required_error: 'Fiyat gerekli' })
    .min(0, 'Fiyat negatif olamaz'),
  currency: z.enum(['TRY', 'USD', 'EUR', 'GBP']).optional().default('TRY'),
  aidat: z.number().min(0).optional().nullable(), // monthly dues

  // Location
  city: z.string({ required_error: 'Sehir gerekli' }).max(50).trim(),
  district: z.string({ required_error: 'Ilce gerekli' }).max(50).trim(),
  neighborhood: z.string().max(100).trim().optional().nullable(), // mahalle
  street: z.string().max(200).optional().nullable(),
  address_detail: z.string().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),

  // Property details
  gross_sqm: z.number().min(1, 'Brut metrekare gerekli').optional().nullable(),
  net_sqm: z.number().min(1).optional().nullable(),
  room_count: z.string().max(10).optional().nullable(), // e.g., "3+1", "2+0"
  bathroom_count: z.number().int().min(0).optional().nullable(),
  floor_number: z.number().int().optional().nullable(),
  total_floors: z.number().int().min(0).optional().nullable(),
  building_age: z.number().int().min(0).optional().nullable(),
  heating_type: heatingTypeEnum.optional().nullable(),
  is_furnished: z.boolean().optional().default(false),
  has_elevator: z.boolean().optional().default(false),
  has_parking: z.boolean().optional().default(false),
  has_balcony: z.boolean().optional().default(false),
  has_garden: z.boolean().optional().default(false),
  has_pool: z.boolean().optional().default(false),
  has_security: z.boolean().optional().default(false),
  has_cellar: z.boolean().optional().default(false),

  // Deed info (tapu)
  tapu_durumu: z.enum(['kat_mulkiyeti', 'kat_irtifaki', 'arsa_tapusu', 'hisseli', 'diger']).optional().nullable(),
  ada_no: z.string().max(20).optional().nullable(),
  parsel_no: z.string().max(20).optional().nullable(),
  gabari: z.string().max(50).optional().nullable(),
  imar_durumu: z.string().max(100).optional().nullable(),

  // Relations
  seller_contact_id: z.string().min(1).optional().nullable(),
  assigned_to_id: z.string().min(1).optional().nullable(),

  // Extras
  features: z.array(z.string().max(50)).max(50).optional(),
  video_url: z.string().url().optional().nullable(),
  virtual_tour_url: z.string().url().optional().nullable(),
});

export const updatePropertySchema = createPropertySchema.partial();

export const propertyFilterSchema = z.object({
  search: z.string().optional(),
  property_type: z.string().optional(), // can be comma-separated
  listing_type: z.string().optional(),
  status: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  neighborhood: z.string().optional(),
  price_min: z.string().optional(),
  price_max: z.string().optional(),
  sqm_min: z.string().optional(),
  sqm_max: z.string().optional(),
  room_count: z.string().optional(), // e.g., "3+1"
  floor_min: z.string().optional(),
  floor_max: z.string().optional(),
  building_age_max: z.string().optional(),
  is_furnished: z.string().optional(),
  has_elevator: z.string().optional(),
  has_parking: z.string().optional(),
  has_balcony: z.string().optional(),
  has_garden: z.string().optional(),
  heating_type: z.string().optional(),
  assigned_to: z.string().optional(),
  seller_contact_id: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const propertyIdParamSchema = z.object({
  id: z.string().min(1, 'ID gerekli'),
});

export const photoIdParamSchema = z.object({
  id: z.string().min(1, 'ID gerekli'),
  photoId: z.string().min(1, 'Fotograf ID gerekli'),
});

export const publishPropertySchema = z.object({
  portals: z.array(z.enum(['sahibinden', 'hepsiemlak', 'emlakjet'])).min(1, 'En az bir portal seciniz'),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PropertyFilterInput = z.infer<typeof propertyFilterSchema>;
export type PublishPropertyInput = z.infer<typeof publishPropertySchema>;
