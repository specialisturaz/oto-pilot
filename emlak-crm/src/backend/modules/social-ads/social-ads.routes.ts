import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { socialAdsService } from './social-ads.service';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/v1/social-ads/:propertyId/facebook
 * Facebook reklam icerigi dondurur.
 */
router.get(
  '/:propertyId/facebook',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await socialAdsService.generateFacebookAd(String(req.params.propertyId), req.user!);
    res.status(200).json({
      success: true,
      data,
    });
  })
);

/**
 * GET /api/v1/social-ads/:propertyId/instagram
 * Instagram reklam icerigi dondurur.
 */
router.get(
  '/:propertyId/instagram',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await socialAdsService.generateInstagramAd(String(req.params.propertyId), req.user!);
    res.status(200).json({
      success: true,
      data,
    });
  })
);

/**
 * GET /api/v1/social-ads/:propertyId/image
 * Reklam gorseli HTML template dondurur.
 */
router.get(
  '/:propertyId/image',
  asyncHandler(async (req: Request, res: Response) => {
    const html = await socialAdsService.generateAdImage(String(req.params.propertyId), req.user!);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  })
);

export default router;
