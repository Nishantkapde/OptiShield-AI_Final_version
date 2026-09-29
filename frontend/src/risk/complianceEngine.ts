// frontend/src/risk/complianceEngine.ts
// Regulatory framework mapping + board risk appetite evaluation.
//
// ── Matching logic ──────────────────────────────────────────
// Each RegulatoryControl declares a requiredControlCategory.
// A control from the PP2 optimizer satisfies the requirement
// iff its `category` string equals that value.
//
// ── Coverage calculation ────────────────────────────────────
// coverage% = Σ(weight of satisfied controls)
//           / Σ(weight of all required controls)   × 100
//
// Weighted scoring reflects that not all controls carry
// equal regulatory weight — a CISO gets more credit for
// funding a high-weight control than a low-weight one.
//
// ── Risk appetite breach ────────────────────────────────────
// varBreachAmount = VaR95 − maxAcceptableVar95
// Positive  →  breached  →  red
// Negative  →  headroom  →  green
import {
  FRAMEWORK_LABELS,
  type ComplianceStatus,
  type FrameworkType,
  type RegulatoryControl,
  type RiskAppetiteConfig,
  type SecurityControl,
  type VaRMetrics,
} from './schema';

// ============================================================
// Built-in regulatory control catalogs
// ============================================================

export const SEBI_CSCRF_CONTROLS: readonly RegulatoryControl[] = Object.freeze([
  { id: 'sc-01', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-01', title: 'Cyber Security Policy & Governance',   requiredControlCategory: 'GOV',     weight: 10 },
  { id: 'sc-02', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-02', title: 'Asset Inventory Management',           requiredControlCategory: 'VM',      weight: 9  },
  { id: 'sc-03', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-03', title: 'Identity & Access Management',         requiredControlCategory: 'IAM',     weight: 10 },
  { id: 'sc-04', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-04', title: 'Privileged Access Management',         requiredControlCategory: 'IAM',     weight: 9  },
  { id: 'sc-05', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-05', title: 'Data Classification & Protection',     requiredControlCategory: 'DLP',     weight: 8  },
  { id: 'sc-06', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-06', title: 'Network Security & Segmentation',      requiredControlCategory: 'Network', weight: 8  },
  { id: 'sc-07', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-07', title: 'Vulnerability Management',             requiredControlCategory: 'VM',      weight: 9  },
  { id: 'sc-08', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-08', title: 'Patch Management',                     requiredControlCategory: 'VM',      weight: 8  },
  { id: 'sc-09', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-09', title: 'Security Incident Management',         requiredControlCategory: 'SIEM',    weight: 10 },
  { id: 'sc-10', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-10', title: 'Business Continuity Planning',         requiredControlCategory: 'GOV',     weight: 9  },
  { id: 'sc-11', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-11', title: 'Disaster Recovery',                    requiredControlCategory: 'GOV',     weight: 9  },
  { id: 'sc-12', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-12', title: 'Third-Party Risk Management',          requiredControlCategory: 'Cloud',   weight: 8  },
  { id: 'sc-13', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-13', title: 'Cloud Security Controls',              requiredControlCategory: 'Cloud',   weight: 8  },
  { id: 'sc-14', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-14', title: 'Encryption Standards',                 requiredControlCategory: 'DLP',     weight: 9  },
  { id: 'sc-15', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-15', title: 'Security Awareness Training',          requiredControlCategory: 'GOV',     weight: 7  },
  { id: 'sc-16', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-16', title: 'Log Management & Monitoring',          requiredControlCategory: 'SIEM',    weight: 9  },
  { id: 'sc-17', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-17', title: 'Threat Intelligence Integration',      requiredControlCategory: 'EDR',     weight: 7  },
  { id: 'sc-18', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-18', title: 'Application Security Testing',         requiredControlCategory: 'VM',      weight: 8  },
  { id: 'sc-19', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-19', title: 'API Security Controls',                requiredControlCategory: 'Network', weight: 9  },
  { id: 'sc-20', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-20', title: 'Regulatory Reporting Automation',      requiredControlCategory: 'GOV',     weight: 7  },
  { id: 'sc-21', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-21', title: 'Cyber Crisis Management Plan',         requiredControlCategory: 'GOV',     weight: 9  },
  { id: 'sc-22', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-22', title: 'Forensic Readiness',                   requiredControlCategory: 'EDR',     weight: 8  },
  { id: 'sc-23', framework: 'SEBI_CSCRF', controlCode: 'CSCRF-23', title: 'Continuous Compliance Monitoring',     requiredControlCategory: 'SIEM',    weight: 8  },
]);

export const ISO_27001_CONTROLS: readonly RegulatoryControl[] = Object.freeze([
  { id: 'iso-01', framework: 'ISO_27001', controlCode: 'A.5.1',   title: 'Policies for Information Security',        requiredControlCategory: 'GOV',     weight: 9  },
  { id: 'iso-02', framework: 'ISO_27001', controlCode: 'A.5.15',  title: 'Access Control',                           requiredControlCategory: 'IAM',     weight: 10 },
  { id: 'iso-03', framework: 'ISO_27001', controlCode: 'A.5.17',  title: 'Authentication Information',               requiredControlCategory: 'IAM',     weight: 9  },
  { id: 'iso-04', framework: 'ISO_27001', controlCode: 'A.8.1',   title: 'User Endpoint Devices',                    requiredControlCategory: 'EDR',     weight: 9  },
  { id: 'iso-05', framework: 'ISO_27001', controlCode: 'A.8.7',   title: 'Protection Against Malware',               requiredControlCategory: 'EDR',     weight: 10 },
  { id: 'iso-06', framework: 'ISO_27001', controlCode: 'A.8.12',  title: 'Data Leakage Prevention',                  requiredControlCategory: 'DLP',     weight: 9  },
  { id: 'iso-07', framework: 'ISO_27001', controlCode: 'A.8.16',  title: 'Monitoring Activities',                    requiredControlCategory: 'SIEM',    weight: 10 },
  { id: 'iso-08', framework: 'ISO_27001', controlCode: 'A.8.20',  title: 'Networks Security',                        requiredControlCategory: 'Network', weight: 8  },
  { id: 'iso-09', framework: 'ISO_27001', controlCode: 'A.8.23',  title: 'Web Filtering',                            requiredControlCategory: 'Network', weight: 7  },
  { id: 'iso-10', framework: 'ISO_27001', controlCode: 'A.8.28',  title: 'Secure Coding',                            requiredControlCategory: 'VM',      weight: 7  },
  { id: 'iso-11', framework: 'ISO_27001', controlCode: 'A.5.23',  title: 'Cloud Services Security',                  requiredControlCategory: 'Cloud',   weight: 8  },
]);

export const NIST_CSF_CONTROLS: readonly RegulatoryControl[] = Object.freeze([
  { id: 'nist-01', framework: 'NIST_CSF_2_0', controlCode: 'GV.OC-01', title: 'Organizational Context',              requiredControlCategory: 'GOV',     weight: 8  },
  { id: 'nist-02', framework: 'NIST_CSF_2_0', controlCode: 'ID.AM-01', title: 'Asset Inventory',                     requiredControlCategory: 'VM',      weight: 9  },
  { id: 'nist-03', framework: 'NIST_CSF_2_0', controlCode: 'PR.AA-01', title: 'Identity Management & Access Control', requiredControlCategory: 'IAM',    weight: 10 },
  { id: 'nist-04', framework: 'NIST_CSF_2_0', controlCode: 'PR.DS-01', title: 'Data-at-Rest Protection',             requiredControlCategory: 'DLP',     weight: 9  },
  { id: 'nist-05', framework: 'NIST_CSF_2_0', controlCode: 'PR.PS-01', title: 'Configuration Management',            requiredControlCategory: 'VM',      weight: 8  },
  { id: 'nist-06', framework: 'NIST_CSF_2_0', controlCode: 'PR.IR-01', title: 'Network Protection',                  requiredControlCategory: 'Network', weight: 9  },
  { id: 'nist-07', framework: 'NIST_CSF_2_0', controlCode: 'DE.CM-01', title: 'Network Monitoring',                  requiredControlCategory: 'SIEM',    weight: 10 },
  { id: 'nist-08', framework: 'NIST_CSF_2_0', controlCode: 'DE.AE-02', title: 'Event Analysis',                      requiredControlCategory: 'EDR',     weight: 9  },
  { id: 'nist-09', framework: 'NIST_CSF_2_0', controlCode: 'RS.AN-03', title: 'Incident Analysis',                   requiredControlCategory: 'EDR',     weight: 8  },
  { id: 'nist-10', framework: 'NIST_CSF_2_0', controlCode: 'RC.RP-01', title: 'Recovery Plan Execution',             requiredControlCategory: 'GOV',     weight: 7  },
]);

/** Framework → catalog lookup. */
export const FRAMEWORK_CONTROLS: Record<FrameworkType, readonly RegulatoryControl[]> = {
  SEBI_CSCRF: SEBI_CSCRF_CONTROLS,
  ISO_27001: ISO_27001_CONTROLS,
  NIST_CSF_2_0: NIST_CSF_CONTROLS,
};

// ============================================================
// Core evaluation
// ============================================================

/**
 * Weighted coverage of one framework given a set of selected controls.
 *
 *   coverage% = Σ(weight of satisfied reqs)
 *             / Σ(weight of all reqs) × 100
 *
 * A requirement is "satisfied" when at least one selected control's
 * `category` equals the requirement's `requiredControlCategory`.
 * Additional controls with the same category do not double-count.
 */
function evaluateFrameworkCoverage(
  framework: FrameworkType,
  selectedControls: SecurityControl[]
): Pick<ComplianceStatus, 'framework' | 'coveragePercentage' | 'satisfiedControlIds' | 'missingControlIds'> {
  const required = FRAMEWORK_CONTROLS[framework];
  const implementedCategories = new Set(selectedControls.map((c) => c.category));

  let satisfiedWeight = 0;
  let totalWeight = 0;
  const satisfiedControlIds: string[] = [];
  const missingControlIds: string[] = [];

  for (const req of required) {
    totalWeight += req.weight;
    if (implementedCategories.has(req.requiredControlCategory)) {
      satisfiedWeight += req.weight;
      satisfiedControlIds.push(req.id);
    } else {
      missingControlIds.push(req.id);
    }
  }

  const coveragePercentage =
    totalWeight > 0 ? (satisfiedWeight / totalWeight) * 100 : 0;

  return {
    framework,
    coveragePercentage: Number(coveragePercentage.toFixed(1)),
    satisfiedControlIds,
    missingControlIds,
  };
}

/**
 * Evaluate all three frameworks against the current portfolio and
 * check the board risk appetite for 95% VaR.
 *
 * @param selectedControls  From the PP2 optimizer's recommended list
 * @param varMetrics        From the PP5 Monte Carlo engine
 * @param appetiteConfig    Board-approved limits
 */
export function evaluateComplianceAndAppetite(
  selectedControls: SecurityControl[],
  varMetrics: VaRMetrics,
  appetiteConfig: RiskAppetiteConfig
): ComplianceStatus[] {
  const frameworks: FrameworkType[] = ['SEBI_CSCRF', 'ISO_27001', 'NIST_CSF_2_0'];

  // Appetite is framework-independent — compute once.
  const varBreachAmount = varMetrics.var95 - appetiteConfig.maxAcceptableVar95;
  const isWithinRiskAppetite = varBreachAmount <= 0;

  return frameworks.map((fw) => {
    const coverage = evaluateFrameworkCoverage(fw, selectedControls);
    return {
      ...coverage,
      isWithinRiskAppetite,
      varBreachAmount: Math.round(varBreachAmount),
    };
  });
}

// ============================================================
// Derived helpers for the UI
// ============================================================

export interface AppetiteUtilisation {
  /** 0..∞ — 1.0 means exactly at the limit */
  utilisation: number;
  /** 0..100 — clamped for the meter bar */
  utilisationPct: number;
  /** 'ok' | 'warning' | 'breach' */
  status: 'ok' | 'warning' | 'breach';
  /** Signed headroom (positive) or breach (negative) USD */
  deltaUsd: number;
}

export function computeAppetiteUtilisation(
  var95: number,
  maxAcceptableVar95: number,
  warningThreshold = 0.8
): AppetiteUtilisation {
  if (maxAcceptableVar95 <= 0) {
    return { utilisation: 0, utilisationPct: 0, status: 'ok', deltaUsd: 0 };
  }
  const utilisation = var95 / maxAcceptableVar95;
  const utilisationPct = Math.min(100, Math.round(utilisation * 100));
  const status: AppetiteUtilisation['status'] =
    utilisation > 1 ? 'breach' : utilisation >= warningThreshold ? 'warning' : 'ok';
  return {
    utilisation,
    utilisationPct,
    status,
    deltaUsd: var95 - maxAcceptableVar95,
  };
}

// ============================================================
// Executive report generator (client-side, no backend)
// ============================================================

export interface ExecutiveReportInput {
  generatedAt: string;
  cyberBudget: number;
  threatLevel: number;
  selectedControls: SecurityControl[];
  varMetrics: VaRMetrics;
  appetiteConfig: RiskAppetiteConfig;
  complianceStatuses: ComplianceStatus[];
}

/**
 * Renders a Markdown executive report — safe to write to a Blob
 * and download as a .md file. Zero network dependencies.
 */
export function generateExecutiveReportMarkdown(
  input: ExecutiveReportInput
): string {
  const {
    generatedAt,
    cyberBudget,
    threatLevel,
    selectedControls,
    varMetrics,
    appetiteConfig,
    complianceStatuses,
  } = input;

  const util = computeAppetiteUtilisation(
    varMetrics.var95,
    appetiteConfig.maxAcceptableVar95
  );

  const fmtUsd = (n: number): string => {
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
    return `${sign}$${Math.round(abs)}`;
  };

  const lines: string[] = [];

  lines.push('# OptiShield AI — Executive Risk Report');
  lines.push('');
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 1. Portfolio snapshot
  lines.push('## 1. Portfolio Snapshot');
  lines.push('');
  lines.push(`- **Cyber Budget (Annual):** ${fmtUsd(cyberBudget)}`);
  lines.push(`- **Threat Environment:** ${threatLevel}/100`);
  lines.push(`- **Selected Controls:** ${selectedControls.length}`);
  lines.push('');

  // 2. Monte Carlo / VaR
  lines.push('## 2. Stochastic Risk Summary (Monte Carlo)');
  lines.push('');
  lines.push(`- **Iterations:** ${varMetrics.iterations.toLocaleString()}`);
  lines.push(`- **Mean EAL:** ${fmtUsd(varMetrics.meanEal)}`);
  lines.push(`- **Median Loss:** ${fmtUsd(varMetrics.medianLoss)}`);
  lines.push(`- **90% VaR:** ${fmtUsd(varMetrics.var90)}`);
  lines.push(`- **95% VaR:** ${fmtUsd(varMetrics.var95)}`);
  lines.push(`- **99% VaR:** ${fmtUsd(varMetrics.var99)}`);
  lines.push(`- **Max Probable Loss:** ${fmtUsd(varMetrics.maxProbableLoss)}`);
  lines.push('');

  // 3. Risk appetite
  lines.push('## 3. Board Risk Appetite');
  lines.push('');
  lines.push(`- **Board Limit (95% VaR):** ${fmtUsd(appetiteConfig.maxAcceptableVar95)}`);
  lines.push(`- **Current 95% VaR:** ${fmtUsd(varMetrics.var95)}`);
  lines.push(
    `- **Status:** ${
      util.status === 'breach'
        ? `❌ BREACH (${fmtUsd(util.deltaUsd)})`
        : util.status === 'warning'
        ? `⚠️ WARNING (${util.utilisationPct}% utilised)`
        : `✅ WITHIN APPETITE (${util.utilisationPct}% utilised)`
    }`
  );
  lines.push('');

  // 4. Compliance per framework
  lines.push('## 4. Regulatory Compliance Coverage');
  lines.push('');
  for (const status of complianceStatuses) {
    lines.push(`### ${FRAMEWORK_LABELS[status.framework]}`);
    lines.push('');
    lines.push(`- **Coverage:** ${status.coveragePercentage}%`);
    lines.push(
      `- **Satisfied:** ${status.satisfiedControlIds.length} · **Missing:** ${status.missingControlIds.length}`
    );
    lines.push(
      `- **Within Risk Appetite:** ${status.isWithinRiskAppetite ? 'Yes' : 'No'}`
    );
    lines.push('');
  }

  // 5. Selected controls roster
  lines.push('## 5. Selected Controls');
  lines.push('');
  lines.push('| Control | Category | Cost | ΔEAL |');
  lines.push('|---------|----------|------|------|');
  for (const c of selectedControls) {
    lines.push(
      `| ${c.name} | ${c.category} | ${fmtUsd(c.cost)} | ${fmtUsd(c.riskReductionEal)} |`
    );
  }
  lines.push('');

  // 6. Sign-off block
  lines.push('---');
  lines.push('');
  lines.push('_Prepared by OptiShield AI · Confidential · Distribution restricted to Board & CISO._');

  return lines.join('\n');
}

/** Trigger a browser download of the report as a .md file. */
export function downloadExecutiveReport(input: ExecutiveReportInput): void {
  const md = generateExecutiveReportMarkdown(input);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `optishield-executive-report-${new Date()
    .toISOString()
    .slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}