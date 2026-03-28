import { Router } from 'express';
import { dealsController } from './deals.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createDealSchema,
  updateDealSchema,
  updateDealStageSchema,
  dealFilterSchema,
  dealIdParamSchema,
} from './deals.validation';

const router = Router();

// All deal routes require authentication
router.use(requireAuth);

// CRUD
router.get('/', validate({ query: dealFilterSchema }), dealsController.list);
router.get('/:id', validate({ params: dealIdParamSchema }), dealsController.getById);
router.post('/', validate({ body: createDealSchema }), dealsController.create);
router.put('/:id', validate({ params: dealIdParamSchema, body: updateDealSchema }), dealsController.update);

// Pipeline stage management
router.patch('/:id/stage', validate({ params: dealIdParamSchema, body: updateDealStageSchema }), dealsController.updateStage);

// History & commissions
router.get('/:id/history', validate({ params: dealIdParamSchema }), dealsController.getHistory);
router.get('/:id/commissions', validate({ params: dealIdParamSchema }), dealsController.getCommissions);

export default router;
