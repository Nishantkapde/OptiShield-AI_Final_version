// src/App.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  memo,
} from 'react';
import {
  Activity,
  TrendingUp,
  Brain,
  ShieldCheck,
  Menu,
  Bell,
  Settings,
  ChevronDown,
  Wrench,
  Zap, // [PP3] icon for the Real-Time Engine tab
  LayoutDashboard, // [PP9] icon for the Executive Dashboard tab
  FileCheck, // [PP10] audit button icon
} from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import RevenueAtRiskCards from './components/RevenueAtRiskCards';
import ExposureFunnel from './components/ExposureFunnel';
import TelemetryGrid from './components/TelemetryGrid'; // [PP1] feed status
import ShadowITAlert from './components/ShadowITAlert';
// [PP2] Removed: import EfficientFrontier from './components/EfficientFrontier';
import { StressTestingSliders } from './components/StressTestingSliders';
import SEBICRIMeter from './components/SEBICRIMeter';
import ServiceDependencyGraph from './components/ServiceDependencyGraph';
import MultiLevelRollup from './components/MultiLevelRollup';
import ControlWhatIfSimulator from './components/ControlWhatIfSimulator';
import CorrelatedKillChain from './components/CorrelatedKillChain';
import PresidioAITerminal from './components/PresidioAITerminal';
import { LogAnalyzer } from './components/LogAnalyzer';
import { CascadeRiskModel } from './components/CascadeRiskModel';

// [PP2] Pain Point 2 — Knapsack optimizer imports
import EfficientFrontierChart from './risk/EfficientFrontierChart';
import BudgetRecommendationTable from './risk/BudgetRecommendationTable';
import { useBudgetOptimizer } from './risk/useBudgetOptimizer';
import type { SecurityControl, ThreatAlertLevel } from './risk/schema';

// [PP3] Pain Point 3 — Real-Time Delta Engine
import RealTimeRiskStream from './risk/RealTimeRiskStream';

// [PP4] Pain Point 4 — Multi-Source Telemetry Correlation
// Aliased to avoid name collision with `./components/TelemetryGrid` (PP1).
import TelemetryCorrelationGrid from './risk/TelemetryGrid';

// [PP5] Pain Point 5 — Monte Carlo / Value-at-Risk
import LossExceedanceChart from './risk/LossExceedanceChart';
import { useMonteCarlo } from './risk/useMonteCarlo';
import type { DistributionParams } from './risk/schema';

// [PP6] Pain Point 6 — Compliance & Board Reporting
import ComplianceBoardDashboard from './risk/ComplianceBoardDashboard';
import type { RiskAppetiteConfig } from './risk/schema';
import { evaluateComplianceAndAppetite } from './risk/complianceEngine';

// [PP7] Pain Point 7 — Supply Chain Risk Propagation
import DependencyGraphView from './risk/DependencyGraphView';
import type { DependencyEdge, DependencyNode } from './risk/schema';

// [PP8] Pain Point 8 — Remediation Action Center
import RemediationPlaybookView from './risk/RemediationPlaybookView';
import { generateRankedPlaybooks } from './risk/remediationEngine';
import type {
  CorrelatedAssetThreat,
  SystemRiskSummary,
} from './risk/schema';

// [PP9] Pain Point 9 — Executive Dashboard
import RiskDashboardView from './risk/RiskDashboardView';
import type {
  AssetRiskInput,
  RiskAssessmentResult,
} from './risk/schema';

// [PP10] Pain Point 10 — Audit Trail + Report Export
import AuditReportModal from './risk/AuditReportModal';
import { useAuditPersistence } from './risk/useAuditPersistence';

// ============================================================
// Hoisted constants & helpers
// ============================================================

const BASE_EXPOSURE = 48_500_000;
const SOFT_CAP = 12_000_000;
const DEFAULT_DOWNTIME_HOURS = 10;
const DEFAULT_HOURLY_REVENUE_LOSS = 50_000;

const fmtCurrency = (n: number): string =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1_000).toFixed(0)}K`;

const fmtFull = (n: number): string =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${n.toLocaleString()}`;

const threatColor = (level: number): string =>
  level >= 75 ? 'text-rose-400' : level >= 50 ? 'text-amber-400' : 'text-emerald-400';

const ACCENT_MAP = {
  cyan: {
    active: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40',
    glow: 'shadow-cyan-500/20',
    dot: 'bg-cyan-400',
  },
  emerald: {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
    glow: 'shadow-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  rose: {
    active: 'bg-rose-500/10 text-rose-400 border-rose-500/40',
    glow: 'shadow-rose-500/20',
    dot: 'bg-rose-400',
  },
  // [PP3] amber accent for the Real-Time Engine tab
  amber: {
    active: 'bg-amber-500/10 text-amber-400 border-amber-500/40',
    glow: 'shadow-amber-500/20',
    dot: 'bg-amber-400',
  },
  // [PP9] purple accent for the Executive Dashboard tab
  purple: {
    active: 'bg-purple-500/10 text-purple-400 border-purple-500/40',
    glow: 'shadow-purple-500/20',
    dot: 'bg-purple-400',
  },
} as const;

type AccentKey = keyof typeof ACCENT_MAP;
// [PP3] added 'realtime' to TabId
// [PP9] added 'executive' to TabId
type TabId = 'executive' | 'telemetry' | 'capital' | 'realtime' | 'ai-privacy';

interface TabConfig {
  id: TabId;
  label: string;
  sublabel: string;
  blurb: string;
  icon: React.ElementType;
  accent: AccentKey;
}

