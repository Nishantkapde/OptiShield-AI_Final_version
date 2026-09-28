// src/components/ServiceDependencyGraph.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  Server,
  Database,
  Brain,
  Shield,
  Globe,
  Boxes,
  Activity,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Zap,
  Power,
  PowerOff,
  DollarSign,
  Clock,
  Users,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Cpu,
  Link2,
  Unlink,
  Layers,
  Gauge,
  X,
} from 'lucide-react';

// ============================================================
// TypeScript Interfaces
// ============================================================

type ServiceStatus = 'operational' | 'degraded' | 'at-risk' | 'compromised' | 'isolated';
type ServiceKind = 'gateway' | 'ai-guardrail' | 'ai-model' | 'database' | 'api' | 'compute';

interface SLAHealth {
  /** Uptime percentage 0-100 */
  uptimePct: number;
  /** Average response time in ms */
  avgLatencyMs: number;
  /** Error rate percentage */
  errorRatePct: number;
}

interface ServiceNode {
  id: string;
  name: string;
  shortName: string;
  kind: ServiceKind;
  status: ServiceStatus;
  /** Human-readable endpoint */
  endpoint: string;
  /** Upstream service IDs (dependencies this service needs) */
  upstreamIds: string[];
  /** Downstream service IDs (services that depend on this one) */
  downstreamIds: string[];
  /** Financial criticality in $/hr of downtime */
  financialCriticality: number;
  /** SLA health snapshot */
  sla: SLAHealth;
  /** Active threat level 0-100 */
  threatLevel: number;
  /** Linked AI agents (IDs/names) */
  linkedAgents: string[];
  /** Visual column position on the graph */
  column: number;
  /** Vertical row position on the graph */
  row: number;
}

interface BlastRadius {
  /** Total services affected downstream */
  affectedServices: number;
  /** Cumulative $/hr impact */
  financialImpact: number;
  /** Critical path length */
  criticalPathLength: number;
  /** Affected AI agents */
  affectedAgents: string[];
}

// ============================================================
// Visual Configuration Maps
// ============================================================

interface StatusVisual {
  label: string;
  text: string;
  bg: string;
  border: string;
  dot: string;
  icon: React.ElementType;
  nodeBorder: string;
}

const STATUS_VISUALS: Record<ServiceStatus, StatusVisual> = {
  operational: {
    label: 'Operational',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
    icon: CheckCircle2,
    nodeBorder: 'border-emerald-500/50',
  },
  degraded: {
    label: 'Degraded',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
    icon: AlertTriangle,
    nodeBorder: 'border-amber-500/50',
  },
  'at-risk': {
    label: 'At Risk',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    dot: 'bg-rose-400',
    icon: AlertOctagon,
    nodeBorder: 'border-rose-500/50',
  },
  compromised: {
    label: 'Compromised',
    text: 'text-rose-400',
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/50',
    dot: 'bg-rose-500',
    icon: AlertOctagon,
    nodeBorder: 'border-rose-500/80',
  },
  isolated: {
    label: 'Isolated',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/40',
    dot: 'bg-slate-500',
    icon: PowerOff,
    nodeBorder: 'border-slate-600/60',
  },
};

interface KindVisual {
  label: string;
  color: string;
  text: string;
  bg: string;
  icon: React.ElementType;
}

const KIND_VISUALS: Record<ServiceKind, KindVisual> = {
  gateway: {
    label: 'Gateway',
    color: '#8b5cf6',
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    icon: Globe,
  },
  'ai-guardrail': {
    label: 'AI Guardrail',
    color: '#06b6d4',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    icon: Shield,
  },
  'ai-model': {
    label: 'AI Model',
    color: '#06b6d4',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    icon: Brain,
  },
  database: {
    label: 'Database',
    color: '#f59e0b',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    icon: Database,
  },
  api: {
    label: 'External API',
    color: '#3b82f6',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    icon: Network,
  },
  compute: {
    label: 'Compute',
    color: '#10b981',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    icon: Cpu,
  },
};

