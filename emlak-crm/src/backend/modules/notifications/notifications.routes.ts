import { Router } from 'express';
import { notificationsController } from './notifications.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

// Get current user's notifications (supports both /my-notifications and / root)
router.get('/my-notifications', notificationsController.getMyNotifications);
router.get('/', notificationsController.getMyNotifications);

// Get unread count
router.get('/unread-count', notificationsController.getUnreadCount);

// Mark all as read (supports both /mark-all-read and /read-all)
router.patch('/mark-all-read', notificationsController.markAllAsRead);
router.patch('/read-all', notificationsController.markAllAsRead);

// Mark single notification as read (supports both /:id/mark-read and /:id/read)
router.patch(
  '/:id/mark-read',
  validate({ params: z.object({ id: z.string().min(1, 'ID gerekli') }) }),
  notificationsController.markAsRead
);
router.patch(
  '/:id/read',
  validate({ params: z.object({ id: z.string().min(1, 'ID gerekli') }) }),
  notificationsController.markAsRead
);

export default router;
