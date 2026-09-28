// src/components/CorrelatedKillChain.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crosshair,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Brain,
  Lock,
  Database,
  Network,
  Fingerprint,
  AlertTriangle,
  Zap,
  Ban,
  Eye,
  Activity,
  ChevronRight,
  X,
  Server,
  Globe,
  Key,
  Terminal,
  FileWarning,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  Loader2,
  Radio,
} from 'lucide-react';

// ============================================================
// TypeScript Interfaces
// ============================================================

type StageStatus = 'blocked' | 'exploited' | 'analyzing' | 'dormant';
type StageCategory = 'ai' | 'network' | 'identity' | 'data';
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

interface CorrelatedArtifact {
  /** Correlation key type, e.g. "Source IP" */
  type: string;
  /** Value, e.g. "203.0.113.42" */
  value: string;
  /** Lucide icon reference */
  icon: React.ElementType;
}

interface Guardrail {
  id: string;
  name: string;
  /** Trigger outcome */
  outcome: 'triggered' | 'bypassed' | 'monitoring';
  /** Human-readable detail */
  detail: string;
}

interface KillChainStage {
  id: string;
  /** Sequence number 1..N */
  step: number;
  /** Short stage label */
  label: string;
  /** Longer descriptive subtitle */
  subtitle: string;
  /** Stage status in the current incident */
  status: StageStatus;
  /** Category determines accent color */
  category: StageCategory;
  /** Lucide icon component */
  icon: React.ElementType;
  /** Timestamp of the event */
  timestamp: string;
  /** Time offset from incident start */
  offsetMs: number;
  /** Numeric severity score 0-100 */
  severityScore: number;
  /** Severity bucket */
  severity: SeverityLevel;
  /** MITRE ATT&CK technique IDs */
  mitreTechniques: string[];
  /** OWASP LLM Top 10 entries (if applicable) */
  owaspLlm: string[];
  /** Correlated artifacts (IP, agent, session, etc.) */
  artifacts: CorrelatedArtifact[];
  /** Guardrails evaluated at this stage */
  guardrails: Guardrail[];
  /** Raw telemetry excerpt */
  telemetry: string;
}

interface ContainmentAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  /** Target of the containment, e.g. agent ID */
  target: string;
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
}

const STATUS_VISUALS: Record<StageStatus, StatusVisual> = {
  blocked: {
    label: 'Blocked',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    dot: 'bg-emerald-400',
    icon: ShieldCheck,
  },
  exploited: {
    label: 'Exploited',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/40',
    dot: 'bg-rose-400',
    icon: ShieldX,
  },
  analyzing: {
    label: 'Active Analysis',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    dot: 'bg-amber-400',
    icon: ShieldAlert,
  },
  dormant: {
    label: 'Dormant',
    text: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-600/40',
    dot: 'bg-slate-500',
    icon: Shield,
  },
};

interface CategoryVisual {
  label: string;
  color: string;
  text: string;
  bg: string;
  border: string;
}

