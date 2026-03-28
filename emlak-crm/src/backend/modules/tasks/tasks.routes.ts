import { Router, Request, Response } from 'express';
import { tasksController } from './tasks.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler, NotFoundError as NotFoundErr } from '../../middleware/errorHandler';
import {
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  taskFilterSchema,
  taskIdParamSchema,
} from './tasks.validation';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// All task routes require authentication
router.use(requireAuth);

// My tasks
router.get('/my-tasks', validate({ query: taskFilterSchema }), tasksController.getMyTasks);

// Task stats
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday

  const [totalTasks, overdueTasks, dueTodayTasks, completedThisWeek] = await Promise.all([
    prisma.task.count({
      where: { officeId: user.officeId!, status: { in: ['TODO', 'IN_PROGRESS'] } },
    }),
    prisma.task.count({
      where: {
        officeId: user.officeId!,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { lt: startOfDay },
      },
    }),
    prisma.task.count({
      where: {
        officeId: user.officeId!,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.task.count({
      where: {
        officeId: user.officeId!,
        status: 'COMPLETED',
        completedAt: { gte: startOfWeek },
      },
    }),
  ]);

  res.json({
    success: true,
    data: { totalTasks, overdueTasks, dueTodayTasks, completedThisWeek },
  });
}));

// CRUD
router.get('/', validate({ query: taskFilterSchema }), tasksController.list);
router.get('/:id', validate({ params: taskIdParamSchema }), tasksController.getById);
router.post('/', validate({ body: createTaskSchema }), tasksController.create);
router.put('/:id', validate({ params: taskIdParamSchema, body: updateTaskSchema }), tasksController.update);
router.delete('/:id', validate({ params: taskIdParamSchema }), tasksController.delete);

// Actions
router.patch(
  '/:id/assign',
  validate({
    params: taskIdParamSchema,
    body: z.object({ assigned_to_id: z.string().min(1, 'Kullanici ID gerekli') }),
  }),
  tasksController.assign
);
router.patch(
  '/:id/complete',
  validate({ params: taskIdParamSchema, body: completeTaskSchema }),
  tasksController.complete
);

// ═══════════════════════════════════════════════════════════════════════════
// Task Comments / Notes
// ═══════════════════════════════════════════════════════════════════════════

const commentBodySchema = z.object({
  content: z.string().min(1, 'Yorum icerigi gerekli').max(2000),
});

// GET /api/v1/tasks/:id/comments
router.get('/:id/comments', validate({ params: taskIdParamSchema }), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const taskId = String(req.params.id);

  // Verify task exists and user has access
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw NotFoundErr('Gorev');
  if (task.officeId !== user.officeId) throw NotFoundErr('Gorev');

  const comments = await prisma.activity.findMany({
    where: {
      officeId: user.officeId!,
      type: 'NOTE',
      subject: `task:${taskId}`,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  res.json({ success: true, data: comments });
}));

// POST /api/v1/tasks/:id/comments
router.post(
  '/:id/comments',
  validate({ params: taskIdParamSchema, body: commentBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const taskId = String(req.params.id);

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw NotFoundErr('Gorev');
    if (task.officeId !== user.officeId) throw NotFoundErr('Gorev');

    const comment = await prisma.activity.create({
      data: {
        officeId: user.officeId!,
        userId: user.id,
        type: 'NOTE',
        subject: `task:${taskId}`,
        description: req.body.content,
        contactId: task.contactId || null,
        propertyId: task.propertyId || null,
        dealId: task.dealId || null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ success: true, data: comment });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// Task Attachments (file upload)
// ═══════════════════════════════════════════════════════════════════════════

// Ensure uploads/tasks directory exists
const tasksUploadsDir = path.join(process.cwd(), 'uploads', 'tasks');
if (!fs.existsSync(tasksUploadsDir)) {
  fs.mkdirSync(tasksUploadsDir, { recursive: true });
}

const taskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tasksUploadsDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const taskUpload = multer({
  storage: taskStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// GET /api/v1/tasks/:id/attachments
router.get('/:id/attachments', validate({ params: taskIdParamSchema }), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const taskId = String(req.params.id);

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw NotFoundErr('Gorev');
  if (task.officeId !== user.officeId) throw NotFoundErr('Gorev');

  // Use Activity records with type DOCUMENT_UPLOAD and subject task:<id> to track attachments
  const attachments = await prisma.activity.findMany({
    where: {
      officeId: user.officeId!,
      type: 'DOCUMENT_UPLOAD',
      subject: `task_attachment:${taskId}`,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json({ success: true, data: attachments });
}));

// POST /api/v1/tasks/:id/attachments
router.post(
  '/:id/attachments',
  validate({ params: taskIdParamSchema }),
  taskUpload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const taskId = String(req.params.id);
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'Dosya yuklenemedi' } });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw NotFoundErr('Gorev');
    if (task.officeId !== user.officeId) throw NotFoundErr('Gorev');

    // Store as an Activity record with special subject prefix
    const attachment = await prisma.activity.create({
      data: {
        officeId: user.officeId!,
        userId: user.id,
        type: 'DOCUMENT_UPLOAD',
        subject: `task_attachment:${taskId}`,
        description: JSON.stringify({
          fileName: file.originalname,
          fileUrl: `/uploads/tasks/${file.filename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
        }),
        contactId: task.contactId || null,
        propertyId: task.propertyId || null,
        dealId: task.dealId || null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ success: true, data: attachment });
  })
);

// DELETE /api/v1/tasks/:id/attachments/:aid
router.delete(
  '/:id/attachments/:aid',
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const taskId = String(req.params.id);
    const attachmentId = String(req.params.aid);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw NotFoundErr('Gorev');
    if (task.officeId !== user.officeId) throw NotFoundErr('Gorev');

    const attachment = await prisma.activity.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.subject !== `task_attachment:${taskId}`) {
      throw NotFoundErr('Ek dosya');
    }

    // Try to delete the file
    try {
      const meta = JSON.parse(attachment.description || '{}');
      if (meta.fileUrl) {
        const filePath = path.join(process.cwd(), meta.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch {
      // ignore file deletion errors
    }

    await prisma.activity.delete({ where: { id: attachmentId } });

    res.json({ success: true, message: 'Ek dosya silindi' });
  })
);

export default router;
