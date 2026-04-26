import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdatePostDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  event_id?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  content?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  scheduled_at?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ArrayUnique()
  @IsIn(['x', 'facebook'], { each: true })
  networks?: Array<'x' | 'facebook'>;
}
