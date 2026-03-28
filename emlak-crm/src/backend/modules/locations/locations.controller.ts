import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { locationsService } from './locations.service';

export class LocationsController {
  getIller = asyncHandler(async (_req: Request, res: Response) => {
    const iller = await locationsService.getIller();

    res.status(200).json({
      success: true,
      data: iller,
    });
  });

  getIlById = asyncHandler(async (req: Request, res: Response) => {
    const il = await locationsService.getIlById(String(req.params.id));

    res.status(200).json({
      success: true,
      data: il,
    });
  });

  getIlceler = asyncHandler(async (req: Request, res: Response) => {
    const ilceler = await locationsService.getIlcelerByIl(String(req.params.id));

    res.status(200).json({
      success: true,
      data: ilceler,
    });
  });

  getMahalleler = asyncHandler(async (req: Request, res: Response) => {
    const mahalleler = await locationsService.getMahallelerByIlce(String(req.params.id));

    res.status(200).json({
      success: true,
      data: mahalleler,
    });
  });

  search = asyncHandler(async (req: Request, res: Response) => {
    const query = (req.query.q as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const results = await locationsService.searchLocations(query, limit);

    res.status(200).json({
      success: true,
      data: results,
    });
  });
}

export const locationsController = new LocationsController();