const TABS: readonly TabConfig[] = Object.freeze([
  // [PP9] executive tab inserted first so it lands as the default tab
  {
    id: 'executive',
    label: 'Executive Dashboard',
    sublabel: 'Pain Point 9',
    blurb: 'Unified command center — heatmap, live ticker, and cross-module filters.',
    icon: LayoutDashboard,
    accent: 'purple',
  },
  {
    id: 'telemetry',
    label: 'Telemetry & Exposure',
    sublabel: 'Pain Points 1, 4, 6, 11',
    blurb: 'Real-time threat ingestion, exposure funneling, and shadow IT discovery.',
    icon: Activity,
    accent: 'cyan',
  },
  {
    id: 'capital',
    // [PP5] updated sublabel + blurb to mention Monte Carlo
    // [PP6] updated to mention Board Reporting
    // [PP7] updated to include supply chain (already includes "7")
    label: 'Capital & Compliance',
    sublabel: 'Pain Points 2, 5, 6, 7, 8',
    blurb: 'Optimal capital allocation, Monte Carlo VaR, regulatory compliance.',
    icon: TrendingUp,
    accent: 'emerald',
  },
  // [PP3] new tab inserted between Capital and AI Privacy
  // [PP8] updated sublabel + blurb to mention Remediation Action Center
  {
    id: 'realtime',
    label: 'Real-Time Engine',
    sublabel: 'Pain Points 3, 8',
    blurb: 'O(1) delta recalculation + REI-ranked remediation action center.',
    icon: Zap,
    accent: 'amber',
  },
  {
    id: 'ai-privacy',
    label: 'AI Privacy & Cascade Engine',
    sublabel: 'Pain Points 9, 10, 11, 13',
    blurb: 'PII/PHI sanitization, agentic cascade risk, and autonomous guardrails.',
    icon: Brain,
    accent: 'rose',
  },
]);

const TABS_BY_ID: ReadonlyMap<TabId, TabConfig> = new Map(TABS.map((t) => [t.id, t]));

// ============================================================
// [PP2] Demo controls portfolio for the Knapsack optimizer.
// ============================================================
const DEMO_CONTROLS: readonly SecurityControl[] = Object.freeze([
  { id: 'c1',  name: 'CrowdStrike Falcon EDR',      category: 'EDR',     cost: 285_000, riskReductionEal: 1_200_000 },
  { id: 'c2',  name: 'Splunk Enterprise Security',  category: 'SIEM',    cost: 420_000, riskReductionEal: 1_500_000 },
  { id: 'c3',  name: 'Okta Identity Cloud',         category: 'IAM',     cost: 180_000, riskReductionEal:   950_000 },
  { id: 'c4',  name: 'Varonis DLP Suite',           category: 'DLP',     cost: 220_000, riskReductionEal:   680_000 },
  { id: 'c5',  name: 'Wiz Cloud Security',          category: 'Cloud',   cost: 165_000, riskReductionEal:   720_000 },
  { id: 'c6',  name: 'Darktrace AI Defense',        category: 'AI',      cost: 310_000, riskReductionEal:   540_000 },
  { id: 'c7',  name: 'Palo Alto NGFW Refresh',      category: 'Network', cost: 480_000, riskReductionEal: 1_100_000 },
  { id: 'c8',  name: 'SentinelOne EDR Add-on',      category: 'EDR',     cost: 240_000, riskReductionEal:   890_000 },
  { id: 'c9',  name: 'CyberArk PAM',                category: 'IAM',     cost: 350_000, riskReductionEal: 1_020_000 },
  { id: 'c10', name: 'Zscaler Private Access',      category: 'Network', cost: 290_000, riskReductionEal:   760_000 },
  { id: 'c11', name: 'Tenable VM Platform',         category: 'VM',      cost: 195_000, riskReductionEal:   830_000 },
  { id: 'c12', name: 'Proofpoint Email Security',   category: 'Email',   cost: 150_000, riskReductionEal:   610_000 },
]);

// ============================================================
// [PP5] Demo distribution params for the Monte Carlo engine.
// ============================================================
interface Pp5DemoAsset {
  assetId: string;
  label: string;
  lossDistribution: DistributionParams;
  frequencyDistribution: DistributionParams;
}

const PP5_DEMO_ASSETS: readonly Pp5DemoAsset[] = Object.freeze([
  {
    assetId: 'srv-db-01',
    label: 'srv-db-01 · Primary Database',
    lossDistribution: { min: 15_000, mostLikely: 60_000, max: 450_000 },
    frequencyDistribution: { min: 0.5, mostLikely: 2, max: 8 },
  },
  {
    assetId: 'srv-pay-02',
    label: 'srv-pay-02 · Payment Gateway',
    lossDistribution: { min: 40_000, mostLikely: 180_000, max: 1_200_000 },
    frequencyDistribution: { min: 1, mostLikely: 3, max: 12 },
  },
  {
    assetId: 'srv-ml-05',
    label: 'srv-ml-05 · ML Inference Node',
    lossDistribution: { min: 25_000, mostLikely: 110_000, max: 900_000 },
    frequencyDistribution: { min: 0.8, mostLikely: 2.5, max: 10 },
  },
]);

// ============================================================
// [PP6] Board-approved risk appetite limits (USD).
// ============================================================
const BOARD_RISK_APPETITE: RiskAppetiteConfig = Object.freeze({
  maxAcceptableEal: 25_000_000,   // $25M
  maxAcceptableVar95: 2_800_000,  // $2.8M (~6% of base exposure)
});

