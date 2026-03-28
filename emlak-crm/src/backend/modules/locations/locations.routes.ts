import { Router } from 'express';
import { locationsController } from './locations.controller';
import { optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { z } from 'zod';

const router = Router();

const idParamSchema = z.object({
  id: z.string({ required_error: 'ID gerekli' }),
});

// Location routes use optional auth - public for property search, authenticated for CRM
router.use(optionalAuth);

// Il (Province) routes
router.get('/iller', locationsController.getIller);
router.get('/iller/:id', validate({ params: idParamSchema }), locationsController.getIlById);
router.get('/iller/:id/ilceler', validate({ params: idParamSchema }), locationsController.getIlceler);

// Ilce (District) routes
router.get('/ilceler/:id/mahalleler', validate({ params: idParamSchema }), locationsController.getMahalleler);

// Search
router.get('/search', locationsController.search);

export default router;
