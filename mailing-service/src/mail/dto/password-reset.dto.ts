import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  Allow,
} from 'class-validator';

export class PasswordResetDto {
  @IsEmail()
  email!: string;

  @Allow()
  resetUrl!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  expiresInMinutes?: number;
}
