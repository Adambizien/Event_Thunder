export class CreateSubscriptionCheckoutDto {
  userId: string;
  planId: string;
  stripePriceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  stripeCustomerId?: string;
}
