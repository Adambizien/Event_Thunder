import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class GeneratePostTextDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1200)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  prompt!: string;

  @IsOptional()
  @IsUUID()
  event_id?: string;
}
