import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsOptional,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  firstName: string = '';

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  lastName: string = '';

  @IsEmail()
  email: string = '';

  @IsString()
  @IsOptional()
  @MaxLength(30)
  phoneNumber?: string;

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
  password: string = '';
}
