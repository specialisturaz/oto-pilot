import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { settingsService } from './settings.service';

export class SettingsController {
  getOfficeSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await settingsService.getOfficeSettings(req.user!);

    res.status(200).json({
      success: true,
      data: settings,
    });
  });

  updateOfficeSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await settingsService.updateOfficeSettings(req.body, req.user!);

    res.status(200).json({
      success: true,
      data: settings,
    });
  });

  listTemplates = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      channel: req.query.channel as string | undefined,
      category: req.query.category as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    };
    const result = await settingsService.listTemplates(filters, req.user!);

    res.status(200).json(result);
  });

  getTemplate = asyncHandler(async (req: Request, res: Response) => {
    const template = await settingsService.getTemplateById(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: template,
    });
  });

  createTemplate = asyncHandler(async (req: Request, res: Response) => {
    const template = await settingsService.createTemplate(req.body, req.user!);

    res.status(201).json({
      success: true,
      data: template,
    });
  });

  updateTemplate = asyncHandler(async (req: Request, res: Response) => {
    const template = await settingsService.updateTemplate(String(req.params.id), req.body, req.user!);

    res.status(200).json({
      success: true,
      data: template,
    });
  });

  deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
    await settingsService.deleteTemplate(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      message: 'Mesaj sablonu basariyla silindi',
    });
  });
}

export const settingsController = new SettingsController();
