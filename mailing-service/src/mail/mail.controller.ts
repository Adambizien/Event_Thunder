import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { PasswordResetDto } from './dto/password-reset.dto';
import { SendWelcomeDto } from './dto/send-welcome.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  @Post('password-reset')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendPasswordReset(@Body() payload: PasswordResetDto) {
    const result = await this.mailService.sendPasswordReset(payload);
    return { message: 'Password reset email sent', ...result };
  }

  /**
   * Envoie un email de bienvenue
   */
  @Post('welcome')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendWelcome(@Body() payload: SendWelcomeDto) {
    const result = await this.mailService.sendWelcome(payload);
    return { message: 'Welcome email sent', ...result };
  }
}
