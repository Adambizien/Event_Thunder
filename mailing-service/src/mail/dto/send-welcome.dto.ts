import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendWelcomeDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  activationUrl?: string;
}
