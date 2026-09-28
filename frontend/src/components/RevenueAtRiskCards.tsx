// src/components/RevenueAtRiskCards.tsx
import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';

// ============================================================
// TypeScript Interfaces
// ============================================================

type TrendDirection = 'up' | 'down' | 'flat';
type RiskLevel = 'critical' | 'elevated' | 'moderate' | 'secure';
type AccentColor = 'rose' | 'amber' | 'emerald' | 'cyan';

interface TrendBadge {
  /** Human-readable delta label, e.g. "+14.2% vs Q3" */
  label: string;
  /** Direction of change */
  direction: TrendDirection;
  /** Whether this change increases (bad) or decreases (good) risk */
  isFavorable: boolean;
}

interface RiskEquation {
  /** Formula string, e.g. "ALE = SLE × ARO" */
  formula: string;
  /** Plain-language explanation */
  explanation: string;
  /** Variable definitions */
  variables: Array<{ symbol: string; meaning: string }>;
}

interface FinancialMetric {
  id: string;
  label: string;
  /** Sub-label / context */
  context: string;
  /** Numeric value */
  value: number;
  /** Display unit, e.g. "M", "K" */
  unit: string;
  /** Currency symbol */
  currency: string;
  /** Trend badge */
  trend: TrendBadge;
  /** Risk severity classification */
  riskLevel: RiskLevel;
  /** Accent color for the card theme */
  accent: AccentColor;
  /** Lucide icon component */
  icon: React.ElementType;
  /** Risk equation tooltip content */
  equation: RiskEquation;
  /** Current exposure as a percentage of total budget capacity (0-100) */
  exposurePct: number;
  /** Absolute budget capacity in USD for this metric */
  budgetCapacity: number;
}

// ============================================================
// Risk Level → Visual Config Map
// ============================================================

interface RiskVisualConfig {
  text: string;
  bg: string;
  border: string;
  bar: string;
  glow: string;
  label: string;
}

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
// Mock Data (self-contained)
// ============================================================

const FINANCIAL_METRICS: FinancialMetric[] = [
  {
    id: 'rar',
    label: 'Total Revenue at Risk',
    context: '12-month forward projection',
    value: 48.5,
    unit: 'M',
    currency: '$',
    trend: {
      label: '+14.2% vs Q3',
      direction: 'up',
      isFavorable: false,
    },
    riskLevel: 'critical',
    accent: 'rose',
    icon: TrendingUp,
    equation: {
      formula: 'RaR = Σ(Asset Value × Threat Probability)',
      explanation:
        'Aggregate financial exposure across all business-critical revenue streams if current controls fail.',
      variables: [
        { symbol: 'Asset Value', meaning: 'Annualized revenue tied to each asset' },
        { symbol: 'Threat Probability', meaning: 'Likelihood of compromise over 12 months' },
      ],
    },
    exposurePct: 82,
    budgetCapacity: 59_000_000,
  },
  {
    id: 'ale',
    label: 'Annualized Loss Expectancy',
    context: 'Weighted by ARO across portfolio',
    value: 15.5,
    unit: 'M',
    currency: '$',
    trend: {
      label: '-8.5% mitigation',
      direction: 'down',
      isFavorable: true,
    },
    riskLevel: 'elevated',
    accent: 'amber',
    icon: ShieldAlert,
    equation: {
      formula: 'ALE = SLE × ARO',
      explanation:
        'Expected annual financial loss from a given risk, combining the impact of a single event with how often it occurs.',
      variables: [
        { symbol: 'SLE', meaning: 'Single Loss Expectancy — cost of one incident' },
        { symbol: 'ARO', meaning: 'Annualized Rate of Occurrence — events per year' },
      ],
    },
    exposurePct: 58,
    budgetCapacity: 26_700_000,
  },
  {
    id: 'sle',
    label: 'Single Loss Expectancy',
    context: 'Median per-incident impact',
    value: 2.4,
    unit: 'M',
    currency: '$',
    trend: {
      label: '+3.1% QoQ',
      direction: 'up',
      isFavorable: false,
    },
    riskLevel: 'moderate',
    accent: 'amber',
    icon: Target,
    equation: {
      formula: 'SLE = Asset Value × Exposure Factor',
      explanation:
        'The monetary cost of a single successful attack against a specific asset, before annualization.',
      variables: [
        { symbol: 'Asset Value', meaning: 'Total worth of the targeted asset' },
        { symbol: 'Exposure Factor', meaning: 'Fraction of asset value lost (0-1)' },
      ],
    },
    exposurePct: 34,
    budgetCapacity: 7_100_000,
  },
  {
    id: 'shadow-it',
    label: 'Unmitigated Shadow IT Cost',
    context: '42 unsanctioned assets detected',
    value: 8.7,
    unit: 'M',
    currency: '$',
    trend: {
      label: '+22.4% new assets',
      direction: 'up',
      isFavorable: false,
    },
    riskLevel: 'critical',
    accent: 'rose',
    icon: CloudOff,
    equation: {
      formula: 'SIT Cost = Σ(Vendor Spend × Breach Probability × Avg Breach Cost)',
      explanation:
        'Financial exposure from unauthorized SaaS and cloud services bypassing corporate security controls.',
      variables: [
        { symbol: 'Vendor Spend', meaning: 'Shadow IT procurement cost' },
        { symbol: 'Breach Probability', meaning: 'Per-vendor compromise likelihood' },
        { symbol: 'Avg Breach Cost', meaning: 'Industry-average incident cost' },
      ],
    },
    exposurePct: 94,
    budgetCapacity: 9_250_000,
  },
];

