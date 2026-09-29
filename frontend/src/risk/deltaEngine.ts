// frontend/src/risk/deltaEngine.ts
// Event-driven O(1) delta recalculation engine.
//
// ── Full-sweep (the OLD way) ────────────────────────────────
//   on every telemetry event:
//     for each asset: assessAssetRisk()      // O(N)
//     sum results                             // O(N)
//   → O(N) per event. With 10,000 assets, that's 10,000 recomputes.
//
// ── Delta (the NEW way) ─────────────────────────────────────
//   on every telemetry event:
//     lookup one asset                        // O(1) Map.get
//     assessAssetRisk() on that asset         // O(1)
//     ΔEAL = EAL_new − EAL_old                // O(1)
//     systemEAL += ΔEAL                       // O(1)
//   → O(1) per event, regardless of N.
//
// The only O(N) step left is initialization, which happens once.
import { assessAssetRisk } from './assessAssetRisk';
import type {
  AssetRiskInput,
  RiskAssessmentResult,
  SystemRiskSummary,
  TelemetryEvent,
} from './schema';

// ============================================================
// Internal state per asset
// ============================================================
interface AssetState {
  input: AssetRiskInput;
  assessment: RiskAssessmentResult;
}

// ============================================================
// What processTelemetryEvent returns
// ============================================================
export interface DeltaResult {
  /** Updated O(1) system summary */
  summary: SystemRiskSummary;
  /** ΔEAL for the one event that just fired */
  deltaEal: number;
  /** ΔDirectLoss for the one event that just fired */
  deltaDirectLoss: number;
  /** Wall-clock duration of the delta computation (ms) */
  durationMs: number;
}

// ============================================================
// Pure helper — apply the event's newValue to an asset's input
// ============================================================
function applyEventToInput(
  input: AssetRiskInput,
  event: TelemetryEvent
): AssetRiskInput {
  switch (event.eventType) {
    case 'EPSS_UPDATE': {
      if (typeof event.newValue !== 'number') {
        throw new Error(`EPSS_UPDATE requires numeric newValue, got ${typeof event.newValue}`);
      }
      const clamped = Math.max(0, Math.min(1, event.newValue));
      return { ...input, epssScore: clamped };
    }
    case 'MAINTENANCE_TOGGLE': {
      if (typeof event.newValue !== 'boolean') {
        throw new Error(`MAINTENANCE_TOGGLE requires boolean newValue, got ${typeof event.newValue}`);
      }
      if (event.newValue) {
        return {
          ...input,
          isInMaintenance: true,
          changeTicketId: input.changeTicketId ?? 'CHG-ADHOC',
          maintenanceStart: undefined,
          maintenanceEnd: undefined,
        };
      }
      return {
        ...input,
        isInMaintenance: false,
        maintenanceStart: undefined,
        maintenanceEnd: undefined,
      };
    }
    case 'DOWNTIME_CHANGE': {
      if (typeof event.newValue !== 'number') {
        throw new Error(`DOWNTIME_CHANGE requires numeric newValue, got ${typeof event.newValue}`);
      }
      return { ...input, downtimeHours: Math.max(0, event.newValue) };
    }
  }
}

// ============================================================
// The engine — a singleton so multiple hook instances share state
// ============================================================
class DeltaRiskEngine {
  private readonly assets = new Map<string, AssetState>();
  private initialized = false;

  /**
   * [O(N), ONE-TIME] Seed the engine with a portfolio.
   * Runs the full sweep ONCE. All subsequent updates are O(1).
   */
  initialize(
    initialAssets: AssetRiskInput[],
    now: Date = new Date()
  ): SystemRiskSummary {
    this.assets.clear();
    let totalEal = 0;
    let totalDirectLoss = 0;

    for (const input of initialAssets) {
      const assessment = assessAssetRisk(input, now);
      this.assets.set(input.assetId, { input, assessment });
      totalEal += assessment.annualizedLossExpectancyEal;
      totalDirectLoss += assessment.directLoss;
    }

    this.initialized = true;

    return {
      totalEal,
      totalDirectLoss,
      activeAssetCount: this.assets.size,
      lastRecalculationTimeMs: 0,
    };
  }

  /**
   * [O(1)] Process one telemetry event and update the running summary.
   *
   * Steps:
   *   1. Fetch affected asset from the Map            O(1)
   *   2. Capture its old EAL                          O(1)
   *   3. Apply the event's newValue                   O(1)
   *   4. Reassess ONLY this asset                     O(1)
   *   5. ΔEAL = EAL_new − EAL_old                     O(1)
   *   6. systemEAL += ΔEAL                            O(1)
   *   7. Persist the new state                        O(1)
   *
   * Total: O(1) regardless of portfolio size.
   */
  processTelemetryEvent(
    event: TelemetryEvent,
    currentSummary: SystemRiskSummary
  ): DeltaResult {
    const start = performance.now();

    if (!this.initialized) {
      throw new Error('DeltaRiskEngine: call initialize() before dispatching events');
    }

    // Step 1 — O(1) Map lookup
    const state = this.assets.get(event.assetId);
    if (!state) {
      throw new Error(`DeltaRiskEngine: unknown assetId "${event.assetId}"`);
    }

    // Step 2 — capture old values
    const ealOld = state.assessment.annualizedLossExpectancyEal;
    const dlOld = state.assessment.directLoss;

    // Step 3 + 4 — apply event, reassess this ONE asset
    const nextInput = applyEventToInput(state.input, event);
    const nextAssessment = assessAssetRisk(nextInput, new Date(event.timestamp));

    // Step 5 — compute delta
    const deltaEal = nextAssessment.annualizedLossExpectancyEal - ealOld;
    const deltaDirectLoss = nextAssessment.directLoss - dlOld;

    // Step 6 — O(1) update of the running totals
    // (this is the entire point of Pain Point 3 — no full-graph sweep)
    const nextSummary: SystemRiskSummary = {
      ...currentSummary,
      totalEal: currentSummary.totalEal + deltaEal,
      totalDirectLoss: currentSummary.totalDirectLoss + deltaDirectLoss,
      lastEventProcessed: event,
      lastRecalculationTimeMs: performance.now() - start,
    };

    // Step 7 — commit
    this.assets.set(event.assetId, { input: nextInput, assessment: nextAssessment });

    return {
      summary: nextSummary,
      deltaEal,
      deltaDirectLoss,
      durationMs: nextSummary.lastRecalculationTimeMs,
    };
  }

  /** Snapshot getters for UI introspection */
  getAsset(assetId: string): AssetState | undefined {
    return this.assets.get(assetId);
  }

  getAllAssets(): AssetState[] {
    return Array.from(this.assets.values());
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton export — the engine persists across React renders
export const deltaEngine = new DeltaRiskEngine();