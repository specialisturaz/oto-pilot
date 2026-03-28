import { Router } from 'express';
import { portalsController } from './portals.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  portalIdParamSchema,
  portalListingParamSchema,
  updatePortalSchema,
  publishToPortalsSchema,
} from './portals.validation';

const router = Router();

// All portal routes require authentication
router.use(requireAuth);

// Stats endpoint (must be before /:id to avoid conflict)
router.get('/stats', portalsController.getStats);

// Publish and sync endpoints (must be before /:id too)
router.post('/publish', validate({ body: publishToPortalsSchema }), portalsController.publish);
router.post('/sync', portalsController.sync);

// CRUD for portals
router.get('/', portalsController.list);
router.get('/:id', validate({ params: portalIdParamSchema }), portalsController.getById);
router.put('/:id', validate({ params: portalIdParamSchema, body: updatePortalSchema }), portalsController.update);

// Test connection
router.post('/:id/test-connection', validate({ params: portalIdParamSchema }), portalsController.testConnection);

// Portal listings
router.get('/:id/listings', validate({ params: portalIdParamSchema }), portalsController.getListings);

// Remove listing from portal
router.delete(
  '/:portalId/listings/:listingId',
  validate({ params: portalListingParamSchema }),
  portalsController.removeListing
);

export default router;