// ============================================================
// Mock Data — Service Topology
// ============================================================

const SERVICE_NODES: ServiceNode[] = [
  {
    id: 'gateway',
    name: 'API Gateway',
    shortName: 'Gateway',
    kind: 'gateway',
    status: 'operational',
    endpoint: 'api.optishield.io/v2',
    upstreamIds: [],
    downstreamIds: ['presidio', 'llm-router'],
    financialCriticality: 48_000,
    sla: { uptimePct: 99.97, avgLatencyMs: 42, errorRatePct: 0.03 },
    threatLevel: 12,
    linkedAgents: [],
    column: 0,
    row: 1,
  },
  {
    id: 'presidio',
    name: 'Presidio Guardrail',
    shortName: 'Presidio',
    kind: 'ai-guardrail',
    status: 'operational',
    endpoint: 'presidio.ai.internal:8443',
    upstreamIds: ['gateway'],
    downstreamIds: ['llm-router'],
    financialCriticality: 62_000,
    sla: { uptimePct: 99.94, avgLatencyMs: 12, errorRatePct: 0.06 },
    threatLevel: 28,
    linkedAgents: ['router-agent-01', 'router-agent-07'],
    column: 1,
    row: 0,
  },
  {
    id: 'llm-router',
    name: 'LLM Router',
    shortName: 'LLM Router',
    kind: 'ai-model',
    status: 'degraded',
    endpoint: 'router.llm.optishield.io',
    upstreamIds: ['gateway', 'presidio'],
    downstreamIds: ['code-interpreter', 'customer-db'],
    financialCriticality: 124_000,
    sla: { uptimePct: 98.42, avgLatencyMs: 380, errorRatePct: 2.14 },
    threatLevel: 64,
    linkedAgents: ['router-agent-01', 'router-agent-07', 'router-agent-12'],
    column: 2,
    row: 1,
  },
  {
    id: 'code-interpreter',
    name: 'Code Interpreter Sandbox',
    shortName: 'Code Exec',
    kind: 'compute',
    status: 'compromised',
    endpoint: 'code-exec.sandbox.prod',
    upstreamIds: ['llm-router'],
    downstreamIds: ['customer-db'],
    financialCriticality: 86_000,
    sla: { uptimePct: 96.10, avgLatencyMs: 1240, errorRatePct: 8.72 },
    threatLevel: 91,
    linkedAgents: ['code-interpreter-03'],
    column: 3,
    row: 0,
  },
  {
    id: 'customer-db',
    name: 'Customer Database',
    shortName: 'Customer DB',
    kind: 'database',
    status: 'at-risk',
    endpoint: 'prod-cust-pg-01.internal',
    upstreamIds: ['llm-router', 'code-interpreter'],
    downstreamIds: [],
    financialCriticality: 240_000,
    sla: { uptimePct: 99.88, avgLatencyMs: 28, errorRatePct: 0.12 },
    threatLevel: 78,
    linkedAgents: ['db-access-02'],
    column: 4,
    row: 1,
  },
  {
    id: 'stripe-api',
    name: 'Stripe Payments API',
    shortName: 'Stripe',
    kind: 'api',
    status: 'operational',
    endpoint: 'api.stripe.com/v1',
    upstreamIds: ['llm-router'],
    downstreamIds: [],
    financialCriticality: 320_000,
    sla: { uptimePct: 99.99, avgLatencyMs: 180, errorRatePct: 0.02 },
    threatLevel: 18,
    linkedAgents: ['payment-agent-01'],
    column: 3,
    row: 2,
  },
];

// Build reverse lookup for efficient traversal
const NODE_MAP: Record<string, ServiceNode> = SERVICE_NODES.reduce(
  (acc, node) => {
    acc[node.id] = node;
    return acc;
  },
  {} as Record<string, ServiceNode>
);

// ============================================================
// Graph Traversal Helpers
// ============================================================

