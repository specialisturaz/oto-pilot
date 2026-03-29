import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { socialAdsService } from './social-ads.service';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/v1/social-ads/:propertyId/facebook
 * Facebook reklam paketi dondurur (A/B varyantlari, hedefleme, butce onerisi).
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
 * Instagram reklam paketi dondurur (caption, hashtag, story, carousel onerileri).
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
 * GET /api/v1/social-ads/:propertyId/google
 * Google Ads reklam paketi dondurur (basliklar, aciklamalar, anahtar kelimeler).
 */
router.get(
  '/:propertyId/google',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await socialAdsService.generateGoogleAd(String(req.params.propertyId), req.user!);
    res.status(200).json({
      success: true,
      data,
    });
  })
);

/**
 * GET /api/v1/social-ads/:propertyId/keywords
 * Anahtar kelime raporu dondurur (birincil, ikincil, negatif).
 */
router.get(
  '/:propertyId/keywords',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await socialAdsService.generateKeywordsReport(String(req.params.propertyId), req.user!);
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
