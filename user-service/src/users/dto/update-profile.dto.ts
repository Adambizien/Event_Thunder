import { IsEmail, IsString, IsOptional, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @Matches(/^(?:\+?\d{7,15}|0\d{9})$/, {
    message: 'Format de numéro de téléphone invalide',
  })
  phoneNumber?: string;
}
