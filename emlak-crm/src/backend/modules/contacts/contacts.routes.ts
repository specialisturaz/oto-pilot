import { Router } from 'express';
import { contactsController } from './contacts.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createContactSchema,
  updateContactSchema,
  contactFilterSchema,
  createNoteSchema,
  idParamSchema,
} from './contacts.validation';

const router = Router();

// All contact routes require authentication
router.use(requireAuth);

router.get('/', validate({ query: contactFilterSchema }), contactsController.list);
router.get('/:id', validate({ params: idParamSchema }), contactsController.getById);
router.post('/', validate({ body: createContactSchema }), contactsController.create);
router.put('/:id', validate({ params: idParamSchema, body: updateContactSchema }), contactsController.update);
router.delete('/:id', validate({ params: idParamSchema }), contactsController.delete);

// Sub-resources
router.get('/:id/activities', validate({ params: idParamSchema }), contactsController.getActivities);
router.get('/:id/deals', validate({ params: idParamSchema }), contactsController.getDeals);
router.post('/:id/notes', validate({ params: idParamSchema, body: createNoteSchema }), contactsController.addNote);

export default router;
