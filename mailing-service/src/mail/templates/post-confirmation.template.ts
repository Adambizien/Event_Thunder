import { EmailTemplate } from '../interfaces/email.interface';

export class PostConfirmationTemplate {
  constructor(private readonly productName: string) {}

  create(payload: {
    username: string;
    postId: string;
    confirmationUrl: string;
    scheduledText: string;
    networks: string;
    contentPreview?: string;
    eventUrl?: string;
  }): EmailTemplate {
    const escapedUsername = this.escapeHtml(payload.username);
    const escapedScheduledText = this.escapeHtml(payload.scheduledText);
    const escapedNetworks = this.escapeHtml(payload.networks);
    const escapedContentPreview = payload.contentPreview
      ? this.escapeHtml(payload.contentPreview)
      : null;
    const escapedEventUrl = payload.eventUrl
      ? this.escapeHtml(payload.eventUrl)
      : null;
    const escapedConfirmationUrl = this.escapeHtml(payload.confirmationUrl);
    const escapedPostId = this.escapeHtml(payload.postId);

    return {
      subject: `${this.productName} - Confirmation de publication`,
      html: `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirmation de publication</title>
  </head>
  <body style="margin: 0; padding: 24px; background: #f4f6fb; color: #111827; font-family: Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #dde3ef; border-radius: 14px; overflow: hidden;">
      <tr>
        <td style="padding: 0; background: linear-gradient(135deg, #0f766e 0%, #0b5c56 100%);">
          <div style="padding: 24px; color: #ffffff;">
            <p style="margin: 0 0 6px 0; font-size: 12px; letter-spacing: 0.8px; text-transform: uppercase; opacity: 0.9;">Event Thunder</p>
            <h1 style="margin: 0; font-size: 22px; line-height: 1.3;">Confirmation de publication</h1>
          </div>
        </td>
      </tr>

      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 14px 0; font-size: 16px;">Bonjour <strong>${escapedUsername}</strong>,</p>
          <p style="margin: 0 0 16px 0; color: #374151; line-height: 1.6;">
            Votre post planifié pour <strong>${escapedScheduledText}</strong> est prêt à être publié sur <strong>${escapedNetworks}</strong>.
          </p>

          ${
            escapedContentPreview
              ? `<div style="margin: 0 0 16px 0; padding: 14px; border-radius: 10px; border: 1px solid #e5e7eb; background: #f9fafb;"><p style="margin: 0; color: #374151; white-space: pre-wrap;"><em>${escapedContentPreview}</em></p></div>`
              : ''
          }

          ${
            escapedEventUrl
              ? `<p style="margin: 0 0 18px 0; font-size: 14px; color: #374151;">Lien de l'événement: <a href="${escapedEventUrl}" style="color: #0f766e; text-decoration: none; font-weight: 600;">${escapedEventUrl}</a></p>`
              : ''
          }

          <p style="margin: 0 0 20px 0;">
            <a href="${escapedConfirmationUrl}" style="display: inline-block; padding: 12px 18px; background: #0f766e; color: #ffffff; text-decoration: none; border-radius: 9px; font-weight: 700; font-size: 14px;">Confirmer et publier</a>
          </p>

          <p style="margin: 0; font-size: 12px; color: #6b7280;">Post ID: ${escapedPostId}</p>
        </td>
      </tr>

      <tr>
        <td style="padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">Ce lien de confirmation est personnel et expire automatiquement.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    };
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
