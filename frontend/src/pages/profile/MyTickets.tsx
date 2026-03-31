import { useEffect, useMemo, useState } from 'react';
import { ticketService } from '../../services/TicketService';
import type { TicketPurchase } from '../../types/TicketTypes';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('fr-FR');
};

const formatCurrency = (amount: number, currency: string) => {
  const normalized = currency === 'USD' ? 'USD' : 'EUR';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: normalized,
  }).format(amount);
};

const MyTickets = () => {
  const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <div className="space-y-6">
            {purchases.map((purchase) => (
              <section
                key={purchase.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-lg"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm text-gray-400">Achat</p>
                    <p className="text-white font-semibold">{purchase.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Montant</p>
                    <p className="text-thunder-gold font-semibold">
                      {formatCurrency(Number(purchase.total_amount ?? 0), purchase.currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Payé le</p>
                    <p className="text-white">{formatDate(purchase.paid_at ?? purchase.created_at)}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <h3 className="text-white font-semibold mb-2">Lignes d'achat</h3>
                    <ul className="space-y-2 text-sm text-gray-200">
                      {purchase.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-3">
                          <span>
                            {item.ticket_type_label || item.ticket_type?.name || 'Ticket'} x{item.quantity}
                          </span>
                          <span>
                            {formatCurrency(Number(item.unit_price) * item.quantity, item.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <h3 className="text-white font-semibold mb-2">Billets générés</h3>
                    <div className="space-y-2">
                      {purchase.tickets.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="rounded-lg border border-white/10 bg-white/5 p-3"
                        >
                          <p className="text-xs text-gray-400">Numéro de ticket</p>
                          <p className="font-mono text-thunder-gold text-sm">{ticket.ticket_number}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            Statut: {ticket.used ? 'Utilisé' : 'Valide'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;