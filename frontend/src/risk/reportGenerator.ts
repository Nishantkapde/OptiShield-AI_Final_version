// frontend/src/risk/reportGenerator.ts
// Client-side report builder (Markdown + JSON) and Blob-based download.
import { FRAMEWORK_LABELS } from './schema';
import type {
  ActionablePlaybook,
  AuditLogEntry,
  ComplianceStatus,
  ReportExportConfig,
  SystemRiskSummary,
  VaRMetrics,
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

const fmtPct = (p: number): string => `${p.toFixed(1)}%`;

// ============================================================
// Markdown report
// ============================================================
export interface ReportInput {
  generatedAt: string;
  actor: string;
  summary: SystemRiskSummary;
  varMetrics: VaRMetrics | null;
  compliance: ComplianceStatus[];
  playbooks: ActionablePlaybook[];
  auditTail: AuditLogEntry[];
  config: ReportExportConfig;
}

export function generateExecutiveReportMarkdown(input: ReportInput): string {
  const {
    generatedAt,
    actor,
    summary,
    varMetrics,
    compliance,
    playbooks,
    auditTail,
    config,
  } = input;

  const lines: string[] = [];

  // ── Cover ────────────────────────────────────────────────
  lines.push('# OptiShield AI — Executive Risk Brief');
  lines.push('');
  lines.push(`**Generated:** ${generatedAt}  `);
  lines.push(`**Prepared by:** ${actor}  `);
  lines.push(`**Framework focus:** ${config.framework}  `);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── 1. Portfolio snapshot ────────────────────────────────
  lines.push('## 1. Portfolio Snapshot');
  lines.push('');
  lines.push(`- **System EAL:** ${fmtUsd(summary.totalEal)}`);
  lines.push(`- **Direct Loss (non-maintenance):** ${fmtUsd(summary.totalDirectLoss)}`);
  lines.push(`- **Assets Monitored:** ${summary.activeAssetCount}`);
  lines.push(`- **Last Event:** ${summary.lastEventProcessed?.eventType ?? '—'}`);
  lines.push(`- **Recalc Time:** ${summary.lastRecalculationTimeMs.toFixed(3)} ms`);
  lines.push('');

  // ── 2. Monte Carlo / VaR ─────────────────────────────────
  if (config.includeMonteCarloVaR && varMetrics) {
    lines.push('## 2. Stochastic Risk (Monte Carlo)');
    lines.push('');
    lines.push(`- **Iterations:** ${varMetrics.iterations.toLocaleString()}`);
    lines.push(`- **Mean EAL:** ${fmtUsd(varMetrics.meanEal)}`);
    lines.push(`- **Median Loss:** ${fmtUsd(varMetrics.medianLoss)}`);
    lines.push(`- **90% VaR:** ${fmtUsd(varMetrics.var90)}`);
    lines.push(`- **95% VaR:** ${fmtUsd(varMetrics.var95)}`);
    lines.push(`- **99% VaR:** ${fmtUsd(varMetrics.var99)}`);
    lines.push(`- **Max Probable Loss:** ${fmtUsd(varMetrics.maxProbableLoss)}`);
    lines.push('');
  }

  // ── 3. Compliance ────────────────────────────────────────
  if (compliance.length > 0) {
    lines.push('## 3. Regulatory Compliance Coverage');
    lines.push('');
    lines.push('| Framework | Coverage | Satisfied | Missing | Within Appetite |');
    lines.push('|-----------|----------|-----------|---------|-----------------|');
    for (const c of compliance) {
      lines.push(
        `| ${FRAMEWORK_LABELS[c.framework]} | ${fmtPct(c.coveragePercentage)} | ${c.satisfiedControlIds.length} | ${c.missingControlIds.length} | ${c.isWithinRiskAppetite ? 'Yes' : 'No'} |`
      );
    }
    lines.push('');
  }

  // ── 4. Remediation plan ──────────────────────────────────
  if (config.includeRemediationPlan && playbooks.length > 0) {
    lines.push('## 4. Top Remediation Actions (REI-Ranked)');
    lines.push('');
    lines.push('| Rank | Action | Target | ΔEAL | Effort | REI |');
    lines.push('|------|--------|--------|------|--------|-----|');
    playbooks.slice(0, 10).forEach((pb, idx) => {
      lines.push(
        `| ${idx + 1} | ${pb.action.title} | ${pb.action.targetAssetId} | ${fmtUsd(pb.potentialEalReduction)} | ${pb.action.estimatedHours}h | ${pb.reiScore.toFixed(0)} |`
      );
    });
    lines.push('');
  }

  // ── 5. Audit tail ────────────────────────────────────────
  if (auditTail.length > 0) {
    lines.push('## 5. Audit Trail (Most Recent 10 Events)');
    lines.push('');
    lines.push('| Time | Action | Actor | Hash (first 12) |');
    lines.push('|------|--------|-------|------------------|');
    auditTail.slice(0, 10).forEach((e) => {
      lines.push(
        `| ${new Date(e.timestamp).toLocaleString()} | ${e.actionType} | ${e.actor} | \`${e.currentHash.slice(0, 12)}…\` |`
      );
    });
    lines.push('');
  }

  // ── Footer ───────────────────────────────────────────────
  lines.push('---');
  lines.push('');
  lines.push('_Confidential · Distribution restricted to Board & CISO · SEBI CSCRF / ISO 27001 aligned._');

  return lines.join('\n');
}

// ============================================================
// JSON report
// ============================================================
export function generateExecutiveReportJSON(input: ReportInput): string {
  const {
    generatedAt,
    actor,
    summary,
    varMetrics,
    compliance,
    playbooks,
    auditTail,
    config,
  } = input;

  const payload = {
    meta: {
      product: 'OptiShield AI',
      version: '3.2.1',
      generatedAt,
      actor,
      framework: config.framework,
      includeMonteCarloVaR: config.includeMonteCarloVaR,
      includeRemediationPlan: config.includeRemediationPlan,
    },
    summary,
    var: config.includeMonteCarloVaR ? varMetrics : null,
    compliance,
    remediation: config.includeRemediationPlan
      ? playbooks.map((pb) => ({
          id: pb.id,
          title: pb.action.title,
          target: pb.action.targetAssetId,
          category: pb.action.category,
          potentialEalReduction: pb.potentialEalReduction,
          estimatedHours: pb.action.estimatedHours,
          reiScore: pb.reiScore,
          status: pb.executionStatus,
        }))
      : [],
    auditTail: auditTail.slice(0, 20),
  };

  return JSON.stringify(payload, null, 2);
}

// ============================================================
// Blob-based download — native browser APIs, no libraries
// ============================================================
export function downloadReportFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  // A Blob wraps raw content in an immutable binary container.
  // URL.createObjectURL gives us a temporary browser URL that
  // can be attached to an <a download> element.
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Release the memory held by the object URL
  URL.revokeObjectURL(url);
}

