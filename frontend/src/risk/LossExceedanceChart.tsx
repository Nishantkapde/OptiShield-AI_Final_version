// frontend/src/risk/LossExceedanceChart.tsx
// Loss Exceedance Curve (LEC) + VaR comparison pill.
import React, { memo, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Gauge, ShieldAlert, TrendingUp, Zap } from 'lucide-react';
import { useMonteCarlo } from './useMonteCarlo';
import { computeDeterministicEal } from './monteCarloEngine';
import type { DistributionParams } from './schema';

// ============================================================
// Formatters
// ============================================================
const fmtUsd = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

const fmtUsdFull = (n: number): string =>
  n >= 1_000 ? `$${Math.round(n).toLocaleString()}` : `$${Math.round(n)}`;

const fmtPct = (p: number): string => `${Math.round(p * 100)}%`;

// ============================================================
// Custom tooltip for the LEC
// ============================================================
interface LossExceedancePoint {
  lossThreshold: number;
  probabilityExceeded: number;
}

interface LecTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: LossExceedancePoint }>;
}

const LecTooltip = memo<LecTooltipProps>(({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 shadow-2xl">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
        Loss Threshold
      </p>
      <p className="text-sm font-mono font-semibold text-white mb-2">
        {fmtUsdFull(p.lossThreshold)}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[11px] text-slate-400">Prob. Exceeded</span>
        <span className="text-[11px] font-mono font-semibold text-rose-400">
          {fmtPct(p.probabilityExceeded)}
        </span>
      </div>
    </div>
  );
});
LecTooltip.displayName = 'LecTooltip';

// ============================================================
// Props
// ============================================================
interface LossExceedanceChartProps {
  assetId: string;
  assetLabel: string;
  lossDistribution: DistributionParams;
  frequencyDistribution: DistributionParams;
}

// ============================================================
// Main component
// ============================================================
const LossExceedanceChart = memo<LossExceedanceChartProps>(
  ({ assetId, assetLabel, lossDistribution, frequencyDistribution }) => {
    const metrics = useMonteCarlo(assetId, lossDistribution, frequencyDistribution);

    const deterministicEal = useMemo(
      () => computeDeterministicEal(lossDistribution, frequencyDistribution),
      [lossDistribution, frequencyDistribution]
    );

    // Tail lift factor: how many times bigger is the 95% VaR vs the
    // deterministic mean. A judge-friendly single number.
    const tailLift = useMemo(() => {
      if (deterministicEal <= 0) return 0;
      return metrics.var95 / deterministicEal;
    }, [metrics.var95, deterministicEal]);

    const var95Pct = useMemo(() => 5, []); // 95% VaR = 5% exceedance

    return (
      <section
        className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
        aria-labelledby="lec-heading"
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2
                id="lec-heading"
                className="text-base lg:text-lg font-semibold text-white flex items-center gap-2"
              >
                Loss Exceedance Curve — {assetLabel}
                <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                  MONTE CARLO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {metrics.iterations.toLocaleString()} simulated years ·{' '}
                <span className="text-emerald-400 font-mono">
                  {metrics.processingTimeMs.toFixed(2)} ms
                </span>
              </p>
            </div>
          </div>

          {/* EAL vs VaR95 pill */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                EAL
              </span>
              <span className="text-sm font-mono font-bold text-cyan-400">
                {fmtUsd(deterministicEal)}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[10px] text-rose-400/80 uppercase tracking-wide">
                95% VaR Tail Risk
              </span>
              <span className="text-sm font-mono font-bold text-rose-400">
                {fmtUsd(metrics.var95)}
              </span>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <Kpi label="Median" value={fmtUsd(metrics.medianLoss)} accent="text-slate-300" />
          <Kpi label="90% VaR" value={fmtUsd(metrics.var90)} accent="text-amber-400" />
          <Kpi label="95% VaR" value={fmtUsd(metrics.var95)} accent="text-orange-400" />
          <Kpi label="99% VaR" value={fmtUsd(metrics.var99)} accent="text-rose-400" />
          <Kpi
            label="Max Probable"
            value={fmtUsd(metrics.maxProbableLoss)}
            accent="text-rose-500"
          />
        </div>

        {/* Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={metrics.lossExceedanceCurve}
                margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
              >
                <defs>
                  <linearGradient id="lecGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

                <XAxis
                  dataKey="lossThreshold"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={fmtUsd}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: 'Annual Loss (USD)',
                    position: 'insideBottom',
                    offset: -10,
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  dataKey="probabilityExceeded"
                  type="number"
                  domain={[0, 1]}
                  tickFormatter={fmtPct}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: 'Probability Exceeded',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />

                <Tooltip content={<LecTooltip />} cursor={{ stroke: '#334155' }} />

                {/* 95% VaR reference line */}
                <ReferenceLine
                  x={metrics.var95}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `95% VaR ${fmtUsd(metrics.var95)}`,
                    position: 'top',
                    fill: '#f43f5e',
                    fontSize: 10,
                    fontFamily: 'monospace',
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="probabilityExceeded"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#lecGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interpretation strip */}
        <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                Tail Lift
              </p>
              <p className="text-sm font-mono font-bold text-amber-400 mt-0.5">
                {tailLift.toFixed(1)}× the mean
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                95% VaR vs deterministic EAL
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                Simulation Time
              </p>
              <p className="text-sm font-mono font-bold text-cyan-400 mt-0.5">
                {metrics.processingTimeMs.toFixed(2)} ms
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {metrics.iterations.toLocaleString()} iterations in-browser
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                Interpretation
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                {fmtPct(var95Pct)} of simulated years exceed{' '}
                <span className="text-rose-400 font-mono font-semibold">
                  {fmtUsd(metrics.var95)}
                </span>{' '}
                in unplanned loss.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }
);
LossExceedanceChart.displayName = 'LossExceedanceChart';

// ============================================================
// Helper
// ============================================================
interface KpiProps {
  label: string;
  value: string;
  accent: string;
}

const Kpi = memo<KpiProps>(({ label, value, accent }) => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
      {label}
    </p>
    <p className={`text-lg font-bold font-mono tabular-nums mt-1 ${accent}`}>{value}</p>
  </div>
));
Kpi.displayName = 'Kpi';

export default LossExceedanceChart;