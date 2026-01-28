import { IsEmail, IsString, MinLength } from 'class-validator';

export class UpdatePasswordWithEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(12, {
    message: 'Le mot de passe doit contenir au moins 12 caractères',
  })
  newPassword!: string;
}
