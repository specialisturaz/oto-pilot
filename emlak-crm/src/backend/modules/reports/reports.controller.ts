import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { reportsService } from './reports.service';

export class ReportsController {
  dashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await reportsService.getDashboardStats(req.user!);

    res.status(200).json({
      success: true,
      data: stats,
    });
  });

  salesReport = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
    };
    const report = await reportsService.getSalesReport(filters, req.user!);

    res.status(200).json({
      success: true,
      data: report,
    });
  });

  agentPerformance = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
      agent_id: req.query.agent_id as string | undefined,
    };
    const report = await reportsService.getAgentPerformance(filters, req.user!);

    res.status(200).json({
      success: true,
      data: report,
    });
  });

  commissionReport = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
      agent_id: req.query.agent_id as string | undefined,
    };
    const report = await reportsService.getCommissionReport(filters, req.user!);

    res.status(200).json({
      success: true,
      data: report,
    });
  });

  portalPerformance = asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      date_from: req.query.date_from as string | undefined,
      date_to: req.query.date_to as string | undefined,
    };
    const report = await reportsService.getPortalPerformance(filters, req.user!);

    res.status(200).json({
      success: true,
      data: report,
    });
  });
}

export const reportsController = new ReportsController();
