import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketCurrency } from '@prisma/client';

export class UpsertEventTicketTypeItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @Type(() => Number)
  @Min(0.01)
  price!: number;

  @IsOptional()
  @IsEnum(TicketCurrency)
  currency?: TicketCurrency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  max_quantity?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpsertEventTicketTypesDto {
  @IsArray()
  @Type(() => UpsertEventTicketTypeItemDto)
  ticket_types!: UpsertEventTicketTypeItemDto[];
}
