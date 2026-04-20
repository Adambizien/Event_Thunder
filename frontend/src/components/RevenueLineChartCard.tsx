type RevenueLineChartPoint = {
  label: string;
  value: number;
};

type RevenueLineChartCardProps = {
  title: string;
  subtitle: string;
  data: RevenueLineChartPoint[];
  currency: string;
  emptyMessage?: string;
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: (currency || 'EUR').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount);
};

const RevenueLineChartCard = ({
  title,
  subtitle,
  data,
  currency,
  emptyMessage = 'Aucune donnée disponible pour générer le graphique.',
}: RevenueLineChartCardProps) => {
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
    <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-h-[72px]">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>
        <span className="rounded-full border border-thunder-gold/30 bg-thunder-gold/10 px-3 py-1 text-xs font-semibold text-thunder-gold">
          {currency.toUpperCase()}
        </span>
      </div>

      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-64 min-w-[680px] w-full overflow-visible sm:h-72"
            preserveAspectRatio="xMidYMid meet"
          >
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
        </div>
      )}
    </div>
  );
};

export default RevenueLineChartCard;
