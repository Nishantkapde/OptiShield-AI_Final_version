// src/components/MultiLevelRollup.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Briefcase,
  Layers,
  Globe,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  DollarSign,
  Percent,
  Users,
  Activity,
  Minus,
} from 'lucide-react';

// ============================================================
// TypeScript Interfaces
// ============================================================

type NodeLevel = 'enterprise' | 'business-unit' | 'department' | 'sub-department';
type DriftStatus = 'critical-drift' | 'warning' | 'compliant';
type MetricView = 'financial' | 'control-failure';

interface RollupMetrics {
  /** Risk score 0-100 (higher = worse) */
  riskScore: number;
  /** Financial loss exposure in USD */
  lossExposure: number;
  /** Active incident count */
  activeIncidents: number;
  /** Control failure rate 0-100 (%) */
  controlFailureRate: number;
  /** Employee / asset count for context */
  assetCount: number;
}

interface RollupNode {
  id: string;
  name: string;
  level: NodeLevel;
  /** Human-readable owner/lead */
  owner: string;
  /** Compliance drift status */
  driftStatus: DriftStatus;
  /** Rolled-up metrics for this node */
  metrics: RollupMetrics;
  /** Child nodes (empty for leaf nodes) */
  children: RollupNode[];
}

// ============================================================
// Visual Configuration Maps
// ============================================================

interface DriftVisual {
  label: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
  icon: React.ElementType;
}

const DRIFT_VISUALS: Record<DriftStatus, DriftVisual> = {
  'critical-drift': {
    label: 'Critical Drift',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
    icon: AlertOctagon,
  },
  warning: {
    label: 'Warning',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
  },
  compliant: {
    label: 'Compliant',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    icon: ShieldCheck,
  },
};

interface LevelVisual {
  icon: React.ElementType;
  indent: string;
  label: string;
  text: string;
}

const LEVEL_VISUALS: Record<NodeLevel, LevelVisual> = {
  enterprise: {
    icon: Globe,
    indent: 'pl-0',
    label: 'Enterprise',
    text: 'text-cyan-400',
  },
  'business-unit': {
    icon: Building2,
    indent: 'pl-4 lg:pl-6',
    label: 'Business Unit',
    text: 'text-blue-400',
  },
  department: {
    icon: Briefcase,
    indent: 'pl-8 lg:pl-12',
    label: 'Department',
    text: 'text-violet-400',
  },
  'sub-department': {
    icon: Layers,
    indent: 'pl-12 lg:pl-18',
    label: 'Sub-Department',
    text: 'text-slate-400',
  },
};

// ============================================================
// Mock Data (self-contained hierarchical tree)
// ============================================================

