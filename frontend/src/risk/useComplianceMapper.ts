// frontend/src/risk/useComplianceMapper.ts
// React hook — re-runs compliance evaluation whenever
// portfolio, VaR metrics, or board appetite change.
import { useMemo } from 'react';
import {
  computeAppetiteUtilisation,
  evaluateComplianceAndAppetite,
  type AppetiteUtilisation,
} from './complianceEngine';
import type {
  ComplianceStatus,
  RiskAppetiteConfig,
  SecurityControl,
  VaRMetrics,
} from './schema';

interface UseComplianceMapperResult {
  complianceStatuses: ComplianceStatus[];
  appetiteUtilisation: AppetiteUtilisation;
  /** Aggregate across all frameworks */
  averageCoverage: number;
}

export function useComplianceMapper(
  selectedControls: SecurityControl[],
  varMetrics: VaRMetrics,
  appetiteConfig: RiskAppetiteConfig
): UseComplianceMapperResult {
  return useMemo(() => {
    const complianceStatuses = evaluateComplianceAndAppetite(
      selectedControls,
      varMetrics,
      appetiteConfig
    );

    const appetiteUtilisation = computeAppetiteUtilisation(
      varMetrics.var95,
      appetiteConfig.maxAcceptableVar95
    );

    const averageCoverage =
      complianceStatuses.length > 0
        ? Number(
            (
              complianceStatuses.reduce((s, c) => s + c.coveragePercentage, 0) /
              complianceStatuses.length
            ).toFixed(1)
          )
        : 0;

    return { complianceStatuses, appetiteUtilisation, averageCoverage };
  }, [selectedControls, varMetrics, appetiteConfig]);
}