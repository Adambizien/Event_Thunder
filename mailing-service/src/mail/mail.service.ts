import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PasswordResetDto } from './dto/password-reset.dto';
import { SendWelcomeDto } from './dto/send-welcome.dto';
import { EmailTemplateFactory } from './templates/email-template.factory';
import { SendEmailOptions } from './interfaces/email.interface';
import { readSecret } from '../utils/secret.util';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly productName: string;
  private readonly templateFactory: EmailTemplateFactory;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      readSecret('RESEND_API_KEY') ??
      this.configService.get<string>('RESEND_API_KEY');
    this.from =
      this.configService.get<string>('MAIL_FROM') ??
      'no-reply@mail.event-thunder.com';
    this.productName =
      this.configService.get<string>('PRODUCT_NAME') ?? 'Event Thunder';

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is missing');
    }

    this.resend = new Resend(apiKey);
    this.templateFactory = new EmailTemplateFactory(this.productName);
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordReset(dto: PasswordResetDto) {
    const expires = dto.expiresInMinutes ?? 60;
    const username = dto.username ?? dto.email.split('@')[0];

    const template = this.templateFactory.createPasswordResetTemplate({
      username,
      resetUrl: dto.resetUrl,
      expiresInMinutes: expires,
    });

    return this.sendEmail({
      to: dto.email,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Envoie un email de bienvenue
   */
  async sendWelcome(dto: SendWelcomeDto) {
    const username = dto.username ?? dto.email.split('@')[0];

    const template = this.templateFactory.createWelcomeTemplate({
      username,
      activationUrl: dto.activationUrl,
    });

    return this.sendEmail({
      to: dto.email,
      subject: template.subject,
      html: template.html,
    });
  }

  /**
   * Méthode interne pour envoyer un email
   */
  private async sendEmail(options: SendEmailOptions) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return { id: data?.id, status: 'sent' };
    } catch (error) {
      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException('Unable to send email');
    }
  }
}
