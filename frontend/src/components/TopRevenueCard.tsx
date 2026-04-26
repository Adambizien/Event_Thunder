type TopRevenueMode = 'subscription' | 'ticket';

type TopRevenueItem = {
  label: string;
  amount: number;
  count: number;
};

type TopRevenueCardProps = {
  mode: TopRevenueMode;
  items: TopRevenueItem[];
  currency: string;
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: (currency || 'EUR').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount);
};

const TopRevenueCard = ({ mode, items, currency }: TopRevenueCardProps) => {
  const cappedItems = items.slice(0, 5);
  const title =
    mode === 'subscription' ? 'Top Plans' : 'Top Types de Ticket';
  const subtitle =
    mode === 'subscription'
      ? 'Classement des ventes encaissées par plan de service.'
      : 'Classement des ventes encaissées par type de ticket.';
  const countLabel = mode === 'subscription' ? 'transaction(s)' : 'ticket(s)';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="text-sm text-gray-400">{subtitle}</p>
      </div>

      {cappedItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
          Aucun paiement encaissé sur cette période.
        </div>
      ) : (
        <div className="space-y-4">
          {cappedItems.map((item) => (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="text-xs text-gray-400">
                    {item.count} {countLabel}
                  </p>
                </div>
                <span className="text-sm font-semibold text-thunder-gold">
                  {formatCurrency(item.amount, currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopRevenueCard;