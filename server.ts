import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  AnalysisRequest,
  generateCorridorDecision,
  buildGeminiPrompt,
  GREEN_CORRIDOR_SYSTEM_INSTRUCTION,
} from './src/engine/corridorEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded safely from root directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Safely validate and sanitize Gemini API key
const rawApiKey = (process.env.GEMINI_API_KEY || '').trim();
const hasValidGeminiKey = Boolean(
  rawApiKey &&
  rawApiKey !== '' &&
  rawApiKey !== 'MY_GEMINI_API_KEY' &&
  !rawApiKey.includes('MY_GEMINI_API_KEY')
);

// Server-side Google GenAI client (initialized only if valid key exists)
let ai: GoogleGenAI | null = null;
if (hasValidGeminiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: rawApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('[GreenCorridor AI] Gemini 3.8 Flash Neural Core initialized successfully.');
  } catch (initErr) {
    console.warn('[GreenCorridor AI] Warning initializing GoogleGenAI client:', initErr);
    ai = null;
  }
} else {
  console.warn(
    '[GreenCorridor AI] NOTICE: GEMINI_API_KEY environment variable is not set or contains placeholder.\n' +
    'The server will operate in high-reliability autonomous mode using the deterministic GreenCorridor AI rule engine.'
  );
}

// API Route: Analyze corridor and generate strict JSON output
app.post('/api/analyze-corridor', async (req, res) => {
  const reqBody: AnalysisRequest = req.body || {};
  const intersectionId = reqBody.intersection_id || 'INT-104';

  // If Gemini API key is missing or client is uninitialized, immediately use autonomous rule engine
  if (!hasValidGeminiKey || !ai) {
    const fallbackDecision = generateCorridorDecision(reqBody);
    return res.json({
      success: true,
      source: 'greencorridor-deterministic-engine',
      decision: fallbackDecision,
      raw_output: JSON.stringify(fallbackDecision, null, 2),
      warning: 'GEMINI_API_KEY environment variable is not configured on server. Operating in autonomous rule engine mode.',
    });
  }

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
      console.warn('[GreenCorridor AI] Failed to parse Gemini response as JSON. Falling back to autonomous engine.');
    }

    // Fallback if parsing failed
    const fallbackDecision = generateCorridorDecision(reqBody);
    return res.json({
      success: true,
      source: 'greencorridor-deterministic-engine',
      decision: fallbackDecision,
      raw_output: JSON.stringify(fallbackDecision, null, 2),
    });
  } catch (error: any) {
    console.warn('[GreenCorridor AI] Gemini API call failed, falling back to autonomous engine:', error?.message || error);
    const fallbackDecision = generateCorridorDecision(reqBody);
    return res.json({
      success: true,
      source: 'greencorridor-deterministic-fallback',
      decision: fallbackDecision,
      raw_output: JSON.stringify(fallbackDecision, null, 2),
      warning: error?.message || 'Server error running Gemini AI model, autonomous fallback applied',
    });
  }
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  const distIndexPath = path.resolve(__dirname, 'dist', 'index.html');
  res.json({
    status: 'online',
    engine: 'GreenCorridor AI',
    model: hasValidGeminiKey ? 'gemini-3.8-flash' : 'greencorridor-autonomous-engine',
    gemini_key_configured: hasValidGeminiKey,
    frontend_dist_ready: fs.existsSync(distIndexPath),
    time: new Date().toISOString(),
  });
});

// In production, serve the built client
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, 'dist');
  const distIndexPath = path.resolve(distPath, 'index.html');

  // Self-healing check: if dist/index.html does not exist yet (e.g. Render build step was missed), build it automatically
  if (!fs.existsSync(distIndexPath)) {
    console.warn(
      `[GreenCorridor AI] WARNING: 'dist/index.html' not found at ${distIndexPath}.\n` +
      `Automatically building frontend production bundle now...`
    );
    try {
      execSync('npx vite build', { stdio: 'inherit' });
      console.log('[GreenCorridor AI] Frontend production build completed successfully.');
    } catch (buildErr) {
      console.error('[GreenCorridor AI] Error building frontend on start:', buildErr);
    }
  }

  // Mount static assets directory
  app.use(express.static(distPath));

  // SPA fallback route
  app.get('*', (_req, res) => {
    if (fs.existsSync(distIndexPath)) {
      res.sendFile(distIndexPath);
    } else {
      res.status(503).send(`
        <!DOCTYPE html>
        <html>
          <head><title>GreenCorridor AI - Building</title></head>
          <body style="font-family:sans-serif;background:#090d16;color:#e2e8f0;padding:40px;text-align:center;">
            <h1>GreenCorridor AI Server Online</h1>
            <p>Frontend production assets are currently building. Please refresh in a few moments.</p>
            <p style="color:#10b981;">API endpoints are healthy at <code>/api/health</code></p>
          </body>
        </html>
      `);
    }
  });

  app.listen(PORT, () => {
    console.log(`GreenCorridor AI production server running on port ${PORT}`);
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
    console.log(`GreenCorridor AI full-stack dev server running on http://localhost:${PORT}`);
  });
}
