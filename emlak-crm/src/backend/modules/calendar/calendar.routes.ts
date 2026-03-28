import { Router } from 'express';
import { calendarController } from './calendar.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentFilterSchema,
  dateRangeSchema,
  appointmentIdParamSchema,
} from './calendar.validation';

const router = Router();

// All calendar routes require authentication
router.use(requireAuth);

// Special views
router.get('/upcoming', calendarController.getUpcoming);
router.get('/range', validate({ query: dateRangeSchema }), calendarController.getByDateRange);

// CRUD
router.get('/', validate({ query: appointmentFilterSchema }), calendarController.list);
router.get('/:id', validate({ params: appointmentIdParamSchema }), calendarController.getById);
router.post('/', validate({ body: createAppointmentSchema }), calendarController.create);
router.put('/:id', validate({ params: appointmentIdParamSchema, body: updateAppointmentSchema }), calendarController.update);
router.delete('/:id', validate({ params: appointmentIdParamSchema }), calendarController.delete);

export default router;
