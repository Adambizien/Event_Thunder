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
} from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsUUID()
  event_id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  content!: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @ArrayUnique()
  @IsIn(['x'], { each: true })
  networks!: Array<'x'>;
}