// ============================================================
// Helper: Currency Formatter
// ============================================================

const formatCurrency = (
  value: number,
  unit: string,
  currency: string = '$'
): string => {
  if (unit === 'M') return `${currency}${value.toFixed(1)}M`;
  if (unit === 'K') return `${currency}${value.toFixed(0)}K`;
  if (unit === 'B') return `${currency}${value.toFixed(2)}B`;
  return `${currency}${value.toLocaleString()}`;
};

const formatFullCurrency = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

// ============================================================
// Sub-Component: Trend Badge
// ============================================================

const TrendBadgeComponent: React.FC<{ trend: TrendBadge }> = ({ trend }) => {
  const { direction, isFavorable, label } = trend;

  const Icon =
    direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  // Color logic: favorable → emerald, unfavorable → rose, flat → slate
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
};

// ============================================================
// Sub-Component: Equation Tooltip
// ============================================================

interface EquationTooltipProps {
  equation: RiskEquation;
  metricLabel: string;
}

const EquationTooltip: React.FC<EquationTooltipProps> = ({ equation, metricLabel }) => {
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
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 z-50 animate-in fade-in slide-in-from-bottom-1 duration-150"
        >
          <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 shadow-2xl shadow-black/60">
            {/* Formula */}
            <div className="bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1.5 mb-2">
              <p className="text-xs font-mono font-semibold text-cyan-400 text-center">
                {equation.formula}
              </p>
            </div>

            {/* Explanation */}
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
              {equation.explanation}
            </p>

            {/* Variables */}
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

            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="w-2 h-2 bg-slate-950 border-r border-b border-slate-700 rotate-45" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Sub-Component: Exposure Progress Bar
// ============================================================

interface ExposureBarProps {
  pct: number;
  riskLevel: RiskLevel;
  budgetCapacity: number;
}

const ExposureBar: React.FC<ExposureBarProps> = ({ pct, riskLevel, budgetCapacity }) => {
  const visuals = RISK_VISUALS[riskLevel];
  const clampedPct = Math.min(100, Math.max(0, pct));

  return (
    <div className="mt-3 pt-3 border-t border-slate-800">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-slate-500 font-medium">
          Exposure vs Capacity
        </span>
        <span className={`text-[10px] font-mono font-bold ${visuals.text}`}>
          {clampedPct}%
        </span>
      </div>

      <div className="relative w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-700 ease-out ${visuals.bar}`}
          style={{ width: `${clampedPct}%` }}
          role="progressbar"
          aria-valuenow={clampedPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Exposure at ${clampedPct}% of budget capacity`}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-slate-600 font-mono">
          Cap: {formatFullCurrency(budgetCapacity)}
        </span>
        {clampedPct >= 80 && (
          <span className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold">
            <AlertTriangle className="w-2.5 h-2.5" />
            Near limit
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Sub-Component: Single Metric Card
// ============================================================

const MetricCard: React.FC<{ metric: FinancialMetric }> = ({ metric }) => {
  const visuals = RISK_VISUALS[metric.riskLevel];
  const Icon = metric.icon;

  const formattedValue = formatCurrency(metric.value, metric.unit, metric.currency);

  return (
    <div
      className={`group relative bg-slate-900/80 border ${visuals.border} rounded-xl p-4 lg:p-5 transition-all duration-200 hover:border-slate-600 hover:bg-slate-900 shadow-lg ${visuals.glow} hover:shadow-xl`}
    >
      {/* Header Row: Icon + Risk Badge + Tooltip */}
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
          <span
            className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${visuals.bg} ${visuals.text} border ${visuals.border}`}
          >
            {visuals.label}
          </span>
          <EquationTooltip equation={metric.equation} metricLabel={metric.label} />
        </div>
      </div>

      {/* Value + Trend */}
      <div className="flex items-end justify-between gap-3 mb-1">
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl lg:text-3xl font-bold ${visuals.text} tabular-nums`}>
            {formattedValue}
          </span>
          <DollarSign className="w-4 h-4 text-slate-600 mb-1" aria-hidden="true" />
        </div>
        <TrendBadgeComponent trend={metric.trend} />
      </div>

      {/* Exposure Progress Bar */}
      <ExposureBar
        pct={metric.exposurePct}
        riskLevel={metric.riskLevel}
        budgetCapacity={metric.budgetCapacity}
      />
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

export default function RevenueAtRiskCards(): JSX.Element {
  const [activeFilter, setActiveFilter] = useState<'all' | RiskLevel>('all');

  // Aggregate summary derived from mock data
  const summary = useMemo(() => {
    const totalRisk = FINANCIAL_METRICS.reduce(
      (sum, m) => sum + m.value * (m.unit === 'M' ? 1_000_000 : 1_000),
      0
    );
    const criticalCount = FINANCIAL_METRICS.filter(
      (m) => m.riskLevel === 'critical'
    ).length;
    const avgExposure =
      FINANCIAL_METRICS.reduce((sum, m) => sum + m.exposurePct, 0) /
      FINANCIAL_METRICS.length;

    return {
      totalRisk,
      criticalCount,
      avgExposure: Math.round(avgExposure),
    };
  }, []);

  const filteredMetrics = useMemo(() => {
    if (activeFilter === 'all') return FINANCIAL_METRICS;
    return FINANCIAL_METRICS.filter((m) => m.riskLevel === activeFilter);
  }, [activeFilter]);

  const filterOptions: Array<{ id: 'all' | RiskLevel; label: string }> = [
    { id: 'all', label: 'All Metrics' },
    { id: 'critical', label: 'Critical' },
    { id: 'elevated', label: 'Elevated' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'secure', label: 'Secure' },
  ];

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="revenue-at-risk-heading"
    >
      {/* Section Header */}
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

        {/* Filter Pills */}
        <div
          className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg overflow-x-auto"
          role="tablist"
          aria-label="Filter metrics by risk level"
        >
          {filterOptions.map((opt) => {
            const isActive = activeFilter === opt.id;
            const count =
              opt.id === 'all'
                ? FINANCIAL_METRICS.length
                : FINANCIAL_METRICS.filter((m) => m.riskLevel === opt.id).length;

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

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredMetrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Empty State */}
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

      {/* Footer Summary Strip */}
      <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Portfolio ALE
          </p>
          <p className="text-sm font-bold text-amber-400 tabular-nums mt-0.5">
            $15.5M
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Portfolio SLE
          </p>
          <p className="text-sm font-bold text-white tabular-nums mt-0.5">
            $2.4M
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Shadow IT Losses
          </p>
          <p className="text-sm font-bold text-rose-400 tabular-nums mt-0.5">
            $8.7M
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Budget Utilization
          </p>
          <p className="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">
            {summary.avgExposure}%
          </p>
        </div>
      </div>
    </section>
  );
}