/** Recursively collect all downstream service IDs (excluding isolated branches) */
const collectDownstream = (
  nodeId: string,
  isolatedSet: Set<string>,
  visited: Set<string> = new Set()
): Set<string> => {
  if (visited.has(nodeId)) return visited;
  visited.add(nodeId);

  const node = NODE_MAP[nodeId];
  if (!node) return visited;

  node.downstreamIds.forEach((childId) => {
    // Skip isolated nodes — the circuit breaker severs their link
    if (isolatedSet.has(childId)) return;
    collectDownstream(childId, isolatedSet, visited);
  });

  return visited;
};

/** Recursively collect all upstream service IDs */
const collectUpstream = (
  nodeId: string,
  isolatedSet: Set<string>,
  visited: Set<string> = new Set()
): Set<string> => {
  if (visited.has(nodeId)) return visited;
  visited.add(nodeId);

  const node = NODE_MAP[nodeId];
  if (!node) return visited;

  node.upstreamIds.forEach((parentId) => {
    if (isolatedSet.has(parentId)) return;
    collectUpstream(parentId, isolatedSet, visited);
  });

  return visited;
};

/** Compute blast radius for a node given the current isolation set */
const computeBlastRadius = (
  nodeId: string,
  isolatedSet: Set<string>
): BlastRadius => {
  const downstream = collectDownstream(nodeId, isolatedSet);
  // Remove self from results
  downstream.delete(nodeId);

  const affected: ServiceNode[] = Array.from(downstream)
    .map((id) => NODE_MAP[id])
    .filter(Boolean);

  const financialImpact = affected.reduce(
    (sum, n) => sum + n.financialCriticality,
    0
  );

  const affectedAgents = Array.from(
    new Set(affected.flatMap((n) => n.linkedAgents))
  );

  return {
    affectedServices: affected.length,
    financialImpact,
    criticalPathLength: affected.length,
    affectedAgents,
  };
};

// ============================================================
// Formatting Helpers
// ============================================================

const formatCurrency = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
};

const threatColor = (level: number): string => {
  if (level >= 75) return 'text-rose-400';
  if (level >= 50) return 'text-amber-400';
  if (level >= 25) return 'text-yellow-400';
  return 'text-emerald-400';
};

const threatBar = (level: number): string => {
  if (level >= 75) return 'bg-rose-500';
  if (level >= 50) return 'bg-amber-500';
  if (level >= 25) return 'bg-yellow-500';
  return 'bg-emerald-500';
};

// ============================================================
// Sub-Component: Service Node Card
// ============================================================

interface ServiceNodeCardProps {
  node: ServiceNode;
  isSelected: boolean;
  isUpstream: boolean;
  isDownstream: boolean;
  isIsolated: boolean;
  isDimmed: boolean;
  onClick: (id: string) => void;
}

