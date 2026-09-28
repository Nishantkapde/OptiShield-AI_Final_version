export type TelemetryState = 'healthy' | 'degraded' | 'offline';

export interface TelemetrySource {
  name: string;
  shortName: string;
  description: string;
  state: TelemetryState;
  confidence: number;
  events: string;
  lastSync: string;
  icon: string;
}

export interface ThreatItem {
  id: string;
  label: string;
  asset: string;
  epss: number;
  criticality: 'Critical' | 'High' | 'Medium';
  ale: number;
  kev: boolean;
  color: string;
}

export const telemetrySources: TelemetrySource[] = [
  { name: 'Security Information & Event Management', shortName: 'SIEM', description: 'Splunk Enterprise', state: 'healthy', confidence: 98, events: '1.24M', lastSync: '12s ago', icon: 'activity' },
  { name: 'Endpoint Detection & Response', shortName: 'EDR', description: 'CrowdStrike Falcon', state: 'healthy', confidence: 94, events: '842K', lastSync: '8s ago', icon: 'shield' },
  { name: 'Identity & Access Management', shortName: 'IAM', description: 'Okta Workforce', state: 'degraded', confidence: 76, events: '208K', lastSync: '4m ago', icon: 'key' },
  { name: 'Cloud Security Posture Management', shortName: 'CSPM', description: 'Wiz Cloud', state: 'healthy', confidence: 91, events: '64K', lastSync: '26s ago', icon: 'cloud' },
];

export const threatItems: ThreatItem[] = [
  { id: 'CVE-2026-1102', label: 'Remote Code Execution', asset: 'payments-api-prod', epss: 0.94, criticality: 'Critical', ale: 1860000, kev: true, color: '#f87171' },
  { id: 'CVE-2026-0871', label: 'Privilege Escalation', asset: 'identity-cluster-01', epss: 0.71, criticality: 'Critical', ale: 920000, kev: false, color: '#fb923c' },
  { id: 'CVE-2025-4430', label: 'SQL Injection', asset: 'customer-portal-web', epss: 0.42, criticality: 'High', ale: 412000, kev: false, color: '#fbbf24' },
  { id: 'CVE-2026-0054', label: 'Auth Bypass', asset: 'vpn-gateway-east', epss: 0.18, criticality: 'High', ale: 280000, kev: true, color: '#facc15' },
  { id: 'CVE-2024-7712', label: 'Information Disclosure', asset: 'analytics-worker', epss: 0.06, criticality: 'Medium', ale: 34000, kev: false, color: '#34d399' },
  { id: 'CVE-2025-2938', label: 'Cross-Site Scripting', asset: 'marketing-cms', epss: 0.03, criticality: 'Medium', ale: 18000, kev: false, color: '#34d399' },
];

export const lossDistribution = [
  { range: '$0', value: 2 }, { range: '$250K', value: 6 }, { range: '$500K', value: 11 },
  { range: '$750K', value: 16 }, { range: '$1M', value: 22 }, { range: '$1.25M', value: 27 },
  { range: '$1.5M', value: 31 }, { range: '$1.75M', value: 35 }, { range: '$2M', value: 39 },
  { range: '$2.25M', value: 36 }, { range: '$2.5M', value: 31 }, { range: '$2.75M', value: 24 },
  { range: '$3M', value: 18 }, { range: '$3.25M', value: 12 }, { range: '$3.5M', value: 7 },
  { range: '$3.75M', value: 3 },
];

export const hourlyLossData = [
  { month: 'Jan', value: 1.82 }, { month: 'Feb', value: 2.14 }, { month: 'Mar', value: 1.96 },
  { month: 'Apr', value: 2.48 }, { month: 'May', value: 2.68 }, { month: 'Jun', value: 2.31 },
  { month: 'Jul', value: 2.92 }, { month: 'Aug', value: 2.76 }, { month: 'Sep', value: 3.14 },
  { month: 'Oct', value: 2.85 }, { month: 'Nov', value: 3.22 }, { month: 'Dec', value: 3.08 },
];

