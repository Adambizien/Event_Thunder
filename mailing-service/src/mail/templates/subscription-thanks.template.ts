import { EmailTemplate } from '../interfaces/email.interface';

export class SubscriptionThanksTemplate {
  constructor(private readonly productName: string) {}

  create(payload: {
    username: string;
    amount?: number;
    currency?: string;
    paidAt?: string;
    hostedInvoiceUrl?: string | null;
    invoicePdfUrl?: string | null;
  }): EmailTemplate {
    const amountText = this.formatAmount(payload.amount, payload.currency);
    const paidAtText = this.formatDate(payload.paidAt);
    const invoiceUrl = payload.hostedInvoiceUrl || payload.invoicePdfUrl || '';

    return {
      subject: `${this.productName} - Merci pour votre abonnement`,
      html: `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Abonnement confirmé</title>
  </head>
  <body style="font-family: 'Space Grotesk', 'Sora', 'Manrope', Arial, sans-serif; background: linear-gradient(135deg, #095668, #074353); margin: 0; padding: 0; color: #f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #095668, #074353); padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 16px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35); overflow: hidden; backdrop-filter: blur(8px);">
            <tr>
              <td style="background: linear-gradient(135deg, #095668, #074353); color: #f9fafb; padding: 24px 32px; border-bottom: 1px solid rgba(255, 176, 32, 0.35);">
                <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #ffd24a; font-weight: 700;">Event Thunder</p>
                <h1 style="margin: 0; font-size: 22px;">Merci pour votre abonnement</h1>
                <p style="margin: 8px 0 0; font-size: 14px; color: #d1d5db;">Votre paiement a bien été confirmé.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px; color: #f3f4f6;">
                <p style="font-size: 15px; margin: 0 0 12px;">Bonjour ${payload.username},</p>
                <p style="font-size: 15px; margin: 0 0 16px; color: #e5e7eb; line-height: 1.55;">
                  Nous vous remercions pour votre abonnement à ${this.productName}.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 10px; margin: 0 0 22px; background: rgba(255, 255, 255, 0.04);">
                  <tr>
                    <td style="padding: 12px 14px; font-size: 14px; color: #d1d5db;">Montant facturé</td>
                    <td style="padding: 12px 14px; font-size: 14px; color: #f3f4f6; text-align: right;"><strong>${amountText}</strong></td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 14px; font-size: 14px; color: #d1d5db; border-top: 1px solid rgba(255, 255, 255, 0.12);">Date de paiement</td>
                    <td style="padding: 12px 14px; font-size: 14px; color: #f3f4f6; text-align: right; border-top: 1px solid rgba(255, 255, 255, 0.12);"><strong>${paidAtText}</strong></td>
                  </tr>
                </table>
                ${
                  invoiceUrl
                    ? `<p style="text-align: center; margin: 0 0 20px;">
                  <a href="${invoiceUrl}" style="display: inline-block; padding: 14px 22px; background: #ffb020; color: #000000; text-decoration: none; border-radius: 10px; font-weight: 700;">Voir ma facture Stripe</a>
                </p>`
                    : ''
                }
                <p style="font-size: 13px; color: #d1d5db; margin: 0;">
                  Conservez cet email pour votre suivi de facturation.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background: rgba(0, 0, 0, 0.22); color: #9ca3af; font-size: 12px; padding: 16px 32px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <p style="margin: 0;">${this.productName}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    };
  }

  private formatAmount(amount?: number, currency?: string): string {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      return '-';
    }

    const normalizedCurrency = (currency ?? 'EUR').toUpperCase();
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: normalizedCurrency,
    }).format(amount);
  }

  private formatDate(dateIso?: string): string {
    if (!dateIso) {
      return '-';
    }

    const date = new Date(dateIso);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}