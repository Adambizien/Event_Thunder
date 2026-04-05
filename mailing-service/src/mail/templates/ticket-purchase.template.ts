import { EmailTemplate } from '../interfaces/email.interface';

export class TicketPurchaseTemplate {
  constructor(private readonly productName: string) {}

  create(payload: {
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
    const amountText = this.formatAmount(payload.amountTotal, payload.currency);
    const invoiceUrl =
      payload.hostedInvoiceUrl ||
      payload.invoicePdfUrl ||
      payload.receiptUrl ||
      '';
    const purchaseDateText = this.formatDateTime(payload.purchaseDate);
    const purchaseStatus = payload.statusLabel ?? 'Paiement confirmé';

    const itemsHtml = payload.items
      .map((item) => {
        const lineAmount =
          typeof item.unitAmount === 'number'
            ? item.unitAmount * item.quantity
            : undefined;
        const linePrice = this.formatAmount(lineAmount, payload.currency);
        return `<tr>
          <td style="padding: 8px 0; font-size: 14px; color: #f3f4f6;">${item.name} x${item.quantity}</td>
          <td style="padding: 8px 0; font-size: 14px; color: #f3f4f6; text-align: right;">${linePrice}</td>
        </tr>`;
      })
      .join('');

    const ticketsHtml = (payload.tickets ?? [])
      .map((ticket, index) => {
        const ticketNumber = ticket.ticketNumber ?? `Ticket ${index + 1}`;
        const qrData = encodeURIComponent(
          ticket.qrCode ?? ticket.ticketNumber ?? '',
        );
        const qrImg = qrData
          ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${qrData}" alt="QR code ticket" width="140" height="140" style="display: block; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); margin-top: 10px;" />`
          : '';
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; background: rgba(255, 255, 255, 0.05); margin-bottom: 10px;">
          <tr>
            <td style="padding: 12px;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">Numéro de ticket</p>
              <p style="margin: 4px 0 8px; font-family: 'Courier New', Courier, monospace; font-size: 13px; font-weight: 700; color: #ffb020;">${ticketNumber}</p>
              <p style="margin: 0 0 4px; font-size: 12px; color: #d1d5db;">Nom : <span style="color: #f9fafb; font-weight: 700;">${ticket.attendeeLastname ?? '-'}</span></p>
              <p style="margin: 0 0 4px; font-size: 12px; color: #d1d5db;">Prénom : <span style="color: #f9fafb; font-weight: 700;">${ticket.attendeeFirstname ?? '-'}</span></p>
              <p style="margin: 0 0 4px; font-size: 12px; color: #d1d5db;">Email : <span style="color: #f9fafb; font-weight: 700;">${ticket.attendeeEmail ?? '-'}</span></p>
              ${
                ticket.ticketTypeName
                  ? `<p style="margin: 0 0 4px; font-size: 12px; color: #d1d5db;">Type : <span style="color: #f9fafb; font-weight: 700;">${ticket.ticketTypeName}</span></p>`
                  : ''
              }
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">Statut: ${ticket.statusLabel ?? 'Valide'}</p>
              ${qrImg}
            </td>
          </tr>
        </table>`;
      })
      .join('');

    return {
      subject: `${this.productName} - Merci pour votre achat de tickets`,
      html: `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Achat tickets confirmé</title>
    <style>
      .purchase-col {
        width: 50%;
      }

      @media only screen and (max-width: 640px) {
        .purchase-col {
          display: block !important;
          width: 100% !important;
        }

        .purchase-col-inner-left {
          margin-right: 0 !important;
          margin-bottom: 12px !important;
        }

        .purchase-col-inner-right {
          margin-left: 0 !important;
        }
      }
    </style>
  </head>
  <body style="font-family: 'Space Grotesk', 'Sora', 'Manrope', Arial, sans-serif; background: linear-gradient(135deg, #095668, #074353); margin: 0; padding: 0; color: #f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #095668, #074353); padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 16px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35); overflow: hidden; backdrop-filter: blur(8px);">
            <tr>
              <td style="background: linear-gradient(135deg, #095668, #074353); color: #f9fafb; padding: 24px 32px; border-bottom: 1px solid rgba(255, 176, 32, 0.35);">
                <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #ffd24a; font-weight: 700;">Event Thunder</p>
                <h1 style="margin: 0; font-size: 22px;">Merci pour votre achat</h1>
                <p style="margin: 8px 0 0; font-size: 14px; color: #d1d5db;">Vos tickets sont confirmés.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px; color: #f3f4f6;">
                <p style="font-size: 15px; margin: 0 0 12px;">Bonjour ${payload.username},</p>
                <p style="font-size: 15px; margin: 0 0 16px; color: #e5e7eb; line-height: 1.55;">
                  Merci pour votre commande. Voici les informations essentielles à conserver.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; background: rgba(255, 255, 255, 0.05); box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28); margin: 0 0 16px;">
                  <tr>
                    <td style="padding: 16px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                      <p style="margin: 0; font-size: 12px; color: #9ca3af;">Achat</p>
                      <p style="margin: 4px 0 0; font-size: 14px; font-weight: 700; color: #f9fafb;">${payload.purchaseId ?? payload.stripeCheckoutSessionId ?? '-'}</p>
                      <p style="margin: 4px 0 0; font-size: 12px; color: #9ca3af;">Stripe: ${payload.stripePaymentIntentId ?? '-'}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 14px 18px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="font-size: 12px; color: #9ca3af;">Achat le</td>
                          <td style="font-size: 12px; color: #9ca3af; text-align: right;">Prix total</td>
                        </tr>
                        <tr>
                          <td style="font-size: 14px; color: #f9fafb; padding-top: 2px;">${purchaseDateText}</td>
                          <td style="font-size: 16px; font-weight: 700; color: #ffb020; text-align: right; padding-top: 2px;">${amountText}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 18px;">
                  <tr>
                    <td class="purchase-col" valign="top" style="padding: 0 6px 0 0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="purchase-col-inner-left" style="border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0, 0, 0, 0.2); border-radius: 12px; margin-right: 6px;">
                        <tr>
                          <td style="padding: 14px;">
                            <h3 style="margin: 0 0 10px; font-size: 16px; color: #f9fafb;">Détails de l'achat</h3>
                            <p style="margin: 0 0 6px; font-size: 13px; color: #d1d5db;"><span style="color: #9ca3af;">Nom:</span> ${payload.buyerLastname ?? '-'}</p>
                            <p style="margin: 0 0 6px; font-size: 13px; color: #d1d5db;"><span style="color: #9ca3af;">Prénom:</span> ${payload.buyerFirstname ?? '-'}</p>
                            <p style="margin: 0 0 6px; font-size: 13px; color: #d1d5db;"><span style="color: #9ca3af;">Email:</span> ${payload.buyerEmail ?? '-'}</p>
                            <p style="margin: 0 0 6px; font-size: 13px; color: #d1d5db;"><span style="color: #9ca3af;">Statut:</span> ${purchaseStatus}</p>
                            <p style="margin: 0 0 6px; font-size: 13px; color: #d1d5db;"><span style="color: #9ca3af;">Nombre de tickets:</span> ${payload.ticketCount}</p>
                            <h3 style="margin: 0 0 8px; font-size: 15px; color: #f9fafb;">Montant détaillé</h3>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                              ${itemsHtml}
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="purchase-col" valign="top" style="padding: 0 0 0 6px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="purchase-col-inner-right" style="border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0, 0, 0, 0.2); border-radius: 12px; margin-left: 6px;">
                        <tr>
                          <td style="padding: 14px;">
                            <h3 style="margin: 0 0 10px; font-size: 16px; color: #f9fafb;">Billets générés</h3>
                            ${ticketsHtml}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                ${
                  invoiceUrl
                    ? `<p style="text-align: center; margin: 0 0 20px;">
                  <a href="${invoiceUrl}" style="display: inline-block; padding: 14px 22px; background: #ffb020; color: #000000; text-decoration: none; border-radius: 10px; font-weight: 700;">Voir la facture</a>
                </p>`
                    : ''
                }
                <p style="font-size: 13px; color: #d1d5db; margin: 0; line-height: 1.55;">
                  Pensez à présenter vos tickets (QR code) lors de l'entrée à l'événement.
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

  private formatDateTime(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  }
}