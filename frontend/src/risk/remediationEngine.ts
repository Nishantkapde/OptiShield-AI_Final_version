// frontend/src/risk/remediationEngine.ts
// Maps correlated threats → ranked technical playbooks.
//
// ── REI formula ──────────────────────────────────────────────
// REI = potentialEalReduction / (estimatedHours × $50 + costEstimate)
//
// The denominator is a normalised "cost of the fix" in USD:
// engineering time valued at $50/hr plus any tooling cost.
// Higher REI = more dollars of annual risk avoided per dollar
// spent on the fix — the classic ROI ordering.
import {
  BASE_EAL_PER_SIGNAL,
  ENGINEERING_HOURLY_RATE,
  SOURCE_WEIGHTS,
  type ActionablePlaybook,
  type CorrelatedAssetThreat,
  type RemediationCategory,
  type SystemRiskSummary,
  type TechnicalAction,
  type TelemetrySource,
} from './schema';

// ============================================================
// Static lookup — how each source maps to a remediation playbook
// ============================================================
interface PlaybookTemplate {
  category: RemediationCategory;
  titlePrefix: string;
  estimatedHours: number;
  costEstimate: number;
  commandScriptSnippet: (assetId: string) => string;
}

const SOURCE_PLAYBOOK: Record<TelemetrySource, PlaybookTemplate> = {
  EDR: {
    category: 'PATCH_MANAGEMENT',
    titlePrefix: 'Patch vulnerable endpoint binaries on',
    estimatedHours: 4,
    costEstimate: 200,
    commandScriptSnippet: (assetId) =>
      `# Patch EDR-managed hosts on ${assetId}\n` +
      `ansible-playbook -i ${assetId}, patch-rollout.yml \\\n` +
      `  --extra-vars "reboot=true require_cve_scan=true"\n`,
  },
  IAM: {
    category: 'IAM_HARDENING',
    titlePrefix: 'Enforce MFA + least-privilege on',
    estimatedHours: 2,
    costEstimate: 0,
    commandScriptSnippet: (assetId) =>
      `# Harden identity policy for ${assetId}\n` +
      `aws iam put-role-policy \\\n` +
      `  --role-name ${assetId}-role \\\n` +
      `  --policy-name EnforceMFA \\\n` +
      `  --policy-document file://mfa-policy.json\n`,
  },
  SIEM: {
    category: 'NETWORK_ISOLATION',
    titlePrefix: 'Isolate unusual outbound traffic from',
    estimatedHours: 3,
    costEstimate: 500,
    commandScriptSnippet: (assetId) =>
      `# Push microsegmentation rule to ${assetId}\n` +
      `terraform apply -var "asset=${assetId}" \\\n` +
      `  -var "egress=deny-untrusted" isolation.tfplan\n`,
  },
  CSPM: {
    category: 'CONFIG_REMEDIATION',
    titlePrefix: 'Remediate cloud misconfiguration on',
    estimatedHours: 1,
    costEstimate: 0,
    commandScriptSnippet: (assetId) =>
      `# Fix bucket ACL for ${assetId}\n` +
      `aws s3api put-bucket-acl --bucket ${assetId}-data \\\n` +
      `  --acl private --no-public-access-block=false\n`,
  },
};

// ============================================================
// Generate the ranked playbook list
// ============================================================

/**
 * @param activeThreats  Output of the PP4 correlator (or a filter of it)
 * @param systemState    Output of the PP3 delta engine (totalEal used
 *                       as an upper bound on addressable risk)
 */
export function generateRankedPlaybooks(
  activeThreats: CorrelatedAssetThreat[],
  systemState: SystemRiskSummary
): ActionablePlaybook[] {
  const playbooks: ActionablePlaybook[] = [];

  for (const threat of activeThreats) {
    // Only surface fixes for non-healthy assets
    if (threat.statusLabel === 'HEALTHY') continue;

    // Per source, take the MAX severity signal on this asset
    const maxSeverityBySource = new Map<TelemetrySource, number>();
    for (const signal of threat.activeSignals) {
      const prev = maxSeverityBySource.get(signal.source) ?? 0;
      if (signal.severityScore > prev) {
        maxSeverityBySource.set(signal.source, signal.severityScore);
      }
    }

    maxSeverityBySource.forEach((severity, source) => {
      const template = SOURCE_PLAYBOOK[source];
      const actionId = `act-${threat.assetId}-${source.toLowerCase()}`;

      // ΔEAL = severity × source weight × base-per-signal
      const rawReduction =
        severity * SOURCE_WEIGHTS[source] * BASE_EAL_PER_SIGNAL;
      // Cap at 25% of the system's total EAL so nothing dominates
      const potentialEalReduction = Math.round(
        Math.min(rawReduction, systemState.totalEal * 0.25)
      );

      const action: TechnicalAction = {
        id: actionId,
        title: `${template.titlePrefix} ${threat.assetId}`,
        category: template.category,
        targetAssetId: threat.assetId,
        commandScriptSnippet: template.commandScriptSnippet(threat.assetId),
        estimatedHours: template.estimatedHours,
        costEstimate: template.costEstimate,
      };

      // ── REI math ────────────────────────────────────────────
      const fixCostUsd =
        template.estimatedHours * ENGINEERING_HOURLY_RATE + template.costEstimate;
      const reiScore =
        fixCostUsd > 0 ? potentialEalReduction / fixCostUsd : 0;

      playbooks.push({
        id: `pb-${actionId}`,
        action,
        addressableThreatId: threat.assetId,
        potentialEalReduction,
        reiScore: Number(reiScore.toFixed(2)),
        executionStatus: 'PENDING',
      });
    });
  }

  // Descending by REI — highest ROI first
  return playbooks.sort((a, b) => b.reiScore - a.reiScore);
}

// ============================================================
// Aggregate helpers for the UI
// ============================================================
export interface RemediationSummary {
  totalPlaybooks: number;
  totalAddressableEal: number;
  totalEngineeringHours: number;
  totalToolingCost: number;
  appliedCount: number;
  appliedEalReduction: number;
}

export function summarisePlaybooks(
  playbooks: ActionablePlaybook[]
): RemediationSummary {
  let totalAddressableEal = 0;
  let totalEngineeringHours = 0;
  let totalToolingCost = 0;
  let appliedCount = 0;
  let appliedEalReduction = 0;

  for (const pb of playbooks) {
    totalAddressableEal += pb.potentialEalReduction;
    totalEngineeringHours += pb.action.estimatedHours;
    totalToolingCost += pb.action.costEstimate;
    if (pb.executionStatus !== 'PENDING') {
      appliedCount++;
      appliedEalReduction += pb.potentialEalReduction;
    }
  }

  return {
    totalPlaybooks: playbooks.length,
    totalAddressableEal,
    totalEngineeringHours,
    totalToolingCost,
    appliedCount,
    appliedEalReduction,
  };
}