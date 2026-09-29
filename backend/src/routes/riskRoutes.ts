// backend/src/routes/riskRoutes.ts
import { Router } from 'express';
import {
  handleRiskAssessment,
  handleListAssets,
} from '../controllers/riskController';

const router = Router();

/**
 * POST /api/risk/assess
 * Single-asset Pain Point 1 assessment with Maintenance Mode Suppressor.
 */
router.post('/assess', handleRiskAssessment);

/**
 * GET /api/risk/assets
 * [NEW] List every asset with its live Pain Point 1 assessment + totals.
 * Supports `?now=<ISO>` for deterministic testing.
 */
router.get('/assets', handleListAssets);

export default router;