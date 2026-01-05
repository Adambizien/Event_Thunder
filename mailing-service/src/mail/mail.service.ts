import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PasswordResetDto } from './dto/password-reset.dto';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly productName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from =
      this.configService.get<string>('MAIL_FROM') ??
      'no-reply@mail.event-thunder.com';
    this.productName =
      this.configService.get<string>('PRODUCT_NAME') ?? 'Event Thunder';

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is missing');
    }

    this.resend = new Resend(apiKey);
  }

  async sendPasswordReset(dto: PasswordResetDto) {
    const expires = dto.expiresInMinutes ?? 60;
    const username = dto.username ?? dto.email.split('@')[0];

    const html = this.buildPasswordResetHtml({
      username,
      resetUrl: dto.resetUrl,
      expiresInMinutes: expires,
    });

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: dto.email,
        subject: `${this.productName} password reset`,
        html,
      });

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return { id: data?.id, status: 'sent' };
    } catch (error) {
      if (error instanceof Error) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        'Unable to send password reset email',
      );
    }
  }

  private buildPasswordResetHtml(payload: {
    username: string;
    resetUrl: string;
    expiresInMinutes: number;
  }) {
    const { username, resetUrl, expiresInMinutes } = payload;

    return `<!doctype html>
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
                <p style="margin: 8px 0 0; font-size: 14px; color: #e5e7eb;">Password reset request</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px; color: #111827;">
                <p style="font-size: 15px; margin: 0 0 12px;">Hello ${username},</p>
                <p style="font-size: 15px; margin: 0 0 12px;">
                  We received a request to reset your password. Use the button below to choose a new password.
                </p>
                <p style="font-size: 15px; margin: 0 0 24px;">This link expires in ${expiresInMinutes} minutes.</p>
                <p style="text-align: center; margin: 0 0 24px;">
                  <a href="${resetUrl}" style="display: inline-block; padding: 14px 22px; background: #1f2937; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset password</a>
                </p>
                <p style="font-size: 13px; color: #4b5563; margin: 0 0 16px;">
                  If the button does not work, paste this link into your browser:<br />
                  <a href="${resetUrl}" style="color: #1f2937; word-break: break-all;">${resetUrl}</a>
                </p>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">If you did not request this, you can safely ignore this email.</p>
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
</html>`;
  }
}
