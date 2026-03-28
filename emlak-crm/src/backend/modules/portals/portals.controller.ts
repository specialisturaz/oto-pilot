import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { portalsService } from './portals.service';
import type { UpdatePortalInput, PublishToPortalsInput } from './portals.validation';

export class PortalsController {
  /**
   * GET /api/v1/portals
   * List all portals with their status.
   */
  list = asyncHandler(async (req: Request, res: Response) => {
    const portals = await portalsService.listPortals(req.user!);

    res.status(200).json({
      success: true,
      data: portals,
    });
  });

  /**
   * GET /api/v1/portals/stats
   * Portal performance stats.
   */
  getStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await portalsService.getPortalStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  });

  /**
   * GET /api/v1/portals/:id
   * Get portal details.
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const portal = await portalsService.getPortalById(String(req.params.id));

    res.status(200).json({
      success: true,
      data: portal,
    });
  });

  /**
   * PUT /api/v1/portals/:id
   * Update portal settings.
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdatePortalInput;
    const portal = await portalsService.updatePortal(String(req.params.id), data);

    res.status(200).json({
      success: true,
      data: portal,
    });
  });

  /**
   * POST /api/v1/portals/:id/test-connection
   * Test portal API connection.
   */
  testConnection = asyncHandler(async (req: Request, res: Response) => {
    const result = await portalsService.testConnection(String(req.params.id));

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * GET /api/v1/portals/:id/listings
   * Get all listings on a specific portal.
   */
  getListings = asyncHandler(async (req: Request, res: Response) => {
    const listings = await portalsService.getPortalListings(String(req.params.id));

    res.status(200).json({
      success: true,
      data: listings,
    });
  });

  /**
   * POST /api/v1/portals/publish
   * Publish a property to selected portals.
   */
  publish = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as PublishToPortalsInput;
    const result = await portalsService.publishToPortals(data, req.user!);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * POST /api/v1/portals/sync
   * Sync all active portal listings.
   */
  sync = asyncHandler(async (_req: Request, res: Response) => {
    const result = await portalsService.syncAllPortals();

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * DELETE /api/v1/portals/:portalId/listings/:listingId
   * Remove a listing from a portal.
   */
  removeListing = asyncHandler(async (req: Request, res: Response) => {
    const result = await portalsService.removeListing(
      String(req.params.portalId),
      String(req.params.listingId)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}

export const portalsController = new PortalsController();
