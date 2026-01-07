import { EmailTemplate } from '../interfaces/email.interface';

export class WelcomeTemplate {
  constructor(private readonly productName: string) {}

  create(payload: { username: string; activationUrl?: string }): EmailTemplate {
    const { username, activationUrl } = payload;

    return {
      subject: `Bienvenue dans ${this.productName}!`,
      html: `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bienvenue ${this.productName}</title>
  </head>
  <body style="font-family: Arial, sans-serif; background: #f6f7fb; margin: 0; padding: 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f6f7fb; padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; box-shadow: 0 8px 24px rgba(18, 38, 63, 0.12); overflow: hidden;">
            <tr>
              <td style="background: linear-gradient(135deg, #10b981, #059669); color: #f9fafb; padding: 24px 32px;">
                <h1 style="margin: 0; font-size: 22px;">Bienvenue! 🎉</h1>
                <p style="margin: 8px 0 0; font-size: 14px; color: #e5e7eb;">Merci de vous être inscrit à ${this.productName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px; color: #111827;">
                <p style="font-size: 15px; margin: 0 0 12px;">Bonjour ${username},</p>
                <p style="font-size: 15px; margin: 0 0 12px;">
                  Nous sommes ravis de vous accueillir sur ${this.productName}. Votre compte a été créé avec succès.
                </p>
                <p style="font-size: 15px; margin: 0 0 24px;">
                  Explorez nos fonctionnalités et commencez à créer vos événements dès maintenant!
                </p>
                ${
                  activationUrl
                    ? `<p style="text-align: center; margin: 0 0 24px;">
                  <a href="${activationUrl}" style="display: inline-block; padding: 14px 22px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Activer mon compte</a>
                </p>`
                    : ''
                }
                <p style="font-size: 13px; color: #6b7280; margin: 0;">
                  Des questions? Nous sommes là pour vous aider!
                </p>
              </td>
            </tr>
            <tr>
              <td style="background: #f9fafb; color: #6b7280; font-size: 12px; padding: 16px 32px; text-align: center;">
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
}