// ============================================================
// Convenience — dispatch based on chosen format
// ============================================================
export function exportReport(
  input: ReportInput,
  format: ReportExportConfig['format']
): void {
  const date = new Date().toISOString().slice(0, 10);

  if (format === 'JSON') {
    const json = generateExecutiveReportJSON(input);
    downloadReportFile(json, `optishield-report-${date}.json`, 'application/json');
    return;
  }

  // Default: Markdown (also used as fallback for PDF, which
  // requires a rendering library — the browser print dialog is
  // the dependency-free alternative and is documented in the UI).
  const md = generateExecutiveReportMarkdown(input);
  if (format === 'PDF') {
    // Open a print-ready window — user can Save as PDF from the dialog.
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(
        `<!doctype html><html><head><title>OptiShield Report</title>` +
          `<style>body{font-family:ui-monospace,Menlo,monospace;padding:32px;max-width:820px;margin:auto;line-height:1.55;color:#111}h1{border-bottom:2px solid #111;padding-bottom:8px}h2{margin-top:32px;color:#333}pre{white-space:pre-wrap;font-size:12px;background:#f6f6f6;padding:12px;border-radius:6px}</style>` +
          `</head><body><pre>${md.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>` +
          `<script>window.onload=()=>window.print()</script></body></html>`
      );
      win.document.close();
    }
    return;
  }

  downloadReportFile(md, `optishield-report-${date}.md`, 'text/markdown');
}