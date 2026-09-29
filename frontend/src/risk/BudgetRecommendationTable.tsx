// frontend/src/risk/BudgetRecommendationTable.tsx
// Recommended controls + summary metrics (cost, ΔEAL, ROSI badge).
import React, { memo, useMemo } from 'react';
import { Award, CheckCircle2, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import type { OptimizationResult } from './schema';

// ============================================================
// Formatters — hoisted
// ============================================================
const fmtUsd = (n: number): string =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `$${Math.round(n / 1_000)}K`
    : `$${n}`;

const fmtFullUsd = (n: number): string => `$${n.toLocaleString()}`;

const fmtPct = (n: number): string => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

// ============================================================
// ROSI badge — color-coded by return
// ============================================================
const RosiBadge = memo<{ rosi: number }>(({ rosi }) => {
  const classes =
    rosi >= 200
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : rosi >= 100
      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
      : rosi >= 0
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${classes}`}
    >
      <TrendingUp className="w-3 h-3" />
      {fmtPct(rosi)}
    </span>
  );
});
RosiBadge.displayName = 'RosiBadge';

// ============================================================
// Props
// ============================================================
interface BudgetRecommendationTableProps {
  result: OptimizationResult;
  /** Total budget the caller passed to the optimizer. */
  budget: number;
}

// ============================================================
// Main component
// ============================================================
const BudgetRecommendationTable = memo<BudgetRecommendationTableProps>(
  ({ result, budget }) => {
    const unspentCapital = useMemo(
      () => Math.max(0, budget - result.totalCost),
      [budget, result.totalCost]
    );

    const utilizationPct = useMemo(
      () => (budget > 0 ? Math.round((result.totalCost / budget) * 100) : 0),
      [budget, result.totalCost]
    );

    return (
      <section
        className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
        aria-labelledby="budget-recommendation-heading"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Award className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2
                id="budget-recommendation-heading"
                className="text-base lg:text-lg font-semibold text-white"
              >
                Recommended Allocation
              </h2>
              <p className="text-xs text-slate-400">
                {result.recommendedControls.length} control
                {result.recommendedControls.length === 1 ? '' : 's'} selected by
                0-1 Knapsack
              </p>
            </div>
          </div>
          <RosiBadge rosi={result.overallRosi} />
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <SummaryCard
            icon={DollarSign}
            label="Total Spent"
            value={fmtUsd(result.totalCost)}
            accent="text-emerald-400"
          />
          <SummaryCard
            icon={Wallet}
            label="Unspent Capital"
            value={fmtUsd(unspentCapital)}
            accent="text-cyan-400"
          />
          <SummaryCard
            icon={TrendingUp}
            label="ΔEAL Reduction"
            value={fmtUsd(result.totalRiskReduction)}
            accent="text-amber-400"
          />
          <SummaryCard
            icon={Award}
            label="Budget Utilization"
            value={`${utilizationPct}%`}
            accent="text-rose-400"
          />
        </div>

        {/* Table */}
        {result.recommendedControls.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center">
            <Award className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              No controls selected — budget too small for any single control
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 border-b border-slate-800">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                    Control
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-400">
                    Category
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">
                    Cost
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">
                    ΔEAL
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-slate-400">
                    ROSI
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.recommendedControls.map((control) => {
                  const rosi =
                    control.cost > 0
                      ? ((control.riskReductionEal - control.cost) / control.cost) *
                        100
                      : 0;
                  return (
                    <tr
                      key={control.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-sm text-white font-medium">
                            {control.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400 font-mono">
                          {control.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-mono text-white tabular-nums">
                          {fmtFullUsd(control.cost)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-mono text-amber-400 tabular-nums">
                          {fmtFullUsd(control.riskReductionEal)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RosiBadge rosi={rosi} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }
);
BudgetRecommendationTable.displayName = 'BudgetRecommendationTable';

// ============================================================
// Small helper — summary metric card
// ============================================================
interface SummaryCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
}

const SummaryCard = memo<SummaryCardProps>(({ icon: Icon, label, value, accent }) => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
    <div className="flex items-center gap-2 mb-1">
      <Icon className={`w-3.5 h-3.5 ${accent}`} />
      <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
        {label}
      </span>
    </div>
    <p className={`text-base font-bold font-mono tabular-nums ${accent}`}>{value}</p>
  </div>
));
SummaryCard.displayName = 'SummaryCard';

export default BudgetRecommendationTable;