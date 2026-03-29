import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { demandPoolService } from './demand-pool.service';
import type {
  CreateDemandInput,
  UpdateDemandInput,
  DemandFilterInput,
  RespondDemandInput,
} from './demand-pool.validation';

export class DemandPoolController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as DemandFilterInput;
    const result = await demandPoolService.listDemands(filters, req.user!);

    res.status(200).json(result);
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateDemandInput;
    const demand = await demandPoolService.createDemand(data, req.user!);

    res.status(201).json({
      success: true,
      data: demand,
    });
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const demand = await demandPoolService.getDemandById(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: demand,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdateDemandInput;
    const demand = await demandPoolService.updateDemand(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: demand,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await demandPoolService.deleteDemand(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: { message: 'Talep basariyla silindi' },
    });
  });

  respond = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as RespondDemandInput;
    const result = await demandPoolService.respondToDemand(
      String(req.params.id),
      data.message,
      req.user!
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  getMyPosts = asyncHandler(async (req: Request, res: Response) => {
    const demands = await demandPoolService.getMyDemands(req.user!);

    res.status(200).json({
      success: true,
      data: demands,
    });
  });
}

export const demandPoolController = new DemandPoolController();
