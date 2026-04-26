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
  <body style="font-family: 'Space Grotesk', 'Sora', 'Manrope', Arial, sans-serif; background: linear-gradient(135deg, #095668, #074353); margin: 0; padding: 0; color: #f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #095668, #074353); padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 16px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35); overflow: hidden; backdrop-filter: blur(8px);">
            <tr>
              <td style="background: linear-gradient(135deg, #095668, #074353); color: #f9fafb; padding: 24px 32px; border-bottom: 1px solid rgba(255, 176, 32, 0.35);">
                <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #ffd24a; font-weight: 700;">${this.productName}</p>
                <h1 style="margin: 0; font-size: 22px;">Confirmation de publication</h1>
                <p style="margin: 8px 0 0; font-size: 14px; color: #d1d5db;">Une action est requise pour finaliser votre post</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px; color: #f3f4f6;">
                <p style="font-size: 15px; margin: 0 0 12px;">Bonjour ${escapedUsername},</p>
                <p style="font-size: 15px; margin: 0 0 16px; color: #e5e7eb; line-height: 1.55;">
                  Votre post planifié pour <strong>${escapedScheduledText}</strong> est prêt à être publié sur <strong>${escapedNetworks}</strong>.
                </p>

                ${
                  escapedContentPreview
                    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 12px; margin: 0 0 16px; background: rgba(255, 255, 255, 0.04);">
                  <tr>
                    <td style="padding: 14px 16px;">
                      <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;">Aperçu du contenu</p>
                      <p style="margin: 0; font-size: 14px; color: #f3f4f6; white-space: pre-wrap; line-height: 1.5;">${escapedContentPreview}</p>
                    </td>
                  </tr>
                </table>`
                    : ''
                }

                ${
                  escapedEventUrl
                    ? `<p style="margin: 0 0 18px; font-size: 14px; color: #d1d5db; line-height: 1.5;">
                  Lien de l'événement : <a href="${escapedEventUrl}" style="color: #ffd24a; text-decoration: none; font-weight: 700; word-break: break-all;">${escapedEventUrl}</a>
                </p>`
                    : ''
                }

                <p style="text-align: center; margin: 0 0 20px;">
                  <a href="${escapedConfirmationUrl}" style="display: inline-block; padding: 14px 22px; background: #ffb020; color: #000000; text-decoration: none; border-radius: 10px; font-weight: 700;">Confirmer et publier</a>
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 10px; margin: 0 0 14px; background: rgba(0, 0, 0, 0.16);">
                  <tr>
                    <td style="padding: 12px 14px; font-size: 12px; color: #9ca3af;">Post ID</td>
                    <td style="padding: 12px 14px; font-size: 13px; color: #f3f4f6; text-align: right; word-break: break-all;"><strong>${escapedPostId}</strong></td>
                  </tr>
                </table>

                <p style="font-size: 13px; color: #d1d5db; margin: 0; line-height: 1.55;">
                  Ce lien de confirmation est personnel et expire automatiquement après 24 heures.
                </p>
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

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
