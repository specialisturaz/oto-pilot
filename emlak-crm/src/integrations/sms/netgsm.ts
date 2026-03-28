import { logger } from '../../backend/utils/logger.js';

interface SmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  jobId?: string;
}

interface BulkSmsRequest {
  numbers: string[];
  message: string;
  header?: string;
  startDate?: string;
  stopDate?: string;
}

export class NetgsmClient {
  private userCode: string;
  private password: string;
  private defaultHeader: string;
  private baseUrl = 'https://api.netgsm.com.tr';

  constructor() {
    this.userCode = process.env.NETGSM_USERCODE || '';
    this.password = process.env.NETGSM_PASSWORD || '';
    this.defaultHeader = process.env.NETGSM_MSGHEADER || '';
  }

  async sendSms(to: string, message: string, header?: string): Promise<SmsResponse> {
    const phone = this.formatTurkishPhone(to);
    const msgHeader = header || this.defaultHeader;

    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <mainbody>
          <header>
            <company dession="1">Netgsm</company>
            <usercode>${this.userCode}</usercode>
            <password>${this.password}</password>
            <type>1:n</type>
            <msgheader>${msgHeader}</msgheader>
          </header>
          <body>
            <msg><![CDATA[${message}]]></msg>
            <no>${phone}</no>
          </body>
        </mainbody>`;

      const response = await fetch(`${this.baseUrl}/sms/send/xml`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: xml,
      });

      const responseText = await response.text();
      return this.parseResponse(responseText);
    } catch (error) {
      logger.error('Netgsm SMS send error:', error);
      return { success: false, error: String(error) };
    }
  }

  async sendBulkSms(request: BulkSmsRequest): Promise<SmsResponse> {
    const numbers = request.numbers.map(n => this.formatTurkishPhone(n));
    const msgHeader = request.header || this.defaultHeader;

    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <mainbody>
          <header>
            <company dession="1">Netgsm</company>
            <usercode>${this.userCode}</usercode>
            <password>${this.password}</password>
            <type>1:n</type>
            <msgheader>${msgHeader}</msgheader>
            ${request.startDate ? `<startdate>${request.startDate}</startdate>` : ''}
            ${request.stopDate ? `<stopdate>${request.stopDate}</stopdate>` : ''}
          </header>
          <body>
            <msg><![CDATA[${request.message}]]></msg>
            ${numbers.map(n => `<no>${n}</no>`).join('\n            ')}
          </body>
        </mainbody>`;

      const response = await fetch(`${this.baseUrl}/sms/send/xml`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: xml,
      });

      const responseText = await response.text();
      return this.parseResponse(responseText);
    } catch (error) {
      logger.error('Netgsm bulk SMS error:', error);
      return { success: false, error: String(error) };
    }
  }

  async sendOtp(to: string, code: string): Promise<SmsResponse> {
    const message = `Emlak CRM doğrulama kodunuz: ${code}. Bu kodu kimseyle paylaşmayın.`;
    return this.sendSms(to, message);
  }

  async sendAppointmentReminder(
    to: string,
    details: {
      contactName: string;
      propertyTitle: string;
      date: string;
      time: string;
      address: string;
    }
  ): Promise<SmsResponse> {
    const message = [
      `Sayın ${details.contactName},`,
      `${details.date} tarihinde saat ${details.time}'da`,
      `"${details.propertyTitle}" için gösterim randevunuz bulunmaktadır.`,
      `Adres: ${details.address}`,
      `Emlak CRM`,
    ].join('\n');

    return this.sendSms(to, message);
  }

  async getBalance(): Promise<{ credits: number } | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/balance/list/get?usercode=${this.userCode}&password=${this.password}&stession=2`
      );
      const text = await response.text();
      const credits = parseFloat(text.trim());
      return isNaN(credits) ? null : { credits };
    } catch (error) {
      logger.error('Netgsm balance check error:', error);
      return null;
    }
  }

  async getDeliveryReport(jobId: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/sms/report?usercode=${this.userCode}&password=${this.password}&bulkid=${jobId}&type=0`
      );
      return await response.text();
    } catch (error) {
      logger.error('Netgsm delivery report error:', error);
      return '';
    }
  }

  private parseResponse(responseText: string): SmsResponse {
    const code = responseText.trim().split(' ')[0];

    const successCodes: Record<string, string> = {
      '00': 'Mesaj gönderildi',
      '01': 'Mesaj gönderildi',
      '02': 'Mesaj gönderildi',
    };

    const errorCodes: Record<string, string> = {
      '20': 'Mesaj metninde hata var',
      '30': 'Geçersiz kullanıcı adı/şifre',
      '40': 'Mesaj başlığı tanımlı değil',
      '50': 'Abone hesabı aktif değil',
      '51': 'SMS gönderim kısıtlaması',
      '70': 'Hatalı parametre',
      '80': 'Gönderim sınırı aşıldı',
      '85': 'Birden fazla mesaj tanımı hatalı',
    };

    if (successCodes[code]) {
      const parts = responseText.trim().split(' ');
      return {
        success: true,
        jobId: parts[1] || undefined,
        messageId: parts[1] || undefined,
      };
    }

    return {
      success: false,
      error: errorCodes[code] || `Bilinmeyen hata kodu: ${code}`,
    };
  }

  private formatTurkishPhone(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('90')) {
      cleaned = cleaned.substring(2);
    }
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    return cleaned;
  }
}

export const netgsmClient = new NetgsmClient();