const ServiceNodeCard: React.FC<ServiceNodeCardProps> = ({
  node,
  isSelected,
  isUpstream,
  isDownstream,
  isIsolated,
  isDimmed,
  onClick,
}) => {
  const status = isIsolated ? STATUS_VISUALS.isolated : STATUS_VISUALS[node.status];
  const kind = KIND_VISUALS[node.kind];
  const KindIcon = kind.icon;
  const StatusIcon = status.icon;

  // Highlight ring for related nodes
  const relationRing = isSelected
    ? 'ring-2 ring-cyan-500/50'
    : isUpstream
    ? 'ring-2 ring-violet-500/40'
    : isDownstream
    ? 'ring-2 ring-rose-500/40'
    : '';

  return (
    <motion.button
      onClick={() => onClick(node.id)}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      animate={{ opacity: isDimmed ? 0.35 : 1 }}
      transition={{ duration: 0.2 }}
      className={`relative flex flex-col gap-2 p-3 rounded-xl border-2 bg-slate-900/80 backdrop-blur-sm text-left min-w-[170px] max-w-[200px] transition-all duration-200 ${status.nodeBorder} ${relationRing} ${
        isSelected ? 'shadow-2xl shadow-cyan-500/10' : 'hover:shadow-lg'
      }`}
      aria-label={`${node.name} — ${status.label}`}
      aria-pressed={isSelected}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="p-1.5 rounded-lg shrink-0"
          style={{
            backgroundColor: `${kind.color}15`,
            border: `1px solid ${kind.color}40`,
          }}
        >
          <KindIcon className={`w-3.5 h-3.5 ${kind.text}`} />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <motion.div
            animate={
              node.status === 'compromised'
                ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }
                : {}
            }
            transition={{ duration: 1.4, repeat: Infinity }}
            className={`w-2 h-2 rounded-full ${status.dot}`}
          />
          {isIsolated && <PowerOff className="w-3 h-3 text-slate-500" />}
        </div>
      </div>

      {/* Service Name + Status */}
      <div>
        <p className="text-xs font-semibold text-white truncate" title={node.name}>
          {node.name}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          <StatusIcon className={`w-2.5 h-2.5 ${status.text}`} />
          <span className={`text-[10px] font-medium ${status.text}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Mini Metrics */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-500 uppercase tracking-wide">
            Impact
          </span>
          <span className="text-[11px] font-mono font-bold text-amber-400 tabular-nums">
            {formatCurrency(node.financialCriticality)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-slate-500 uppercase tracking-wide">
            Threat
          </span>
          <span
            className={`text-[11px] font-mono font-bold tabular-nums ${threatColor(
              node.threatLevel
            )}`}
          >
            {node.threatLevel}
          </span>
        </div>
      </div>

      {/* Relation tag */}
      {(isUpstream || isDownstream) && !isSelected && (
        <span
          className={`absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide whitespace-nowrap ${
            isUpstream
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {isUpstream ? 'Upstream' : 'Downstream'}
        </span>
      )}
    </motion.button>
  );
};

// ============================================================
// Sub-Component: Detail Pane
// ============================================================

interface DetailPaneProps {
  node: ServiceNode;
  blastRadius: BlastRadius;
  isIsolated: boolean;
  onToggleIsolation: () => void;
  onClose: () => void;
}

