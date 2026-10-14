import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Server-side Google GenAI initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

import {
  AnalysisRequest,
  generateCorridorDecision,
  buildGeminiPrompt,
  GREEN_CORRIDOR_SYSTEM_INSTRUCTION,
} from './src/engine/corridorEngine.js';

// API Route: Analyze corridor and generate strict JSON output
app.post('/api/analyze-corridor', async (req, res) => {
  const reqBody: AnalysisRequest = req.body || {};
  const intersectionId = reqBody.intersection_id || 'INT-104';

  try {
    const promptText = buildGeminiPrompt(reqBody);

    let contents: any = promptText;

    // Support image analysis if base64 provided
    if (reqBody.image_base64) {
      const mimeMatch = reqBody.image_base64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (mimeMatch) {
        contents = {
          parts: [
            {
              inlineData: {
                mimeType: mimeMatch[1],
                data: mimeMatch[2],
              },
            },
            { text: promptText },
          ],
        };
      }
    }

    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: GREEN_CORRIDOR_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              priority_level: {
                type: Type.STRING,
                description: 'Must be CRITICAL, MODULAR, or INFO',
              },
              category: {
                type: Type.STRING,
                description: 'Must be SIGNAL_CONTROL, DRIVER_ALERT, or TRAFFIC_REBALANCE',
              },
              intersection_id: {
                type: Type.STRING,
                description: 'Intersection identifier, e.g., INT-104',
              },
              action: {
                type: Type.OBJECT,
                properties: {
                  target_lane: {
                    type: Type.STRING,
                    description: 'Target lane affected',
                  },
                  signal_state: {
                    type: Type.STRING,
                    description: 'Must be GREEN_OVERRIDE, RED_HOLD, or STANDARD_CYCLE',
                  },
                  duration_seconds: {
                    type: Type.INTEGER,
                    description: 'Duration of signal state in seconds',
                  },
                },
                required: ['target_lane', 'signal_state', 'duration_seconds'],
              },
              broadcast_alert: {
                type: Type.STRING,
                description: 'Short clear advisory message for surrounding driver HUDs/apps.',
              },
              emergency_vehicle_detected: {
                type: Type.BOOLEAN,
                description: 'Whether an emergency vehicle is detected',
              },
            },
            required: [
              'priority_level',
              'category',
              'intersection_id',
              'action',
              'broadcast_alert',
              'emergency_vehicle_detected',
            ],
          },
        },
      });

      const rawText = response.text?.trim() || '';
      try {
        const parsed = JSON.parse(rawText);
        return res.json({
          success: true,
          source: 'gemini-3.8-flash',
          decision: parsed,
          raw_output: rawText,
        });
      } catch (parseErr) {
        console.error('Failed to parse Gemini JSON output:', rawText);
      }
    }

    // Fallback if no API key or parsing failed
    const fallbackDecision = generateCorridorDecision(reqBody);
    return res.json({
      success: true,
      source: 'greencorridor-deterministic-engine',
      decision: fallbackDecision,
      raw_output: JSON.stringify(fallbackDecision, null, 2),
    });
  } catch (error: any) {
    console.error('Error analyzing corridor with Gemini:', error);
    const fallbackDecision = generateCorridorDecision(reqBody);
    return res.json({
      success: true,
      source: 'greencorridor-deterministic-fallback',
      decision: fallbackDecision,
      raw_output: JSON.stringify(fallbackDecision, null, 2),
      warning: error?.message || 'Server error running Gemini AI model, fallback applied',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    engine: 'GreenCorridor AI',
    model: 'gemini-3.8-flash',
    gemini_key_configured: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// In production, serve the built client
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
  app.listen(PORT, () => {
    console.log(`GreenCorridor AI server running in production on port ${PORT}`);
  });
} else {
  // In development, hook Vite middlewares
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  app.listen(PORT, () => {
    console.log(`GreenCorridor AI full-stack server running on http://localhost:${PORT}`);
  });
}
