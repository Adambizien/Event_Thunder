import { useEffect, useMemo, useState } from 'react';
import TicketPurchaseCards, {
  type TicketPurchaseCardData,
} from '../../components/TicketPurchaseCards';
import { ticketService } from '../../services/TicketService';
import type { TicketPurchase } from '../../types/TicketTypes';

const ticketPurchaseStatusLabels: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Échoué',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
};

const toTicketPurchaseStatusLabel = (status?: string | null) => {
  if (!status) return '-';
  return ticketPurchaseStatusLabels[status.toLowerCase()] ?? status;
};

const MyTickets = () => {
  const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await ticketService.getMyTickets();
        setPurchases(Array.isArray(data.purchases) ? data.purchases : []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        setPurchases([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const ticketCount = useMemo(
    () => purchases.reduce((sum, purchase) => sum + purchase.tickets.length, 0),
    [purchases],
  );

  const purchaseCards = useMemo<TicketPurchaseCardData[]>(() => {
    return purchases.map((purchase) => ({
      id: purchase.id,
      stripePaymentIntentId: purchase.stripe_payment_intent_id,
      createdAt: purchase.paid_at ?? purchase.created_at,
      totalAmount: Number(purchase.total_amount ?? 0),
      currency: purchase.currency,
      buyerLastname: purchase.buyer?.lastName ?? undefined,
      buyerFirstname: purchase.buyer?.firstName ?? undefined,
      buyerEmail: purchase.buyer?.email ?? null,
      statusLabel: toTicketPurchaseStatusLabel(purchase.status),
      ticketCount: purchase.tickets.length,
      lineItems: purchase.items.map((item) => ({
        id: item.id,
        label: item.ticket_type_label || item.ticket_type?.name || 'Ticket',
        quantity: item.quantity,
        amount: Number(item.unit_price) * item.quantity,
        currency: item.currency,
      })),
      tickets: purchase.tickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        attendeeLastname: ticket.attendee_lastname,
        attendeeFirstname: ticket.attendee_firstname,
        attendeeEmail: ticket.attendee_email,
        statusLabel: ticket.used ? 'Utilisé' : 'Valide',
      })),
    }));
  }, [purchases]);

  const handleOpenInvoice = async (stripePaymentIntentId: string) => {
    if (!stripePaymentIntentId) {
      setError('Facture Stripe indisponible pour cette transaction.');
      return;
    }

    try {
      setOpeningInvoiceId(stripePaymentIntentId);
      setError(null);
      const { hostedInvoiceUrl, invoicePdfUrl, receiptUrl } =
        await ticketService.getPaymentInvoiceLinks(stripePaymentIntentId);
      const invoiceUrl = hostedInvoiceUrl ?? invoicePdfUrl ?? receiptUrl;

      if (!invoiceUrl) {
        setError('Facture Stripe indisponible pour cette transaction.');
        return;
      }

      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Impossible d’ouvrir la facture Stripe.');
    } finally {
      setOpeningInvoiceId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
          <h1 className="text-3xl font-bold text-thunder-gold">Mes tickets</h1>
          <p className="mt-2 text-gray-300">
            Retrouve tous tes billets achetés et leurs numéros.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            {purchases.length} achat{purchases.length > 1 ? 's' : ''} · {ticketCount} ticket
            {ticketCount > 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300 shadow-2xl backdrop-blur-lg">
            <span className="spinner mr-2 align-middle"></span>
            Chargement des tickets...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/50 bg-red-500/20 p-6 text-red-200 shadow-2xl backdrop-blur-lg">
            {error}
          </div>
        ) : purchases.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
            Aucun ticket acheté pour le moment.
          </div>
        ) : (
          <TicketPurchaseCards
            purchases={purchaseCards}
            openingInvoiceId={openingInvoiceId}
            onOpenInvoice={(stripePaymentIntentId) => {
              void handleOpenInvoice(stripePaymentIntentId);
            }}
            emptyMessage="Aucun ticket acheté pour le moment."
            dateLabel="Payé le"
            totalLabel="Montant"
          />
        )}
      </div>
    </div>
  );
};

export default MyTickets;