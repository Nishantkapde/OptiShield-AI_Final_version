// frontend/src/risk/AuditReportModal.tsx
// Modal — view the SHA-256 chained audit ledger + export reports.
import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Download,
  FileJson,
  FileText,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { exportReport, type ReportInput } from './reportGenerator';
import type {
  ActionablePlaybook,
  AuditLogEntry,
  ComplianceStatus,
  ReportExportConfig,
  ReportExportFormat,
  SystemRiskSummary,
  VaRMetrics,
} from './schema';
import type { LedgerVerification } from './auditEngine';

// ============================================================
// Format metadata
// ============================================================
const FORMAT_OPTIONS: { id: ReportExportFormat; label: string; icon: React.ElementType }[] = [
  { id: 'MARKDOWN', label: 'Markdown', icon: FileText },
  { id: 'JSON', label: 'JSON', icon: FileJson },
  { id: 'PDF', label: 'PDF (Print)', icon: FileText },
];

// ============================================================
// Props
// ============================================================
interface AuditReportModalProps {
  open: boolean;
  onClose: () => void;
  auditLog: AuditLogEntry[];
  ledgerStatus: LedgerVerification | null;
  summary: SystemRiskSummary;
  varMetrics: VaRMetrics | null;
  compliance: ComplianceStatus[];
  playbooks: ActionablePlaybook[];
  frameworkLabel: string;
}

// ============================================================
// Sub-component: single ledger row
// ============================================================
const LedgerRow = memo<{ entry: AuditLogEntry; index: number }>(
  ({ entry, index }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(entry.currentHash);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      } catch {
        /* ignore */
      }
    }, [entry.currentHash]);

    return (
      <div className="grid grid-cols-12 gap-2 px-3 py-2.5 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors">
        <div className="col-span-1 text-[10px] font-mono text-slate-500 self-center">
          #{index + 1}
        </div>
        <div className="col-span-2 text-[10px] font-mono text-slate-400 self-center">
          {new Date(entry.timestamp).toLocaleTimeString()}
        </div>
        <div className="col-span-3">
          <span className="text-[10px] font-mono font-semibold text-cyan-400">
            {entry.actionType}
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate" title={entry.actor}>
            {entry.actor}
          </p>
        </div>
        <div className="col-span-4 self-center">
          <p className="text-[10px] text-slate-400 truncate" title={entry.details}>
            {entry.details}
          </p>
        </div>
        <div className="col-span-2 flex items-center justify-end gap-1">
          <span className="text-[9px] font-mono text-emerald-400 truncate max-w-[80px]">
            {entry.currentHash.slice(0, 10)}…
          </span>
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-slate-700/60 transition-colors"
            aria-label="Copy hash"
            title="Copy full hash"
          >
            {copied ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-slate-500" />
            )}
          </button>
        </div>
      </div>
    );
  }
);
LedgerRow.displayName = 'LedgerRow';

// ============================================================
// Main component
// ============================================================
const AuditReportModal = memo<AuditReportModalProps>(
  ({
    open,
    onClose,
    auditLog,
    ledgerStatus,
    summary,
    varMetrics,
    compliance,
    playbooks,
    frameworkLabel,
  }) => {
    const [format, setFormat] = useState<ReportExportFormat>('MARKDOWN');

    const tail = useMemo(() => [...auditLog].reverse().slice(0, 20), [auditLog]);

    const handleExport = useCallback(() => {
      const config: ReportExportConfig = {
        framework: frameworkLabel,
        includeMonteCarloVaR: varMetrics !== null,
        includeRemediationPlan: true,
        format,
      };
      const input: ReportInput = {
        generatedAt: new Date().toISOString(),
        actor: 'operator@optishield',
        summary,
        varMetrics,
        compliance,
        playbooks,
        auditTail: [...auditLog].reverse(),
        config,
      };
      exportReport(input, format);
    }, [format, frameworkLabel, summary, varMetrics, compliance, playbooks, auditLog]);

    if (!open) return null;

    const isValid = ledgerStatus?.valid ?? true;
    const entryCount = ledgerStatus?.entriesChecked ?? auditLog.length;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-heading"
        onClick={onClose}
      >
        <div
          className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <Fingerprint className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2
                  id="audit-modal-heading"
                  className="text-base font-semibold text-white"
                >
                  Audit Ledger & Report Export
                </h2>
                <p className="text-xs text-slate-400">
                  SHA-256 hash chain · {entryCount} entries · IndexedDB-persisted
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Ledger status banner */}
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                isValid
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-rose-500/5 border-rose-500/30'
              }`}
            >
              {isValid ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-400">
                      Ledger integrity verified
                    </p>
                    <p className="text-[10px] font-mono text-emerald-400/70 mt-0.5">
                      All {entryCount} hashes chain correctly back to genesis
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-rose-400">
                      Ledger integrity broken
                    </p>
                    <p className="text-[10px] font-mono text-rose-400/70 mt-0.5">
                      Tamper detected at entry index {ledgerStatus?.brokenAtIndex}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Ledger table */}
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800 text-[10px] uppercase tracking-wide text-slate-500 font-medium">
                <div className="col-span-1">#</div>
                <div className="col-span-2">Time</div>
                <div className="col-span-3">Action</div>
                <div className="col-span-4">Details</div>
                <div className="col-span-2 text-right">Hash</div>
              </div>
              {tail.length === 0 ? (
                <div className="p-8 text-center">
                  <Fingerprint className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    No audit entries yet — actions will be logged here.
                  </p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {tail.map((entry, idx) => (
                    <LedgerRow
                      key={entry.id}
                      entry={entry}
                      index={auditLog.length - 1 - idx}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Export panel */}
            <div className="border border-slate-800 rounded-lg p-4 bg-slate-900/40">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">
                  Export Executive Brief
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {FORMAT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = format === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setFormat(opt.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                        active
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Board-Ready Brief ({format})
              </button>

              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Report generated entirely in your browser · no data leaves this device ·
                includes summary, VaR, compliance, remediation plan, and the last 20 audit entries.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
AuditReportModal.displayName = 'AuditReportModal';

export default AuditReportModal;