export class TicketAttendeeDto {
  ticketTypeId!: string;
  firstname!: string;
  lastname!: string;
  email!: string;
}

export class CreateTicketCheckoutDto {
  userId!: string;
  eventId!: string;
  successUrl!: string;
  cancelUrl!: string;
  customerEmail!: string;
  customerName!: string;
  attendees!: TicketAttendeeDto[];
  items!: Array<{
    ticketTypeId: string;
    name: string;
    description?: string;
    quantity: number;
    unitAmount: number;
    currency: string;
  }>;
}
