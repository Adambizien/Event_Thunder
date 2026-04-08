export class CreateTicketRefundDto {
  stripePaymentIntentId!: string;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}