// ============================================================
// [PP7] Demo supply chain — 5 vendors, 5 internal assets, 11 edges.
// ============================================================
const PP7_DEMO_NODES: readonly DependencyNode[] = Object.freeze([
  // Vendors
  { id: 'auth0',      name: 'Auth0 · Identity',  type: 'VENDOR',         baseEal: 320_000, epssScore: 0.35, isThirdParty: true },
  { id: 'aws-s3',     name: 'AWS S3 · Storage',  type: 'VENDOR',         baseEal: 180_000, epssScore: 0.25, isThirdParty: true },
  { id: 'stripe',     name: 'Stripe · Payments', type: 'VENDOR',         baseEal: 520_000, epssScore: 0.18, isThirdParty: true },
  { id: 'cloudflare', name: 'Cloudflare · Edge', type: 'VENDOR',         baseEal: 150_000, epssScore: 0.22, isThirdParty: true },
  { id: 'snowflake',  name: 'Snowflake · DW',    type: 'VENDOR',         baseEal: 240_000, epssScore: 0.30, isThirdParty: true },
  // Internal assets
  { id: 'payment-api',   name: 'Payment API',   type: 'INTERNAL_ASSET', baseEal: 1_200_000, epssScore: 0.10, isThirdParty: false },
  { id: 'customer-db',   name: 'Customer DB',   type: 'INTERNAL_ASSET', baseEal: 2_400_000, epssScore: 0.08, isThirdParty: false },
  { id: 'ml-inference',  name: 'ML Inference',  type: 'INTERNAL_ASSET', baseEal:   850_000, epssScore: 0.12, isThirdParty: false },
  { id: 'admin-console', name: 'Admin Console', type: 'INTERNAL_ASSET', baseEal:   650_000, epssScore: 0.09, isThirdParty: false },
  { id: 'fraud-engine',  name: 'Fraud Engine',  type: 'INTERNAL_ASSET', baseEal:   980_000, epssScore: 0.11, isThirdParty: false },
]);

const PP7_DEMO_EDGES: readonly DependencyEdge[] = Object.freeze([
  // auth0 — 3 edges, one at coupling 1.0 → SPOF
  { id: 'e1',  sourceNodeId: 'auth0',      targetNodeId: 'payment-api',   couplingWeight: 0.95, transferLossAmount: 480_000 },
  { id: 'e2',  sourceNodeId: 'auth0',      targetNodeId: 'admin-console', couplingWeight: 1.00, transferLossAmount: 220_000 },
  { id: 'e3',  sourceNodeId: 'auth0',      targetNodeId: 'customer-db',   couplingWeight: 0.85, transferLossAmount: 180_000 },
  // stripe
  { id: 'e4',  sourceNodeId: 'stripe',     targetNodeId: 'payment-api',   couplingWeight: 0.90, transferLossAmount: 680_000 },
  { id: 'e5',  sourceNodeId: 'stripe',     targetNodeId: 'fraud-engine',  couplingWeight: 0.70, transferLossAmount: 320_000 },
  // aws-s3
  { id: 'e6',  sourceNodeId: 'aws-s3',     targetNodeId: 'customer-db',   couplingWeight: 1.00, transferLossAmount: 420_000 },
  { id: 'e7',  sourceNodeId: 'aws-s3',     targetNodeId: 'ml-inference',  couplingWeight: 0.90, transferLossAmount: 580_000 },
  // cloudflare
  { id: 'e8',  sourceNodeId: 'cloudflare', targetNodeId: 'payment-api',   couplingWeight: 0.50, transferLossAmount: 120_000 },
  { id: 'e9',  sourceNodeId: 'cloudflare', targetNodeId: 'admin-console', couplingWeight: 0.40, transferLossAmount:  80_000 },
  // snowflake
  { id: 'e10', sourceNodeId: 'snowflake',  targetNodeId: 'ml-inference',  couplingWeight: 0.85, transferLossAmount: 380_000 },
  { id: 'e11', sourceNodeId: 'snowflake',  targetNodeId: 'fraud-engine',  couplingWeight: 0.60, transferLossAmount: 210_000 },
]);

