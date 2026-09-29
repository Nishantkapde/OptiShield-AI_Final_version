// src/components/RevenueAtRiskCards.tsx
import React, { useState, useMemo, memo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  Target,
  CloudOff,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { useGlobalState } from '../App';
import { useAssets } from '../hooks/useAssets';

// ============================================================
// Types
// ============================================================
type TrendDirection = 'up' | 'down' | 'flat';
type RiskLevel = 'critical' | 'elevated' | 'moderate' | 'secure';
type AccentColor = 'rose' | 'amber' | 'emerald' | 'cyan';

interface TrendBadge {
  label: string;
  direction: TrendDirection;
  isFavorable: boolean;
}

interface RiskEquation {
  formula: string;
  explanation: string;
  variables: readonly { symbol: string; meaning: string }[];
}

interface FinancialMetric {
  id: string;
  label: string;
  context: string;
  value: number;
  unit: 'M' | 'K';
  currency: string;
  trend: TrendBadge;
  riskLevel: RiskLevel;
  accent: AccentColor;
  icon: React.ElementType;
  equation: RiskEquation;
  exposurePct: number;
  budgetCapacity: number;
  /** True when this metric is being suppressed by maintenance mode */
  suppressed?: boolean;
}

interface RiskVisualConfig {
  text: string;
  bg: string;
  border: string;
  bar: string;
  glow: string;
  label: string;
}

// ============================================================
// Risk level visual config — unchanged
// ============================================================
const RISK_VISUALS: Record<RiskLevel, RiskVisualConfig> = {
  critical: {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    bar: 'bg-rose-500',
    glow: 'shadow-rose-500/10',
    label: 'Critical',
  },
  elevated: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    bar: 'bg-amber-500',
    glow: 'shadow-amber-500/10',
    label: 'Elevated',
  },
  moderate: {
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    bar: 'bg-yellow-500',
    glow: 'shadow-yellow-500/10',
    label: 'Moderate',
  },
  secure: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    bar: 'bg-emerald-500',
    glow: 'shadow-emerald-500/10',
    label: 'Secure',
  },
};

// ============================================================
// Static equation definitions — descriptions of the math, not the data
// ============================================================
const EQUATIONS = {
  rar: {
    formula: 'RaR = Σ(Asset Value × Threat Probability)',
    explanation:
      'Aggregate financial exposure across all business-critical revenue streams if current controls fail.',
    variables: [
      { symbol: 'Asset Value', meaning: 'Annualized revenue tied to each asset' },
      { symbol: 'Threat Probability', meaning: 'Likelihood of compromise over 12 months' },
    ],
  },
  ale: {
    formula: 'ALE = Σ(directLoss × LEF)',
    explanation:
      'Sum of Expected Annual Loss across every non-maintenance asset in the portfolio. Direct Pain Point 1 output.',
    variables: [
      { symbol: 'directLoss', meaning: '(downtime × revenue) + (records × cost)' },
      { symbol: 'LEF', meaning: 'epssScore × exposureMultiplier × threatAttempts' },
    ],
  },
  sle: {
    formula: 'SLE = mean(directLoss)',
    explanation:
      'Mean per-incident impact across the portfolio, before annualization. Derived from Pain Point 1 outputs.',
    variables: [
      { symbol: 'directLoss', meaning: 'Pain Point 1 output per asset' },
    ],
  },
  shadow: {
    formula: 'SIT Cost = Σ(Vendor Spend × Breach Probability × Avg Breach Cost)',
    explanation:
      'Financial exposure from unauthorized SaaS and cloud services bypassing corporate security controls.',
    variables: [
      { symbol: 'Vendor Spend', meaning: 'Shadow IT procurement cost' },
      { symbol: 'Breach Probability', meaning: 'Per-vendor compromise likelihood' },
      { symbol: 'Avg Breach Cost', meaning: 'Industry-average incident cost' },
    ],
  },
} as const;

// Calibration constant: RaR is derived from EAL until a revenue model exists
const RAR_MULTIPLIER = 3.13;
// Placeholder until Shadow IT has a backend endpoint
const SHADOW_IT_COST_M = 8.7;

// ============================================================
// Formatters
// ============================================================
const formatCurrency = (value: number, unit: 'M' | 'K', currency: string = '$'): string => {
  if (unit === 'M') return `${currency}${value.toFixed(1)}M`;
  return `${currency}${value.toFixed(0)}K`;
};

const formatFullCurrency = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

