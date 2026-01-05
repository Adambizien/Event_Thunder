import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { PasswordResetDto } from './dto/password-reset.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('password-reset')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendPasswordReset(@Body() payload: PasswordResetDto) {
    const result = await this.mailService.sendPasswordReset(payload);
    return { message: 'Password reset email sent', ...result };
  }
}
