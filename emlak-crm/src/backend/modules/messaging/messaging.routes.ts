import { Router } from 'express';
import { messagingController } from './messaging.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createConversationSchema,
  updateConversationSchema,
  sendMessageSchema,
  conversationFilterSchema,
  messageFilterSchema,
  conversationIdParamSchema,
} from './messaging.validation';

const router = Router();

// WhatsApp webhooks (no auth - verified by token)
router.get('/webhooks/whatsapp', messagingController.webhookVerify);
router.post('/webhooks/whatsapp', messagingController.webhookHandler);

// All other messaging routes require authentication
router.use(requireAuth);

// Conversations
router.get('/conversations', validate({ query: conversationFilterSchema }), messagingController.listConversations);
router.get('/conversations/:id', validate({ params: conversationIdParamSchema }), messagingController.getConversation);
router.get(
  '/conversations/:id/messages',
  validate({ params: conversationIdParamSchema, query: messageFilterSchema }),
  messagingController.getMessages
);
router.post('/conversations', validate({ body: createConversationSchema }), messagingController.createConversation);
router.patch(
  '/conversations/:id',
  validate({ params: conversationIdParamSchema, body: updateConversationSchema }),
  messagingController.updateConversation
);

// Send message
router.post('/send', validate({ body: sendMessageSchema }), messagingController.sendMessage);

export default router;
