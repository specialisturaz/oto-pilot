import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
const { mockPrismaContact, mockPrismaActivity, mockPrismaDeal } = vi.hoisted(() => ({
  mockPrismaContact: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  mockPrismaActivity: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  mockPrismaDeal: {
    findMany: vi.fn(),
  },
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    contact: mockPrismaContact,
    activity: mockPrismaActivity,
    deal: mockPrismaDeal,
  })),
}));

vi.mock('../../../src/backend/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  requestLogFormat: vi.fn().mockReturnValue(''),
}));

vi.mock('../../../src/backend/config', () => ({
  default: {
    server: {
      port: 0,
      nodeEnv: 'test',
      frontendUrl: 'http://localhost:3000',
      isProduction: false,
    },
    jwt: {
      secret: 'test-jwt-secret-key-emlak-crm-2026',
      expiresIn: '15m',
      refreshSecret: 'test-jwt-refresh-secret-key-emlak-crm-2026',
      refreshExpiresIn: '7d',
    },
    upload: {
      uploadsDir: '/tmp/test-uploads',
      maxFileSize: 10485760,
      allowedImageTypes: ['image/jpeg'],
      allowedDocumentTypes: ['application/pdf'],
    },
  },
}));

// ---------------------------------------------------------------------------
// Build test Express app
// ---------------------------------------------------------------------------
import contactsRoutes from '../../../src/backend/modules/contacts/contacts.routes';
import { globalErrorHandler } from '../../../src/backend/middleware/errorHandler';

let app: express.Express;

const JWT_SECRET = 'test-jwt-secret-key-emlak-crm-2026';

const TEST_AUTH_USER = {
  userId: 'test-agent-1',
  email: 'elif.yildiz@emlak.com',
  role: 'ADMIN',
  officeId: 'office-kadikoy-1',
};

let authToken: string;

// Sample contact data (Turkish values)
const SAMPLE_CONTACT = {
  id: 'contact-uuid-1',
  firstName: 'Hasan',
  lastName: 'Ozdemir',
  email: 'hasan.ozdemir@gmail.com',
  phone: '05351234567',
  secondaryPhone: null,
  type: 'buyer',
  source: 'sahibinden',
  tcKimlikNo: null,
  companyName: 'Ozdemir Insaat',
  address: 'Bagdat Caddesi No:45, Kadikoy',
  city: 'Istanbul',
  district: 'Kadikoy',
  notes: 'Kadikoy bolgesinde 3+1 daire ariyor',
  tags: '["yatirimci", "acil"]',
  budgetMin: 3000000,
  budgetMax: 5000000,
  preferredLocations: '["Kadikoy", "Uskudar"]',
  preferredPropertyTypes: '["APARTMENT"]',
  interestType: 'BUYER',
  officeId: 'office-kadikoy-1',
  assignedUserId: 'test-agent-1',
  createdAt: new Date('2025-08-10T14:00:00Z'),
  updatedAt: new Date('2025-08-10T14:00:00Z'),
  assignedUser: {
    id: 'test-agent-1',
    firstName: 'Elif',
    lastName: 'Yildiz',
    avatarUrl: null,
  },
};

