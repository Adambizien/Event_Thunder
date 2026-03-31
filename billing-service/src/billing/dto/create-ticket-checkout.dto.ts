export class CreateTicketCheckoutDto {
  userId!: string;
  eventId!: string;
  successUrl!: string;
  cancelUrl!: string;
  customerEmail!: string;
  customerName!: string;
  items!: Array<{
    ticketTypeId: string;
    name: string;
    description?: string;
    quantity: number;
    unitAmount: number;
    currency: string;
  }>;
}