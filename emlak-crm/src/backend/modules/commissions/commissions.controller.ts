import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { commissionsService } from './commissions.service';
import type {
  CreateCommissionInput,
  UpdateCommissionInput,
  CalculateCommissionInput,
  ApproveCommissionInput,
  MarkPaidInput,
  CommissionFilterInput,
} from './commissions.validation';

export class CommissionsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as CommissionFilterInput;
    const result = await commissionsService.listCommissions(filters, req.user!);

    res.status(200).json(result);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const commission = await commissionsService.getCommissionById(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: commission,
    });
  });

  calculate = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CalculateCommissionInput;
    const result = await commissionsService.calculateCommission(data, req.user!);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateCommissionInput;
    const commission = await commissionsService.createCommission(data, req.user!);

    res.status(201).json({
      success: true,
      data: commission,
    });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdateCommissionInput;
    const commission = await commissionsService.updateCommission(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: commission,
    });
  });

  approve = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as ApproveCommissionInput;
    const commission = await commissionsService.approveCommission(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: commission,
    });
  });

  markPaid = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as MarkPaidInput;
    const commission = await commissionsService.markCommissionPaid(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: commission,
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await commissionsService.deleteCommission(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      message: 'Komisyon basariyla silindi',
    });
  });

  getReport = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
      agent_id: req.query.agent_id as string | undefined,
    };
    const report = await commissionsService.getCommissionReport(filters, req.user!);

    res.status(200).json({
      success: true,
      data: report,
    });
  });
}

export const commissionsController = new CommissionsController();
