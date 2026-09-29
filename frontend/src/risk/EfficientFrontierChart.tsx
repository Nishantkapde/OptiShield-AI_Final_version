// frontend/src/risk/EfficientFrontierChart.tsx
// Interactive Efficient Frontier curve — Budget vs. max achievable ΔEAL.
import React, { memo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Target } from 'lucide-react';
import type { OptimizationResult } from './schema';

// ============================================================
// Formatters — hoisted, no per-render allocation
// ============================================================
const fmtUsd = (n: number): string =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${Math.round(n / 1_000)}K`
    : `$${n}`;

const fmtPct = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(0)}%`;

// ============================================================
// Recharts tooltip
// ============================================================
interface TooltipPayloadItem {
  payload: {
    budgetStep: number;
    maxRiskReduction: number;
    rosi: number;
  };
}

interface FrontierTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

const FrontierTooltip = memo<FrontierTooltipProps>(({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 shadow-2xl">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
        Budget Step
      </p>
      <p className="text-sm font-mono font-semibold text-white mb-2">
        {fmtUsd(p.budgetStep)}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] text-slate-400">ΔEAL Reduction</span>
          <span className="text-[11px] font-mono font-semibold text-emerald-400">
            {fmtUsd(p.maxRiskReduction)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] text-slate-400">ROSI</span>
          <span
            className={`text-[11px] font-mono font-semibold ${
              p.rosi >= 0 ? 'text-cyan-400' : 'text-rose-400'
            }`}
          >
            {fmtPct(p.rosi)}
          </span>
        </div>
      </div>
    </div>
  );
});
FrontierTooltip.displayName = 'FrontierTooltip';

// ============================================================
// Component props
// ============================================================
interface EfficientFrontierChartProps {
  result: OptimizationResult;
  /** Current user budget — drawn as a reference line on the chart. */
  currentBudget: number;
}

// ============================================================
// Main component
// ============================================================
const EfficientFrontierChart = memo<EfficientFrontierChartProps>(
  ({ result, currentBudget }) => {
    const data = result.efficientFrontierPoints;

    // Clamp the current budget to the frontier range so the reference
    // line always sits within the plot.
    const maxStep = data.length > 0 ? data[data.length - 1].budgetStep : 0;
    const clampedBudget = Math.max(0, Math.min(currentBudget, maxStep));

    return (
      <section
        className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
        aria-labelledby="efficient-frontier-heading"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2
                id="efficient-frontier-heading"
                className="text-base lg:text-lg font-semibold text-white"
              >
                Efficient Frontier
              </h2>
              <p className="text-xs text-slate-400">
                Maximum ΔEAL achievable at each budget level (0-1 Knapsack)
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Frontier</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-slate-400">Your Budget</span>
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 20, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="budgetStep"
                tickFormatter={fmtUsd}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: 'Security Budget (USD)',
                  position: 'insideBottom',
                  offset: -5,
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <YAxis
                dataKey="maxRiskReduction"
                tickFormatter={fmtUsd}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: 'ΔEAL Reduction',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <Tooltip
                content={<FrontierTooltip />}
                cursor={{ stroke: '#334155', strokeWidth: 1 }}
              />

              {/* Reference line at the user's current budget */}
              {clampedBudget > 0 && (
                <ReferenceLine
                  x={data.reduce(
                    (closest, point) =>
                      Math.abs(point.budgetStep - clampedBudget) <
                      Math.abs(closest - clampedBudget)
                        ? point.budgetStep
                        : closest,
                    data[0]?.budgetStep ?? 0
                  )}
                  stroke="#06b6d4"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              )}

              {/* The frontier curve itself */}
              <Line
                type="monotone"
                dataKey="maxRiskReduction"
                stroke="#34d399"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#34d399', stroke: '#0f172a', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#34d399', stroke: '#0f172a', strokeWidth: 2 }}
                isAnimationActive={false}
              />

              {/* Marker at the user's current operating point */}
              {clampedBudget > 0 && result.totalRiskReduction > 0 && (
                <ReferenceDot
                  x={data.reduce(
                    (closest, point) =>
                      Math.abs(point.budgetStep - clampedBudget) <
                      Math.abs(closest - clampedBudget)
                        ? point.budgetStep
                        : closest,
                    data[0]?.budgetStep ?? 0
                  )}
                  y={result.totalRiskReduction}
                  r={6}
                  fill="#06b6d4"
                  stroke="#0f172a"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer summary */}
        <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Current Budget
            </p>
            <p className="text-sm font-bold font-mono text-cyan-400 mt-0.5">
              {fmtUsd(currentBudget)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              ΔEAL Reduction
            </p>
            <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
              {fmtUsd(result.totalRiskReduction)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              ROSI
            </p>
            <p
              className={`text-sm font-bold font-mono mt-0.5 ${
                result.overallRosi >= 0 ? 'text-cyan-400' : 'text-rose-400'
              }`}
            >
              {fmtPct(result.overallRosi)}
            </p>
          </div>
        </div>
      </section>
    );
  }
);
EfficientFrontierChart.displayName = 'EfficientFrontierChart';

export default EfficientFrontierChart;