import { IsString, Length } from 'class-validator';

export class ConfirmPostDto {
  @IsString()
  @Length(32, 128)
  token!: string;
}
