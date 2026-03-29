import { Router } from 'express';
import { demandPoolController } from './demand-pool.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createDemandSchema,
  updateDemandSchema,
  demandFilterSchema,
  respondDemandSchema,
  idParamSchema,
} from './demand-pool.validation';

const router = Router();

// All demand pool routes require authentication
router.use(requireAuth);

// GET /api/v1/demand-pool/my-posts - Get user's own demands (must be before /:id)
router.get('/my-posts', demandPoolController.getMyPosts);

// GET /api/v1/demand-pool - List all active demands
router.get('/', validate({ query: demandFilterSchema }), demandPoolController.list);

// POST /api/v1/demand-pool - Create a new demand
router.post('/', validate({ body: createDemandSchema }), demandPoolController.create);

// GET /api/v1/demand-pool/:id - Get demand details
router.get('/:id', validate({ params: idParamSchema }), demandPoolController.getById);

// PUT /api/v1/demand-pool/:id - Update demand
router.put('/:id', validate({ params: idParamSchema, body: updateDemandSchema }), demandPoolController.update);

// DELETE /api/v1/demand-pool/:id - Delete demand
router.delete('/:id', validate({ params: idParamSchema }), demandPoolController.delete);

// POST /api/v1/demand-pool/:id/respond - Respond to a demand
router.post('/:id/respond', validate({ params: idParamSchema, body: respondDemandSchema }), demandPoolController.respond);

export default router;
