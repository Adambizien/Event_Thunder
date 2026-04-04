import { useEffect, useMemo, useRef, useState } from 'react';
import AdminPageHeader from '../../components/AdminPageHeader';
import RevenueLineChartCard from '../../components/RevenueLineChartCard';
import TicketPurchaseCards, {
  type TicketPurchaseCardData,
} from '../../components/TicketPurchaseCards';
import TopRevenueCard from '../../components/TopRevenueCard';
import { ticketService } from '../../services/TicketService';
import type { TicketPurchase } from '../../types/TicketTypes';

type PeriodMode = 'month' | 'year' | 'all';
type StatusFilter =
  | 'all'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'pending';

type ChartPoint = {
  label: string;
  value: number;
};

const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' });

const getCurrentMonthValue = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: (currency || 'EUR').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount);
};

const ticketPurchaseStatusLabels: Record<string, string> = {
  pending: 'En attente',
  paid: 'Payé',
  failed: 'Échoué',
  cancelled: 'Annulé',
  refunded: 'Remboursé',
};

const isPaidStatus = (status?: string | null) => {
  const normalized = String(status ?? '').toLowerCase();
  return normalized === 'paid';
};

const toStatusLabel = (status?: string | null) => {
  if (!status) {
    return '-';
  }
  return ticketPurchaseStatusLabels[status.toLowerCase()] ?? status;
};

const parseMonthValue = (value: string) => {
  const [yearRaw, monthRaw] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
    };
  }

  return {
    year,
    monthIndex: month - 1,
  };
};

const getPeriodRange = (
  periodMode: PeriodMode,
  selectedMonth: string,
  selectedYear: number,
) => {
  if (periodMode === 'month') {
    const { year, monthIndex } = parseMonthValue(selectedMonth);
    return {
      start: new Date(year, monthIndex, 1, 0, 0, 0, 0),
      end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
    };
  }

  if (periodMode === 'year') {
    return {
      start: new Date(selectedYear, 0, 1, 0, 0, 0, 0),
      end: new Date(selectedYear, 11, 31, 23, 59, 59, 999),
    };
  }

  return null;
};

const getPeriodDescription = (
  periodMode: PeriodMode,
  selectedMonth: string,
  selectedYear: number,
) => {
  if (periodMode === 'month') {
    const { year, monthIndex } = parseMonthValue(selectedMonth);
    return `${monthFormatter.format(new Date(year, monthIndex, 1))} ${year}`;
  }

  if (periodMode === 'year') {
    return `Année ${selectedYear}`;
  }

  return 'Historique complet';
};

const buildRevenueSeries = (
  purchases: TicketPurchase[],
  periodMode: PeriodMode,
  selectedMonth: string,
  selectedYear: number,
): ChartPoint[] => {
  const paidPurchases = purchases.filter((purchase) => isPaidStatus(purchase.status));

  if (periodMode === 'month') {
    const { year, monthIndex } = parseMonthValue(selectedMonth);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const values = Array.from({ length: daysInMonth }, (_, index) => ({
      label: `${index + 1}`,
      value: 0,
    }));

    paidPurchases.forEach((purchase) => {
      const sourceDate = purchase.paid_at ?? purchase.created_at;
      const date = new Date(sourceDate);
      const dayIndex = date.getDate() - 1;
      if (dayIndex >= 0 && dayIndex < values.length) {
        values[dayIndex].value += Number(purchase.total_amount ?? 0);
      }
    });

    return values;
  }

  if (periodMode === 'year') {
    const values = Array.from({ length: 12 }, (_, index) => ({
      label: monthFormatter.format(new Date(selectedYear, index, 1)),
      value: 0,
    }));

    paidPurchases.forEach((purchase) => {
      const sourceDate = purchase.paid_at ?? purchase.created_at;
      const monthIndex = new Date(sourceDate).getMonth();
      values[monthIndex].value += Number(purchase.total_amount ?? 0);
    });

    return values;
  }

  const yearlyTotals = new Map<number, number>();
  paidPurchases.forEach((purchase) => {
    const sourceDate = purchase.paid_at ?? purchase.created_at;
    const year = new Date(sourceDate).getFullYear();
    yearlyTotals.set(
      year,
      (yearlyTotals.get(year) ?? 0) + Number(purchase.total_amount ?? 0),
    );
  });

  return [...yearlyTotals.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([year, value]) => ({
      label: String(year),
      value,
    }));
};

