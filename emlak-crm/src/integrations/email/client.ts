import nodemailer from 'nodemailer';
import { logger } from '../../backend/utils/logger.js';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
  }>;
  replyTo?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

export class EmailClient {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;

  constructor() {
    this.fromAddress = process.env.EMAIL_FROM || 'noreply@emlakcrm.com';

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: `"Emlak CRM" <${this.fromAddress}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
        replyTo: options.replyTo,
      });

      logger.info(`Email sent: ${info.messageId} to ${options.to}`);
      return true;
    } catch (error) {
      logger.error('Email send error:', error);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const template = this.getWelcomeTemplate(name);
    return this.sendEmail({ to, ...template });
  }

  async sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<boolean> {
    const template = this.getPasswordResetTemplate(name, resetUrl);
    return this.sendEmail({ to, ...template });
  }

  async sendNewLeadNotification(
    to: string,
    agentName: string,
    leadDetails: { name: string; phone: string; interest: string; source: string }
  ): Promise<boolean> {
    const template = this.getNewLeadTemplate(agentName, leadDetails);
    return this.sendEmail({ to, ...template });
  }

  async sendAppointmentConfirmation(
    to: string,
    details: {
      contactName: string;
      propertyTitle: string;
      date: string;
      time: string;
      address: string;
      agentName: string;
      agentPhone: string;
    }
  ): Promise<boolean> {
    const template = this.getAppointmentTemplate(details);
    return this.sendEmail({ to, ...template });
  }

  private getWelcomeTemplate(name: string): EmailTemplate {
    return {
      subject: 'Emlak CRM\'e Hoş Geldiniz!',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Emlak CRM</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Merhaba ${name},</h2>
            <p>Emlak CRM ailesine hoş geldiniz! Hesabınız başarıyla oluşturuldu.</p>
            <p>Artık müşterilerinizi, ilanlarınızı ve satış süreçlerinizi tek bir yerden yönetebilirsiniz.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Başlayın</a>
            </div>
          </div>
          <div style="background: #eee; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p>Bu e-posta Emlak CRM tarafından gönderilmiştir.</p>
          </div>
        </div>
      `,
    };
  }

  private getPasswordResetTemplate(name: string, resetUrl: string): EmailTemplate {
    return {
      subject: 'Şifre Sıfırlama Talebi - Emlak CRM',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Emlak CRM</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Merhaba ${name},</h2>
            <p>Şifre sıfırlama talebiniz alındı. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Şifremi Sıfırla</a>
            </div>
            <p style="color: #666; font-size: 14px;">Bu link 1 saat içinde geçerliliğini yitirecektir.</p>
            <p style="color: #666; font-size: 14px;">Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
          </div>
        </div>
      `,
    };
  }

  private getNewLeadTemplate(
    agentName: string,
    lead: { name: string; phone: string; interest: string; source: string }
  ): EmailTemplate {
    return {
      subject: `Yeni Müşteri Adayı: ${lead.name} - Emlak CRM`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Yeni Lead!</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Merhaba ${agentName},</h2>
            <p>Size yeni bir müşteri adayı atandı:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Ad Soyad:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${lead.name}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Telefon:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${lead.phone}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>İlgi Alanı:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${lead.interest}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Kaynak:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${lead.source}</td></tr>
            </table>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/musteriler" style="background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Müşteriyi Görüntüle</a>
            </div>
          </div>
        </div>
      `,
    };
  }

  private getAppointmentTemplate(details: {
    contactName: string;
    propertyTitle: string;
    date: string;
    time: string;
    address: string;
    agentName: string;
    agentPhone: string;
  }): EmailTemplate {
    return {
      subject: `Gösterim Randevusu Onayı - ${details.propertyTitle}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Randevu Onayı</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Sayın ${details.contactName},</h2>
            <p>Gösterim randevunuz onaylanmıştır:</p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Gayrimenkul:</strong> ${details.propertyTitle}</p>
              <p><strong>Tarih:</strong> ${details.date}</p>
              <p><strong>Saat:</strong> ${details.time}</p>
              <p><strong>Adres:</strong> ${details.address}</p>
              <p><strong>Danışmanınız:</strong> ${details.agentName}</p>
              <p><strong>İletişim:</strong> ${details.agentPhone}</p>
            </div>
            <p style="color: #666;">Randevunuzu iptal etmek veya değiştirmek için danışmanınızla iletişime geçin.</p>
          </div>
        </div>
      `,
    };
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email connection verified');
      return true;
    } catch (error) {
      logger.error('Email connection failed:', error);
      return false;
    }
  }
}

export const emailClient = new EmailClient();
