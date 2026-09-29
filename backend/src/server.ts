// backend/src/server.ts
import dotenv from 'dotenv';
dotenv.config(); // Must be called BEFORE importing routes

import express from 'express';
import cors from 'cors';
import privacyRoutes from './routes/privacyRoutes';
import cascadeRoutes from './routes/cascadeRoutes'; // Pain Point 12 Route Import
import riskRoutes from './routes/riskRoutes';       // [NEW] Pain Point 1 Maintenance Mode Route Import

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use('/api/privacy', privacyRoutes);
app.use('/api/cascade', cascadeRoutes); // Pain Point 12 Route Endpoint
app.use('/api/risk', riskRoutes);       // [NEW] Pain Point 1 Maintenance Mode Endpoint (POST /api/risk/assess)

// Pain Point 11: Shadow Asset Penalization Workflow Route
app.post('/api/shadow-assets/analyze', async (req, res) => {
  try {
    const unmappedEntities = [
      { id: 'net-991', ip: '192.168.4.88', type: 'Unauth AWS S3 Bucket', source: 'EDR Telemetry', riskMultiplier: 1.8 },
      { id: 'net-412', ip: '10.0.12.45', type: 'Shadow LLM Endpoint', source: 'Network Scan', riskMultiplier: 2.2 },
    ];

    const totalPenaltyMultiplier = unmappedEntities.reduce((acc, curr) => acc * curr.riskMultiplier, 1.5);

    res.json({
      success: true,
      unmappedCount: unmappedEntities.length,
      unmappedEntities,
      penaltyMultiplier: Number(totalPenaltyMultiplier.toFixed(2)),
      recommendation: 'Reconcile unmapped assets into the CMDB inventory or isolate via network policy to reduce risk score penalty.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Shadow asset analysis failed' });
  }
});

// Pain Point 10: Control-Level What-If Simulation & Predictive Risk Trend Engine
app.post('/api/risk/simulate', async (req, res) => {
  try {
    const { selectedControls = [], threatLevel = 62 } = req.body;

    const baseEal = 4850000 * (threatLevel / 50);
    const baseVar = baseEal * 0.32;

    const controlImpacts: Record<string, { ealReduction: number; cost: number; label: string }> = {
      mfa_privileged: { ealReduction: 0.22, cost: 150000, label: 'Enforce MFA on All Privileged Accounts' },
      zero_trust_segmentation: { ealReduction: 0.35, cost: 450000, label: 'Zero-Trust Network Micro-segmentation' },
      edr_deployment: { ealReduction: 0.28, cost: 300000, label: 'Advanced EDR & Automated Containment' },
      cloud_cspm: { ealReduction: 0.18, cost: 120000, label: 'Cloud Security Posture Management (CSPM)' },
      patch_automation: { ealReduction: 0.25, cost: 200000, label: 'Automated EPSS-Prioritized Patching' },
    };

    let totalReduction = 0;
    let totalImplementationCost = 0;
    const appliedControlsList: string[] = [];

    selectedControls.forEach((controlId: string) => {
      if (controlImpacts[controlId]) {
        totalReduction += controlImpacts[controlId].ealReduction;
        totalImplementationCost += controlImpacts[controlId].cost;
        appliedControlsList.push(controlImpacts[controlId].label);
      }
    });

    const effectiveReduction = Math.min(0.85, totalReduction);
    const simulatedEal = Math.round(baseEal * (1 - effectiveReduction));
    const simulatedVar = Math.round(baseVar * (1 - effectiveReduction));
    const ealSavings = Math.round(baseEal - simulatedEal);
    const netRoi = totalImplementationCost > 0 ? ((ealSavings - totalImplementationCost) / totalImplementationCost) * 100 : 0;

    const months = ['Current', 'Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
    const trendForecast = months.map((month, idx) => {
      const progressionFactor = 1 - (effectiveReduction * (idx / (months.length - 1)));
      return {
        month,
        projectedEal: Math.round(baseEal * progressionFactor),
        projectedVar: Math.round(baseVar * progressionFactor),
      };
    });

    res.json({
      success: true,
      simulationParams: {
        selectedControls: appliedControlsList,
        totalImplementationCost,
      },
      metrics: {
        baselineEal: Math.round(baseEal),
        simulatedEal,
        baselineVar: Math.round(baseVar),
        simulatedVar,
        ealSavings,
        netRoi: Number(netRoi.toFixed(1)),
      },
      trendForecast,
      recommendation: appliedControlsList.length > 0
        ? `Deploying ${appliedControlsList.length} selected control(s) yields an estimated ROI of ${netRoi.toFixed(1)}% with a Risk Reduction of ${(effectiveReduction * 100).toFixed(0)}%.`
        : 'Select at least one control to simulate granular risk mitigation impact.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to compute scenario simulation' });
  }
});

app.listen(PORT, () => {
  console.log(`OptiShield-AI Backend running on port ${PORT}`);
});