import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

// Get current user's notifications
router.get('/my-notifications', notificationsController.getMyNotifications);

// Get unread count
router.get('/unread-count', notificationsController.getUnreadCount);

// Mark all as read
router.patch('/mark-all-read', notificationsController.markAllAsRead);

// Mark single notification as read
router.patch(
  '/:id/mark-read',
  validate({ params: z.object({ id: z.string().min(1, 'ID gerekli') }) }),
  notificationsController.markAsRead
);

export default router;
