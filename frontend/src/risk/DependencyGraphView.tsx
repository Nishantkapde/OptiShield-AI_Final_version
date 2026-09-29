// frontend/src/risk/DependencyGraphView.tsx
// Supply chain DAG visualiser + breach simulator.
import React, { memo, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  Database,
  Flame,
  RotateCcw,
  Shield,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useSupplyChainRisk } from './useSupplyChainRisk';
import {
  classifyNodeRisk,
  type NodeRiskTier,
} from './graphEngine';
import type {
  DependencyEdge,
  DependencyNode,
} from './schema';

// ============================================================
// Layout constants — fixed grid, wrapped in overflow-x-auto
// ============================================================
const CANVAS_W = 900;
const CANVAS_H = 500;
const VENDOR_X = 20;
const VENDOR_W = 180;
const ASSET_X = 700;
const ASSET_W = 180;
const NODE_H = 62;
const TOP_Y = 40;
const ROW_GAP = 88;

// ============================================================
// Node risk → visual config
// ============================================================
interface NodeVisual {
  border: string;
  bg: string;
  text: string;
  dot: string;
  stroke: string;
  label: string;
}

const TIER_VISUALS: Record<NodeRiskTier, NodeVisual> = {
  healthy: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    stroke: '#10b981',
    label: 'Healthy',
  },
  elevated: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    stroke: '#f59e0b',
    label: 'Elevated',
  },
  critical: {
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/5',
    text: 'text-rose-400',
    dot: 'bg-rose-400',
    stroke: '#f43f5e',
    label: 'Critical',
  },
};

// ============================================================
// Bezier path between two nodes
// ============================================================
function buildEdgePath(
  sourceY: number,
  targetY: number,
  breach: boolean
): string {
  const x1 = VENDOR_X + VENDOR_W;
  const x2 = ASSET_X;
  const y1 = sourceY + NODE_H / 2;
  const y2 = targetY + NODE_H / 2;
  const cp1x = x1 + (x2 - x1) * 0.4;
  const cp2x = x1 + (x2 - x1) * 0.6;
  // If breached, slightly thicken/bend for emphasis
  const lift = breach ? 4 : 0;
  return `M ${x1} ${y1} C ${cp1x} ${y1 - lift}, ${cp2x} ${y2 + lift}, ${x2} ${y2}`;
}

// ============================================================
// Formatters
// ============================================================
const fmtUsd = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

// ============================================================
// Sub-component — node card
// ============================================================
interface NodeCardProps {
  node: DependencyNode;
  x: number;
  y: number;
  width: number;
  cascadedEal: number;
  isBreached: boolean;
  onClick?: () => void;
}

