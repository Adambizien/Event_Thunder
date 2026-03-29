import { EmailTemplate } from '../interfaces/email.interface';

export class PasswordResetTemplate {
  constructor(private readonly productName: string) {}

  create(payload: {
    username: string;
    resetUrl: string;
    expiresInMinutes: number;
  }): EmailTemplate {
    const { username, resetUrl, expiresInMinutes } = payload;

    return {
      subject: `${this.productName} - Réinitialiser votre mot de passe`,
      html: `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.productName} Password Reset</title>
  </head>
  <body style="font-family: Arial, sans-serif; background: #f6f7fb; margin: 0; padding: 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f6f7fb; padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; box-shadow: 0 8px 24px rgba(18, 38, 63, 0.12); overflow: hidden;">
            <tr>
              <td style="background: linear-gradient(135deg, #111827, #1f2937); color: #f9fafb; padding: 24px 32px;">
                <h1 style="margin: 0; font-size: 22px;">${this.productName}</h1>
                <p style="margin: 8px 0 0; font-size: 14px; color: #e5e7eb;">Réinitialisation du mot de passe</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px; color: #111827;">
                <p style="font-size: 15px; margin: 0 0 12px;">Bonjour ${username},</p>
                <p style="font-size: 15px; margin: 0 0 12px;">
                  Nous avons reçu une demande de réinitialisation de votre mot de passe. Utilisez le bouton ci-dessous pour définir un nouveau mot de passe.
                </p>
                <p style="font-size: 15px; margin: 0 0 24px;">Ce lien expire dans ${expiresInMinutes} minutes.</p>
                <p style="text-align: center; margin: 0 0 24px;">
                  <a href="${resetUrl}" style="display: inline-block; padding: 14px 22px; background: #1f2937; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Réinitialiser le mot de passe</a>
                </p>
                <p style="font-size: 13px; color: #4b5563; margin: 0 0 16px;">
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur:<br />
                  <a href="${resetUrl}" style="color: #1f2937; word-break: break-all;">${resetUrl}</a>
                </p>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">Si vous n'avez pas demandé cela, vous pouvez ignorer cet email.</p>
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
