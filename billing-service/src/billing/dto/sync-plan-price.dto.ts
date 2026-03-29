export class SyncPlanPriceDto {
  planId?: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  currency?: 'eur' | 'usd';
}