beforeAll(() => {
  authToken = jwt.sign(TEST_AUTH_USER, JWT_SECRET, { expiresIn: '1h' });

  app = express();
  app.use(express.json());
  app.use('/api/v1/contacts', contactsRoutes);
  app.use(globalErrorHandler);
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/v1/contacts (list)
// ---------------------------------------------------------------------------
describe('GET /api/v1/contacts', () => {
  it('should return 401 without auth token', async () => {
    const response = await request(app)
      .get('/api/v1/contacts')
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  it('should return 200 with paginated contacts', async () => {
    mockPrismaContact.findMany.mockResolvedValue([SAMPLE_CONTACT]);
    mockPrismaContact.count.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/v1/contacts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.pagination).toBeDefined();
    expect(response.body.pagination.total).toBe(1);
    expect(response.body.pagination.page).toBe(1);
  });

  it('should return empty array when no contacts', async () => {
    mockPrismaContact.findMany.mockResolvedValue([]);
    mockPrismaContact.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/v1/contacts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.total).toBe(0);
  });

  it('should support pagination query params', async () => {
    mockPrismaContact.findMany.mockResolvedValue([]);
    mockPrismaContact.count.mockResolvedValue(50);

    const response = await request(app)
      .get('/api/v1/contacts?page=2&limit=10')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.pagination.page).toBe(2);
    expect(response.body.pagination.limit).toBe(10);
    expect(response.body.pagination.totalPages).toBe(5);
  });

  it('should reject invalid auth token', async () => {
    const response = await request(app)
      .get('/api/v1/contacts')
      .set('Authorization', 'Bearer invalid-token-xyz')
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/contacts (create)
// ---------------------------------------------------------------------------
describe('POST /api/v1/contacts', () => {
  const newContactPayload = {
    first_name: 'Fatma',
    last_name: 'Cetin',
    phone: '05441234567',
    email: 'fatma.cetin@gmail.com',
    contact_type: 'buyer',
    source: 'website',
    city: 'Ankara',
    district: 'Cankaya',
    notes: 'Cankaya bolgesinde villa ariyor',
    budget_min: 8000000,
    budget_max: 15000000,
  };

  it('should create a contact with valid data', async () => {
    mockPrismaContact.create.mockResolvedValue({
      id: 'new-contact-uuid',
      firstName: 'Fatma',
      lastName: 'Cetin',
      phone: '05441234567',
      email: 'fatma.cetin@gmail.com',
      type: 'buyer',
      source: 'website',
      city: 'Ankara',
      district: 'Cankaya',
      officeId: 'office-kadikoy-1',
      assignedUserId: 'test-agent-1',
      createdAt: new Date(),
      assignedUser: {
        id: 'test-agent-1',
        firstName: 'Elif',
        lastName: 'Yildiz',
        avatarUrl: null,
      },
    });

    const response = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newContactPayload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.firstName).toBe('Fatma');
    expect(response.body.data.lastName).toBe('Cetin');
    expect(response.body.data.officeId).toBe('office-kadikoy-1');
  });

  it('should return 401 without auth', async () => {
    await request(app)
      .post('/api/v1/contacts')
      .send(newContactPayload)
      .expect(401);
  });

  it('should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        first_name: 'Ali',
        // missing last_name, phone, contact_type
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid phone format', async () => {
    const response = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        ...newContactPayload,
        phone: '123', // invalid
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid contact_type', async () => {
    const response = await request(app)
      .post('/api/v1/contacts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        ...newContactPayload,
        contact_type: 'invalid_type',
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/contacts/:id
// ---------------------------------------------------------------------------
describe('GET /api/v1/contacts/:id', () => {
  it('should return a contact by ID', async () => {
    mockPrismaContact.findUnique.mockResolvedValue({ ...SAMPLE_CONTACT });

    const response = await request(app)
      .get('/api/v1/contacts/contact-uuid-1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('contact-uuid-1');
    expect(response.body.data.firstName).toBe('Hasan');
    expect(response.body.data.city).toBe('Istanbul');
  });

  it('should return 404 for non-existent contact', async () => {
    mockPrismaContact.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/v1/contacts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 403 when contact belongs to different office', async () => {
    mockPrismaContact.findUnique.mockResolvedValue({
      ...SAMPLE_CONTACT,
      officeId: 'other-office-id',
    });

    const response = await request(app)
      .get('/api/v1/contacts/contact-uuid-1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should return 400 for invalid UUID format', async () => {
    const response = await request(app)
      .get('/api/v1/contacts/not-a-uuid')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/v1/contacts/:id
// ---------------------------------------------------------------------------
describe('PUT /api/v1/contacts/:id', () => {
  it('should update a contact', async () => {
    mockPrismaContact.findUnique.mockResolvedValue({ ...SAMPLE_CONTACT });
    mockPrismaContact.update.mockResolvedValue({
      ...SAMPLE_CONTACT,
      notes: 'Guncellenmis notlar - Besiktas bolgesine de bakiyor',
      budgetMax: 6000000,
    });

    const response = await request(app)
      .put('/api/v1/contacts/contact-uuid-1')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notes: 'Guncellenmis notlar - Besiktas bolgesine de bakiyor',
        budget_max: 6000000,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.budgetMax).toBe(6000000);
  });

  it('should return 404 for updating non-existent contact', async () => {
    mockPrismaContact.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .put('/api/v1/contacts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ notes: 'Test' })
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 403 when updating contact from different office', async () => {
    mockPrismaContact.findUnique.mockResolvedValue({
      ...SAMPLE_CONTACT,
      officeId: 'different-office',
    });

    const response = await request(app)
      .put('/api/v1/contacts/contact-uuid-1')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ notes: 'Yetkisiz guncelleme' })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/contacts/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/v1/contacts/:id', () => {
  it('should delete a contact', async () => {
    mockPrismaContact.findUnique.mockResolvedValue({ ...SAMPLE_CONTACT });
    mockPrismaContact.delete.mockResolvedValue({ ...SAMPLE_CONTACT });

    const response = await request(app)
      .delete('/api/v1/contacts/contact-uuid-1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toBe('Musteri basariyla silindi');
  });

  it('should return 404 for deleting non-existent contact', async () => {
    mockPrismaContact.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .delete('/api/v1/contacts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 403 when deleting contact from different office', async () => {
    mockPrismaContact.findUnique.mockResolvedValue({
      ...SAMPLE_CONTACT,
      officeId: 'unauthorized-office',
    });

    const response = await request(app)
      .delete('/api/v1/contacts/contact-uuid-1')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should return 401 without auth', async () => {
    await request(app)
      .delete('/api/v1/contacts/contact-uuid-1')
      .expect(401);
  });
});
