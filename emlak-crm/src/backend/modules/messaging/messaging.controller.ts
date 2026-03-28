import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { messagingService } from './messaging.service';
import type {
  CreateConversationInput,
  UpdateConversationInput,
  SendMessageInput,
  ConversationFilterInput,
  MessageFilterInput,
} from './messaging.validation';

export class MessagingController {
  listConversations = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as ConversationFilterInput;
    const result = await messagingService.listConversations(filters, req.user!);

    res.status(200).json(result);
  });

  getConversation = asyncHandler(async (req: Request, res: Response) => {
    const conversation = await messagingService.getConversationById(String(req.params.id), req.user!);

    res.status(200).json({
      success: true,
      data: conversation,
    });
  });

  getMessages = asyncHandler(async (req: Request, res: Response) => {
    const filters = req.query as unknown as MessageFilterInput;
    const result = await messagingService.getConversationMessages(String(req.params.id), filters, req.user!);

    res.status(200).json(result);
  });

  createConversation = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as CreateConversationInput;
    const conversation = await messagingService.createConversation(data, req.user!);

    res.status(201).json({
      success: true,
      data: conversation,
    });
  });

  updateConversation = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as UpdateConversationInput;
    const conversation = await messagingService.updateConversation(String(req.params.id), data, req.user!);

    res.status(200).json({
      success: true,
      data: conversation,
    });
  });

  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const data = req.body as SendMessageInput;
    const message = await messagingService.sendMessage(data, req.user!);

    res.status(201).json({
      success: true,
      data: message,
    });
  });

  /**
   * WhatsApp webhook verification (GET).
   */
  webhookVerify = asyncHandler(async (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify token should match your configured webhook verify token
    const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'emlak_crm_webhook';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }

    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Webhook dogrulamasi basarisiz' },
    });
  });

  /**
   * WhatsApp webhook handler (POST).
   */
  webhookHandler = asyncHandler(async (req: Request, res: Response) => {
    await messagingService.processWhatsAppWebhook(req.body);

    // Always return 200 to acknowledge receipt
    res.status(200).json({ success: true });
  });
}

export const messagingController = new MessagingController();
