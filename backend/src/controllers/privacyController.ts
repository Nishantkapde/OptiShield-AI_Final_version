import { Request, Response } from 'express';
import { PrivacyGuardrailService } from '../services/privacyGuardrail';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const analyzeLogPrivacy = async (req: Request, res: Response) => {
  console.log('👉 Received request at /api/privacy/analyze-log');

  try {
    const { rawLog } = req.body;
    if (!rawLog) {
      return res.status(400).json({ error: 'rawLog parameter is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY is missing from environment variables');
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing in backend .env' });
    }

    // 1. Intercept and Mask raw log telemetry
    const { maskedText, redactedEntities } = PrivacyGuardrailService.maskTelemetry(rawLog);

    // 2. Query LLM safely with sanitized context
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const prompt = `You are a cybersecurity expert. Analyze this sanitized security log for threat activity. Do not attempt to guess redacted entities:\n\n${maskedText}`;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    return res.status(200).json({
      status: 'SECURE',
      originalLength: rawLog.length,
      maskedPrompt: maskedText,
      redactedEntities,
      aiAnalysis: aiResponse
    });
  } catch (error: any) {
    console.error('❌ Error inside analyzeLogPrivacy:', error.message || error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};