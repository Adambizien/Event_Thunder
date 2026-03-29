export class CreateCheckoutSessionDto {
  userId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  stripeCustomerId?: string;
}
