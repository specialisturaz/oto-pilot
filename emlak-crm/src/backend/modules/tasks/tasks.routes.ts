import { Router } from 'express';
import { tasksController } from './tasks.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  taskFilterSchema,
  taskIdParamSchema,
} from './tasks.validation';
import { z } from 'zod';

const router = Router();

// All task routes require authentication
router.use(requireAuth);

// My tasks
router.get('/my-tasks', validate({ query: taskFilterSchema }), tasksController.getMyTasks);

// CRUD
router.get('/', validate({ query: taskFilterSchema }), tasksController.list);
router.get('/:id', validate({ params: taskIdParamSchema }), tasksController.getById);
router.post('/', validate({ body: createTaskSchema }), tasksController.create);
router.put('/:id', validate({ params: taskIdParamSchema, body: updateTaskSchema }), tasksController.update);
router.delete('/:id', validate({ params: taskIdParamSchema }), tasksController.delete);

// Actions
router.patch(
  '/:id/assign',
  validate({
    params: taskIdParamSchema,
    body: z.object({ assigned_to_id: z.string().min(1, 'Kullanici ID gerekli') }),
  }),
  tasksController.assign
);
router.patch(
  '/:id/complete',
  validate({ params: taskIdParamSchema, body: completeTaskSchema }),
  tasksController.complete
);

export default router;