// ============================================================
// [PP8] Demo threats + system state fed into the Remediation
// Action Center.
// ============================================================
const PP8_DEMO_THREATS: readonly CorrelatedAssetThreat[] = Object.freeze([
  {
    assetId: 'srv-db-01',
    activeSignals: [
      { id: 'sig-1', assetId: 'srv-db-01', source: 'EDR',  severityScore: 0.85, rawEventName: 'Suspicious PowerShell',   timestamp: new Date().toISOString() },
      { id: 'sig-2', assetId: 'srv-db-01', source: 'IAM',  severityScore: 0.78, rawEventName: 'Privilege Escalation',   timestamp: new Date().toISOString() },
      { id: 'sig-3', assetId: 'srv-db-01', source: 'SIEM', severityScore: 0.72, rawEventName: 'Failed Auth Attempts',  timestamp: new Date().toISOString() },
    ],
    threatConfidenceIndex: 1.0,
    isSuppressedByContext: false,
    statusLabel: 'CONFIRMED_ATTACK',
  },
  {
    assetId: 'srv-pay-02',
    activeSignals: [
      { id: 'sig-4', assetId: 'srv-pay-02', source: 'EDR',  severityScore: 0.45, rawEventName: 'Unusual Process Spawn',   timestamp: new Date().toISOString() },
      { id: 'sig-5', assetId: 'srv-pay-02', source: 'SIEM', severityScore: 0.38, rawEventName: 'Unusual Outbound Flow',  timestamp: new Date().toISOString() },
    ],
    threatConfidenceIndex: 0.46,
    isSuppressedByContext: false,
    statusLabel: 'SUSPICIOUS',
  },
  {
    assetId: 'srv-auth-01',
    activeSignals: [
      { id: 'sig-6', assetId: 'srv-auth-01', source: 'IAM', severityScore: 0.75, rawEventName: 'MFA Bypass Attempt',  timestamp: new Date().toISOString() },
    ],
    threatConfidenceIndex: 0.36,
    isSuppressedByContext: false,
    statusLabel: 'SUSPICIOUS',
  },
  {
    assetId: 'srv-ml-05',
    activeSignals: [
      { id: 'sig-7', assetId: 'srv-ml-05', source: 'EDR',  severityScore: 0.55, rawEventName: 'Unusual Model Artifact Access', timestamp: new Date().toISOString() },
      { id: 'sig-8', assetId: 'srv-ml-05', source: 'CSPM', severityScore: 0.42, rawEventName: 'Misconfigured S3 Policy',        timestamp: new Date().toISOString() },
    ],
    threatConfidenceIndex: 0.63,
    isSuppressedByContext: false,
    statusLabel: 'SUSPICIOUS',
  },
]);

const PP8_DEMO_SYSTEM_STATE: SystemRiskSummary = Object.freeze({
  totalEal: 8_200_000,
  totalDirectLoss: 3_500_000,
  activeAssetCount: 6,
  lastRecalculationTimeMs: 0.4,
});

// ============================================================
// [PP9] Demo assets + assessments for the heatmap.
// In production these come from PP1's GET /api/risk/assets.
// ============================================================
const PP9_DEMO_ASSETS: readonly AssetRiskInput[] = Object.freeze([
  { assetId: 'srv-db-01',   downtimeHours: 8,  hourlyRevenueLoss: 120_000, recordsExposed: 12_000, costPerRecord: 250, epssScore: 0.35, assetExposureMultiplier: 1.8, annualThreatAttempts: 14 },
  { assetId: 'srv-pay-02',  downtimeHours: 6,  hourlyRevenueLoss: 200_000, recordsExposed:  4_000, costPerRecord: 320, epssScore: 0.28, assetExposureMultiplier: 2.1, annualThreatAttempts: 11 },
  { assetId: 'srv-auth-01', downtimeHours: 4,  hourlyRevenueLoss:  90_000, recordsExposed:  2_500, costPerRecord: 280, epssScore: 0.22, assetExposureMultiplier: 1.5, annualThreatAttempts:  9 },
  { assetId: 'srv-api-03',  downtimeHours: 10, hourlyRevenueLoss:  65_000, recordsExposed:  8_000, costPerRecord: 210, epssScore: 0.42, assetExposureMultiplier: 1.7, annualThreatAttempts: 18 },
  { assetId: 'srv-cache-04',downtimeHours: 3,  hourlyRevenueLoss:  40_000, recordsExposed:    500, costPerRecord: 180, epssScore: 0.18, assetExposureMultiplier: 1.2, annualThreatAttempts:  6 },
  { assetId: 'srv-ml-05',   downtimeHours: 5,  hourlyRevenueLoss: 150_000, recordsExposed:  3_000, costPerRecord: 290, epssScore: 0.55, assetExposureMultiplier: 2.3, annualThreatAttempts: 21 },
]);

// Pre-computed Pain Point 1 assessments for each demo asset.
// Matches backend formula: directLoss = downtime×revenue + records×cost,
// LEF = epss × exposure × threats, EAL = directLoss × LEF.
const PP9_DEMO_RESULTS: Map<string, RiskAssessmentResult> = new Map(
  PP9_DEMO_ASSETS.map((a) => {
    const directLoss =
      a.downtimeHours * a.hourlyRevenueLoss + a.recordsExposed * a.costPerRecord;
    const lef = a.epssScore * a.assetExposureMultiplier * a.annualThreatAttempts;
    const eal = directLoss * lef;
    return [
      a.assetId,
      {
        directLoss,
        lossEventFrequencyLef: lef,
        annualizedLossExpectancyEal: eal,
        status: 'UNPLANNED_CYBER_RISK' as const,
        isMaintenanceActive: false,
        suppressAlerts: false,
        plannedOperationalCost: 0,
        auditMessage: '',
        assessedAt: new Date().toISOString(),
      } satisfies RiskAssessmentResult,
    ];
  })
);

// ============================================================
// Derived Metrics
// ============================================================

export const deriveMetrics = (cyberBudget: number, threatLevel: number) => {
  const mitigationFactor = Math.min(0.9, cyberBudget / (cyberBudget + SOFT_CAP));
  const threatMultiplier = 0.5 + (threatLevel / 100) * 1.5;
  const exposureBaseline = BASE_EXPOSURE * threatMultiplier * (1 - mitigationFactor);
  const revenueAtRisk = exposureBaseline * 0.32;
  const activeAlerts = Math.round(240 + threatLevel * 18 - cyberBudget / 40_000);

  return {
    exposureBaseline: Math.max(0, Math.round(exposureBaseline)),
    revenueAtRisk: Math.max(0, Math.round(revenueAtRisk)),
    activeAlerts: Math.max(12, activeAlerts),
  };
};

// ============================================================
// Contexts
// ============================================================

