import { config } from '../../backend/config/index.js';
import { logger } from '../../backend/utils/logger.js';

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'image' | 'document';
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: string;
      parameters: Array<{ type: string; text?: string; image?: { link: string } }>;
    }>;
  };
  image?: { link: string; caption?: string };
  document?: { link: string; filename: string; caption?: string };
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  document?: { id: string; mime_type: string; sha256: string; filename: string };
}

export class WhatsAppClient {
  private apiUrl: string;
  private phoneNumberId: string;
  private accessToken: string;

  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  }

  private get baseUrl(): string {
    return `${this.apiUrl}/${this.phoneNumberId}`;
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async sendTextMessage(to: string, body: string): Promise<WhatsAppResponse> {
    const phoneNumber = this.formatTurkishPhone(to);
    const payload: WhatsAppMessage = {
      to: phoneNumber,
      type: 'text',
      text: { body },
    };

    return this.sendMessage(payload);
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    parameters: string[] = [],
    languageCode: string = 'tr'
  ): Promise<WhatsAppResponse> {
    const phoneNumber = this.formatTurkishPhone(to);
    const payload: WhatsAppMessage = {
      to: phoneNumber,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: parameters.length > 0
          ? [{
              type: 'body',
              parameters: parameters.map(p => ({ type: 'text', text: p })),
            }]
          : undefined,
      },
    };

    return this.sendMessage(payload);
  }

  async sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
  ): Promise<WhatsAppResponse> {
    const phoneNumber = this.formatTurkishPhone(to);
    const payload: WhatsAppMessage = {
      to: phoneNumber,
      type: 'image',
      image: { link: imageUrl, caption },
    };

    return this.sendMessage(payload);
  }

  async sendPropertyListing(
    to: string,
    property: {
      title: string;
      price: string;
      location: string;
      rooms: string;
      sqm: string;
      imageUrl?: string;
      listingUrl?: string;
    }
  ): Promise<WhatsAppResponse> {
    const message = [
      `🏠 *${property.title}*`,
      '',
      `💰 Fiyat: ${property.price}`,
      `📍 Konum: ${property.location}`,
      `🛏️ Oda: ${property.rooms}`,
      `📐 m²: ${property.sqm}`,
      '',
      property.listingUrl ? `🔗 Detay: ${property.listingUrl}` : '',
      '',
      'Detaylı bilgi için bize ulaşın!',
    ].filter(Boolean).join('\n');

    if (property.imageUrl) {
      return this.sendImageMessage(to, property.imageUrl, message);
    }
    return this.sendTextMessage(to, message);
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark message as read: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('WhatsApp markAsRead error:', error);
    }
  }

  parseWebhookMessage(body: any): WebhookMessage | null {
    try {
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.[0]) return null;

      return value.messages[0] as WebhookMessage;
    } catch {
      return null;
    }
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }

  private async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      ...message,
    };

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('WhatsApp API error:', errorData);
        throw new Error(`WhatsApp API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json() as WhatsAppResponse;
      logger.info(`WhatsApp message sent to ${message.to}, ID: ${data.messages[0]?.id}`);
      return data;
    } catch (error) {
      logger.error('WhatsApp send error:', error);
      throw error;
    }
  }

  private formatTurkishPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = '90' + cleaned.substring(1);
    } else if (!cleaned.startsWith('90')) {
      cleaned = '90' + cleaned;
    }

    return cleaned;
  }
}

export const whatsappClient = new WhatsAppClient();
