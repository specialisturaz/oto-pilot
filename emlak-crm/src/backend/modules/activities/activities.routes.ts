import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { PrismaClient } from '@prisma/client';
import { parsePaginationParams, createPaginatedResponse } from '../../utils/pagination.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/activities
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaginationParams(req.query as any);
  const user = req.user!;

  const where: any = { officeId: user.officeId! };

  if (req.query.contact_id) {
    where.contactId = String(req.query.contact_id);
  }
  if (req.query.property_id) {
    where.propertyId = String(req.query.property_id);
  }
  if (req.query.deal_id) {
    where.dealId = String(req.query.deal_id);
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        property: { select: { id: true, title: true } },
        deal: { select: { id: true, type: true, stage: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  res.json(createPaginatedResponse(activities, total, page, limit));
}));

// POST /api/v1/activities
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const user = req.user!;

  const activity = await prisma.activity.create({
    data: {
      officeId: user.officeId!,
      userId: user.id,
      type: req.body.type || 'NOTE',
      subject: req.body.subject || '',
      description: req.body.description || '',
      durationMinutes: req.body.duration_minutes || null,
      outcome: req.body.outcome || null,
      contactId: req.body.contact_id || null,
      propertyId: req.body.property_id || null,
      dealId: req.body.deal_id || null,
    },
  });

  res.status(201).json({ success: true, data: activity });
}));

export default router;
