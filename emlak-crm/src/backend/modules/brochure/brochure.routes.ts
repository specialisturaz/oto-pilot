import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { brochureService } from './brochure.service';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/v1/brochure/:propertyId
 * Yazdirma/PDF icin HTML brosur dondurur.
 */
router.get(
  '/:propertyId',
  asyncHandler(async (req: Request, res: Response) => {
    const propertyId = req.params.propertyId as string;
    const html = await brochureService.generateBrochure(propertyId, req.user!);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  })
);

/**
 * GET /api/v1/brochure/:propertyId/data
 * Brosur verisini JSON olarak dondurur.
 */
router.get(
  '/:propertyId/data',
  asyncHandler(async (req: Request, res: Response) => {
    const propertyId = req.params.propertyId as string;
    const data = await brochureService.getBrochureData(propertyId, req.user!);
    res.status(200).json({
      success: true,
      data,
    });
  })
);

export default router;
