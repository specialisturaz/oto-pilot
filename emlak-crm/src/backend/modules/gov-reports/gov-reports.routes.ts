import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { govReportsService } from './gov-reports.service';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['ADMIN', 'MANAGER']));

/**
 * GET /api/v1/gov-reports/eids?from=&to=
 * EIDS Raporu - HTML ve JSON veri
 */
router.get(
  '/eids',
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    };

    const format = req.query.format as string | undefined;
    const result = await govReportsService.generateEidsReport(filters, req.user!);

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(result.html);
    } else {
      res.status(200).json({
        success: true,
        data: result.data,
        html: result.html,
      });
    }
  })
);

/**
 * GET /api/v1/gov-reports/btrans?from=&to=
 * GIB BTRANS Raporu - CSV indirme
 */
router.get(
  '/btrans',
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    };

    const format = req.query.format as string | undefined;
    const result = await govReportsService.generateBtransReport(filters, req.user!);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="btrans-rapor-${filters.from || 'tum'}-${filters.to || 'tum'}.csv"`);
      res.send(result.csv);
    } else {
      res.status(200).json({
        success: true,
        data: result.data,
        csv: result.csv,
      });
    }
  })
);

/**
 * GET /api/v1/gov-reports/chamber?from=&to=
 * Emlak Odasi Raporu - HTML ve JSON veri
 */
router.get(
  '/chamber',
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    };

    const format = req.query.format as string | undefined;
    const result = await govReportsService.generateChamberReport(filters, req.user!);

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(result.html);
    } else {
      res.status(200).json({
        success: true,
        data: result.data,
        html: result.html,
      });
    }
  })
);

export default router;