export const navItems = [
  { label: 'Risk Overview', icon: 'layout-dashboard' },
  { label: 'Threat Exposure', icon: 'crosshair' },
  { label: 'Asset Inventory', icon: 'server' },
  { label: 'Telemetry', icon: 'radio-tower' },
  { label: 'Scenario Models', icon: 'calculator' },
];

export const formatCurrency = (value: number, decimals = 0) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(decimals || 1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(decimals || 0)}K`;
  return `${value.toFixed(decimals)}`;
};

export interface ThreatToggle {
  id: string;
  label: string;
  description: string;
  multiplier: number;
  icon: string;
}

export const threatToggles: ThreatToggle[] = [
  { id: 'ransomware', label: '50% Surge in Ransomware', description: 'Increases ransomware-related ALE by 50%', multiplier: 1.5, icon: 'alert' },
  { id: 'regulatory', label: 'Regulatory Fine Hike', description: 'Doubles compliance penalty exposure', multiplier: 2.0, icon: 'scale' },
  { id: 'supplychain', label: 'Supply Chain Attack', description: 'Third-party breach probability +40%', multiplier: 1.4, icon: 'network' },
  { id: 'insider', label: 'Insider Threat Escalation', description: 'Privileged user abuse likelihood +30%', multiplier: 1.3, icon: 'key' },
];

export const BUDGET_MIN = 250000;
export const BUDGET_MAX = 5000000;
export const BUDGET_STEP = 25000;
export const BUDGET_DEFAULT = 1850000;

export const BASE_AGGREGATE = 2840000;
export const BASE_HIGH = 4120000;
export const BASE_LOW = 1160000;

export interface BudgetAllocation {
  tool: string;
  category: string;
  cost: number;
  riskReduction: number;
  rosi: number;
  selected: boolean;
}

export const budgetAllocations: BudgetAllocation[] = [
  { tool: 'CrowdStrike Falcon Complete', category: 'EDR / XDR', cost: 180000, riskReduction: 32, rosi: 412, selected: true },
  { tool: 'Okta Identity Governance', category: 'IAM / PAM', cost: 95000, riskReduction: 18, rosi: 287, selected: true },
  { tool: 'Wiz Cloud Security', category: 'CSPM', cost: 120000, riskReduction: 22, rosi: 356, selected: true },
  { tool: 'Splunk Enterprise Security', category: 'SIEM / SOAR', cost: 210000, riskReduction: 28, rosi: 298, selected: true },
  { tool: 'Tenable Vulnerability Mgmt', category: 'VM', cost: 75000, riskReduction: 12, rosi: 194, selected: false },
  { tool: 'Duo MFA Plus', category: 'IAM', cost: 45000, riskReduction: 8, rosi: 165, selected: true },
  { tool: 'Cloudflare DDoS Protection', category: 'Network', cost: 60000, riskReduction: 10, rosi: 178, selected: false },
  { tool: 'Snyk Developer Security', category: 'DevSecOps', cost: 85000, riskReduction: 14, rosi: 221, selected: false },
];

export const efficientFrontierData = [
  { budget: 250, riskReduction: 8, optimal: false },
  { budget: 500, riskReduction: 19, optimal: true },
  { budget: 750, riskReduction: 31, optimal: true },
  { budget: 1000, riskReduction: 42, optimal: true },
  { budget: 1250, riskReduction: 51, optimal: true },
  { budget: 1500, riskReduction: 58, optimal: true },
  { budget: 1750, riskReduction: 64, optimal: true },
  { budget: 2000, riskReduction: 69, optimal: true },
  { budget: 2500, riskReduction: 76, optimal: true },
  { budget: 3000, riskReduction: 81, optimal: true },
  { budget: 3500, riskReduction: 84, optimal: false },
  { budget: 4000, riskReduction: 86, optimal: false },
  { budget: 4500, riskReduction: 87, optimal: false },
  { budget: 5000, riskReduction: 88, optimal: false },
];

export const subOptimalPoints = [
  { budget: 800, riskReduction: 14 },
  { budget: 1200, riskReduction: 28 },
  { budget: 1600, riskReduction: 38 },
  { budget: 2200, riskReduction: 52 },
  { budget: 2800, riskReduction: 61 },
  { budget: 3500, riskReduction: 68 },
  { budget: 4200, riskReduction: 73 },
];
