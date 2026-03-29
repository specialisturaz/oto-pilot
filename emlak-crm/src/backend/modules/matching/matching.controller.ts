import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { matchingService } from './matching.service';

export class MatchingController {
  getMatchesForContact = asyncHandler(async (req: Request, res: Response) => {
    const matches = await matchingService.findMatchesForContact(
      String(req.params.contactId),
      req.user!
    );

    res.status(200).json({
      success: true,
      data: matches,
    });
  });

  getMatchesForProperty = asyncHandler(async (req: Request, res: Response) => {
    const matches = await matchingService.findMatchesForProperty(
      String(req.params.propertyId),
      req.user!
    );

    res.status(200).json({
      success: true,
      data: matches,
    });
  });

  getTopMatches = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const matches = await matchingService.getTopMatches(req.user!, limit);

    res.status(200).json({
      success: true,
      data: matches,
    });
  });

  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await matchingService.getMatchingStats(req.user!);

    res.status(200).json({
      success: true,
      data: stats,
    });
  });
}

export const matchingController = new MatchingController();
