import { Router } from 'express';
import { usersController } from './users.controller';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  userFilterSchema,
  userIdParamSchema,
} from './users.validation';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

// Profile routes (available to all authenticated users)
router.get('/profile', usersController.updateProfile); // GET profile returns current user data
router.patch('/profile', validate({ body: updateProfileSchema }), usersController.updateProfile);
router.post('/change-password', validate({ body: changePasswordSchema }), usersController.changePassword);

// Agents list (available to all authenticated users)
router.get('/agents', usersController.getAgents);

// Admin-only user management
router.get(
  '/',
  requireRole(['ADMIN', 'MANAGER']),
  validate({ query: userFilterSchema }),
  usersController.list
);

router.get(
  '/:id',
  requireRole(['ADMIN', 'MANAGER']),
  validate({ params: userIdParamSchema }),
  usersController.getById
);

router.post(
  '/',
  requireRole(['ADMIN']),
  validate({ body: createUserSchema }),
  usersController.create
);

router.put(
  '/:id',
  requireRole(['ADMIN']),
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  usersController.update
);

router.delete(
  '/:id',
  requireRole(['ADMIN']),
  validate({ params: userIdParamSchema }),
  usersController.deactivate
);

export default router;
