import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutTicketItemDto {
  @IsUUID()
  ticket_type_id!: string;

  @Type(() => Number)
  @Min(1)
  @Max(20)
  quantity!: number;
}

export class CreateTicketCheckoutDto {
  @IsUUID()
  event_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => CheckoutTicketItemDto)
  items!: CheckoutTicketItemDto[];

  @IsUrl({ require_tld: false })
  success_url!: string;

  @IsUrl({ require_tld: false })
  cancel_url!: string;

  @IsString()
  @IsNotEmpty()
  customer_name!: string;

  @IsEmail()
  customer_email!: string;
}