import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PasswordResetDto } from './dto/password-reset.dto';
import { SendWelcomeDto } from './dto/send-welcome.dto';
import { EmailTemplateFactory } from './templates/email-template.factory';
import { SendEmailOptions } from './interfaces/email.interface';
import { readSecret } from '../utils/secret.util';

type SubscriptionThanksInput = {
  email: string;
  username?: string;
  amount?: number;
  currency?: string;
  paidAt?: string;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
};

type TicketPurchaseThanksInput = {
  email: string;
  username?: string;
  eventId?: string;
  amountTotal?: number;
  currency?: string;
  ticketCount: number;
  buyerFirstname?: string;
  buyerLastname?: string;
  buyerEmail?: string | null;
  statusLabel?: string;
  purchaseDate?: string;
  purchaseId?: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  hostedInvoiceUrl?: string | null;
  invoicePdfUrl?: string | null;
  receiptUrl?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitAmount?: number;
  }>;
  tickets?: Array<{
    ticketNumber?: string;
    attendeeLastname?: string;
    attendeeFirstname?: string;
    attendeeEmail?: string | null;
    ticketTypeName?: string;
    statusLabel?: string;
    qrCode?: string;
  }>;
};

type TicketRefundSuccessInput = TicketPurchaseThanksInput;

type PostConfirmationRequestedInput = {
  email: string;
  username?: string;
  postId: string;
  confirmationUrl: string;
  scheduledAt?: string;
  networks?: string[];
  contentPreview?: string;
  eventUrl?: string;
};

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly productName: string;
  private readonly frontendUrl: string;
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
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';

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

  async sendSubscriptionThanks(input: SubscriptionThanksInput) {
    const username = input.username ?? input.email.split('@')[0];

    const template = this.templateFactory.createSubscriptionThanksTemplate({
      username,
      amount: input.amount,
      currency: input.currency,
      paidAt: input.paidAt,
      hostedInvoiceUrl: input.hostedInvoiceUrl,
      invoicePdfUrl: input.invoicePdfUrl,
    });

    return this.sendEmail({
      to: input.email,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendTicketPurchaseThanks(input: TicketPurchaseThanksInput) {
    const username = input.username ?? input.email.split('@')[0];
    const eventUrl = this.buildEventUrl(input.eventId);

    const template = this.templateFactory.createTicketPurchaseTemplate({
      username,
      eventUrl,
      amountTotal: input.amountTotal,
      currency: input.currency,
      ticketCount: input.ticketCount,
      buyerFirstname: input.buyerFirstname,
      buyerLastname: input.buyerLastname,
      buyerEmail: input.buyerEmail,
      statusLabel: input.statusLabel,
      purchaseDate: input.purchaseDate,
      purchaseId: input.purchaseId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      hostedInvoiceUrl: input.hostedInvoiceUrl,
      invoicePdfUrl: input.invoicePdfUrl,
      receiptUrl: input.receiptUrl,
      items: input.items,
      tickets: input.tickets,
    });

    return this.sendEmail({
      to: input.email,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendTicketRefundedSuccess(input: TicketRefundSuccessInput) {
    const username = input.username ?? input.email.split('@')[0];
    const eventUrl = this.buildEventUrl(input.eventId);

    const template = this.templateFactory.createTicketPurchaseTemplate({
      subject: `${this.productName} - Ticket remboursé avec succès`,
      emailTitle: 'Remboursement confirmé',
      emailSubtitle: 'Votre demande de remboursement a bien été validée.',
      introText:
        'Le remboursement de votre achat de tickets a été effectué avec succès. Voici le détail de la transaction remboursée.',
      footerText:
        'Conservez cet email comme justificatif de remboursement et de facturation.',
      ctaLabel: 'Voir la facture',
      eventUrl,
      showQrCodes: false,
      username,
      amountTotal: input.amountTotal,
      currency: input.currency,
      ticketCount: input.ticketCount,
      buyerFirstname: input.buyerFirstname,
      buyerLastname: input.buyerLastname,
      buyerEmail: input.buyerEmail,
      statusLabel: input.statusLabel,
      purchaseDate: input.purchaseDate,
      purchaseId: input.purchaseId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      hostedInvoiceUrl: input.hostedInvoiceUrl,
      invoicePdfUrl: input.invoicePdfUrl,
      receiptUrl: input.receiptUrl,
      items: input.items,
      tickets: input.tickets,
    });

    return this.sendEmail({
      to: input.email,
      subject: template.subject,
      html: template.html,
    });
  }

  async sendPostConfirmationRequested(input: PostConfirmationRequestedInput) {
    const username = input.username ?? input.email.split('@')[0];
    const scheduledText = input.scheduledAt
      ? new Date(input.scheduledAt).toLocaleString('fr-FR')
      : 'maintenant';
    const networks = Array.isArray(input.networks)
      ? input.networks.map((network) => network.toUpperCase()).join(' et ')
      : 'réseaux sélectionnés';
    const template = this.templateFactory.createPostConfirmationTemplate({
      username,
      postId: input.postId,
      confirmationUrl: input.confirmationUrl,
      scheduledText,
      networks,
      contentPreview: input.contentPreview,
      eventUrl: input.eventUrl,
    });

    return this.sendEmail({
      to: input.email,
      subject: template.subject,
      html: template.html,
    });
  }

  private buildEventUrl(eventId?: string): string | undefined {
    if (!eventId || eventId.trim().length === 0) {
      return undefined;
    }

    const normalizedBase = this.frontendUrl.replace(/\/$/, '');
    return `${normalizedBase}/events/${encodeURIComponent(eventId)}`;
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
