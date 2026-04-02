export type TicketCurrency = 'EUR' | 'USD';

export type TicketTypeItem = {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: TicketCurrency;
  max_quantity?: number | null;
  sold_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsertTicketTypeInput = {
  id?: string;
  name: string;
  description?: string;
  price: number;
  currency?: TicketCurrency;
  max_quantity?: number;
  is_active?: boolean;
};


export type TicketAttendee = {
  ticket_type_id: string;
  firstname: string;
  lastname: string;
  email: string;
};

export type CreateTicketCheckoutPayload = {
  event_id: string;
  items: Array<{
    ticket_type_id: string;
    quantity: number;
  }>;
  success_url: string;
  cancel_url: string;
  customer_name: string;
  customer_email: string;
  attendees: TicketAttendee[];
};

export type CreateTicketCheckoutResponse = {
  sessionId: string;
  url: string | null;
};

export type TicketPurchaseItem = {
  id: string;
  ticket_purchase_id: string;
  ticket_type_id: string;
  quantity: number;
  unit_price: number;
  currency: TicketCurrency;
  ticket_type_label?: string | null;
  created_at: string;
  ticket_type?: TicketTypeItem;
};

export type Ticket = {
  id: string;
  ticket_purchase_id: string;
  ticket_type_id: string;
  attendee_firstname: string;
  attendee_lastname: string;
  attendee_email?: string | null;
  ticket_number: string;
  qr_code: string;
  used: boolean;
  used_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketPurchase = {
  id: string;
  user_id: string;
  buyer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  stripe_payment_intent_id: string;
  status: string;
  total_amount: number;
  currency: TicketCurrency;
  paid_at?: string | null;
  failed_at?: string | null;
  refunded_at?: string | null;
  cancelled_at?: string | null;
  failure_reason?: string | null;
  created_at: string;
  updated_at: string;
  items: TicketPurchaseItem[];
  tickets: Ticket[];
};

export type MyTicketsResponse = {
  purchases: TicketPurchase[];
};

export type TicketInvoiceLinksResponse = {
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  receiptUrl: string | null;
};

export type SoldEventTicketItem = {
  id: string;
  ticket_number: string;
  attendee_firstname: string;
  attendee_lastname: string;
  attendee_email?: string | null;
  created_at: string;
  ticket_type: {
    id: string;
    name: string;
    price: number | string;
    currency: TicketCurrency;
  };
  ticket_purchase: {
    id: string;
    user_id: string;
    stripe_payment_intent_id: string;
    created_at: string;
    status: string;
    total_amount: number | string;
    currency: TicketCurrency;
    buyer?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null;
  };
};

export type EventSoldTicketsResponse = {
  event_id: string;
  count: number;
  tickets: SoldEventTicketItem[];
};