const NodeCard = memo<NodeCardProps>(
  ({ node, x, y, width, cascadedEal, isBreached, onClick }) => {
    const tier = classifyNodeRisk(node.epssScore);
    const vis = isBreached ? TIER_VISUALS.critical : TIER_VISUALS[tier];
    const Icon = node.type === 'VENDOR' ? Building2 : Database;

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width,
          height: NODE_H,
        }}
        className={`text-left rounded-lg border px-2.5 py-1.5 transition-all duration-200 ${
          vis.border
        } ${vis.bg} ${
          onClick
            ? 'hover:scale-[1.02] hover:border-slate-500 cursor-pointer'
            : 'cursor-default'
        } ${isBreached ? 'shadow-lg shadow-rose-500/20 ring-1 ring-rose-500/40' : ''}`}
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon className={`w-3 h-3 shrink-0 ${vis.text}`} />
          <span className="text-[11px] font-semibold text-white truncate">
            {node.name}
          </span>
          {isBreached && (
            <Flame className="w-3 h-3 text-rose-400 shrink-0 animate-pulse" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-slate-500">
            {fmtUsd(node.baseEal)}
          </span>
          <span className={`text-[9px] font-mono font-bold ${vis.text}`}>
            {fmtUsd(cascadedEal)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[8px] font-mono text-slate-600">
            epss {node.epssScore.toFixed(2)}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${vis.dot}`} />
        </div>
      </button>
    );
  }
);
NodeCard.displayName = 'NodeCard';

// ============================================================
// Sub-component — KPI card
// ============================================================
interface KpiProps {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  icon: React.ElementType;
}

const Kpi = memo<KpiProps>(({ label, value, sub, accent, icon: Icon }) => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
    <div className="flex items-center gap-2 mb-1">
      <Icon className={`w-3.5 h-3.5 ${accent}`} />
      <span className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
        {label}
      </span>
    </div>
    <p className={`text-base font-bold font-mono tabular-nums ${accent}`}>{value}</p>
    {sub && <p className="text-[9px] font-mono text-slate-600 mt-0.5">{sub}</p>}
  </div>
));
Kpi.displayName = 'Kpi';

// ============================================================
// Props
// ============================================================
interface DependencyGraphViewProps {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

// ============================================================
// Main component
// ============================================================
const DependencyGraphView = memo<DependencyGraphViewProps>(({ nodes, edges }) => {
  const {
    effectiveNodes,
    summary,
    compromisedVendors,
    toggleVendorBreach,
    clearBreaches,
  } = useSupplyChainRisk(nodes, edges);

  // Split nodes into two columns, preserving insertion order.
  const vendors = useMemo(
    () => effectiveNodes.filter((n) => n.type === 'VENDOR'),
    [effectiveNodes]
  );
  const assets = useMemo(
    () => effectiveNodes.filter((n) => n.type === 'INTERNAL_ASSET'),
    [effectiveNodes]
  );

  // Map node ID → absolute Y coordinate
  const yById = useMemo(() => {
    const m = new Map<string, number>();
    vendors.forEach((v, i) => m.set(v.id, TOP_Y + i * ROW_GAP));
    assets.forEach((a, i) => m.set(a.id, TOP_Y + i * ROW_GAP));
    return m;
  }, [vendors, assets]);

  // Compute max impact node for KPI
  const maxImpactNodeId = useMemo(() => {
    let bestId = '';
    let bestScore = -1;
    for (const [id, score] of Object.entries(summary.nodeImpactScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }
    return bestId;
  }, [summary.nodeImpactScores]);

  const maxImpactNode = effectiveNodes.find((n) => n.id === maxImpactNodeId);

  const handleToggle = useCallback(
    (vendorId: string) => () => toggleVendorBreach(vendorId),
    [toggleVendorBreach]
  );

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="supply-chain-heading"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2
              id="supply-chain-heading"
              className="text-base lg:text-lg font-semibold text-white flex items-center gap-2"
            >
              Supply Chain Risk Propagation
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                DAG
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Topological traversal · cascading EAL · single points of failure
            </p>
          </div>
        </div>

        <button
          onClick={clearBreaches}
          disabled={compromisedVendors.size === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
            compromisedVendors.size > 0
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
              : 'bg-slate-900/80 text-slate-600 border-slate-800 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          Reset Breaches
          {compromisedVendors.size > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-[9px] font-bold">
              {compromisedVendors.size}
            </span>
          )}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi
          label="Total Cascaded EAL"
          value={fmtUsd(summary.totalCascadedEal)}
          sub="Σ internal-asset cascaded"
          accent="text-rose-400"
          icon={ShieldAlert}
        />
        <Kpi
          label="Critical Vendors"
          value={String(summary.criticalVendorCount)}
          sub="epss > 0.28"
          accent="text-amber-400"
          icon={AlertTriangle}
        />
        <Kpi
          label="Single Points of Failure"
          value={String(summary.singlePointsOfFailure.length)}
          sub={summary.singlePointsOfFailure.join(', ') || 'none'}
          accent="text-purple-400"
          icon={Zap}
        />
        <Kpi
          label="Max Impact Node"
          value={maxImpactNode ? maxImpactNode.name.split(' ')[0] : '—'}
          sub={
            maxImpactNode
              ? `${Math.round(
                  (summary.nodeImpactScores[maxImpactNode.id] ?? 0) * 100
                )}% of peak`
              : ''
          }
          accent="text-cyan-400"
          icon={Database}
        />
      </div>

      {/* Graph canvas */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 mb-5 overflow-x-auto">
        <div
          className="relative"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        >
          {/* SVG edges */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={CANVAS_W}
            height={CANVAS_H}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          >
            {edges.map((edge) => {
              const sy = yById.get(edge.sourceNodeId);
              const ty = yById.get(edge.targetNodeId);
              if (sy === undefined || ty === undefined) return null;
              const source = effectiveNodes.find((n) => n.id === edge.sourceNodeId);
              if (!source) return null;
              const breached = compromisedVendors.has(source.id);
              const tier = classifyNodeRisk(source.epssScore);
              const stroke = breached
                ? TIER_VISUALS.critical.stroke
                : TIER_VISUALS[tier].stroke;
              const d = buildEdgePath(sy, ty, breached);
              return (
                <path
                  key={edge.id}
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={breached ? 2.5 : 1.5}
                  strokeOpacity={breached ? 0.9 : 0.55}
                />
              );
            })}
          </svg>

          {/* Vendor nodes */}
          {vendors.map((v) => (
            <NodeCard
              key={v.id}
              node={v}
              x={VENDOR_X}
              y={yById.get(v.id) ?? TOP_Y}
              width={VENDOR_W}
              cascadedEal={summary.cascadedEalByNode[v.id] ?? 0}
              isBreached={compromisedVendors.has(v.id)}
              onClick={handleToggle(v.id)}
            />
          ))}

          {/* Internal asset nodes */}
          {assets.map((a) => (
            <NodeCard
              key={a.id}
              node={a}
              x={ASSET_X}
              y={yById.get(a.id) ?? TOP_Y}
              width={ASSET_W}
              cascadedEal={summary.cascadedEalByNode[a.id] ?? 0}
              isBreached={false}
            />
          ))}
        </div>
      </div>

      {/* Simulation hint */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-purple-500/5 border border-purple-500/20 rounded-lg">
        <Flame className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        <p className="text-[11px] text-purple-300/80">
          Click any <span className="font-semibold">vendor node</span> to simulate a breach. Watch cascading EAL flow through downstream assets in real time.
        </p>
      </div>

      {/* Legend */}
      <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
          Legend:
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-slate-400">Healthy (epss &lt; 0.3)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[10px] text-slate-400">Elevated (0.3 – 0.6)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          <span className="text-[10px] text-slate-400">Critical (&ge; 0.6)</span>
        </span>
        <span className="ml-auto text-[10px] font-mono text-slate-500">
          Traversal: Kahn topo sort · Complexity O(V + E)
        </span>
      </div>
    </section>
  );
});
DependencyGraphView.displayName = 'DependencyGraphView';

export default DependencyGraphView;