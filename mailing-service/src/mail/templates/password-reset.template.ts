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
  <body style="font-family: 'Space Grotesk', 'Sora', 'Manrope', Arial, sans-serif; background: linear-gradient(135deg, #095668, #074353); margin: 0; padding: 0; color: #f3f4f6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #095668, #074353); padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 16px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35); overflow: hidden; backdrop-filter: blur(8px);">
            <tr>
              <td style="background: linear-gradient(135deg, #095668, #074353); color: #f9fafb; padding: 24px 32px; border-bottom: 1px solid rgba(255, 176, 32, 0.35);">
                <p style="margin: 0 0 10px; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #ffd24a; font-weight: 700;">Event Thunder</p>  
                <h1 style="margin: 0; font-size: 22px;">Réinitialisation du mot de passe</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px; color: #f3f4f6;">
                <p style="font-size: 15px; margin: 0 0 12px;">Bonjour ${username},</p>
                <p style="font-size: 15px; margin: 0 0 12px; color: #e5e7eb; line-height: 1.55;">
                  Nous avons reçu une demande de réinitialisation de votre mot de passe. Utilisez le bouton ci-dessous pour définir un nouveau mot de passe.
                </p>
                <p style="font-size: 15px; margin: 0 0 24px; color: #e5e7eb;">Ce lien expire dans ${expiresInMinutes} minutes.</p>
                <p style="text-align: center; margin: 0 0 24px;">
                  <a href="${resetUrl}" style="display: inline-block; padding: 14px 22px; background: #ffb020; color: #000000; text-decoration: none; border-radius: 10px; font-weight: 700;">Réinitialiser le mot de passe</a>
                </p>
                <p style="font-size: 13px; color: #d1d5db; margin: 0 0 16px; line-height: 1.55;">
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
                  <a href="${resetUrl}" style="color: #ffd24a; word-break: break-all;">${resetUrl}</a>
                </p>
                <p style="font-size: 13px; color: #9ca3af; margin: 0;">Si vous n'avez pas demandé cela, vous pouvez ignorer cet email.</p>
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