interface GlobalValues {
  cyberBudget: number;
  threatLevel: number;
  activeAlerts: number;
  revenueAtRisk: number;
  exposureBaseline: number;
  maintenanceActive: boolean;
  maintenanceTicketId: string | null;
  maintenanceEndsAt: string | null;
  plannedOperationalCost: number;
}

interface GlobalActions {
  setCyberBudget: (v: number) => void;
  setThreatLevel: (v: number) => void;
  setMaintenanceActive: (
    active: boolean,
    opts?: { ticketId?: string; endsAt?: string }
  ) => void;
}

const GlobalStateContext = createContext<GlobalValues | null>(null);
const GlobalActionsContext = createContext<GlobalActions | null>(null);

export const useGlobalState = (): GlobalValues => {
  const ctx = useContext(GlobalStateContext);
  if (!ctx) throw new Error('useGlobalState must be used within GlobalStateProvider');
  return ctx;
};

export const useGlobalActions = (): GlobalActions => {
  const ctx = useContext(GlobalActionsContext);
  if (!ctx) throw new Error('useGlobalActions must be used within GlobalStateProvider');
  return ctx;
};

// ============================================================
// Provider
// ============================================================

const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cyberBudget, setCyberBudgetRaw] = useState(6_500_000);
  const [threatLevel, setThreatLevelRaw] = useState(62);
  const [maintenanceActive, setMaintenanceActiveRaw] = useState(false);
  const [maintenanceTicketId, setMaintenanceTicketId] = useState<string | null>(null);
  const [maintenanceEndsAt, setMaintenanceEndsAt] = useState<string | null>(null);

  const setCyberBudget = useCallback((v: number) => setCyberBudgetRaw(v), []);
  const setThreatLevel = useCallback((v: number) => setThreatLevelRaw(v), []);

  const setMaintenanceActive = useCallback(
    (active: boolean, opts?: { ticketId?: string; endsAt?: string }) => {
      setMaintenanceActiveRaw(active);
      setMaintenanceTicketId(active ? opts?.ticketId ?? null : null);
      setMaintenanceEndsAt(active ? opts?.endsAt ?? null : null);
    },
    []
  );

  const derived = useMemo(
    () => deriveMetrics(cyberBudget, threatLevel),
    [cyberBudget, threatLevel]
  );

  const plannedOperationalCost = useMemo(
    () =>
      maintenanceActive
        ? DEFAULT_DOWNTIME_HOURS * DEFAULT_HOURLY_REVENUE_LOSS
        : 0,
    [maintenanceActive]
  );

  const values: GlobalValues = useMemo(
    () => ({
      cyberBudget,
      threatLevel,
      ...derived,
      maintenanceActive,
      maintenanceTicketId,
      maintenanceEndsAt,
      plannedOperationalCost,
    }),
    [
      cyberBudget,
      threatLevel,
      derived,
      maintenanceActive,
      maintenanceTicketId,
      maintenanceEndsAt,
      plannedOperationalCost,
    ]
  );

  const actions: GlobalActions = useMemo(
    () => ({ setCyberBudget, setThreatLevel, setMaintenanceActive }),
    [setCyberBudget, setThreatLevel, setMaintenanceActive]
  );

  return (
    <GlobalActionsContext.Provider value={actions}>
      <GlobalStateContext.Provider value={values}>{children}</GlobalStateContext.Provider>
    </GlobalActionsContext.Provider>
  );
};

// ============================================================
// Header readout
// ============================================================