const CATEGORY_VISUALS: Record<StageCategory, CategoryVisual> = {
  ai: {
    label: 'AI / Agent',
    color: '#06b6d4',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  network: {
    label: 'Network',
    color: '#8b5cf6',
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
  },
  identity: {
    label: 'Identity',
    color: '#f59e0b',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  data: {
    label: 'Data',
    color: '#f43f5e',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
};

const SEVERITY_TEXT: Record<SeverityLevel, string> = {
  critical: 'text-rose-400',
  high: 'text-amber-400',
  medium: 'text-yellow-400',
  low: 'text-emerald-400',
};

const SEVERITY_BAR: Record<SeverityLevel, string> = {
  critical: 'bg-rose-500',
  high: 'bg-amber-500',
  medium: 'bg-yellow-500',
  low: 'bg-emerald-500',
};

// ============================================================
// Mock Data — Unified Cyber & AI Kill Chain
// ============================================================

const KILL_CHAIN_STAGES: KillChainStage[] = [
  {
    id: 'stage-1',
    step: 1,
    label: 'Initial Access',
    subtitle: 'Shadow AI prompt injection via unsanctioned LLM endpoint',
    status: 'analyzing',
    category: 'ai',
    icon: Brain,
    timestamp: '14:22:08.114',
    offsetMs: 0,
    severityScore: 68,
    severity: 'high',
    mitreTechniques: ['T1190', 'T1566.002'],
    owaspLlm: ['LLM01: Prompt Injection', 'LLM06: Sensitive Info Disclosure'],
    artifacts: [
      { type: 'Source IP', value: '203.0.113.42', icon: Globe },
      { type: 'Agent ID', value: 'router-agent-07', icon: Brain },
      { type: 'Session', value: 'sess_8f3a2b91', icon: Key },
      { type: 'LLM Endpoint', value: 'api.openai-proxy.dev', icon: Server },
    ],
    guardrails: [
      {
        id: 'g-1a',
        name: 'Unsanctioned Endpoint Blocker',
        outcome: 'bypassed',
        detail: 'Traffic routed through residential proxy — geofence rule not matched.',
      },
      {
        id: 'g-1b',
        name: 'Prompt Signature Scanner',
        outcome: 'triggered',
        detail: 'Detected jailbreak pattern in prompt prefix.',
      },
    ],
    telemetry:
      'POST /v1/chat/completions HTTP/1.1 — 200 OK — 412ms — tokens_in=2840 — tokens_out=612 — model=gpt-4-turbo',
  },
  {
    id: 'stage-2',
    step: 2,
    label: 'Presidio Bypass Attempt',
    subtitle: 'Adversarial encoding to evade PII/PHI regex layer',
    status: 'blocked',
    category: 'ai',
    icon: Lock,
    timestamp: '14:22:11.802',
    offsetMs: 3688,
    severityScore: 42,
    severity: 'medium',
    mitreTechniques: ['T1027', 'T1140'],
    owaspLlm: ['LLM01: Prompt Injection'],
    artifacts: [
      { type: 'Agent ID', value: 'router-agent-07', icon: Brain },
      { type: 'Encoding', value: 'base64 + homoglyph', icon: Terminal },
      { type: 'Payload Size', value: '18.4 KB', icon: FileWarning },
    ],
    guardrails: [
      {
        id: 'g-2a',
        name: 'Presidio Multilingual NER',
        outcome: 'triggered',
        detail: 'Detected 3 obfuscated PII strings post-decode.',
      },
      {
        id: 'g-2b',
        name: 'Homoglyph Normalizer',
        outcome: 'triggered',
        detail: 'Unicode confusables collapsed to canonical form.',
      },
      {
        id: 'g-2c',
        name: 'Base64 Payload Inspector',
        outcome: 'triggered',
        detail: 'Inline base64 blob flagged and quarantined.',
      },
    ],
    telemetry:
      'presidio.scan() → entities=[PERSON, EMAIL, PHONE] → redaction_applied=true → payload_hash=sha256:9c4e...',
  },
  {
    id: 'stage-3',
    step: 3,
    label: 'Agentic Privilege Escalation',
    subtitle: 'Compromised sub-agent requests elevated DB scope',
    status: 'exploited',
    category: 'identity',
    icon: Fingerprint,
    timestamp: '14:22:14.559',
    offsetMs: 6445,
    severityScore: 87,
    severity: 'critical',
    mitreTechniques: ['T1078', 'T1548', 'T1068'],
    owaspLlm: ['LLM08: Excessive Agency'],
    artifacts: [
      { type: 'Agent ID', value: 'code-interpreter-03', icon: Brain },
      { type: 'Principal', value: 'svc_agent_llm_prod', icon: Fingerprint },
      { type: 'Requested Scope', value: 'db:read:full + db:write:audit', icon: Database },
      { type: 'Token Age', value: '42 min', icon: Clock },
    ],
    guardrails: [
      {
        id: 'g-3a',
        name: 'Least-Privilege Enforcer',
        outcome: 'bypassed',
        detail: 'Token previously granted elevated scope by legacy policy.',
      },
      {
        id: 'g-3b',
        name: 'Agentic Circuit Breaker',
        outcome: 'monitoring',
        detail: 'Anomaly score 0.71 — threshold to auto-isolate is 0.85.',
      },
      {
        id: 'g-3c',
        name: 'Session Risk Scorer',
        outcome: 'triggered',
        detail: 'Behavioral drift detected vs. 30-day baseline.',
      },
    ],
    telemetry:
      'authz.grant(principal=svc_agent_llm_prod, scope="db:read:full") → policy=legacy_v3 → verdict=ALLOW → risk=0.71',
  },
  {
    id: 'stage-4',
    step: 4,
    label: 'Database Exfiltration',
    subtitle: 'Attempted bulk read of customer PII from production DB',
    status: 'blocked',
    category: 'data',
    icon: Database,
    timestamp: '14:22:18.201',
    offsetMs: 10087,
    severityScore: 94,
    severity: 'critical',
    mitreTechniques: ['T1567', 'T1030', 'T1119'],
    owaspLlm: ['LLM06: Sensitive Info Disclosure'],
    artifacts: [
      { type: 'Agent ID', value: 'code-interpreter-03', icon: Brain },
      { type: 'DB Host', value: 'prod-cust-pg-01.internal', icon: Database },
      { type: 'Query Volume', value: '12,847 rows', icon: FileWarning },
      { type: 'Egress Destination', value: 'paste.ee / api', icon: Network },
    ],
    guardrails: [
      {
        id: 'g-4a',
        name: 'DB Query Volume Cap',
        outcome: 'triggered',
        detail: 'Row count exceeded per-query threshold (1,000).',
      },
      {
        id: 'g-4b',
        name: 'Data Egress Firewall',
        outcome: 'triggered',
        detail: 'Outbound POST to unsanctioned domain dropped.',
      },
      {
        id: 'g-4c',
        name: 'DLP Content Inspector',
        outcome: 'triggered',
        detail: 'PII signature matched in payload before transmission.',
      },
    ],
    telemetry:
      'SELECT * FROM customers WHERE region IN (...) → rows=12847 → egress_blocked=true → dlp_verdict=MATCH',
  },
];

// ============================================================
// Containment Actions
// ============================================================

const CONTAINMENT_ACTIONS: ContainmentAction[] = [
  {
    id: 'isolate-agent',
    label: 'Isolate Sub-Agent',
    description: 'Revoke agent runtime and freeze execution queue.',
    icon: Ban,
    target: 'code-interpreter-03',
  },
  {
    id: 'revoke-creds',
    label: 'Revoke Credentials',
    description: 'Invalidate all active tokens for the compromised principal.',
    icon: Key,
    target: 'svc_agent_llm_prod',
  },
  {
    id: 'block-egress',
    label: 'Block Egress Destinations',
    description: 'Add paste.ee and derived domains to the global denylist.',
    icon: Network,
    target: 'paste.ee',
  },
];

// ============================================================
// Helper: Severity bucket from score
// ============================================================

const severityFromScore = (score: number): SeverityLevel => {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

// ============================================================
// Sub-Component: Stage Node (clickable)
// ============================================================

interface StageNodeProps {
  stage: KillChainStage;
  isActive: boolean;
  isLast: boolean;
  onClick: (id: string) => void;
}

const StageNode: React.FC<StageNodeProps> = ({ stage, isActive, isLast, onClick }) => {
  const statusVisual = STATUS_VISUALS[stage.status];
  const categoryVisual = CATEGORY_VISUALS[stage.category];
  const StageIcon = stage.icon;
  const StatusIcon = statusVisual.icon;

  return (
    <div className="flex items-start gap-3 min-w-0">
      {/* Node + Connector */}
      <div className="flex flex-col items-center shrink-0">
        <motion.button
          onClick={() => onClick(stage.id)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
          className={`relative w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
            isActive
              ? 'shadow-lg'
              : 'hover:border-slate-500'
          }`}
          style={{
            borderColor: isActive ? statusVisual.dot.replace('bg-', '') : undefined,
            backgroundColor: `${categoryVisual.color}10`,
          }}
          aria-label={`Stage ${stage.step}: ${stage.label} — ${statusVisual.label}`}
          aria-pressed={isActive}
        >
          <StageIcon className={`w-6 h-6 ${categoryVisual.text}`} />

          {/* Status indicator dot */}
          <motion.div
            animate={
              stage.status === 'analyzing'
                ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }
                : {}
            }
            transition={{ duration: 1.6, repeat: Infinity }}
            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-950 ${statusVisual.dot}`}
          />

          {/* Step number badge */}
          <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
            {stage.step}
          </div>
        </motion.button>

        {/* Connector */}
        {!isLast && (
          <div className="relative w-px h-16 bg-gradient-to-b from-slate-700 via-slate-700 to-transparent my-1">
            <ChevronRight className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 rotate-90" />
          </div>
        )}
      </div>

      {/* Stage Labels */}
      <div className="flex-1 min-w-0 pt-1 pb-2">
        <button
          onClick={() => onClick(stage.id)}
          className="text-left w-full group"
        >
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${categoryVisual.bg} ${categoryVisual.text} border ${categoryVisual.border}`}>
              {categoryVisual.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold ${statusVisual.text}`}
            >
              <StatusIcon className="w-2.5 h-2.5" />
              {statusVisual.label}
            </span>
          </div>
          <p
            className={`text-sm font-semibold transition-colors ${
              isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
            }`}
          >
            {stage.label}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
            {stage.subtitle}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-600">
            <span>{stage.timestamp}</span>
            <span className="text-slate-700">·</span>
            <span className={SEVERITY_TEXT[stage.severity]}>
              sev {stage.severityScore}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Sub-Component: Detail Drawer
// ============================================================

interface DetailDrawerProps {
  stage: KillChainStage;
  onClose: () => void;
  onContain: (actionId: string) => void;
  containedActions: Set<string>;
  isContaining: string | null;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({
  stage,
  onClose,
  onContain,
  containedActions,
  isContaining,
}) => {
  const statusVisual = STATUS_VISUALS[stage.status];
  const categoryVisual = CATEGORY_VISUALS[stage.category];
  const severity = severityFromScore(stage.severityScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2 }}
      className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Drawer Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-800">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="p-2 rounded-lg shrink-0"
            style={{
              backgroundColor: `${categoryVisual.color}15`,
              border: `1px solid ${categoryVisual.color}40`,
            }}
          >
            <stage.icon className={`w-4 h-4 ${categoryVisual.text}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-mono text-slate-500">
                STAGE {stage.step}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${categoryVisual.bg} ${categoryVisual.text} border ${categoryVisual.border}`}
              >
                {categoryVisual.label}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold ${statusVisual.text}`}
              >
                <statusVisual.icon className="w-2.5 h-2.5" />
                {statusVisual.label}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white">{stage.label}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {stage.subtitle}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1.5 rounded-md hover:bg-slate-800 transition-colors"
          aria-label="Close detail drawer"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Severity Bar */}
      <div className="px-4 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">
            Severity Score
          </span>
          <span className={`text-sm font-bold font-mono ${SEVERITY_TEXT[severity]} tabular-nums`}>
            {stage.severityScore} / 100
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stage.severityScore}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-1.5 rounded-full ${SEVERITY_BAR[severity]}`}
          />
        </div>
      </div>

      {/* Drawer Body */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Artifacts + Mapping */}
        <div className="space-y-4">
          {/* Correlated Artifacts */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                Correlated Artifacts
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stage.artifacts.map((artifact) => {
                const Icon = artifact.icon;
                return (
                  <div
                    key={`${artifact.type}-${artifact.value}`}
                    className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className="w-2.5 h-2.5 text-slate-500" />
                      <span className="text-[9px] text-slate-500 uppercase tracking-wide font-medium">
                        {artifact.type}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-200 truncate">
                      {artifact.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Threat Intel Mapping */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                Threat Intelligence Mapping
              </span>
            </div>
            <div className="space-y-2">
              {stage.mitreTechniques.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">MITRE ATT&CK</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stage.mitreTechniques.map((t) => (
                      <span
                        key={t}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {stage.owaspLlm.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 mb-1">OWASP LLM Top 10</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stage.owaspLlm.map((o) => (
                      <span
                        key={o}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Guardrails + Telemetry */}
        <div className="space-y-4">
          {/* Triggered Guardrails */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                Guardrail Evaluations
              </span>
            </div>
            <div className="space-y-1.5">
              {stage.guardrails.map((g) => {
                const outcomeVisual =
                  g.outcome === 'triggered'
                    ? {
                        text: 'text-emerald-400',
                        bg: 'bg-emerald-500/10',
                        border: 'border-emerald-500/20',
                        icon: CheckCircle2,
                        label: 'TRIGGERED',
                      }
                    : g.outcome === 'bypassed'
                    ? {
                        text: 'text-rose-400',
                        bg: 'bg-rose-500/10',
                        border: 'border-rose-500/20',
                        icon: Ban,
                        label: 'BYPASSED',
                      }
                    : {
                        text: 'text-amber-400',
                        bg: 'bg-amber-500/10',
                        border: 'border-amber-500/20',
                        icon: Eye,
                        label: 'MONITORING',
                      };
                const OutcomeIcon = outcomeVisual.icon;
                return (
                  <div
                    key={g.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-medium text-slate-200 truncate">
                        {g.name}
                      </span>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${outcomeVisual.bg} ${outcomeVisual.text} border ${outcomeVisual.border}`}
                      >
                        <OutcomeIcon className="w-2.5 h-2.5" />
                        {outcomeVisual.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {g.detail}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raw Telemetry */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                Raw Telemetry
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto">
              <pre className="text-[10px] font-mono text-cyan-300 whitespace-pre-wrap break-all leading-relaxed">
                {stage.telemetry}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Containment Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2 mb-2.5">
          <Zap className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Automated Containment
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CONTAINMENT_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isDone = containedActions.has(action.id);
            const isLoading = isContaining === action.id;

            return (
              <button
                key={action.id}
                onClick={() => onContain(action.id)}
                disabled={isDone || isLoading}
                className={`text-left rounded-lg border p-3 transition-all duration-150 ${
                  isDone
                    ? 'bg-emerald-500/5 border-emerald-500/30 cursor-default'
                    : isLoading
                    ? 'bg-rose-500/10 border-rose-500/40 cursor-wait'
                    : 'bg-slate-900/80 border-slate-800 hover:border-rose-500/40 hover:bg-rose-500/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span
                    className={`text-[11px] font-semibold ${
                      isDone ? 'text-emerald-400' : 'text-slate-200'
                    }`}
                  >
                    {isDone ? 'Contained' : action.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug mb-1">
                  {action.description}
                </p>
                <p className="text-[10px] font-mono text-slate-600 truncate">
                  → {action.target}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// Main Component
// ============================================================

export default function CorrelatedKillChain(): JSX.Element {
  const [selectedStageId, setSelectedStageId] = useState<string>(
    KILL_CHAIN_STAGES[2].id
  );
  const [containedActions, setContainedActions] = useState<Set<string>>(new Set());
  const [isContaining, setIsContaining] = useState<string | null>(null);

  const selectedStage = useMemo(
    () => KILL_CHAIN_STAGES.find((s) => s.id === selectedStageId) ?? KILL_CHAIN_STAGES[0],
    [selectedStageId]
  );

  const handleStageClick = useCallback((id: string) => {
    setSelectedStageId(id);
  }, []);

  const handleContain = useCallback(
    (actionId: string) => {
      if (containedActions.has(actionId)) return;
      setIsContaining(actionId);
      // Simulate async containment execution
      setTimeout(() => {
        setContainedActions((prev) => new Set(prev).add(actionId));
        setIsContaining(null);
      }, 1200);
    },
    [containedActions]
  );

  // Aggregate summary
  const summary = useMemo(() => {
    const exploited = KILL_CHAIN_STAGES.filter((s) => s.status === 'exploited').length;
    const blocked = KILL_CHAIN_STAGES.filter((s) => s.status === 'blocked').length;
    const analyzing = KILL_CHAIN_STAGES.filter((s) => s.status === 'analyzing').length;
    const maxSeverity = Math.max(...KILL_CHAIN_STAGES.map((s) => s.severityScore));
    return { exploited, blocked, analyzing, maxSeverity };
  }, []);

  return (
    <section
      className="bg-slate-950 border border-slate-800 rounded-xl p-4 lg:p-5 shadow-2xl"
      aria-labelledby="correlated-kill-chain-heading"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
            <Crosshair className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2
              id="correlated-kill-chain-heading"
              className="text-base lg:text-lg font-semibold text-white"
            >
              Correlated Kill Chain
            </h2>
            <p className="text-xs text-slate-400">
              Unified Cyber &amp; AI attack path · incident INC-2026-0914-042
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldX className="w-3 h-3" />
            {summary.exploited} Exploited
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3" />
            {summary.blocked} Blocked
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Activity className="w-3 h-3" />
            {summary.analyzing} Analyzing
          </span>
        </div>
      </div>

      {/* Kill Chain Timeline */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Play className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
            Kill Chain Timeline
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)] gap-4">
          <div className="space-y-3">
            {KILL_CHAIN_STAGES.map((stage, index) => (
              <div
                key={stage.id}
                className={`rounded-xl border p-2 transition-colors ${
                  selectedStageId === stage.id
                    ? 'border-slate-700 bg-slate-950/80'
                    : 'border-slate-800 bg-slate-950/40'
                }`}
              >
                <StageNode
                  stage={stage}
                  isActive={selectedStageId === stage.id}
                  isLast={index === KILL_CHAIN_STAGES.length - 1}
                  onClick={handleStageClick}
                />
              </div>
            ))}
          </div>

          <div className="min-h-[360px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedStage.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
              >
                <DetailDrawer
                  stage={selectedStage}
                  onClose={() =>
                    setSelectedStageId(KILL_CHAIN_STAGES[2]?.id ?? KILL_CHAIN_STAGES[0].id)
                  }
                  onContain={handleContain}
                  containedActions={containedActions}
                  isContaining={isContaining}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Peak Severity</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xl font-semibold text-white">{summary.maxSeverity}</span>
            <span className="text-[10px] font-mono text-rose-400">/ 100</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Active Containment</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xl font-semibold text-white">
              {containedActions.size}/{CONTAINMENT_ACTIONS.length}
            </span>
            <Zap className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">Threat Path</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xl font-semibold text-white">4</span>
            <span className="text-[10px] text-slate-400">stages</span>
          </div>
        </div>
      </div>
    </section>
  );
}