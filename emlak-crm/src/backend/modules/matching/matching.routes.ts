import { Router } from 'express';
import { matchingController } from './matching.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// All matching routes require authentication
router.use(requireAuth);

// GET /api/v1/matching/top - Top matches for the office
router.get('/top', matchingController.getTopMatches);

// GET /api/v1/matching/stats - Matching statistics
router.get('/stats', matchingController.getStats);

// GET /api/v1/matching/contact/:contactId - Matches for a contact
router.get('/contact/:contactId', matchingController.getMatchesForContact);

// GET /api/v1/matching/property/:propertyId - Matches for a property
router.get('/property/:propertyId', matchingController.getMatchesForProperty);

export default router;