const ROLLUP_TREE: RollupNode[] = [
  {
    id: 'ent-1',
    name: 'OptiShield Global Enterprise',
    level: 'enterprise',
    owner: 'CISO Office',
    driftStatus: 'warning',
    metrics: {
      riskScore: 64,
      lossExposure: 48_500_000,
      activeIncidents: 127,
      controlFailureRate: 18.4,
      assetCount: 4820,
    },
    children: [
      {
        id: 'bu-retail',
        name: 'Retail Banking',
        level: 'business-unit',
        owner: 'Priya Sharma',
        driftStatus: 'critical-drift',
        metrics: {
          riskScore: 78,
          lossExposure: 22_400_000,
          activeIncidents: 54,
          controlFailureRate: 27.2,
          assetCount: 1650,
        },
        children: [
          {
            id: 'dept-payments',
            name: 'Payments & Cards',
            level: 'department',
            owner: 'Rohan Mehta',
            driftStatus: 'critical-drift',
            metrics: {
              riskScore: 86,
              lossExposure: 12_800_000,
              activeIncidents: 28,
              controlFailureRate: 34.5,
              assetCount: 620,
            },
            children: [
              {
                id: 'sub-cc',
                name: 'Credit Card Processing',
                level: 'sub-department',
                owner: 'Anjali Rao',
                driftStatus: 'critical-drift',
                metrics: {
                  riskScore: 91,
                  lossExposure: 8_400_000,
                  activeIncidents: 18,
                  controlFailureRate: 41.2,
                  assetCount: 240,
                },
                children: [],
              },
              {
                id: 'sub-upi',
                name: 'UPI & Wallets',
                level: 'sub-department',
                owner: 'Kiran Patel',
                driftStatus: 'warning',
                metrics: {
                  riskScore: 72,
                  lossExposure: 4_400_000,
                  activeIncidents: 10,
                  controlFailureRate: 22.8,
                  assetCount: 380,
                },
                children: [],
              },
            ],
          },
          {
            id: 'dept-lending',
            name: 'Lending & Loans',
            level: 'department',
            owner: 'Vikram Singh',
            driftStatus: 'warning',
            metrics: {
              riskScore: 68,
              lossExposure: 9_600_000,
              activeIncidents: 26,
              controlFailureRate: 19.8,
              assetCount: 1030,
            },
            children: [],
          },
        ],
      },
      {
        id: 'bu-cloud',
        name: 'Cloud Operations',
        level: 'business-unit',
        owner: 'Arjun Nair',
        driftStatus: 'warning',
        metrics: {
          riskScore: 58,
          lossExposure: 16_200_000,
          activeIncidents: 38,
          controlFailureRate: 15.6,
          assetCount: 1890,
        },
        children: [
          {
            id: 'dept-infra',
            name: 'Cloud Infrastructure',
            level: 'department',
            owner: 'Meera Iyer',
            driftStatus: 'warning',
            metrics: {
              riskScore: 62,
              lossExposure: 9_800_000,
              activeIncidents: 22,
              controlFailureRate: 17.4,
              assetCount: 1120,
            },
            children: [],
          },
          {
            id: 'dept-data',
            name: 'Data Platform',
            level: 'department',
            owner: 'Sameer Khan',
            driftStatus: 'compliant',
            metrics: {
              riskScore: 48,
              lossExposure: 6_400_000,
              activeIncidents: 16,
              controlFailureRate: 13.2,
              assetCount: 770,
            },
            children: [],
          },
        ],
      },
      {
        id: 'bu-wealth',
        name: 'Wealth Management',
        level: 'business-unit',
        owner: 'Kavita Reddy',
        driftStatus: 'compliant',
        metrics: {
          riskScore: 42,
          lossExposure: 9_900_000,
          activeIncidents: 35,
          controlFailureRate: 9.8,
          assetCount: 1280,
        },
        children: [
          {
            id: 'dept-portfolio',
            name: 'Portfolio Services',
            level: 'department',
            owner: 'Nikhil Joshi',
            driftStatus: 'compliant',
            metrics: {
              riskScore: 38,
              lossExposure: 5_200_000,
              activeIncidents: 18,
              controlFailureRate: 8.4,
              assetCount: 640,
            },
            children: [],
          },
          {
            id: 'dept-advisory',
            name: 'Advisory & Research',
            level: 'department',
            owner: 'Deepa Menon',
            driftStatus: 'compliant',
            metrics: {
              riskScore: 46,
              lossExposure: 4_700_000,
              activeIncidents: 17,
              controlFailureRate: 11.2,
              assetCount: 640,
            },
            children: [],
          },
        ],
      },
    ],
  },
];

// ============================================================
// Formatting Helpers
// ============================================================

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

/** Map risk score to a color token for the mini bar */
const riskScoreColor = (score: number): string => {
  if (score >= 75) return 'bg-rose-500';
  if (score >= 55) return 'bg-amber-500';
  if (score >= 35) return 'bg-yellow-500';
  return 'bg-emerald-500';
};

const riskScoreText = (score: number): string => {
  if (score >= 75) return 'text-rose-400';
  if (score >= 55) return 'text-amber-400';
  if (score >= 35) return 'text-yellow-400';
  return 'text-emerald-400';
};

const controlFailureText = (rate: number): string => {
  if (rate >= 30) return 'text-rose-400';
  if (rate >= 18) return 'text-amber-400';
  if (rate >= 10) return 'text-yellow-400';
  return 'text-emerald-400';
};

const controlFailureBar = (rate: number): string => {
  if (rate >= 30) return 'bg-rose-500';
  if (rate >= 18) return 'bg-amber-500';
  if (rate >= 10) return 'bg-yellow-500';
  return 'bg-emerald-500';
};

// ============================================================
// Sub-Component: Status Badge
// ============================================================