// ============================================================
// Sub-component: Trend badge (memoized)
// ============================================================
const TrendBadgeComponent = memo<{ trend: TrendBadge }>(({ trend }) => {
  const { direction, isFavorable, label } = trend;
  const Icon =
    direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  const colorClasses =
    direction === 'flat'
      ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      : isFavorable
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/20';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClasses}`}
      aria-label={`Trend: ${label}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
});
TrendBadgeComponent.displayName = 'TrendBadgeComponent';

// ============================================================
// Sub-component: Equation tooltip (memoized)
// ============================================================
const EquationTooltip = memo<{ equation: RiskEquation; metricLabel: string }>(
  ({ equation, metricLabel }) => {
    const [visible, setVisible] = useState(false);

    return (
      <div
        className="relative inline-flex"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        <button
          type="button"
          className="p-1 rounded-full text-slate-500 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
          aria-label={`Show risk equation for ${metricLabel}`}
          aria-expanded={visible}
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {visible && (
          <div
            role="tooltip"
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 z-50"
          >
            <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 shadow-2xl shadow-black/60">
              <div className="bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1.5 mb-2">
                <p className="text-xs font-mono font-semibold text-cyan-400 text-center">
                  {equation.formula}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
                {equation.explanation}
              </p>
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                {equation.variables.map((v) => (
                  <div key={v.symbol} className="flex items-start gap-2">
                    <span className="text-[10px] font-mono font-bold text-amber-400 shrink-0 min-w-[80px]">
                      {v.symbol}
                    </span>
                    <span className="text-[10px] text-slate-500 leading-relaxed">
                      {v.meaning}
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="w-2 h-2 bg-slate-950 border-r border-b border-slate-700 rotate-45" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
EquationTooltip.displayName = 'EquationTooltip';

// ============================================================
// Sub-component: Exposure bar (memoized, maintenance-aware)
// ============================================================
interface ExposureBarProps {
  pct: number;
  riskLevel: RiskLevel;
  budgetCapacity: number;
  suppressed?: boolean;
}

const ExposureBar = memo<ExposureBarProps>(
  ({ pct, riskLevel, budgetCapacity, suppressed }) => {
    const visuals = RISK_VISUALS[riskLevel];
    const clampedPct = Math.min(100, Math.max(0, pct));
    const displayPct = suppressed ? 0 : clampedPct;

    return (
      <div className="mt-3 pt-3 border-t border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-500 font-medium">
            Exposure vs Capacity
          </span>
          <span className={`text-[10px] font-mono font-bold ${visuals.text}`}>
            {displayPct}%
          </span>
        </div>

        <div className="relative w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ease-out ${visuals.bar}`}
            style={{ width: `${displayPct}%` }}
            role="progressbar"
            aria-valuenow={displayPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Exposure at ${displayPct}% of budget capacity`}
          />
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-slate-600 font-mono">
            Cap: {formatFullCurrency(budgetCapacity)}
          </span>
          {!suppressed && clampedPct >= 80 && (
            <span className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold">
              <AlertTriangle className="w-2.5 h-2.5" />
              Near limit
            </span>
          )}
          {suppressed && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
              <Wrench className="w-2.5 h-2.5" />
              Suppressed
            </span>
          )}
        </div>
      </div>
    );
  }
);
ExposureBar.displayName = 'ExposureBar';

// ============================================================
// Sub-component: Metric card (memoized)
// ============================================================
const MetricCard = memo<{ metric: FinancialMetric }>(({ metric }) => {
  const suppressed = !!metric.suppressed;
  const visuals = RISK_VISUALS[suppressed ? 'secure' : metric.riskLevel];
  const Icon = metric.icon;
  const formattedValue = formatCurrency(
    suppressed ? 0 : metric.value,
    metric.unit,
    metric.currency
  );

  return (
    <div
      className={`group relative bg-slate-900/80 border ${visuals.border} rounded-xl p-4 lg:p-5 transition-all duration-200 hover:border-slate-600 hover:bg-slate-900 shadow-lg ${visuals.glow} hover:shadow-xl`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg ${visuals.bg} border ${visuals.border}`}
            aria-hidden="true"
          >
            <Icon className={`w-4 h-4 ${visuals.text}`} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-300 leading-tight">
              {metric.label}
            </p>
            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
              {metric.context}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {suppressed && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              MAINT
            </span>
          )}
          <span
            className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${visuals.bg} ${visuals.text} border ${visuals.border}`}
          >
            {visuals.label}
          </span>
          <EquationTooltip equation={metric.equation} metricLabel={metric.label} />
        </div>
      </div>

      {/* Value + trend */}
      <div className="flex items-end justify-between gap-3 mb-1">
        <div className="flex items-baseline gap-1">
          <span
            className={`text-2xl lg:text-3xl font-bold ${visuals.text} tabular-nums`}
          >
            {formattedValue}
          </span>
          <DollarSign className="w-4 h-4 text-slate-600 mb-1" aria-hidden="true" />
        </div>
        {!suppressed && <TrendBadgeComponent trend={metric.trend} />}
      </div>

      <ExposureBar
        pct={metric.exposurePct}
        riskLevel={suppressed ? 'secure' : metric.riskLevel}
        budgetCapacity={metric.budgetCapacity}
        suppressed={suppressed}
      />
    </div>
  );
});
MetricCard.displayName = 'MetricCard';

// ============================================================
// Main component
// ============================================================
export default function RevenueAtRiskCards(): JSX.Element {
  const [activeFilter, setActiveFilter] = useState<'all' | RiskLevel>('all');
  const { maintenanceActive, plannedOperationalCost, maintenanceTicketId } =
    useGlobalState();
  const { data } = useAssets();

  // ==========================================================
  // Derive all metrics from live asset list + Pain Point 1 output
  // ==========================================================
  const metrics: FinancialMetric[] = useMemo(() => {
    const t = data?.totals;
    const nonMaintCount = t ? Math.max(1, t.count - t.inMaintenance) : 1;

    // Backend totals are in USD → convert to $M
    const totalEalM = t ? t.totalEalUsd / 1_000_000 : 0;
    const totalDirectLossM = t ? t.totalDirectLossUsd / 1_000_000 : 0;
    const meanDirectLossM = totalDirectLossM / nonMaintCount;

    // Derived RaR (until a revenue model exists)
    const rarM = totalEalM * RAR_MULTIPLIER;

    // All assets under maintenance? Then EAL is fully suppressed.
    const allSuppressed = !!t && t.count > 0 && t.inMaintenance === t.count;

    // ALE card risk level scales with magnitude
    const aleRiskLevel: RiskLevel =
      totalEalM > 10 ? 'critical' : totalEalM > 5 ? 'elevated' : 'moderate';

    // RaR card risk level scales with magnitude
    const rarRiskLevel: RiskLevel =
      rarM > 30 ? 'critical' : rarM > 15 ? 'elevated' : 'moderate';

    return [
      {
        id: 'rar',
        label: 'Total Revenue at Risk',
        context: t
          ? `${t.count} assets in portfolio`
          : '12-month forward projection',
        value: allSuppressed ? 0 : rarM,
        unit: 'M',
        currency: '$',
        trend: { label: '+14.2% vs Q3', direction: 'up', isFavorable: false },
        riskLevel: rarRiskLevel,
        accent: 'rose',
        icon: TrendingUp,
        equation: EQUATIONS.rar,
        exposurePct: 82,
        budgetCapacity: 59_000_000,
        suppressed: allSuppressed,
      },
      {
        id: 'ale',
        label: 'Annualized Loss Expectancy',
        context: t
          ? `${t.inMaintenance}/${t.count} in maintenance`
          : 'Weighted across portfolio',
        value: totalEalM,
        unit: 'M',
        currency: '$',
        trend: { label: '-8.5% mitigation', direction: 'down', isFavorable: true },
        riskLevel: aleRiskLevel,
        accent: 'amber',
        icon: ShieldAlert,
        equation: EQUATIONS.ale,
        exposurePct: 58,
        budgetCapacity: 26_700_000,
        suppressed: allSuppressed,
      },
      {
        id: 'sle',
        label: 'Mean Direct Loss',
        context: t ? `Across ${nonMaintCount} active assets` : 'Median per-incident impact',
        value: meanDirectLossM,
        unit: 'M',
        currency: '$',
        trend: { label: '+3.1% QoQ', direction: 'up', isFavorable: false },
        riskLevel: 'moderate',
        accent: 'amber',
        icon: Target,
        equation: EQUATIONS.sle,
        exposurePct: 34,
        budgetCapacity: 7_100_000,
        suppressed: allSuppressed,
      },
      {
        id: 'shadow-it',
        label: 'Unmitigated Shadow IT Cost',
        context: '42 unsanctioned assets detected',
        value: SHADOW_IT_COST_M,
        unit: 'M',
        currency: '$',
        trend: { label: '+22.4% new assets', direction: 'up', isFavorable: false },
        riskLevel: 'critical',
        accent: 'rose',
        icon: CloudOff,
        equation: EQUATIONS.shadow,
        exposurePct: 94,
        budgetCapacity: 9_250_000,
      },
    ];
  }, [data]);

  // ==========================================================
  // Filter counts — precomputed once per metrics change
  // ==========================================================
  const countsByLevel = useMemo(() => {
    const counts: Record<'all' | RiskLevel, number> = {
      all: metrics.length,
      critical: 0,
      elevated: 0,
      moderate: 0,
      secure: 0,
    };
    for (const m of metrics) counts[m.riskLevel]++;
    return counts;
  }, [metrics]);

  // ==========================================================
  // Aggregate summary
  // ==========================================================
  const summary = useMemo(() => {
    let totalRisk = 0;
    let criticalCount = 0;
    let exposureSum = 0;

    for (const m of metrics) {
      const displayValue = m.suppressed ? 0 : m.value;
      totalRisk += displayValue * (m.unit === 'M' ? 1_000_000 : 1_000);
      if (m.riskLevel === 'critical') criticalCount++;
      exposureSum += m.suppressed ? 0 : m.exposurePct;
    }

    return {
      totalRisk,
      criticalCount,
      avgExposure: Math.round(exposureSum / metrics.length),
    };
  }, [metrics]);

  const filteredMetrics = useMemo(() => {
    if (activeFilter === 'all') return metrics;
    return metrics.filter((m) => m.riskLevel === activeFilter);
  }, [metrics, activeFilter]);

  const filterOptions: Array<{ id: 'all' | RiskLevel; label: string }> = [
    { id: 'all', label: 'All Metrics' },
    { id: 'critical', label: 'Critical' },
    { id: 'elevated', label: 'Elevated' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'secure', label: 'Secure' },
  ];

  // Maintenance banner shows if any asset is in maintenance OR the demo
  // toggle is flipped.
  const maintCount = data?.totals.inMaintenance ?? 0;
  const showMaintBanner = maintenanceActive || maintCount > 0;
  const allSuppressed =
    !!data && data.totals.count > 0 && data.totals.inMaintenance === data.totals.count;

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="revenue-at-risk-heading"
    >
      {/* ============================================================ */}
      {/* Maintenance banner */}
      {/* ============================================================ */}
      {showMaintBanner && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-amber-400">
              {allSuppressed
                ? 'All Assets in Scheduled Maintenance — Full EAL Suppression'
                : maintCount > 0
                ? `${maintCount} asset${maintCount > 1 ? 's' : ''} in Scheduled Maintenance — EAL suppressed`
                : 'Scheduled Maintenance Active — Unplanned Cyber Risk Suppressed'}
            </p>
            <p className="text-[10px] text-amber-400/70 font-mono mt-0.5">
              {maintenanceTicketId ?? 'see asset tickets'} · ref SEBI-CSCRF/ISO-27001:A.12.1.4
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Section header */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
            <DollarSign className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2
              id="revenue-at-risk-heading"
              className="text-base lg:text-lg font-semibold text-white"
            >
              Revenue at Risk Summary
            </h2>
            <p className="text-xs text-slate-400">
              {summary.criticalCount} critical ·{' '}
              <span className="text-rose-400 font-semibold">
                {formatFullCurrency(summary.totalRisk)}
              </span>{' '}
              aggregate exposure · {summary.avgExposure}% avg utilization
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div
          className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg overflow-x-auto"
          role="tablist"
          aria-label="Filter metrics by risk level"
        >
          {filterOptions.map((opt) => {
            const isActive = activeFilter === opt.id;
            const count = countsByLevel[opt.id];
            return (
              <button
                key={opt.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(opt.id)}
                disabled={count === 0}
                className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm'
                    : count === 0
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {opt.label}
                {opt.id !== 'all' && (
                  <span className="ml-1 text-slate-500 font-mono">({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Metric cards grid */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Empty state */}
      {filteredMetrics.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-800 rounded-lg">
          <ShieldAlert className="w-8 h-8 text-slate-700 mb-2" />
          <p className="text-sm text-slate-500">No metrics match this filter</p>
          <button
            onClick={() => setActiveFilter('all')}
            className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Reset filter
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* Footer strip — expands to 5 columns when maintenance active */}
      {/* ============================================================ */}
      <div
        className={`mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 ${
          showMaintBanner ? 'sm:grid-cols-5' : 'sm:grid-cols-4'
        } gap-3`}
      >
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Portfolio EAL
          </p>
          <p
            className={`text-sm font-bold tabular-nums mt-0.5 ${
              showMaintBanner ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {formatFullCurrency(data?.totals.totalEalUsd ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Portfolio Direct Loss
          </p>
          <p className="text-sm font-bold text-white tabular-nums mt-0.5">
            {formatFullCurrency(data?.totals.totalDirectLossUsd ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Shadow IT Losses
          </p>
          <p className="text-sm font-bold text-rose-400 tabular-nums mt-0.5">
            ${SHADOW_IT_COST_M.toFixed(1)}M
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Suppressed Alerts
          </p>
          <p className="text-sm font-bold text-amber-400 tabular-nums mt-0.5">
            {data?.totals.suppressedAlertCount ?? 0}
          </p>
        </div>
        {showMaintBanner && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
              Planned Ops Cost
            </p>
            <p className="text-sm font-bold text-amber-400 tabular-nums mt-0.5">
              {formatFullCurrency(
                data?.totals.totalPlannedOperationalCostUsd ?? plannedOperationalCost
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}