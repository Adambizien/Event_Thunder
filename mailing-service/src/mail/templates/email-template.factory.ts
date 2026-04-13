import { EmailTemplate } from '../interfaces/email.interface';
import { PasswordResetTemplate } from './password-reset.template';
import { SubscriptionThanksTemplate } from './subscription-thanks.template';
import { TicketPurchaseAndRefundTemplate } from './ticket-purchase-and-refund.template';
import { WelcomeTemplate } from './welcome.template';

export class EmailTemplateFactory {
  private readonly passwordResetTemplate: PasswordResetTemplate;
  private readonly subscriptionThanksTemplate: SubscriptionThanksTemplate;
  private readonly ticketPurchaseTemplate: TicketPurchaseAndRefundTemplate;
  private readonly welcomeTemplate: WelcomeTemplate;

  constructor(private readonly productName: string) {
    this.passwordResetTemplate = new PasswordResetTemplate(productName);
    this.subscriptionThanksTemplate = new SubscriptionThanksTemplate(
      productName,
    );
    this.ticketPurchaseTemplate = new TicketPurchaseAndRefundTemplate(
      productName,
    );
    this.welcomeTemplate = new WelcomeTemplate(productName);
  }

  /**
   * Génère le template pour la réinitialisation du mot de passe
   */
  createPasswordResetTemplate(payload: {
    username: string;
    resetUrl: string;
    expiresInMinutes: number;
  }): EmailTemplate {
    return this.passwordResetTemplate.create(payload);
  }

  /**
   * Génère le template de bienvenue
   */
  createWelcomeTemplate(payload: {
    username: string;
    activationUrl?: string;
  }): EmailTemplate {
    return this.welcomeTemplate.create(payload);
  }

  /**
   * Genere le template de remerciement abonnement
   */
  createSubscriptionThanksTemplate(payload: {
    username: string;
    amount?: number;
    currency?: string;
    paidAt?: string;
    hostedInvoiceUrl?: string | null;
    invoicePdfUrl?: string | null;
  }): EmailTemplate {
    return this.subscriptionThanksTemplate.create(payload);
  }

  /**
   * Genere le template de remerciement achat tickets
   */
  createTicketPurchaseTemplate(payload: {
    subject?: string;
    emailTitle?: string;
    emailSubtitle?: string;
    introText?: string;
    footerText?: string;
    ctaLabel?: string;
    eventUrl?: string;
    eventCtaLabel?: string;
    showQrCodes?: boolean;
    username: string;
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
  }): EmailTemplate {
    return this.ticketPurchaseTemplate.create(payload);
  }
}