const StatCard = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-lg">
      <p className="mb-1 text-sm text-gray-300">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-400">{helper}</p>
    </div>
  );
};

const AdminTicketTransactions = () => {
  const monthInputRef = useRef<HTMLInputElement | null>(null);
  const [purchases, setPurchases] = useState<TicketPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('year');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ticketService.getAdminTicketsOverview();
        setPurchases(Array.isArray(data.purchases) ? data.purchases : []);
      } catch {
        setError('Impossible de charger les transactions tickets.');
        setPurchases([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchOverview();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<number>();

    purchases.forEach((purchase) => {
      const source = purchase.paid_at ?? purchase.created_at;
      const year = new Date(source).getFullYear();
      if (!Number.isNaN(year)) {
        years.add(year);
      }
    });

    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }

    return [...years].sort((left, right) => right - left);
  }, [purchases]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const range = useMemo(
    () => getPeriodRange(periodMode, selectedMonth, selectedYear),
    [periodMode, selectedMonth, selectedYear],
  );

  const purchasesInPeriod = useMemo(() => {
    if (!range) {
      return purchases;
    }

    const startTime = range.start.getTime();
    const endTime = range.end.getTime();

    return purchases.filter((purchase) => {
      const source = purchase.paid_at ?? purchase.created_at;
      const timestamp = new Date(source).getTime();
      return timestamp >= startTime && timestamp <= endTime;
    });
  }, [purchases, range]);

  const displayedPurchases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return purchasesInPeriod.filter((purchase) => {
      const normalizedStatus = String(purchase.status ?? '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const fullName = `${purchase.buyer?.firstName ?? ''} ${purchase.buyer?.lastName ?? ''}`.trim();
      const ticketNumbers = purchase.tickets.map((ticket) => ticket.ticket_number).join(' ');
      const haystack = [
        purchase.id,
        purchase.stripe_payment_intent_id,
        purchase.user_id,
        purchase.buyer?.email ?? '',
        fullName,
        ticketNumbers,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [purchasesInPeriod, search, statusFilter]);

  const paidPurchases = useMemo(
    () => displayedPurchases.filter((purchase) => isPaidStatus(purchase.status)),
    [displayedPurchases],
  );

  const totalRevenue = useMemo(
    () => paidPurchases.reduce((sum, purchase) => sum + Number(purchase.total_amount ?? 0), 0),
    [paidPurchases],
  );

  const paidCount = paidPurchases.length;
  const failedCount = displayedPurchases.filter(
    (purchase) => String(purchase.status ?? '').toLowerCase() === 'failed',
  ).length;

  const totalTickets = useMemo(
    () => displayedPurchases.reduce((sum, purchase) => sum + purchase.tickets.length, 0),
    [displayedPurchases],
  );

  const distinctBuyers = useMemo(
    () => new Set(displayedPurchases.map((purchase) => purchase.user_id)).size,
    [displayedPurchases],
  );

  const chartData = useMemo(
    () => buildRevenueSeries(displayedPurchases, periodMode, selectedMonth, selectedYear),
    [displayedPurchases, periodMode, selectedMonth, selectedYear],
  );

  const topTicketTypes = useMemo(() => {
    const totals = new Map<string, { amount: number; quantity: number }>();

    paidPurchases.forEach((purchase) => {
      purchase.items.forEach((item) => {
        const label = item.ticket_type_label || item.ticket_type?.name || 'Ticket';
        const unitPrice = Number(item.unit_price ?? 0);
        const quantity = Number(item.quantity ?? 0);
        const current = totals.get(label) ?? { amount: 0, quantity: 0 };
        current.amount += unitPrice * quantity;
        current.quantity += quantity;
        totals.set(label, current);
      });
    });

    return [...totals.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort((left, right) => right.amount - left.amount);
  }, [paidPurchases]);

  const primaryCurrency =
    displayedPurchases[0]?.currency ?? purchases[0]?.currency ?? 'EUR';

  const purchaseCards = useMemo<TicketPurchaseCardData[]>(() => {
    return displayedPurchases.map((purchase) => ({
      id: purchase.id,
      stripePaymentIntentId: purchase.stripe_payment_intent_id,
      createdAt: purchase.paid_at ?? purchase.created_at,
      totalAmount: Number(purchase.total_amount ?? 0),
      currency: purchase.currency,
      buyerId: purchase.user_id,
      buyerLastname: purchase.buyer?.lastName ?? undefined,
      buyerFirstname: purchase.buyer?.firstName ?? undefined,
      buyerEmail: purchase.buyer?.email ?? null,
      statusLabel: toStatusLabel(purchase.status),
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
  }, [displayedPurchases]);

  const periodDescription = getPeriodDescription(periodMode, selectedMonth, selectedYear);

  const openMonthPicker = () => {
    const input = monthInputRef.current;

    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    input.focus();
    pickerInput.showPicker?.();
  };

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

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
        <span className="spinner mr-2 align-middle"></span>
        Chargement des transactions tickets...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Transactions des tickets"
        subtitle="Consultez l'ensemble des achats de tickets, surveillez les revenus et analysez les performances de vente sur chaque période."
      />

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-white">Filtres d'analyse</h2>
          <p className="text-sm text-gray-400">Période active : {periodDescription}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            Vue
            <select
              value={periodMode}
              onChange={(event) => setPeriodMode(event.target.value as PeriodMode)}
              className="w-full rounded border border-white/20 bg-white/10 px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="month">Mois</option>
              <option value="year">Année</option>
              <option value="all">Total</option>
            </select>
          </label>

          {periodMode === 'month' && (
            <label className="flex flex-col gap-2 text-sm text-gray-300">
              Mois
              <div className="relative">
                <input
                  ref={monthInputRef}
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  onClick={openMonthPicker}
                  className="w-full cursor-pointer rounded border border-white/20 bg-white/10 px-4 py-2 pr-11 text-white focus:border-thunder-gold focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-0"
                  style={{ colorScheme: 'dark' }}
                />
                <button
                  type="button"
                  onClick={openMonthPicker}
                  aria-label="Ouvrir le calendrier du mois"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 transition hover:text-thunder-gold"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3m8-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
                  </svg>
                </button>
              </div>
            </label>
          )}

          {periodMode === 'year' && (
            <label className="flex flex-col gap-2 text-sm text-gray-300">
              Année
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="w-full rounded border border-white/20 bg-white/10 px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            Statut
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="w-full rounded border border-white/20 bg-white/10 px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="all">Tous</option>
              <option value="paid">Payé</option>
              <option value="pending">En attente</option>
              <option value="failed">Échoué</option>
              <option value="cancelled">Annulé</option>
              <option value="refunded">Remboursé</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300 xl:col-span-2">
            Recherche
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Email, acheteur, ticket, Stripe, transaction..."
              className="w-full rounded border border-white/20 bg-white/10 px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            />
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="CA encaissé"
          value={formatCurrency(totalRevenue, primaryCurrency)}
          helper={`Revenus payés sur ${periodDescription.toLowerCase()}`}
        />
        <StatCard
          label="Transactions payées"
          value={String(paidCount)}
          helper="Paiements tickets confirmés"
        />
        <StatCard
          label="Transactions échouées"
          value={String(failedCount)}
          helper="Échecs à surveiller"
        />
        <StatCard
          label="Tickets vendus"
          value={String(totalTickets)}
          helper={`${distinctBuyers} acheteur(s) distinct(s)`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <RevenueLineChartCard
          title="Évolution du chiffre d'affaires des tickets"
          subtitle="Transactions payées agrégées sur la période sélectionnée."
          data={chartData}
          currency={primaryCurrency}
        />
        <TopRevenueCard
          mode="ticket"
          items={topTicketTypes.map((item) => ({
            label: item.label,
            amount: item.amount,
            count: item.quantity,
          }))}
          currency={primaryCurrency}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-lg">
        <div className="flex flex-col gap-2 border-b border-white/10 px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Historique détaillé</h2>
            <p className="text-sm text-gray-400">
              {displayedPurchases.length} transaction(s) affichée(s) sur {purchasesInPeriod.length} pour {periodDescription.toLowerCase()}.
            </p>
          </div>
        </div>

        <div className="p-6">
          <TicketPurchaseCards
            purchases={purchaseCards}
            openingInvoiceId={openingInvoiceId}
            onOpenInvoice={(stripePaymentIntentId) => {
              void handleOpenInvoice(stripePaymentIntentId);
            }}
            emptyMessage="Aucune transaction ticket disponible."
            emptySearchMessage="Aucune transaction ne correspond aux filtres sélectionnés."
          />
        </div>
      </section>
    </div>
  );
};

export default AdminTicketTransactions;