const DriftBadge: React.FC<{ status: DriftStatus }> = ({ status }) => {
  const visuals = DRIFT_VISUALS[status];
  const Icon = visuals.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${visuals.bg} ${visuals.text} ${visuals.border}`}
      aria-label={`Compliance status: ${visuals.label}`}
    >
      <Icon className="w-2.5 h-2.5" />
      {visuals.label}
    </span>
  );
};

// ============================================================
// Sub-Component: Metrics Inline Display
// ============================================================

interface MetricsInlineProps {
  metrics: RollupMetrics;
  view: MetricView;
  compact: boolean;
}

const MetricsInline: React.FC<MetricsInlineProps> = ({ metrics, view, compact }) => {
  if (view === 'financial') {
    return (
      <div className="flex items-center gap-3 lg:gap-5">
        <div className="flex flex-col items-end min-w-[70px]">
          <span className="text-[9px] text-slate-500 uppercase tracking-wide">
            {compact ? 'Loss' : 'Loss Exposure'}
          </span>
          <span className="text-xs lg:text-sm font-bold font-mono text-rose-400 tabular-nums">
            {formatCurrency(metrics.lossExposure)}
          </span>
        </div>
        {!compact && (
          <div className="flex flex-col items-end min-w-[60px]">
            <span className="text-[9px] text-slate-500 uppercase tracking-wide">
              Incidents
            </span>
            <span className="text-xs lg:text-sm font-bold font-mono text-amber-400 tabular-nums">
              {metrics.activeIncidents}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Control failure view
  return (
    <div className="flex items-center gap-3 lg:gap-5">
      <div className="flex flex-col items-end min-w-[70px]">
        <span className="text-[9px] text-slate-500 uppercase tracking-wide">
          {compact ? 'CFR' : 'Control Failure'}
        </span>
        <span
          className={`text-xs lg:text-sm font-bold font-mono tabular-nums ${controlFailureText(
            metrics.controlFailureRate
          )}`}
        >
          {formatPercent(metrics.controlFailureRate)}
        </span>
      </div>
      {!compact && (
        <div className="flex flex-col items-end min-w-[60px]">
          <span className="text-[9px] text-slate-500 uppercase tracking-wide">
            Assets
          </span>
          <span className="text-xs lg:text-sm font-bold font-mono text-slate-300 tabular-nums">
            {metrics.assetCount.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Sub-Component: Risk Score Pill
// ============================================================

const RiskScorePill: React.FC<{ score: number; compact?: boolean }> = ({
  score,
  compact = false,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`relative ${
          compact ? 'w-12' : 'w-16 lg:w-20'
        } h-1.5 bg-slate-800 rounded-full overflow-hidden`}
      >
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${riskScoreColor(
            score
          )}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className={`text-xs lg:text-sm font-bold font-mono tabular-nums ${riskScoreText(
          score
        )} min-w-[24px] text-right`}
      >
        {score}
      </span>
    </div>
  );
};

// ============================================================
// Sub-Component: Tree Node Row (recursive)
// ============================================================

interface TreeNodeRowProps {
  node: RollupNode;
  depth: number;
  view: MetricView;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}

const TreeNodeRow: React.FC<TreeNodeRowProps> = ({
  node,
  depth,
  view,
  expanded,
  onToggle,
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const levelVisual = LEVEL_VISUALS[node.level];
  const LevelIcon = levelVisual.icon;

  // Responsive indentation
  const paddingLeft = `${depth * 20}px`;

  const handleToggle = useCallback(() => {
    if (hasChildren) onToggle(node.id);
  }, [hasChildren, node.id, onToggle]);

  return (
    <div className="select-none">
      {/* Node Row */}
      <div
        className={`group relative flex items-center gap-3 px-3 lg:px-4 py-2.5 rounded-lg border border-transparent hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-150 ${
          depth === 0 ? 'bg-slate-900/40 border-slate-800' : ''
        }`}
        style={{ marginLeft: paddingLeft }}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={depth + 1}
      >
        {/* Expand / Collapse Chevron */}
        <button
          onClick={handleToggle}
          disabled={!hasChildren}
          className={`shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors ${
            hasChildren
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'text-slate-700 cursor-default'
          }`}
          aria-label={
            hasChildren
              ? `${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`
              : `${node.name} has no children`
          }
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <Minus className="w-3 h-3" />
          )}
        </button>

        {/* Level Icon */}
        <div
          className={`shrink-0 p-1.5 rounded-md bg-slate-800/60 border border-slate-700`}
          aria-hidden="true"
        >
          <LevelIcon className={`w-3.5 h-3.5 ${levelVisual.text}`} />
        </div>

        {/* Node Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{node.name}</p>
            <span
              className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${levelVisual.text} bg-slate-800/60 border border-slate-700`}
            >
              {levelVisual.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Users className="w-2.5 h-2.5" />
            {node.owner}
          </p>
        </div>

        {/* Drift Badge */}
        <div className="shrink-0 hidden sm:block">
          <DriftBadge status={node.driftStatus} />
        </div>

        {/* Risk Score */}
        <div className="shrink-0 hidden md:flex flex-col items-end">
          <span className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">
            Risk Score
          </span>
          <RiskScorePill score={node.metrics.riskScore} compact={depth > 1} />
        </div>

        {/* Metric View Values */}
        <div className="shrink-0 min-w-[90px] lg:min-w-[130px]">
          <MetricsInline
            metrics={node.metrics}
            view={view}
            compact={depth > 1}
          />
        </div>

        {/* Expanded indicator stripe */}
        {hasChildren && isExpanded && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-cyan-500/40 rounded-r" />
        )}
      </div>

      {/* Children (recursive) */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              view={view}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Sub-Component: Aggregate Summary Footer
// ============================================================

interface AggregateSummaryProps {
  root: RollupNode;
  view: MetricView;
}

const AggregateSummary: React.FC<AggregateSummaryProps> = ({ root, view }) => {
  // Recursively count nodes and aggregate direct-child metrics
  const stats = useMemo(() => {
    let totalNodes = 0;
    let criticalCount = 0;
    let warningCount = 0;
    let compliantCount = 0;

    const walk = (node: RollupNode) => {
      totalNodes += 1;
      if (node.driftStatus === 'critical-drift') criticalCount += 1;
      else if (node.driftStatus === 'warning') warningCount += 1;
      else compliantCount += 1;
      node.children.forEach(walk);
    };
    walk(root);

    return {
      totalNodes,
      criticalCount,
      warningCount,
      compliantCount,
      topLevelBUs: root.children.length,
    };
  }, [root]);

  return (
    <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
          Total Nodes
        </p>
        <p className="text-sm font-bold text-white tabular-nums mt-0.5">
          {stats.totalNodes}
        </p>
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
          Critical Drift
        </p>
        <p className="text-sm font-bold text-rose-400 tabular-nums mt-0.5">
          {stats.criticalCount}
        </p>
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
          Warning
        </p>
        <p className="text-sm font-bold text-amber-400 tabular-nums mt-0.5">
          {stats.warningCount}
        </p>
      </div>
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
          {view === 'financial' ? 'Top-Level BUs' : 'Compliant'}
        </p>
        <p
          className={`text-sm font-bold tabular-nums mt-0.5 ${
            view === 'financial' ? 'text-cyan-400' : 'text-emerald-400'
          }`}
        >
          {view === 'financial' ? stats.topLevelBUs : stats.compliantCount}
        </p>
      </div>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

export default function MultiLevelRollup(): JSX.Element {
  const [view, setView] = useState<MetricView>('financial');
  const [expanded, setExpanded] = useState<Set<string>>(
    // Default: expand enterprise + top-level BUs, collapse deeper levels
    new Set(['ent-1', 'bu-retail', 'bu-cloud', 'bu-wealth'])
  );

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const all = new Set<string>();
    const walk = (node: RollupNode) => {
      if (node.children.length > 0) all.add(node.id);
      node.children.forEach(walk);
    };
    ROLLUP_TREE.forEach(walk);
    setExpanded(all);
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpanded(new Set(['ent-1']));
  }, []);

  const root = ROLLUP_TREE[0];

  const viewOptions: Array<{
    id: MetricView;
    label: string;
    icon: React.ElementType;
  }> = [
    { id: 'financial', label: 'Financial Exposure', icon: DollarSign },
    { id: 'control-failure', label: 'Control Failure Rate', icon: Percent },
  ];

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="multi-level-rollup-heading"
    >
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
            <Layers className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2
              id="multi-level-rollup-heading"
              className="text-base lg:text-lg font-semibold text-white"
            >
              Multi-Level Risk Rollup
            </h2>
            <p className="text-xs text-slate-400">
              Enterprise → Business Units → Departments → Sub-Departments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Switcher */}
          <div
            className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg"
            role="tablist"
            aria-label="Metric view switcher"
          >
            {viewOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = view === opt.id;
              return (
                <button
                  key={opt.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setView(opt.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-lg">
            <button
              onClick={handleExpandAll}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors"
              aria-label="Expand all nodes"
            >
              Expand All
            </button>
            <div className="w-px h-3 bg-slate-700" />
            <button
              onClick={handleCollapseAll}
              className="px-2.5 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors"
              aria-label="Collapse all nodes"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="hidden md:flex items-center gap-3 px-3 lg:px-4 py-2 mb-1 text-[10px] text-slate-500 uppercase tracking-wide font-medium border-b border-slate-800">
        <div className="w-5" />
        <div className="w-6" />
        <div className="flex-1">Organizational Unit</div>
        <div className="shrink-0 hidden sm:block w-[110px] text-center">Status</div>
        <div className="shrink-0 hidden md:block w-[120px] text-right">Risk Score</div>
        <div className="shrink-0 min-w-[90px] lg:min-w-[130px] text-right">
          {view === 'financial' ? 'Loss Exposure' : 'Control Failure'}
        </div>
      </div>

      {/* Tree Body */}
      <div
        role="tree"
        aria-label="Organizational risk hierarchy"
        className="space-y-0.5"
      >
        {ROLLUP_TREE.map((node) => (
          <TreeNodeRow
            key={node.id}
            node={node}
            depth={0}
            view={view}
            expanded={expanded}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {/* Aggregate Summary */}
      <AggregateSummary root={root} view={view} />

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
          Legend:
        </span>
        {(
          Object.entries(DRIFT_VISUALS) as Array<[DriftStatus, DriftVisual]>
        ).map(([key, visual]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${visual.dot}`} />
            <span className="text-[10px] text-slate-400">{visual.label}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-auto">
          <Activity className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] text-slate-500">
            Live rollup · updated 2m ago
          </span>
        </span>
      </div>
    </section>
  );
}