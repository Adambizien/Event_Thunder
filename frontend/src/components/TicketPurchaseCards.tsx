type TicketPurchaseLineItem = {
  id: string;
  label: string;
  quantity: number;
  amount: number;
  currency: string;
};

type TicketGeneratedItem = {
  id: string;
  ticketNumber: string;
  attendeeLastname: string;
  attendeeFirstname: string;
  attendeeEmail?: string | null;
  ticketTypeName?: string;
  statusLabel?: string;
};

export type TicketPurchaseCardData = {
  id: string;
  stripePaymentIntentId: string;
  createdAt: string;
  totalAmount: number;
  currency: string;
  buyerId?: string;
  buyerLastname?: string;
  buyerFirstname?: string;
  buyerEmail?: string | null;
  statusLabel: string;
  ticketCount: number;
  lineItems: TicketPurchaseLineItem[];
  tickets: TicketGeneratedItem[];
};

type TicketPurchaseCardsProps = {
  purchases: TicketPurchaseCardData[];
  openingInvoiceId: string | null;
  onOpenInvoice: (stripePaymentIntentId: string) => void;
  emptyMessage: string;
  emptySearchMessage?: string;
  dateLabel?: string;
  totalLabel?: string;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('fr-FR');
};

const formatCurrency = (amount: number, currency: string) => {
  const normalized = currency === 'USD' ? 'USD' : 'EUR';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: normalized,
  }).format(amount);
};

const TicketPurchaseCards = ({
  purchases,
  openingInvoiceId,
  onOpenInvoice,
  emptyMessage,
  emptySearchMessage,
  dateLabel = 'Achat le',
  totalLabel = 'Prix total',
}: TicketPurchaseCardsProps) => {
  if (purchases.length === 0) {
    return (
      <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
        {emptySearchMessage ?? emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {purchases.map((purchase) => (
        <section
          key={purchase.id}
          className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-sm text-gray-400">Achat</p>
              <p className="font-semibold text-white">{purchase.id}</p>
              <p className="mt-1 text-xs text-gray-400">Stripe: {purchase.stripePaymentIntentId}</p>
              <button
                type="button"
                onClick={() => onOpenInvoice(purchase.stripePaymentIntentId)}
                disabled={openingInvoiceId === purchase.stripePaymentIntentId}
                className="mt-2 inline-flex items-center rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {openingInvoiceId === purchase.stripePaymentIntentId
                  ? 'Ouverture...'
                  : 'Voir la facture'}
              </button>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">{dateLabel}</p>
              <p className="text-white">{formatDateTime(purchase.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">{totalLabel}</p>
              <p className="font-semibold text-thunder-gold">
                {formatCurrency(purchase.totalAmount, purchase.currency)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h3 className="mb-2 font-semibold text-white">Details de l'achat</h3>
              <div className="mb-4 space-y-2 text-sm text-gray-200">
                {purchase.buyerId && (
                  <p>
                    <span className="text-gray-400">Acheteur:</span> {purchase.buyerId}
                  </p>
                )}
                <p>
                  <span className="text-gray-400">Nom:</span> {purchase.buyerLastname || '-'}
                </p>
                <p>
                  <span className="text-gray-400">Prenom:</span> {purchase.buyerFirstname || '-'}
                </p>
                <p>
                  <span className="text-gray-400">Email:</span> {purchase.buyerEmail || '-'}
                </p>
                <p>
                  <span className="text-gray-400">Statut:</span> {purchase.statusLabel}
                </p>
                <p>
                  <span className="text-gray-400">Nombre de tickets:</span> {purchase.ticketCount}
                </p>
              </div>
              <h3 className="mb-2 font-semibold text-white">Montant detaille</h3>
              <ul className="space-y-2 text-sm text-gray-200">
                {purchase.lineItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3">
                    <span>
                      {item.label} x{item.quantity}
                    </span>
                    <span>{formatCurrency(item.amount, item.currency)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h3 className="mb-2 font-semibold text-white">Billets generes</h3>
              <div className="space-y-2">
                {purchase.tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-gray-400">Numero de ticket</p>
                    <p className="font-mono text-sm text-thunder-gold">{ticket.ticketNumber}</p>
                    <div className="mt-1 text-xs text-gray-300">
                      <span className="block">
                        Nom : <span className="font-semibold text-white">{ticket.attendeeLastname}</span>
                      </span>
                      <span className="block">
                        Prenom : <span className="font-semibold text-white">{ticket.attendeeFirstname}</span>
                      </span>
                      <span className="block">
                        Email : <span className="font-semibold text-white">{ticket.attendeeEmail || '-'}</span>
                      </span>
                      {ticket.ticketTypeName && (
                        <span className="block">
                          Type : <span className="font-semibold text-white">{ticket.ticketTypeName}</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Statut: {ticket.statusLabel || 'Valide'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

export default TicketPurchaseCards;