const DetailPane: React.FC<DetailPaneProps> = ({
  node,
  blastRadius,
  isIsolated,
  onToggleIsolation,
  onClose,
}) => {
  const status = isIsolated ? STATUS_VISUALS.isolated : STATUS_VISUALS[node.status];
  const kind = KIND_VISUALS[node.kind];
  const StatusIcon = status.icon;

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${kind.bg} ${kind.text} border border-slate-700`}
            >
              {kind.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold ${status.text}`}
            >
              <StatusIcon className="w-2.5 h-2.5" />
              {status.label}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white">{node.name}</h3>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
            {node.endpoint}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
          aria-label="Close detail pane"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Metric Grid */}
      <div className="p-4 grid grid-cols-2 gap-3 border-b border-slate-800">
        {/* Financial Criticality */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] text-slate-500 uppercase tracking-wide font-medium">
              Criticality
            </span>
          </div>
          <p className="text-sm font-bold font-mono text-amber-400 tabular-nums">
            {formatCurrency(node.financialCriticality)}
          </p>
          <p className="text-[9px] text-slate-600 mt-0.5">per hour of downtime</p>
        </div>

        {/* SLA Health */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Gauge className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] text-slate-500 uppercase tracking-wide font-medium">
              SLA Health
            </span>
          </div>
          <p className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
            {node.sla.uptimePct.toFixed(2)}%
          </p>
          <p className="text-[9px] text-slate-600 mt-0.5">
            {node.sla.avgLatencyMs}ms · {node.sla.errorRatePct.toFixed(2)}% err
          </p>
        </div>

        {/* Active Threat */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-rose-400" />
              <span className="text-[9px] text-slate-500 uppercase tracking-wide font-medium">
                Active Threat Level
              </span>
            </div>
            <span
              className={`text-sm font-bold font-mono tabular-nums ${threatColor(
                node.threatLevel
              )}`}
            >
              {node.threatLevel} / 100
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${node.threatLevel}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-1.5 rounded-full ${threatBar(node.threatLevel)}`}
            />
          </div>
        </div>
      </div>

      {/* Blast Radius */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2.5">
          <Layers className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Downstream Blast Radius
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-2.5">
            <p className="text-[9px] text-rose-300/70 uppercase tracking-wide font-medium mb-0.5">
              Affected Services
            </p>
            <p className="text-xl font-bold font-mono text-rose-400 tabular-nums">
              {blastRadius.affectedServices}
            </p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5">
            <p className="text-[9px] text-amber-300/70 uppercase tracking-wide font-medium mb-0.5">
              $ / hr Impact
            </p>
            <p className="text-xl font-bold font-mono text-amber-400 tabular-nums">
              {formatCurrency(blastRadius.financialImpact)}
            </p>
          </div>
        </div>
      </div>

      {/* Linked AI Agents */}
      {node.linkedAgents.length > 0 && (
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
              Linked AI Agents ({node.linkedAgents.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {node.linkedAgents.map((agent) => (
              <span
                key={agent}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
              >
                <Brain className="w-2.5 h-2.5" />
                {agent}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Isolation Control */}
      <div className="p-4">
        <button
          onClick={onToggleIsolation}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
            isIsolated
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/40 hover:bg-rose-500/20'
          }`}
          aria-pressed={isIsolated}
        >
          {isIsolated ? (
            <>
              <Power className="w-3.5 h-3.5" />
              Restore Service
            </>
          ) : (
            <>
              <PowerOff className="w-3.5 h-3.5" />
              Isolate Service (Circuit Breaker)
            </>
          )}
        </button>
        <p className="text-[10px] text-slate-500 mt-2 text-center leading-snug">
          {isIsolated
            ? 'Isolation active — dependent links severed. Click to restore.'
            : 'Simulates severing all dependent links and recalculating blast radius.'}
        </p>
      </div>
    </motion.aside>
  );
};

// ============================================================
// Main Component
// ============================================================

