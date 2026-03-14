import { IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  @IsOptional()
  code: string = '';
}