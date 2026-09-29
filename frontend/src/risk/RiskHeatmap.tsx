// frontend/src/risk/RiskHeatmap.tsx
// Interactive 5×5 likelihood × impact matrix.
import React, { memo, useCallback } from 'react';
import { Grid3x3, Target } from 'lucide-react';
import { summariseHeatmap } from './heatmapEngine';
import {
  HEATMAP_TIER_VISUALS,
  type DashboardFilter,
  type HeatmapCell,
} from './schema';

// ============================================================
// Formatters
// ============================================================
const fmtUsd = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return n > 0 ? `$${n}` : '';
};

const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Severe'];

// ============================================================
// Sub-component: one cell
// ============================================================
interface HeatmapCellButtonProps {
  cell: HeatmapCell;
  isSelected: boolean;
  onClick: (cell: HeatmapCell) => void;
}

const HeatmapCellButton = memo<HeatmapCellButtonProps>(
  ({ cell, isSelected, onClick }) => {
    const vis = HEATMAP_TIER_VISUALS[cell.tier];
    const isEmpty = cell.assetIds.length === 0;
    const count = cell.assetIds.length;

    return (
      <button
        type="button"
        onClick={() => onClick(cell)}
        disabled={isEmpty}
        className={`relative aspect-square rounded-md border transition-all duration-200 ${
          vis.border
        } ${
          isEmpty
            ? 'bg-slate-900/40 border-slate-800 opacity-40 cursor-not-allowed'
            : `${vis.bg} ${vis.glow} hover:scale-[1.04] cursor-pointer`
        } ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950' : ''}`}
        aria-label={`Likelihood ${cell.likelihoodScore}, Impact ${cell.impactScore}, ${count} assets`}
      >
        {!isEmpty && (
          <>
            {/* Asset count badge */}
            <div className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-slate-950/70 border border-slate-700 text-[9px] font-mono font-bold text-white">
              {count}
            </div>

            {/* EAL */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[10px] font-mono font-bold ${vis.text}`}>
                {fmtUsd(cell.totalEal)}
              </span>
              <span className="text-[8px] font-mono text-slate-400 mt-0.5">
                L{cell.likelihoodScore}·I{cell.impactScore}
              </span>
            </div>
          </>
        )}
      </button>
    );
  }
);
HeatmapCellButton.displayName = 'HeatmapCellButton';

// ============================================================
// Props
// ============================================================
interface RiskHeatmapProps {
  grid: HeatmapCell[][];
  filter: DashboardFilter;
  onFilterChange: (filter: DashboardFilter) => void;
}

// ============================================================
// Main component
// ============================================================
const RiskHeatmap = memo<RiskHeatmapProps>(({ grid, filter, onFilterChange }) => {
  const stats = summariseHeatmap(grid);

  const selectedCell = filter.selectedHeatmapCell;

  const handleCellClick = useCallback(
    (cell: HeatmapCell) => {
      const isSame =
        selectedCell?.likelihood === cell.likelihoodScore &&
        selectedCell?.impact === cell.impactScore;

      onFilterChange({
        ...filter,
        selectedHeatmapCell: isSame
          ? undefined
          : { likelihood: cell.likelihoodScore, impact: cell.impactScore },
      });
    },
    [filter, onFilterChange, selectedCell]
  );

  const handleClear = useCallback(() => {
    onFilterChange({ ...filter, selectedHeatmapCell: undefined });
  }, [filter, onFilterChange]);

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="risk-heatmap-heading"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Grid3x3 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2
              id="risk-heatmap-heading"
              className="text-base lg:text-lg font-semibold text-white flex items-center gap-2"
            >
              Risk Heatmap
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                5×5
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Likelihood (LEF) × Impact (directLoss) · {stats.assetCount} assets ·{' '}
              {fmtUsd(stats.totalEal)} aggregated EAL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedCell && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-400">
              <Target className="w-3 h-3" />
              L{selectedCell.likelihood} · I{selectedCell.impact}
            </span>
          )}
          {selectedCell && (
            <button
              onClick={handleClear}
              className="px-2.5 py-1 rounded-md text-[10px] font-medium text-slate-400 hover:text-slate-200 bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Grid + axis labels */}
      <div className="flex gap-3">
        {/* Y-axis (likelihood) */}
        <div className="flex flex-col justify-center shrink-0">
          <div className="flex-1 flex flex-col justify-around pr-1">
            {[...LIKELIHOOD_LABELS].reverse().map((label, idx) => (
              <span
                key={label}
                className="text-[9px] font-mono text-slate-500 leading-none text-right"
                style={{ height: 'calc(100% / 5)' }}
                title={label}
              >
                {5 - idx}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Matrix */}
          <div
            className="grid grid-cols-5 gap-1.5"
            role="grid"
            aria-label="Risk heatmap matrix"
          >
            {[...grid].reverse().map((row) =>
              row.map((cell) => {
                const isSelected =
                  selectedCell?.likelihood === cell.likelihoodScore &&
                  selectedCell?.impact === cell.impactScore;
                return (
                  <HeatmapCellButton
                    key={`${cell.likelihoodScore}-${cell.impactScore}`}
                    cell={cell}
                    isSelected={isSelected}
                    onClick={handleCellClick}
                  />
                );
              })
            )}
          </div>

          {/* X-axis (impact) */}
          <div className="grid grid-cols-5 gap-1.5 mt-2">
            {IMPACT_LABELS.map((label, idx) => (
              <span
                key={label}
                className="text-[9px] font-mono text-slate-500 text-center leading-tight"
                title={label}
              >
                {idx + 1}
                <br />
                <span className="text-slate-600">{label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
          Tier:
        </span>
        {(['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((tier) => {
          const vis = HEATMAP_TIER_VISUALS[tier];
          return (
            <span key={tier} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-sm border ${vis.bg} ${vis.border}`} />
              <span className="text-[10px] text-slate-400">{vis.label}</span>
            </span>
          );
        })}
        <span className="ml-auto text-[10px] font-mono text-slate-500">
          Click a populated cell to filter
        </span>
      </div>
    </section>
  );
});
RiskHeatmap.displayName = 'RiskHeatmap';

export default RiskHeatmap;