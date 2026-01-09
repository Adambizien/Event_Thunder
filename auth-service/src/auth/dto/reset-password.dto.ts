import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(12, {
    message: 'Le mot de passe doit contenir au moins 12 caractères',
  })
  @Matches(/[a-z]/, {
    message: 'Le mot de passe doit contenir au moins 1 lettre minuscule',
  })
  @Matches(/[A-Z]/, {
    message: 'Le mot de passe doit contenir au moins 1 lettre majuscule',
  })
  @Matches(/\d/, {
    message: 'Le mot de passe doit contenir au moins 1 chiffre',
  })
  @Matches(/[@$!%*?&]/, {
    message:
      'Le mot de passe doit contenir au moins 1 caractère spécial (@$!%*?&)',
  })
  newPassword!: string;
}
