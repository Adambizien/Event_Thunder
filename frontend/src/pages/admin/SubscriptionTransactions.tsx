import { useEffect, useMemo, useRef, useState } from 'react';
import { planService } from '../../services/PlanService';
import { subscriptionService } from '../../services/SubscriptionService';
import { userService } from '../../services/UserService';
import AdminPageHeader from '../../components/AdminPageHeader';
import type { User } from '../../types/AuthTypes';
import type { PaymentHistoryType, SubscriptionType } from '../../types/SubscriptionTypes';

type PeriodMode = 'month' | 'year' | 'all';
type StatusFilter = 'all' | 'paid' | 'failed';
type PlanFilter = 'all' | string;

type PaymentRow = PaymentHistoryType & {
  subscription: SubscriptionType;
  user: User | null;
  effectiveDate: string;
  timestamp: number;
};

type ChartPoint = {
  label: string;
  value: number;
};

const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const weekdayDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
});

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

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
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

const getPeriodDescription = (periodMode: PeriodMode, selectedMonth: string, selectedYear: number) => {
  if (periodMode === 'month') {
    const { year, monthIndex } = parseMonthValue(selectedMonth);
    return `${monthFormatter.format(new Date(year, monthIndex, 1))} ${year}`;
  }

  if (periodMode === 'year') {
    return `Année ${selectedYear}`;
  }

  return 'Historique complet';
};

