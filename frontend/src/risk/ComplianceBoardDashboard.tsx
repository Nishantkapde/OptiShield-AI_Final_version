// frontend/src/risk/ComplianceBoardDashboard.tsx
// Executive board view — risk appetite meter + framework coverage + audit export.
import React, { memo, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  Shield,
  ShieldAlert,
  TrendingDown,
} from 'lucide-react';
import { useComplianceMapper } from './useComplianceMapper';
import {
  downloadExecutiveReport,
  type ExecutiveReportInput,
} from './complianceEngine';
import {
  FRAMEWORK_LABELS,
  type FrameworkType,
  type RiskAppetiteConfig,
  type SecurityControl,
  type VaRMetrics,
} from './schema';

// ============================================================
// Formatters
// ============================================================
const fmtUsd = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
};

const fmtUsdSigned = (n: number): string =>
  `${n >= 0 ? '+' : ''}${fmtUsd(n)}`;

// ============================================================
// Framework accent
// ============================================================
const FRAMEWORK_COLORS: Record<FrameworkType, { bar: string; text: string }> = {
  SEBI_CSCRF:   { bar: 'bg-emerald-500', text: 'text-emerald-400' },
  ISO_27001:    { bar: 'bg-cyan-500',    text: 'text-cyan-400'    },
  NIST_CSF_2_0: { bar: 'bg-amber-500',   text: 'text-amber-400'   },
};

// ============================================================
// Sub-component: appetite meter
// ============================================================
interface AppetiteMeterProps {
  var95: number;
  maxAcceptable: number;
  utilisationPct: number;
  status: 'ok' | 'warning' | 'breach';
  deltaUsd: number;
}

