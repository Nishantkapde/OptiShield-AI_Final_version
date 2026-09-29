// frontend/src/risk/RemediationPlaybookView.tsx
// Ranked remediation action center — copy snippet + one-click fix.
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Clipboard,
  ClipboardCheck,
  Clock,
  DollarSign,
  Flame,
  RotateCcw,
  Shield,
  Sparkles,
  Terminal,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { useRemediationAction } from './useRemediationAction';
import type {
  ActionablePlaybook,
  CorrelatedAssetThreat,
  RemediationCategory,
  SystemRiskSummary,
} from './schema';

// ============================================================
// Category display
// ============================================================
const CATEGORY_LABEL: Record<RemediationCategory, string> = {
  PATCH_MANAGEMENT: 'Patch Mgmt',
  IAM_HARDENING: 'IAM Hardening',
  NETWORK_ISOLATION: 'Network Isolation',
  CONFIG_REMEDIATION: 'Config Fix',
};

const CATEGORY_ACCENT: Record<RemediationCategory, string> = {
  PATCH_MANAGEMENT: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  IAM_HARDENING: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  NETWORK_ISOLATION: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  CONFIG_REMEDIATION: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

// ============================================================
// Formatters
// ============================================================
const fmtUsd = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
};

// ============================================================
// Sub-component: playbook card
// ============================================================
interface PlaybookCardProps {
  playbook: ActionablePlaybook;
  onApply: (id: string) => void;
}