const GlobalStateReadout: React.FC = memo(() => {
  const {
    cyberBudget,
    threatLevel,
    exposureBaseline,
    revenueAtRisk,
    activeAlerts,
    maintenanceActive,
    maintenanceTicketId,
  } = useGlobalState();

  const visibleAlerts = maintenanceActive ? 0 : activeAlerts;

  return (
    <div className="hidden lg:flex items-center gap-4">
      {maintenanceActive && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <Wrench className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-mono font-semibold text-amber-400">MAINT</span>
          {maintenanceTicketId && (
            <span className="text-[10px] font-mono text-amber-300/70">
              {maintenanceTicketId}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg">
        <span className="text-xs text-slate-500">Budget</span>
        <span className="text-sm font-mono font-semibold text-emerald-400">
          {fmtCurrency(cyberBudget)}
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg">
        <span className="text-xs text-slate-500">Threat</span>
        <span className={`text-sm font-mono font-semibold ${threatColor(threatLevel)}`}>
          {threatLevel}/100
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg">
        <span className="text-xs text-slate-500">Exposure</span>
        <span className="text-sm font-mono font-semibold text-cyan-400">
          {fmtCurrency(maintenanceActive ? 0 : exposureBaseline)}
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-lg">
        <span className="text-xs text-slate-500">RAR</span>
        <span className="text-sm font-mono font-semibold text-rose-400">
          {fmtCurrency(maintenanceActive ? 0 : revenueAtRisk)}
        </span>
      </div>
      <div className="relative">
        <Bell className="w-4 h-4 text-slate-400" />
        {visibleAlerts > 0 && (
          <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-rose-500 text-white rounded-full">
            {visibleAlerts > 99 ? '99+' : visibleAlerts}
          </span>
        )}
        {maintenanceActive && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
        )}
      </div>
    </div>
  );
});
GlobalStateReadout.displayName = 'GlobalStateReadout';

// ============================================================
// Top Navigation — [PP10] adds the audit button
// ============================================================

interface TopNavigationProps {
  activeTab: TabId;
  onChange: (id: TabId) => void;
  onToggleSidebar: () => void;
  // [PP10]
  onOpenAudit: () => void;
  auditCount: number;
}

const TopNavigation: React.FC<TopNavigationProps> = memo(
  ({ activeTab, onChange, onToggleSidebar, onOpenAudit, auditCount }) => {
    const activeConfig = TABS_BY_ID.get(activeTab);

    return (
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
        <div className="px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5 text-slate-300" />
              </button>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 rounded-lg border border-cyan-500/30">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-bold text-white leading-tight">OptiShield AI</h1>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Cyber-Risk Decision Platform
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-xl overflow-x-auto">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const accent = ACCENT_MAP[tab.accent];
                  const shortLabel = tab.label.split(' ')[0];

                  return (
                    <button
                      key={tab.id}
                      onClick={() => onChange(tab.id)}
                      className={`group relative flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                        isActive
                          ? `${accent.active} ${accent.glow} shadow-lg`
                          : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="hidden md:inline">{tab.label}</span>
                      <span className="md:hidden">{shortLabel}</span>
                      {isActive && (
                        <span
                          className={`absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full ${accent.dot}`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <GlobalStateReadout />

              {/* [PP10] Audit ledger button */}
              <button
                onClick={onOpenAudit}
                className="relative p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                aria-label="Open audit ledger"
                title="Audit ledger & report export"
              >
                <FileCheck className="w-4 h-4 text-emerald-400" />
                {auditCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                    {auditCount > 99 ? '99+' : auditCount}
                  </span>
                )}
              </button>

              <button
                className="p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 text-slate-400" />
              </button>
              <button className="hidden sm:flex items-center gap-2 p-1.5 pr-2.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">
                  RS
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 lg:px-6 py-1.5 bg-slate-900/40 border-t border-slate-800/60">
          <p className="text-[10px] text-slate-500 font-mono">{activeConfig?.sublabel}</p>
        </div>
      </header>
    );
  }
);
TopNavigation.displayName = 'TopNavigation';

// ============================================================
// Global Control Deck
// ============================================================

const GlobalControlDeck: React.FC = memo(() => {
  const {
    cyberBudget,
    threatLevel,
    exposureBaseline,
    maintenanceActive,
    plannedOperationalCost,
  } = useGlobalState();
  const { setCyberBudget, setThreatLevel, setMaintenanceActive } = useGlobalActions();

  const handleMaintenanceToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const active = e.target.checked;
      setMaintenanceActive(active, {
        ticketId: active ? 'CHG-2026-0421' : undefined,
        endsAt: active ? new Date(Date.now() + 4 * 3600_000).toISOString() : undefined,
      });
    },
    [setMaintenanceActive]
  );

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 lg:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Global Control Deck</h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-mono text-cyan-400">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="cyberBudget" className="text-xs font-medium text-slate-400">
              Cyber Budget (Annual)
            </label>
            <span className="text-sm font-mono font-bold text-emerald-400">
              {fmtFull(cyberBudget)}
            </span>
          </div>
          <input
            id="cyberBudget"
            type="range"
            min={500_000}
            max={25_000_000}
            step={100_000}
            value={cyberBudget}
            onChange={(e) => setCyberBudget(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-600">
            <span>$0.5M</span>
            <span>$25M</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="threatLevel" className="text-xs font-medium text-slate-400">
              Threat Environment Level
            </label>
            <span className={`text-sm font-mono font-bold ${threatColor(threatLevel)}`}>
              {threatLevel}/100
            </span>
          </div>
          <input
            id="threatLevel"
            type="range"
            min={0}
            max={100}
            step={1}
            value={threatLevel}
            onChange={(e) => setThreatLevel(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-600">
            <span>LOW</span>
            <span>CRITICAL</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
        <label
          htmlFor="maintenanceToggle"
          className="flex items-center gap-2 text-xs font-medium text-slate-400 cursor-pointer"
        >
          <Wrench className="w-3.5 h-3.5 text-amber-400" />
          Scheduled Maintenance Window
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            id="maintenanceToggle"
            type="checkbox"
            checked={maintenanceActive}
            onChange={handleMaintenanceToggle}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-slate-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500/40 peer-checked:after:bg-amber-400" />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-slate-500">Derived Exposure Baseline</span>
        <span className="font-mono font-bold text-cyan-400">
          {fmtFull(maintenanceActive ? 0 : exposureBaseline)}
        </span>
      </div>

      {maintenanceActive && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-500">Planned Operational Cost</span>
          <span className="font-mono font-bold text-amber-400">
            {fmtFull(plannedOperationalCost)}
          </span>
        </div>
      )}
    </div>
  );
});
GlobalControlDeck.displayName = 'GlobalControlDeck';

// ============================================================
// Tab Views
// ============================================================

// ============================================================
// [PP9] Executive Dashboard tab
// ============================================================
const ExecutiveDashboardTab: React.FC = memo(() => {
  // PP5 Monte Carlo — feeds the 95% VaR into the live ticker.
  const pp5Metrics = useMonteCarlo(
    'srv-pay-02',
    { min: 40_000, mostLikely: 180_000, max: 1_200_000 },
    { min: 1, mostLikely: 3, max: 12 }
  );

  return (
    <RiskDashboardView
      assets={PP9_DEMO_ASSETS as AssetRiskInput[]}
      results={PP9_DEMO_RESULTS}
      var95={pp5Metrics.var95}
    />
  );
});
ExecutiveDashboardTab.displayName = 'ExecutiveDashboardTab';

// [PP4] Added <TelemetryCorrelationGrid /> above the existing <TelemetryGrid />
const TelemetryExposureTab: React.FC = memo(() => (
  <div className="space-y-5">
    <GlobalControlDeck />
    <RevenueAtRiskCards />
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="xl:col-span-2">
        <ExposureFunnel />
      </div>
      <div>
        <ShadowITAlert />
      </div>
    </div>
    {/* [PP4] Multi-source correlation matrix (EDR · SIEM · IAM · CSPM) */}
    <TelemetryCorrelationGrid />
    {/* [PP1] Live feed status panel */}
    <TelemetryGrid />
  </div>
));
TelemetryExposureTab.displayName = 'TelemetryExposureTab';

// ============================================================
// Capital & Compliance — PP2 + PP5 + PP6 + PP7
// ============================================================
const CapitalComplianceTab: React.FC = memo(() => {
  const { cyberBudget, threatLevel } = useGlobalState();
  const { setCyberBudget } = useGlobalActions();
  const [enabledThreats, setEnabledThreats] = useState<string[]>([]);

  // [PP5] Selected asset for the Monte Carlo simulation
  const [selectedPp5Asset, setSelectedPp5Asset] = useState<string>('srv-pay-02');

  const handleThreatToggle = useCallback((id: string) => {
    setEnabledThreats((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }, []);

  const alertLevel: ThreatAlertLevel =
    threatLevel >= 75
      ? 'CRITICAL'
      : threatLevel >= 50
      ? 'HIGH'
      : threatLevel >= 25
      ? 'MEDIUM'
      : 'LOW';

  const optimization = useBudgetOptimizer(
    DEMO_CONTROLS as SecurityControl[],
    cyberBudget,
    alertLevel
  );

  // [PP5] Resolve the currently-selected demo asset
  const pp5Asset =
    PP5_DEMO_ASSETS.find((a) => a.assetId === selectedPp5Asset) ?? PP5_DEMO_ASSETS[0];

  // [PP6] Same Monte Carlo input as PP5 — passed to the Board compliance dashboard
  const pp5Metrics = useMonteCarlo(
    pp5Asset.assetId,
    pp5Asset.lossDistribution,
    pp5Asset.frequencyDistribution
  );

  return (
    <div className="space-y-5">
      <GlobalControlDeck />
      <RevenueAtRiskCards />

      <EfficientFrontierChart result={optimization} currentBudget={cyberBudget} />
      <BudgetRecommendationTable result={optimization} budget={cyberBudget} />

      {/* ============================================================ */}
      {/* [PP5] Monte Carlo / Value-at-Risk — asset selector            */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Monte Carlo target:
        </span>
        {PP5_DEMO_ASSETS.map((a) => (
          <button
            key={a.assetId}
            onClick={() => setSelectedPp5Asset(a.assetId)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors border ${
              selectedPp5Asset === a.assetId
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/40'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
            }`}
          >
            {a.assetId}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* [PP5] Loss Exceedance Curve + VaR metrics                     */}
      {/* ============================================================ */}
      <LossExceedanceChart
        assetId={pp5Asset.assetId}
        assetLabel={pp5Asset.label}
        lossDistribution={pp5Asset.lossDistribution}
        frequencyDistribution={pp5Asset.frequencyDistribution}
      />

      {/* ============================================================ */}
      {/* [PP6] Board Compliance Dashboard                              */}
      {/* ============================================================ */}
      <ComplianceBoardDashboard
        selectedControls={optimization.recommendedControls}
        varMetrics={pp5Metrics}
        appetiteConfig={BOARD_RISK_APPETITE}
        cyberBudget={cyberBudget}
        threatLevel={threatLevel}
      />

      {/* ============================================================ */}
      {/* [PP7] Supply Chain Risk Propagation Graph                     */}
      {/* ============================================================ */}
      <DependencyGraphView
        nodes={PP7_DEMO_NODES as DependencyNode[]}
        edges={PP7_DEMO_EDGES as DependencyEdge[]}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <StressTestingSliders
            budget={cyberBudget}
            enabledThreats={enabledThreats}
            onBudgetChange={setCyberBudget}
            onThreatToggle={handleThreatToggle}
          />
        </div>
        <div>
          <SEBICRIMeter />
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ServiceDependencyGraph />
        <ControlWhatIfSimulator />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <MultiLevelRollup />
        <CorrelatedKillChain />
      </div>
    </div>
  );
});
CapitalComplianceTab.displayName = 'CapitalComplianceTab';

// ============================================================
// [PP3] Real-Time Engine tab
// [PP8] + Remediation Action Center below the risk stream
// ============================================================
const RealTimeEngineTab: React.FC = memo(() => (
  <div className="space-y-5">
    <GlobalControlDeck />
    <RealTimeRiskStream />
    {/* [PP8] REI-ranked remediation playbooks */}
    <RemediationPlaybookView
      threats={PP8_DEMO_THREATS as CorrelatedAssetThreat[]}
      systemState={PP8_DEMO_SYSTEM_STATE as SystemRiskSummary}
    />
  </div>
));
RealTimeEngineTab.displayName = 'RealTimeEngineTab';

const AIPrivacyTab: React.FC = memo(() => (
  <div className="space-y-5">
    <GlobalControlDeck />
    <RevenueAtRiskCards />
    <LogAnalyzer />
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <PresidioAITerminal />
      <CascadeRiskModel />
    </div>
    <AgenticPolicyPlaceholder />
  </div>
));
AIPrivacyTab.displayName = 'AIPrivacyTab';

const AgenticPolicyPlaceholder: React.FC = memo(() => (
  <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-2xl">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
        <ShieldCheck className="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Agentic Policy Matrix</h2>
        <p className="text-xs text-slate-400">Autonomous guardrails &amp; permissions</p>
      </div>
    </div>
    <div className="border border-dashed border-slate-700 rounded-lg p-8 text-center">
      <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
      <p className="text-sm text-slate-400">AgenticPolicyMatrix component</p>
      <p className="text-xs text-slate-600 mt-1">
        Import from ./components/AgenticPolicyMatrix
      </p>
    </div>
  </div>
));
AgenticPolicyPlaceholder.displayName = 'AgenticPolicyPlaceholder';

// ============================================================
// Shell
// ============================================================

const TAB_VIEWS: Record<TabId, React.ComponentType> = {
  // [PP9] executive is the first tab
  executive: ExecutiveDashboardTab,
  telemetry: TelemetryExposureTab,
  capital: CapitalComplianceTab,
  realtime: RealTimeEngineTab,
  'ai-privacy': AIPrivacyTab,
};

const AppShell: React.FC = () => {
  // [PP9] default landing tab is now 'executive'
  const [activeTab, setActiveTab] = useState<TabId>('executive');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarItem, setSidebarItem] = useState('overview');

  // ============================================================
  // [PP10] Audit persistence + modal state
  // ============================================================
  const { cyberBudget, threatLevel, maintenanceActive } = useGlobalState();

  const {
    auditLog,
    ledgerStatus,
    appendAudit,
    hydrated,
  } = useAuditPersistence({
    cyberBudget,
    threatLevel,
    maintenanceActive,
  });

  const [auditOpen, setAuditOpen] = useState(false);

  // Seed a single baseline entry once hydration completes and the
  // log is empty. Makes the modal non-empty on first open.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!hydrated || seededRef.current) return;
    seededRef.current = true;
    if (auditLog.length === 0) {
      void appendAudit(
        'PARAMETER_UPDATE',
        `Session initialized · budget=${cyberBudget} threat=${threatLevel}`
      );
    }
  }, [hydrated, auditLog.length, appendAudit, cyberBudget, threatLevel]);

  // Monte Carlo metrics for the export brief.
  const auditMetrics = useMonteCarlo(
    'srv-pay-02',
    { min: 40_000, mostLikely: 180_000, max: 1_200_000 },
    { min: 1, mostLikely: 3, max: 12 }
  );

  // Remediation + compliance snapshots for the export brief.
  const auditPlaybooks = useMemo(
    () =>
      generateRankedPlaybooks(
        PP8_DEMO_THREATS as CorrelatedAssetThreat[],
        PP8_DEMO_SYSTEM_STATE as SystemRiskSummary
      ),
    []
  );
  const auditCompliance = useMemo(
    () =>
      evaluateComplianceAndAppetite(
        DEMO_CONTROLS as SecurityControl[],
        auditMetrics,
        BOARD_RISK_APPETITE
      ),
    [auditMetrics]
  );

  const handleOpenAudit = useCallback(() => setAuditOpen(true), []);
  const handleCloseAudit = useCallback(() => setAuditOpen(false), []);

  const handleTabChange = useCallback((id: TabId) => {
    setActiveTab(id);
    setSidebarOpen(false);
  }, []);

  const handleSidebarNavigate = useCallback((item: string) => {
    setSidebarItem(item);
    setSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const activeConfig = TABS_BY_ID.get(activeTab);
  const TabView = TAB_VIEWS[activeTab];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Sidebar activeItem={sidebarItem} onNavigate={handleSidebarNavigate} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <div className="lg:pl-64 min-h-screen flex flex-col">
        <TopNavigation
          activeTab={activeTab}
          onChange={handleTabChange}
          onToggleSidebar={toggleSidebar}
          onOpenAudit={handleOpenAudit}
          auditCount={auditLog.length}
        />

        <main className="flex-1 px-4 lg:px-6 py-5">
          <div className="mb-5">
            <h2 className="text-xl lg:text-2xl font-bold text-white">{activeConfig?.label}</h2>
            <p className="text-xs lg:text-sm text-slate-400 mt-0.5">{activeConfig?.blurb}</p>
          </div>
          <TabView />
        </main>

        <footer className="border-t border-slate-800 px-4 lg:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-slate-600 font-mono">
              OptiShield AI v3.2.1 · Confidential · © 2026
            </p>
            <div className="flex items-center gap-3 text-[10px] text-slate-600 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                All Systems Operational
              </span>
              <span>·</span>
              <span>ILP Solver: PuLP 2.9</span>
            </div>
          </div>
        </footer>
      </div>

      {/* ============================================================ */}
      {/* [PP10] Audit ledger + report export modal                     */}
      {/* ============================================================ */}
      <AuditReportModal
        open={auditOpen}
        onClose={handleCloseAudit}
        auditLog={auditLog}
        ledgerStatus={ledgerStatus}
        summary={PP8_DEMO_SYSTEM_STATE as SystemRiskSummary}
        varMetrics={auditMetrics}
        compliance={auditCompliance}
        playbooks={auditPlaybooks}
        frameworkLabel="SEBI CSCRF"
      />
    </div>
  );
};

const App: React.FC = () => (
  <GlobalStateProvider>
    <AppShell />
  </GlobalStateProvider>
);

export default App;