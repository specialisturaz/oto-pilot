import { Router } from 'express';
import { commissionsController } from './commissions.controller';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createCommissionSchema,
  updateCommissionSchema,
  calculateCommissionSchema,
  approveCommissionSchema,
  markPaidSchema,
  commissionFilterSchema,
  commissionIdParamSchema,
} from './commissions.validation';

const router = Router();

// All commission routes require authentication
router.use(requireAuth);

// Commission calculation (available to all authenticated users)
router.post('/calculate', validate({ body: calculateCommissionSchema }), commissionsController.calculate);

// Reports
router.get('/report', commissionsController.getReport);

// CRUD
router.get('/', validate({ query: commissionFilterSchema }), commissionsController.list);
router.get('/:id', validate({ params: commissionIdParamSchema }), commissionsController.getById);
router.post(
  '/',
  requireRole(['ADMIN', 'MANAGER']),
  validate({ body: createCommissionSchema }),
  commissionsController.create
);
router.put(
  '/:id',
  requireRole(['ADMIN', 'MANAGER']),
  validate({ params: commissionIdParamSchema, body: updateCommissionSchema }),
  commissionsController.update
);
router.delete(
  '/:id',
  requireRole(['ADMIN', 'MANAGER']),
  validate({ params: commissionIdParamSchema }),
  commissionsController.delete
);

// Actions (admin/manager only)
router.patch(
  '/:id/approve',
  requireRole(['ADMIN', 'MANAGER']),
  validate({ params: commissionIdParamSchema, body: approveCommissionSchema }),
  commissionsController.approve
);
router.patch(
  '/:id/mark-paid',
  requireRole(['ADMIN', 'MANAGER']),
  validate({ params: commissionIdParamSchema, body: markPaidSchema }),
  commissionsController.markPaid
);

export default router;
