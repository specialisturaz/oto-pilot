import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { dealsService } from './deals.service';
import type {
  CreateDealInput,
  UpdateDealInput,
  UpdateDealStageInput,
  DealFilterInput,
} from './deals.validation';

export class DealsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as DealFilterInput;
    const result = await dealsService.listDeals(filters, req.user!);

    res.status(200).json(result);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const deal = await dealsService.getDealById(req.params.id, req.user!);

    res.status(200).json({
      success: true,
      data: deal,
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateDealInput;
    const deal = await dealsService.createDeal(data, req.user!);

    res.status(201).json({
      success: true,
      data: deal,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdateDealInput;
    const deal = await dealsService.updateDeal(req.params.id, data, req.user!);

    res.status(200).json({
      success: true,
      data: deal,
    });
  });

  updateStage = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdateDealStageInput;
    const deal = await dealsService.updateDealStage(req.params.id, data, req.user!);

    res.status(200).json({
      success: true,
      data: deal,
    });
  });

  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const history = await dealsService.getDealHistory(req.params.id, req.user!);

    res.status(200).json({
      success: true,
      data: history,
    });
  });

  getCommissions = asyncHandler(async (req: Request, res: Response) => {
    const commissions = await dealsService.getDealCommissions(req.params.id, req.user!);

    res.status(200).json({
      success: true,
      data: commissions,
    });
  });
}

export const dealsController = new DealsController();