export default function ServiceDependencyGraph(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string>('llm-router');
  const [isolatedSet, setIsolatedSet] = useState<Set<string>>(new Set());

  const selectedNode = useMemo(() => NODE_MAP[selectedId], [selectedId]);

  // Compute upstream / downstream sets for highlighting
  const upstreamSet = useMemo(
    () => collectUpstream(selectedId, isolatedSet),
    [selectedId, isolatedSet]
  );

  const downstreamSet = useMemo(
    () => collectDownstream(selectedId, isolatedSet),
    [selectedId, isolatedSet]
  );

  // Blast radius for selected node
  const blastRadius = useMemo(
    () => computeBlastRadius(selectedId, isolatedSet),
    [selectedId, isolatedSet]
  );

  // Determine dimming — nodes not selected, not up/downstream, get dimmed
  const isNodeDimmed = useCallback(
    (nodeId: string): boolean => {
      if (nodeId === selectedId) return false;
      if (upstreamSet.has(nodeId)) return false;
      if (downstreamSet.has(nodeId)) return false;
      return true;
    },
    [selectedId, upstreamSet, downstreamSet]
  );

  const handleNodeClick = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleToggleIsolation = useCallback(() => {
    setIsolatedSet((prev) => {
      const next = new Set(prev);
      if (next.has(selectedId)) next.delete(selectedId);
      else next.add(selectedId);
      return next;
    });
  }, [selectedId]);

  // Aggregate summary
  const summary = useMemo(() => {
    const operational = SERVICE_NODES.filter(
      (n) => !isolatedSet.has(n.id) && n.status === 'operational'
    ).length;
    const degraded = SERVICE_NODES.filter(
      (n) => !isolatedSet.has(n.id) && n.status === 'degraded'
    ).length;
    const critical = SERVICE_NODES.filter(
      (n) =>
        !isolatedSet.has(n.id) &&
        (n.status === 'at-risk' || n.status === 'compromised')
    ).length;
    const totalImpact = SERVICE_NODES.reduce(
      (sum, n) => sum + n.financialCriticality,
      0
    );
    return { operational, degraded, critical, totalImpact };
  }, [isolatedSet]);

  // Column layout for rendering
  const maxColumn = Math.max(...SERVICE_NODES.map((n) => n.column));
  const columns: ServiceNode[][] = Array.from({ length: maxColumn + 1 }, () => []);
  SERVICE_NODES.forEach((node) => {
    columns[node.column].push(node);
  });

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="service-dependency-heading"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Network className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2
              id="service-dependency-heading"
              className="text-base lg:text-lg font-semibold text-white"
            >
              Service Dependency Graph
            </h2>
            <p className="text-xs text-slate-400">
              Real-time topology · click any node to inspect blast radius
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            {summary.operational} Operational
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            {summary.degraded} Degraded
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-3 h-3" />
            {summary.critical} At Risk
          </span>
        </div>
      </div>

      {/* Main Layout: Graph + Detail Pane */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Graph Column */}
        <div className="xl:col-span-2">
          {/* Topology Canvas */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 lg:p-6 overflow-x-auto">
            {/* Legend */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                Topology:
              </span>
              {(['gateway', 'ai-guardrail', 'database', 'api'] as ServiceKind[]).map(
                (k) => {
                  const kv = KIND_VISUALS[k];
                  const Icon = kv.icon;
                  return (
                    <span key={k} className="flex items-center gap-1.5">
                      <Icon className={`w-3 h-3 ${kv.text}`} />
                      <span className="text-[10px] text-slate-400">{kv.label}</span>
                    </span>
                  );
                }
              )}
              <span className="ml-auto text-[10px] text-slate-500">
                {isolatedSet.size > 0 && (
                  <span className="text-rose-400 font-mono">
                    {isolatedSet.size} isolated
                  </span>
                )}
              </span>
            </div>

            {/* Column-based Layout */}
            <div className="flex items-start gap-6 lg:gap-8 min-w-max pb-2">
              {columns.map((columnNodes, colIdx) => (
                <React.Fragment key={colIdx}>
                  <div className="flex flex-col gap-8">
                    {columnNodes.map((node) => (
                      <ServiceNodeCard
                        key={node.id}
                        node={node}
                        isSelected={node.id === selectedId}
                        isUpstream={upstreamSet.has(node.id)}
                        isDownstream={downstreamSet.has(node.id)}
                        isIsolated={isolatedSet.has(node.id)}
                        isDimmed={isNodeDimmed(node.id)}
                        onClick={handleNodeClick}
                      />
                    ))}
                  </div>

                  {/* Column Connector */}
                  {colIdx < columns.length - 1 && (
                    <div className="flex flex-col items-center justify-center self-stretch gap-2 pt-12">
                      <ArrowRight className="w-4 h-4 text-slate-700" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Aggregate Footer */}
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                Total $ / hr Exposure
              </p>
              <p className="text-sm font-bold font-mono text-amber-400 tabular-nums mt-0.5">
                {formatCurrency(summary.totalImpact)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                Selected Service
              </p>
              <p className="text-sm font-bold text-white mt-0.5 truncate">
                {selectedNode.name}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
                Critical Path
              </p>
              <p className="text-sm font-bold font-mono text-rose-400 tabular-nums mt-0.5">
                {blastRadius.criticalPathLength}
              </p>
            </div>
          </div>
        </div>

        {/* Detail Pane */}
        <div className="xl:col-span-1">
          <AnimatePresence mode="wait">
            <DetailPane
              key={selectedId}
              node={selectedNode}
              blastRadius={blastRadius}
              isIsolated={isolatedSet.has(selectedId)}
              onToggleIsolation={handleToggleIsolation}
              onClose={() => setSelectedId('llm-router')}
            />
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}