const PlaybookCard = memo<PlaybookCardProps>(({ playbook, onApply }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const applied = playbook.executionStatus === 'APPLIED';
  const accent = CATEGORY_ACCENT[playbook.action.category];
  const fixCost =
    playbook.action.estimatedHours * 50 + playbook.action.costEstimate;

  const handleCopy = useCallback(async () => {
    const snippet = playbook.action.commandScriptSnippet;
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }, [playbook.action.commandScriptSnippet]);

  return (
    <div
      className={`bg-slate-900/80 border rounded-lg transition-colors ${
        applied
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Row header */}
      <div className="p-3 flex items-start gap-3">
        {/* Rank badge */}
        <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center shrink-0">
          <span className="text-[9px] font-mono text-slate-500 leading-none">REI</span>
          <span className="text-[11px] font-mono font-bold text-amber-400 leading-tight mt-0.5">
            {Math.round(playbook.reiScore)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + category */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-tight ${applied ? 'text-emerald-400' : 'text-white'}`}>
                {playbook.action.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${accent}`}>
                  {CATEGORY_LABEL[playbook.action.category]}
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  target: {playbook.action.targetAssetId}
                </span>
              </div>
            </div>
            {applied && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400 shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                Applied
              </span>
            )}
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono mt-2">
            <div>
              <p className="text-slate-500 uppercase tracking-wide">ΔEAL</p>
              <p className="text-rose-400 font-bold">{fmtUsd(playbook.potentialEalReduction)}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase tracking-wide">Effort</p>
              <p className="text-cyan-400 font-bold">{playbook.action.estimatedHours}h</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase tracking-wide">Fix Cost</p>
              <p className="text-amber-400 font-bold">{fmtUsd(fixCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions row */}
      <div className="px-3 pb-2 flex items-center gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
        >
          <Terminal className="w-3 h-3" />
          {expanded ? 'Hide' : 'Show'} command
          <ChevronDown
            className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        <div className="flex-1" />

        <button
          onClick={() => onApply(playbook.id)}
          disabled={applied}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition-colors border ${
            applied
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
          }`}
        >
          {applied ? (
            <>
              <CheckCircle2 className="w-3 h-3" />
              Fix Applied
            </>
          ) : (
            <>
              <Zap className="w-3 h-3" />
              Apply Fix
            </>
          )}
        </button>
      </div>

      {/* Expanded code snippet */}
      {expanded && playbook.action.commandScriptSnippet && (
        <div className="mx-3 mb-3 bg-slate-950 border border-slate-800 rounded-md overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900/60">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">
              Remediation Script
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-cyan-400 transition-colors"
            >
              {copied ? (
                <>
                  <ClipboardCheck className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="p-3 text-[10px] font-mono text-slate-300 overflow-x-auto leading-relaxed whitespace-pre">
            {playbook.action.commandScriptSnippet}
          </pre>
        </div>
      )}
    </div>
  );
});
PlaybookCard.displayName = 'PlaybookCard';

// ============================================================
// Sub-component: KPI
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
interface RemediationPlaybookViewProps {
  threats: CorrelatedAssetThreat[];
  systemState: SystemRiskSummary;
}

// ============================================================
// Main component
// ============================================================
const RemediationPlaybookView = memo<RemediationPlaybookViewProps>(
  ({ threats, systemState }) => {
    const { playbooks, summary, executeSimulatedFix, resetAll } =
      useRemediationAction(threats, systemState);

    const [liveEal, setLiveEal] = useState(systemState.totalEal);

    // When the base systemState changes (from PP3 events), reset live EAL
    // and clear applied fixes so numbers stay consistent.
    React.useEffect(() => {
      setLiveEal(systemState.totalEal);
    }, [systemState.totalEal]);

    const handleApply = useCallback(
      (id: string) => {
        const delta = executeSimulatedFix(id);
        if (delta > 0) setLiveEal((v) => Math.max(0, v - delta));
      },
      [executeSimulatedFix]
    );

    const handleReset = useCallback(() => {
      resetAll();
      setLiveEal(systemState.totalEal);
    }, [resetAll, systemState.totalEal]);

    const pctReduced = useMemo(() => {
      if (systemState.totalEal <= 0) return 0;
      const cut = systemState.totalEal - liveEal;
      return Math.round((cut / systemState.totalEal) * 100);
    }, [systemState.totalEal, liveEal]);

    return (
      <section
        className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
        aria-labelledby="remediation-heading"
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <Shield className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2
                id="remediation-heading"
                className="text-base lg:text-lg font-semibold text-white flex items-center gap-2"
              >
                Remediation Action Center
                <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                  REI-RANKED
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Highest-ROI fixes first · ΔEAL / (hours × $50 + cost)
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={summary.appliedCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
              summary.appliedCount > 0
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-slate-900/80 text-slate-600 border-slate-800 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            Reset Fixes
            {summary.appliedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-[9px] font-bold">
                {summary.appliedCount}
              </span>
            )}
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <Kpi
            label="Total Playbooks"
            value={String(summary.totalPlaybooks)}
            sub="derived from live threats"
            accent="text-slate-300"
            icon={Terminal}
          />
          <Kpi
            label="Addressable ΔEAL"
            value={fmtUsd(summary.totalAddressableEal)}
            sub="if every fix applied"
            accent="text-rose-400"
            icon={Flame}
          />
          <Kpi
            label="Engineering Hours"
            value={`${summary.totalEngineeringHours}h`}
            sub={`+ ${fmtUsd(summary.totalToolingCost)} tooling`}
            accent="text-cyan-400"
            icon={Clock}
          />
          <Kpi
            label="Live System EAL"
            value={fmtUsd(liveEal)}
            sub={pctReduced > 0 ? `−${pctReduced}% from fixes` : 'no fixes applied'}
            accent={pctReduced > 0 ? 'text-emerald-400' : 'text-amber-400'}
            icon={TrendingDown}
          />
        </div>

        {/* Playbooks list */}
        {playbooks.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-lg p-8 text-center">
            <Sparkles className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              No actionable playbooks — all monitored assets are healthy
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {playbooks.map((pb) => (
              <PlaybookCard key={pb.id} playbook={pb} onApply={handleApply} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-slate-400">
              REI = ΔEAL ÷ (hours × $50 + tooling cost)
            </span>
          </span>
          <span className="ml-auto text-[10px] font-mono text-slate-500">
            Simulated execution · no real infrastructure changed
          </span>
        </div>
      </section>
    );
  }
);
RemediationPlaybookView.displayName = 'RemediationPlaybookView';

export default RemediationPlaybookView;