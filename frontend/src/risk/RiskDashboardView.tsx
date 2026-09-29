// frontend/src/risk/RiskDashboardView.tsx
// Executive dashboard — ticker + heatmap + filter state.
// Wraps the heatmap and ticker; parent supplies higher-level panels.
import React, { memo, useMemo, useState } from 'react';
import { BarChart3, LayoutDashboard } from 'lucide-react';
import LiveRiskTicker from './LiveRiskTicker';
import RiskHeatmap from './RiskHeatmap';
import { generateRiskHeatmap } from './heatmapEngine';
import type {
  AssetRiskInput,
  DashboardFilter,
  RiskAssessmentResult,
} from './schema';

// ============================================================
// Props
// ============================================================
interface RiskDashboardViewProps {
  assets: AssetRiskInput[];
  results: Map<string, RiskAssessmentResult>;
  /** 95% VaR — from PP5 Monte Carlo */
  var95: number;
  /** Optional slot for the parent to inject extra panels */
  children?: React.ReactNode;
}

// ============================================================
// Main component
// ============================================================
const RiskDashboardView = memo<RiskDashboardViewProps>(
  ({ assets, results, var95, children }) => {
    const [filter, setFilter] = useState<DashboardFilter>({});

    // Build the heatmap grid — O(N) over assets
    const grid = useMemo(
      () => generateRiskHeatmap(assets, results),
      [assets, results]
    );

    // Sum EAL across all assets — the "system" number
    const systemEal = useMemo(() => {
      let total = 0;
      for (const asset of assets) {
        const r = results.get(asset.assetId);
        if (r) total += r.annualizedLossExpectancyEal;
      }
      return Math.round(total);
    }, [assets, results]);

    // Count how many assets match the active filter
    const filteredCount = useMemo(() => {
      const sel = filter.selectedHeatmapCell;
      if (!sel) return assets.length;
      let count = 0;
      for (const asset of assets) {
        const r = results.get(asset.assetId);
        if (!r) continue;
        // Re-derive this asset's bucket and compare
        const lef = r.lossEventFrequencyLef;
        const dl = r.directLoss;
        const l = lef < 1 ? 1 : lef < 3 ? 2 : lef < 6 ? 3 : lef < 12 ? 4 : 5;
        const i = dl < 100_000 ? 1 : dl < 500_000 ? 2 : dl < 1_500_000 ? 3 : dl < 3_000_000 ? 4 : 5;
        if (l === sel.likelihood && i === sel.impact) count++;
      }
      return count;
    }, [assets, results, filter]);

    return (
      <div className="space-y-5">
        {/* Page-level title */}
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-lg border border-cyan-500/30">
            <LayoutDashboard className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base lg:text-lg font-semibold text-white">
              Executive Command Center
            </h2>
            <p className="text-xs text-slate-400">
              {filter.selectedHeatmapCell
                ? `Filtered: ${filteredCount} of ${assets.length} assets`
                : `Live view of ${assets.length} assets · ${var95 > 0 ? 'VaR from Monte Carlo' : 'VaR unavailable'}`}
            </p>
          </div>
        </div>

        {/* Live ticker */}
        <LiveRiskTicker systemEal={systemEal} var95={var95} previousEal={systemEal} />

        {/* Heatmap */}
        <RiskHeatmap grid={grid} filter={filter} onFilterChange={setFilter} />

        {/* Inject parent-supplied panels (EfficientFrontier, Board Appetite, etc.) */}
        {children}

        {/* Placeholder hint when filter is active but no children to reflect it */}
        {filter.selectedHeatmapCell && React.Children.count(children) === 0 && (
          <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-xl p-4 flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="text-xs text-slate-400">
              Cell <span className="font-mono text-cyan-400">
                L{filter.selectedHeatmapCell.likelihood} · I{filter.selectedHeatmapCell.impact}
              </span>{' '}
              selected — {filteredCount} asset{filteredCount === 1 ? '' : 's'} in scope.
            </p>
          </div>
        )}
      </div>
    );
  }
);
RiskDashboardView.displayName = 'RiskDashboardView';

export default RiskDashboardView;