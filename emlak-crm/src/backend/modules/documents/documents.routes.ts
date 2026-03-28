import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler.js';
import { PrismaClient } from '@prisma/client';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination.js';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(process.cwd(), 'uploads', 'documents')),
  filename: (_req, file, cb) => {
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// GET /api/v1/documents
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query as any);
  const user = req.user!;

  const where: any = {};

  // Get all properties belonging to this office, then find their documents
  if (req.query.type) {
    where.type = String(req.query.type);
  }
  if (req.query.property_id) {
    where.propertyId = String(req.query.property_id);
  }

  const [documents, total] = await Promise.all([
    prisma.propertyDocument.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, title: true, officeId: true } },
        uploadedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.propertyDocument.count({ where }),
  ]);

  // Filter by office
  const filtered = documents.filter((d: any) => d.property?.officeId === user.officeId);

  res.json(createPaginatedResponse(filtered, total, page, limit));
}));

// POST /api/v1/documents
router.post('/', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  const user = req.user!;
  const file = req.file;

  if (!file) {
    res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Dosya yuklenemedi' } });
    return;
  }

  const doc = await prisma.propertyDocument.create({
    data: {
      propertyId: req.body.property_id || req.body.propertyId,
      uploadedById: user.id,
      type: req.body.type || 'OTHER',
      fileUrl: `/uploads/documents/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size,
      notes: req.body.notes || null,
    },
  });

  res.status(201).json({ success: true, data: doc });
}));

// PUT /api/v1/documents/:id
router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const doc = await prisma.propertyDocument.update({
    where: { id: String(req.params.id) },
    data: {
      fileName: req.body.fileName || req.body.file_name,
      type: req.body.type,
      notes: req.body.notes,
    },
  });

  res.json({ success: true, data: doc });
}));

// DELETE /api/v1/documents/:id
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const doc = await prisma.propertyDocument.findUnique({ where: { id: String(req.params.id) } });
  if (!doc) throw NotFoundError('Belge bulunamadi');

  await prisma.propertyDocument.delete({ where: { id: String(req.params.id) } });

  res.json({ success: true, data: { message: 'Belge silindi' } });
}));

export default router;
