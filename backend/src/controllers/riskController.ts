// backend/src/controllers/riskController.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { assessAssetRisk } from '../services/risk/assessAssetRisk';
import { AssetRiskInputSchema } from '../services/risk/schema';
import { listAssets } from '../services/risk/listAssets';

/**
 * POST /api/risk/assess
 *
 * [PRESERVED] Request body contract is the same AssetRiskInput payload.
 * [EXTENDED]  Response also returns maintenance-aware fields.
 */
export const handleRiskAssessment = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // [PRESERVED] Validate incoming payload (fast 400 path).
    const parsed = AssetRiskInputSchema.parse(req.body);

    // [EXTENDED] Injectable `now` for deterministic testing.
    const now = req.query.now ? new Date(String(req.query.now)) : new Date();

    const result = assessAssetRisk(parsed, now);

    // [EXTENDED] Compliance-friendly audit log (SEBI CSCRF / ISO 27001).
    //            In production, ship this to your SIEM / audit bus.
    // eslint-disable-next-line no-console
    console.info(result.auditMessage);

    res.status(200).json({ ok: true, data: result });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        ok: false,
        error: 'INVALID_INPUT',
        issues: err.issues,
      });
      return;
    }
    next(err);
  }
};

/**
 * GET /api/risk/assets
 *
 * [NEW] Returns every asset in the store with its live Pain Point 1
 *       assessment already applied, plus aggregate totals.
 *
 * - Runs `assessAssetRisk` once per asset against the current time.
 * - Honours `?now=<ISO>` for deterministic testing / historical replay.
 * - No request body; no query params required.
 */
export const handleListAssets = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // [NEW] Injectable `now` — same convention as handleRiskAssessment.
    const now = req.query.now ? new Date(String(req.query.now)) : new Date();

    const result = listAssets(now);

    // [NEW] One-line audit summary — useful for SIEM ingestion.
    // eslint-disable-next-line no-console
    console.info(
      `[ASSET_LIST] count=${result.totals.count} ` +
        `inMaintenance=${result.totals.inMaintenance} ` +
        `totalEalUsd=${result.totals.totalEalUsd} ` +
        `plannedCostUsd=${result.totals.totalPlannedOperationalCostUsd} ` +
        `generatedAt=${result.generatedAt}`
    );

    res.status(200).json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
};