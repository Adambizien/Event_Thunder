import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EventStatus } from '@prisma/client';

const eventStatusValues = Object.values(EventStatus);

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  location?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  address?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: "L'URL de l'image est invalide" })
  image_url?: string;

  @IsOptional()
  @IsIn(eventStatusValues)
  status?: EventStatus;
}
