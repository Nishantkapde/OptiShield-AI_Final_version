// backend/src/services/risk/assets.store.ts
// In-memory asset registry. Swap this file for a DB adapter later —
// everything downstream consumes the `StoredAsset[]` shape.
import type { AssetRiskInput } from './schema';

export type AssetFeedType = 'SIEM' | 'EDR' | 'IAM' | 'Cloud' | 'Network' | 'DB';

export interface StoredAsset {
  /** Stable ID — must match assetId inside riskInput when assessing */
  assetId: string;
  name: string;
  type: AssetFeedType;
  source: string;
  eventsPerSec: number;
  coverage: number;
  /** UI-only, in production this comes from the ingestion pipeline's last heartbeat */
  lastEvent: string;
  /** Everything Pain Point 1 needs except `assetId` */
  riskInput: Omit<AssetRiskInput, 'assetId'>;
}

// ============================================================
// Seed data — mirrors your existing frontend mock, but is now
// the single source of truth for the backend.
// ============================================================

const now = Date.now();
const in30Min = new Date(now + 30 * 60_000).toISOString();
const twoHoursAgo = new Date(now - 2 * 3600_000).toISOString();
const in2Hours = new Date(now + 2 * 3600_000).toISOString();

export const ASSETS: StoredAsset[] = [
  {
    assetId: 'siem-1',
    name: 'Splunk Enterprise',
    type: 'SIEM',
    source: 'splunk.corp.optishield.io',
    eventsPerSec: 4520,
    coverage: 98,
    lastEvent: '2s ago',
    riskInput: {
      downtimeHours: 8,
      hourlyRevenueLoss: 45_000,
      recordsExposed: 800,
      costPerRecord: 180,
      epssScore: 0.28,
      assetExposureMultiplier: 1.3,
      annualThreatAttempts: 9,
    },
  },
  {
    assetId: 'edr-1',
    name: 'CrowdStrike Falcon',
    type: 'EDR',
    source: 'falcon.crowdstrike.com',
    eventsPerSec: 2180,
    coverage: 99,
    lastEvent: '1s ago',
    riskInput: {
      downtimeHours: 6,
      hourlyRevenueLoss: 60_000,
      recordsExposed: 500,
      costPerRecord: 220,
      epssScore: 0.35,
      assetExposureMultiplier: 1.6,
      annualThreatAttempts: 14,
      // [EXTENDED] Active maintenance window
      isInMaintenance: true,
      maintenanceStart: twoHoursAgo,
      maintenanceEnd: in30Min,
      changeTicketId: 'CHG-2026-0421',
    },
  },
  {
    assetId: 'iam-1',
    name: 'Okta Identity Cloud',
    type: 'IAM',
    source: 'optishield.okta.com',
    eventsPerSec: 890,
    coverage: 72,
    lastEvent: '45s ago',
    riskInput: {
      downtimeHours: 12,
      hourlyRevenueLoss: 85_000,
      recordsExposed: 3_500,
      costPerRecord: 250,
      epssScore: 0.62,
      assetExposureMultiplier: 2.1,
      annualThreatAttempts: 22,
    },
  },
  {
    assetId: 'cloud-1',
    name: 'AWS CloudTrail',
    type: 'Cloud',
    source: 'cloudtrail.us-east-1.amazonaws.com',
    eventsPerSec: 3200,
    coverage: 95,
    lastEvent: '3s ago',
    riskInput: {
      downtimeHours: 4,
      hourlyRevenueLoss: 120_000,
      recordsExposed: 200,
      costPerRecord: 300,
      epssScore: 0.22,
      assetExposureMultiplier: 1.4,
      annualThreatAttempts: 8,
    },
  },
  {
    assetId: 'net-1',
    name: 'Palo Alto Firewall',
    type: 'Network',
    source: 'panorama.corp.optishield.io',
    eventsPerSec: 0,
    coverage: 0,
    lastEvent: '12m ago',
    riskInput: {
      downtimeHours: 16,
      hourlyRevenueLoss: 200_000,
      recordsExposed: 1_200,
      costPerRecord: 320,
      epssScore: 0.78,
      assetExposureMultiplier: 2.4,
      annualThreatAttempts: 31,
      // [EXTENDED] Active maintenance window — that's why it's "down"
      isInMaintenance: true,
      maintenanceStart: twoHoursAgo,
      maintenanceEnd: in2Hours,
      changeTicketId: 'CHG-2026-0422',
    },
  },
  {
    assetId: 'db-1',
    name: 'PostgreSQL Audit',
    type: 'DB',
    source: 'audit.db.internal',
    eventsPerSec: 450,
    coverage: 88,
    lastEvent: '5s ago',
    riskInput: {
      downtimeHours: 10,
      hourlyRevenueLoss: 30_000,
      recordsExposed: 4_000,
      costPerRecord: 210,
      epssScore: 0.55,
      assetExposureMultiplier: 1.9,
      annualThreatAttempts: 17,
    },
  },
];

// ============================================================
// Store API — swap these bodies for DB queries later
// ============================================================

export function getAllAssets(): readonly StoredAsset[] {
  return ASSETS;
}

export function getAssetById(assetId: string): StoredAsset | undefined {
  return ASSETS.find((a) => a.assetId === assetId);
}