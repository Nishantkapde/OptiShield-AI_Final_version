export interface RedactedEntity {
  type: string;
  original: string;
  placeholder: string;
}

export interface AnalyzeLogResponse {
  status: string;
  originalLength: number;
  maskedPrompt: string;
  redactedEntities: RedactedEntity[];
  aiAnalysis: string;
}

const API_BASE_URL = 'http://localhost:5001/api';

export const analyzeLogTelemetry = async (rawLog: string): Promise<AnalyzeLogResponse> => {
  const response = await fetch(`${API_BASE_URL}/privacy/analyze-log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rawLog }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to analyze log telemetry.');
  }

  return response.json();
};

// ============================================================
// Appended Code for Pain Point 10: Risk Simulation
// ============================================================

export interface BackendSimulationResponse {
  success: boolean;
  simulationParams: {
    selectedControls: string[];
    totalImplementationCost: number;
  };
  metrics: {
    baselineEal: number;
    simulatedEal: number;
    baselineVar: number;
    simulatedVar: number;
    ealSavings: number;
    netRoi: number;
  };
  trendForecast: Array<{
    month: string;
    projectedEal: number;
    projectedVar: number;
  }>;
  recommendation: string;
}

export const runRiskSimulation = async (
  selectedControls: string[],
  threatLevel: number = 62
): Promise<BackendSimulationResponse> => {
  const response = await fetch(`${API_BASE_URL}/risk/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ selectedControls, threatLevel }),
  });

  if (!response.ok) {
    let errorData = { error: 'Failed to run risk simulation.' };
    try {
      errorData = await response.json();
    } catch (e) {
      // Ignore JSON parse error if response is not JSON
    }
    throw new Error(errorData.error);
  }

  return response.json();
};