const AppetiteMeter = memo<AppetiteMeterProps>(
  ({ var95, maxAcceptable, utilisationPct, status, deltaUsd }) => {
    const colors =
      status === 'breach'
        ? { bar: 'bg-rose-500', text: 'text-rose-400', chip: 'bg-rose-500/10 border-rose-500/30' }
        : status === 'warning'
        ? { bar: 'bg-amber-500', text: 'text-amber-400', chip: 'bg-amber-500/10 border-amber-500/30' }
        : { bar: 'bg-emerald-500', text: 'text-emerald-400', chip: 'bg-emerald-500/10 border-emerald-500/30' };

    const StatusIcon =
      status === 'breach' ? ShieldAlert : status === 'warning' ? AlertTriangle : CheckCircle2;

    const statusLabel =
      status === 'breach' ? 'BREACH' : status === 'warning' ? 'NEAR LIMIT' : 'WITHIN APPETITE';

    return (
      <div className={`bg-slate-900/80 border rounded-lg p-4 ${colors.chip}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className={`w-4 h-4 ${colors.text}`} />
            <span className="text-xs font-medium text-slate-300">
              Board Risk Appetite — 95% VaR
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${colors.chip} ${colors.text}`}
          >
            <StatusIcon className="w-3 h-3" />
            {statusLabel}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Board Limit
            </p>
            <p className="text-sm font-mono font-bold text-slate-300 tabular-nums mt-0.5">
              {fmtUsd(maxAcceptable)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Current VaR95
            </p>
            <p className={`text-sm font-mono font-bold tabular-nums mt-0.5 ${colors.text}`}>
              {fmtUsd(var95)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              {deltaUsd >= 0 ? 'Over Limit' : 'Headroom'}
            </p>
            <p
              className={`text-sm font-mono font-bold tabular-nums mt-0.5 ${
                deltaUsd >= 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {deltaUsd >= 0 ? fmtUsdSigned(deltaUsd) : fmtUsd(Math.abs(deltaUsd))}
            </p>
          </div>
        </div>

        {/* Utilisation bar */}
        <div className="relative w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${utilisationPct}%` }}
            role="progressbar"
            aria-valuenow={utilisationPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
          {/* 80% warning marker */}
          <div
            className="absolute top-0 bottom-0 w-px bg-slate-600"
            style={{ left: '80%' }}
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] font-mono text-slate-600">0%</span>
          <span className="text-[10px] font-mono text-slate-500">{utilisationPct}% utilised</span>
          <span className="text-[10px] font-mono text-slate-600">100%+</span>
        </div>
      </div>
    );
  }
);
AppetiteMeter.displayName = 'AppetiteMeter';

// ============================================================
// Sub-component: framework coverage row
// ============================================================
interface FrameworkRowProps {
  framework: FrameworkType;
  coveragePct: number;
  satisfied: number;
  missing: number;
}

const FrameworkRow = memo<FrameworkRowProps>(
  ({ framework, coveragePct, satisfied, missing }) => {
    const colors = FRAMEWORK_COLORS[framework];
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-300">
            {FRAMEWORK_LABELS[framework]}
          </span>
          <span className={`text-sm font-mono font-bold ${colors.text}`}>
            {coveragePct}%
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${coveragePct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-slate-500 font-mono">
            <CheckCircle2 className="w-2.5 h-2.5 inline mr-1 -mt-px text-emerald-400" />
            {satisfied} satisfied
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {missing > 0 && (
              <ShieldAlert className="w-2.5 h-2.5 inline mr-1 -mt-px text-rose-400" />
            )}
            {missing} missing
          </span>
        </div>
      </div>
    );
  }
);
FrameworkRow.displayName = 'FrameworkRow';

// ============================================================
// Props
// ============================================================
interface ComplianceBoardDashboardProps {
  selectedControls: SecurityControl[];
  varMetrics: VaRMetrics;
  appetiteConfig: RiskAppetiteConfig;
  cyberBudget: number;
  threatLevel: number;
}

// ============================================================
// Main component
// ============================================================
const ComplianceBoardDashboard = memo<ComplianceBoardDashboardProps>(
  ({ selectedControls, varMetrics, appetiteConfig, cyberBudget, threatLevel }) => {
    const { complianceStatuses, appetiteUtilisation, averageCoverage } =
      useComplianceMapper(selectedControls, varMetrics, appetiteConfig);

    const handleDownload = useCallback(() => {
      const report: ExecutiveReportInput = {
        generatedAt: new Date().toISOString(),
        cyberBudget,
        threatLevel,
        selectedControls,
        varMetrics,
        appetiteConfig,
        complianceStatuses,
      };
      downloadExecutiveReport(report);
    }, [
      cyberBudget,
      threatLevel,
      selectedControls,
      varMetrics,
      appetiteConfig,
      complianceStatuses,
    ]);

    const totalSatisfied = useMemo(
      () => complianceStatuses.reduce((s, c) => s + c.satisfiedControlIds.length, 0),
      [complianceStatuses]
    );
    const totalMissing = useMemo(
      () => complianceStatuses.reduce((s, c) => s + c.missingControlIds.length, 0),
      [complianceStatuses]
    );

    return (
      <section
        className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
        aria-labelledby="compliance-dashboard-heading"
      >
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2
                id="compliance-dashboard-heading"
                className="text-base lg:text-lg font-semibold text-white flex items-center gap-2"
              >
                Board Compliance Dashboard
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                  EXECUTIVE VIEW
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Regulatory coverage · risk appetite alignment · audit-ready export
              </p>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
            aria-label="Download audit-ready executive report"
          >
            <Download className="w-3.5 h-3.5" />
            Download Audit Report
            <FileText className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>

        {/* Appetite meter */}
        <AppetiteMeter
          var95={varMetrics.var95}
          maxAcceptable={appetiteConfig.maxAcceptableVar95}
          utilisationPct={appetiteUtilisation.utilisationPct}
          status={appetiteUtilisation.status}
          deltaUsd={appetiteUtilisation.deltaUsd}
        />

        {/* Aggregate strip */}
        <div className="grid grid-cols-3 gap-3 mt-4 mb-5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Avg Coverage
            </p>
            <p className="text-lg font-bold font-mono text-cyan-400 tabular-nums mt-1">
              {averageCoverage}%
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Controls Satisfied
            </p>
            <p className="text-lg font-bold font-mono text-emerald-400 tabular-nums mt-1">
              {totalSatisfied}
            </p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Gaps Remaining
            </p>
            <p className="text-lg font-bold font-mono text-rose-400 tabular-nums mt-1">
              {totalMissing}
            </p>
          </div>
        </div>

        {/* Framework rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {complianceStatuses.map((status) => (
            <FrameworkRow
              key={status.framework}
              framework={status.framework}
              coveragePct={status.coveragePercentage}
              satisfied={status.satisfiedControlIds.length}
              missing={status.missingControlIds.length}
            />
          ))}
        </div>

        {/* Interpretation footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5">
            <TrendingDown className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-slate-400">
              Appetite breach is framework-independent — driven by 95% VaR
            </span>
          </span>
          <span className="ml-auto text-[10px] font-mono text-slate-500">
            Report format: Markdown · generated client-side · no backend required
          </span>
        </div>
      </section>
    );
  }
);
ComplianceBoardDashboard.displayName = 'ComplianceBoardDashboard';

export default ComplianceBoardDashboard;