import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { notificationsService } from './notifications.service';

export class NotificationsController {
  getMyNotifications = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      is_read: req.query.is_read as string | undefined,
      type: req.query.type as string | undefined,
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    };
    const result = await notificationsService.getMyNotifications(filters, req.user!);

    res.status(200).json(result);
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationsService.getUnreadCount(req.user!);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const notification = await notificationsService.markAsRead(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: notification,
    });
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const result = await notificationsService.markAllAsRead(req.user!);

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}

export const notificationsController = new NotificationsController();
