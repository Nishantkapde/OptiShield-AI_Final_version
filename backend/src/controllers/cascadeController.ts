// src/controllers/cascadeController.ts
import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface SystemNode {
  id: string;
  name: string;
  type: 'AI_AGENT' | 'MICROSERVICE' | 'DATABASE' | 'IAM_ROLE';
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  connectedNodes: string[];
}

export const analyzeCascadeRisk = async (req: Request, res: Response) => {
  try {
    const { initialBreachNode, customNodes } = req.body;

    if (!initialBreachNode) {
      return res.status(400).json({ error: 'initialBreachNode parameter is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in backend .env' });
    }

    // Default system dependency graph if custom nodes are not provided
    const graph: SystemNode[] = customNodes || [
      { id: 'node-1', name: 'Customer Support AI Agent', type: 'AI_AGENT', criticality: 'HIGH', connectedNodes: ['node-2', 'node-3'] },
      { id: 'node-2', name: 'User Management Microservice', type: 'MICROSERVICE', criticality: 'CRITICAL', connectedNodes: ['node-4'] },
      { id: 'node-3', name: 'RAG Knowledge Vector DB', type: 'DATABASE', criticality: 'MEDIUM', connectedNodes: [] },
      { id: 'node-4', name: 'Production PostgreSQL Cluster', type: 'DATABASE', criticality: 'CRITICAL', connectedNodes: ['node-5'] },
      { id: 'node-5', name: 'AWS Admin Execution Role', type: 'IAM_ROLE', criticality: 'CRITICAL', connectedNodes: [] },
    ];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const prompt = `
      You are an autonomous cybersecurity risk engine analyzing blast radius cascade risk.
      Target Entry Point of Compromise: "${initialBreachNode}"
      
      System Architecture Graph:
      ${JSON.stringify(graph, null, 2)}

      Analyze the multi-hop blast radius if this node is compromised or hijacked.
      Provide a concise breakdown in valid JSON format with the following keys:
      {
        "affectedNodeIds": string[],
        "maxPropagationHop": number,
        "blastRadiusScore": number (1-100),
        "cascadeImpactSummary": "string describing propagation path",
        "recommendedContainment": ["action item 1", "action item 2"]
      }
    `;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    
    // Parse JSON output from Gemini response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const analysisPayload = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawAnalysis: rawText };

    return res.status(200).json({
      status: 'SUCCESS',
      initialBreachNode,
      analysis: analysisPayload
    });

  } catch (error: any) {
    console.error('❌ Error inside analyzeCascadeRisk:', error.message || error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};