const getPeriodRange = (periodMode: PeriodMode, selectedMonth: string, selectedYear: number) => {
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

const sumAmount = (payments: PaymentRow[]) => {
  return payments.reduce((total, payment) => total + payment.amount, 0);
};

const buildRevenueSeries = (
  payments: PaymentRow[],
  periodMode: PeriodMode,
  selectedMonth: string,
  selectedYear: number,
): ChartPoint[] => {
  if (periodMode === 'month') {
    const { year, monthIndex } = parseMonthValue(selectedMonth);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const values = Array.from({ length: daysInMonth }, (_, index) => ({
      label: `${index + 1}`,
      value: 0,
    }));

    payments.forEach((payment) => {
      const date = new Date(payment.timestamp);
      const dayIndex = date.getDate() - 1;
      if (dayIndex >= 0 && dayIndex < values.length) {
        values[dayIndex].value += payment.amount;
      }
    });

    return values;
  }

  if (periodMode === 'year') {
    const values = Array.from({ length: 12 }, (_, index) => ({
      label: monthFormatter.format(new Date(selectedYear, index, 1)),
      value: 0,
    }));

    payments.forEach((payment) => {
      const monthIndex = new Date(payment.timestamp).getMonth();
      values[monthIndex].value += payment.amount;
    });

    return values;
  }

  const yearlyTotals = new Map<number, number>();
  payments.forEach((payment) => {
    const year = new Date(payment.timestamp).getFullYear();
    yearlyTotals.set(year, (yearlyTotals.get(year) ?? 0) + payment.amount);
  });

  const years = [...yearlyTotals.keys()].sort((left, right) => left - right);
  return years.map((year) => ({
    label: String(year),
    value: yearlyTotals.get(year) ?? 0,
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
      <p className="text-gray-300 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-400">{helper}</p>
    </div>
  );
};

const RevenueLineChart = ({ data, currency }: { data: ChartPoint[]; currency: string }) => {
  const width = 760;
  const height = 300;
  const padding = 26;
  const bottomAxisSpace = 38;
  const maxValue = Math.max(...data.map((point) => point.value), 0, 1);
  const chartBottomY = height - padding - bottomAxisSpace;

  const points = data.map((point, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = chartBottomY - (point.value / maxValue) * (height - padding * 2 - bottomAxisSpace);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${chartBottomY}`,
    ...points,
    `${width - padding},${chartBottomY}`,
  ].join(' ');

  const tickStep = Math.max(1, Math.ceil(data.length / 6));
  const visibleTicks = data
    .map((point, index) => ({
      ...point,
      index,
      x: padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1),
    }))
    .filter(
      (point) =>
        point.index === 0 || point.index === data.length - 1 || point.index % tickStep === 0,
    );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Évolution du chiffre d’affaires</h2>
          <p className="text-sm text-gray-400">Transactions payées agrégées sur la période sélectionnée.</p>
        </div>
        <span className="rounded-full border border-thunder-gold/30 bg-thunder-gold/10 px-3 py-1 text-xs font-semibold text-thunder-gold">
          {currency.toUpperCase()}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
          Aucune donnée disponible pour générer le graphique.
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full overflow-visible">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartBottomY - ratio * (height - padding * 2 - bottomAxisSpace);
              const value = maxValue * ratio;

              return (
                <g key={ratio}>
                  <line
                    x1={padding}
                    x2={width - padding}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.08)"
                    strokeDasharray="4 6"
                  />
                  <text
                    x={padding}
                    y={y - 6}
                    fill="rgba(255,255,255,0.45)"
                    fontSize="10"
                  >
                    {formatCurrency(value, currency)}
                  </text>
                </g>
              );
            })}

            <line
              x1={padding}
              x2={width - padding}
              y1={chartBottomY}
              y2={chartBottomY}
              stroke="rgba(255,255,255,0.1)"
            />

            <polygon points={areaPoints} fill="rgba(255, 184, 0, 0.18)" />
            <polyline
              points={points.join(' ')}
              fill="none"
              stroke="#f4b400"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {data.map((point, index) => {
              const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
              const y = chartBottomY - (point.value / maxValue) * (height - padding * 2 - bottomAxisSpace);

              return (
                <g key={`${point.label}-${index}`}>
                  <circle cx={x} cy={y} r="4" fill="#f4b400" />
                  <title>{`${point.label} · ${formatCurrency(point.value, currency)}`}</title>
                </g>
              );
            })}

            {visibleTicks.map((point) => (
              <text
                key={point.label}
                x={point.x}
                y={height - 8}
                fill="rgba(255,255,255,0.65)"
                fontSize="12"
                textAnchor="middle"
              >
                {point.label}
              </text>
            ))}
          </svg>
        </>
      )}
    </div>
  );
};

const PlanRevenueBars = ({
  items,
  currency,
}: {
  items: Array<{ label: string; amount: number; transactions: number }>;
  currency: string;
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-white">Répartition par plan</h2>
        <p className="text-sm text-gray-400">Plans les plus performants sur la période.</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
          Aucun paiement encaissé sur cette période.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.transactions} transaction(s)</p>
                </div>
                <span className="text-sm font-semibold text-thunder-gold">
                  {formatCurrency(item.amount, currency)}
                </span>
              </div>

              {/* Progress bar removed per request */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminSubscriptionTransactions = () => {
  const monthInputRef = useRef<HTMLInputElement | null>(null);
  const [availablePlanNames, setAvailablePlanNames] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingInvoiceId, setOpeningInvoiceId] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('year');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        setError(null);

        const [usersData, subscriptionsData, plansData] = await Promise.all([
          userService.fetchUsers(),
          subscriptionService.getAdminSubscriptionsOverview(),
          planService.fetchPlans(),
        ]);

        setUsers(usersData);
        setSubscriptions(subscriptionsData);
        setAvailablePlanNames(
          [...new Set(plansData.map((plan) => plan.name).filter((name) => name.trim().length > 0))].sort(
            (left, right) => left.localeCompare(right, 'fr'),
          ),
        );
      } catch {
        setError('Impossible de charger les transactions d’abonnement.');
        setAvailablePlanNames([]);
        setUsers([]);
        setSubscriptions([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchOverview();
  }, []);

  const userById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]));
  }, [users]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();

    subscriptions.forEach((subscription) => {
      (subscription.payments ?? []).forEach((payment) => {
        const source = payment.paidAt ?? payment.createdAt;
        const year = new Date(source).getFullYear();
        if (!Number.isNaN(year)) {
          years.add(year);
        }
      });
    });

    if (years.size === 0) {
      years.add(new Date().getFullYear());
    }

    return [...years].sort((left, right) => right - left);
  }, [subscriptions]);

  useEffect(() => {
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const payments = useMemo<PaymentRow[]>(() => {
    return subscriptions
      .flatMap((subscription) =>
        (subscription.payments ?? []).map((payment) => {
          const effectiveDate = payment.paidAt ?? payment.createdAt;
          return {
            ...payment,
            subscription,
            user: userById.get(subscription.userId) ?? null,
            effectiveDate,
            timestamp: new Date(effectiveDate).getTime(),
          };
        }),
      )
      .filter((payment) => !Number.isNaN(payment.timestamp))
      .sort((left, right) => right.timestamp - left.timestamp);
  }, [subscriptions, userById]);

  const planOptions = useMemo(() => {
    return [
      ...new Set([
        ...availablePlanNames,
        ...subscriptions.map((subscription) => subscription.plan.name),
      ]),
    ].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [availablePlanNames, subscriptions]);

  const range = useMemo(
    () => getPeriodRange(periodMode, selectedMonth, selectedYear),
    [periodMode, selectedMonth, selectedYear],
  );

  const paymentsInPeriod = useMemo(() => {
    if (!range) {
      return payments;
    }

    const startTime = range.start.getTime();
    const endTime = range.end.getTime();
    return payments.filter((payment) => payment.timestamp >= startTime && payment.timestamp <= endTime);
  }, [payments, range]);

  const displayedPayments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return paymentsInPeriod.filter((payment) => {
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      const matchesPlan = planFilter === 'all' || payment.subscription.plan.name === planFilter;

      if (!matchesStatus || !matchesPlan) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const userName = `${payment.user?.firstName ?? ''} ${payment.user?.lastName ?? ''}`.trim();
      const haystack = [
        payment.user?.email ?? '',
        userName,
        payment.subscription.plan.name,
        payment.stripeInvoiceId,
        payment.subscription.stripeSubscriptionId,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [paymentsInPeriod, planFilter, search, statusFilter]);

  const displayedPaidPayments = useMemo(
    () => displayedPayments.filter((payment) => payment.status === 'paid'),
    [displayedPayments],
  );

  const totalRevenue = useMemo(() => sumAmount(displayedPaidPayments), [displayedPaidPayments]);
  const paidCount = displayedPaidPayments.length;
  const failedCount = displayedPayments.filter((payment) => payment.status === 'failed').length;
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === 'active').length;

  const chartData = useMemo(
    () => buildRevenueSeries(displayedPaidPayments, periodMode, selectedMonth, selectedYear),
    [displayedPaidPayments, periodMode, selectedMonth, selectedYear],
  );

  const planRevenue = useMemo(() => {
    const totals = new Map<string, { amount: number; transactions: number }>();

    displayedPaidPayments.forEach((payment) => {
      const key = payment.subscription.plan.name;
      const current = totals.get(key) ?? { amount: 0, transactions: 0 };
      current.amount += payment.amount;
      current.transactions += 1;
      totals.set(key, current);
    });

    return [...totals.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 6);
  }, [displayedPaidPayments]);

  const primaryCurrency =
    displayedPaidPayments[0]?.currency ?? displayedPayments[0]?.currency ?? 'EUR';
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

  const handleOpenInvoice = async (payment: PaymentRow) => {
    if (!payment.stripeInvoiceId) {
      setError('Facture Stripe indisponible pour cette transaction.');
      return;
    }

    try {
      setOpeningInvoiceId(payment.id);
      setError(null);

      const { hostedInvoiceUrl, invoicePdfUrl } = await subscriptionService.getInvoiceLinks(
        payment.stripeInvoiceId,
        payment.subscription.userId,
      );
      const invoiceUrl = hostedInvoiceUrl ?? invoicePdfUrl;

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
        Chargement des transactions d’abonnement...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Transactions des abonnements"
        subtitle="Suivez toutes les transactions liées aux abonnements, analysez les revenus par mois, année ou historique complet, et consultez rapidement les tendances utiles pour vos statistiques."
      />

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-white">Filtres d’analyse</h2>
          <p className="text-sm text-gray-400">Période active : {periodDescription}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm text-gray-300">
            Vue
            <select
              value={periodMode}
              onChange={(event) => setPeriodMode(event.target.value as PeriodMode)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
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
                  className="w-full cursor-pointer bg-white/10 border border-white/20 rounded px-4 py-2 pr-11 text-white focus:border-thunder-gold focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-0"
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
                className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
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
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="all">Tous</option>
              <option value="paid">Payées</option>
              <option value="failed">Échouées</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            Plan
            <select
              value={planFilter}
              onChange={(event) => setPlanFilter(event.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            >
              <option value="all">Tous les plans</option>
              {planOptions.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-gray-300">
            Recherche
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Email, plan, facture..."
              className="w-full bg-white/10 border border-white/20 rounded px-4 py-2 text-white focus:border-thunder-gold focus:outline-none"
            />
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="CA encaissé"
          value={formatCurrency(totalRevenue, primaryCurrency)}
          helper={`Revenus payés sur ${periodDescription.toLowerCase()}`}
        />
        <StatCard
          label="Transactions payées"
          value={String(paidCount)}
          helper="Paiements confirmés Stripe"
        />
        <StatCard
          label="Transactions échouées"
          value={String(failedCount)}
          helper="À surveiller pour la relance"
        />
        <StatCard
          label="Abonnements actifs"
          value={String(activeSubscriptions)}
          helper="Abonnements actuellement en cours"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <RevenueLineChart data={chartData} currency={primaryCurrency} />
        <PlanRevenueBars items={planRevenue} currency={primaryCurrency} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-2xl backdrop-blur-lg">
        <div className="px-6 py-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white">Historique détaillé</h2>
            <p className="text-sm text-gray-400">
              {displayedPayments.length} transaction(s) affichée(s) sur {paymentsInPeriod.length} pour {periodDescription.toLowerCase()}.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
            Dernier point encaissé :{' '}
            <span className="font-semibold text-white">
              {displayedPaidPayments[0]
                ? weekdayDateFormatter.format(new Date(displayedPaidPayments[0].timestamp))
                : '—'}
            </span>
          </div>
        </div>

        {displayedPayments.length === 0 ? (
          <div className="text-center py-12">
            Aucune transaction ne correspond aux filtres sélectionnés.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Client</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Plan</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Montant</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Statut</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Référence</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Facture</th>
                </tr>
              </thead>
              <tbody>
                {displayedPayments.map((payment) => {
                  const fullName = `${payment.user?.firstName ?? ''} ${payment.user?.lastName ?? ''}`.trim();

                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{formatDateTime(payment.effectiveDate)}</div>
                        <div className="text-xs text-gray-500">Souscription #{payment.subscription.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{fullName || 'Utilisateur inconnu'}</div>
                        <div className="text-xs text-gray-400">{payment.user?.email ?? payment.subscription.userId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{payment.subscription.plan.name}</div>
                        <div className="text-xs text-gray-400">
                          {payment.subscription.plan.interval === 'yearly' ? 'Annuel' : 'Mensuel'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-thunder-gold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            payment.status === 'paid'
                              ? 'bg-green-500/25 text-green-300'
                              : 'bg-red-500/25 text-red-300'
                          }`}
                        >
                          {payment.status === 'paid' ? 'Payée' : 'Échouée'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[180px] truncate text-xs text-gray-400">
                          {payment.stripeInvoiceId || 'Aucune'}
                        </div>
                        <div className="max-w-[180px] truncate text-xs text-gray-500">
                          {payment.subscription.stripeSubscriptionId}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => void handleOpenInvoice(payment)}
                          disabled={!payment.stripeInvoiceId || openingInvoiceId === payment.id}
                          className="inline-flex items-center justify-center rounded border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-gray-500"
                        >
                          {openingInvoiceId === payment.id ? 'Ouverture...' : 'Voir la facture'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminSubscriptionTransactions;