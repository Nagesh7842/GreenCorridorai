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

interface AnalysisRequest {
  intersection_id?: string;
  telemetry?: {
    vehicle_type?: string;
    distance_meters?: number;
    speed_mph?: number;
    approach_lane?: string;
    siren_active?: boolean;
    flashing_lights_detected?: boolean;
    eta_seconds?: number;
  };
  visual_cue?: string;
  image_base64?: string;
  active_pedestrian_crossing?: boolean;
  pedestrian_count?: number;
  cross_traffic_congestion?: string;
  post_passage_cleared?: boolean;
  manual_override_prompt?: string;
}

const GREEN_CORRIDOR_SYSTEM_INSTRUCTION = `
You are GreenCorridor AI, an intelligent urban traffic and emergency response coordination engine.
Your goal is to analyze traffic camera feeds, vehicle telemetry, and sensor data to dynamically grant green corridors for emergency vehicles (ambulances, fire engines) while minimizing city-wide traffic disruption.

Core Objective:
Process incoming intersection visual data, emergency vehicle location inputs, and traffic congestion metrics in real time. Translate this data into immediate, prioritized traffic light adjustments, lane clearing instructions, and route optimization outputs formatted strictly in JSON.

Behavior Rules & Priority Levels:
1. Emergency Priority Override (CRITICAL Priority):
   - Detect approaching emergency vehicles via optical cues (flashing lights, vehicle type) or GPS telemetry.
   - Instantly trigger green signal phases for the approaching lane to flush out queued vehicles before the emergency unit arrives.
   - Hold cross-traffic at red signals to prevent intersection gridlock.
2. Driver & V2X Alert Generation (MODULAR Priority):
   - Generate clear, directional advisory alerts for surrounding connected vehicles and navigation apps (e.g., "Ambulance approaching 300m behind in Left Lane. Shift right safely.").
   - Provide clear lane-clearing directives to prevent panic maneuvers at bottleneck intersections.
3. Post-Passage Traffic Stabilization (INFO Priority):
   - Detect when the emergency vehicle has cleared the intersection.
   - Dynamically rebalance traffic signal timings for surrounding lanes to clear accumulated congestion caused by the emergency hold.

Guardrails & Safety Directives:
- NEVER grant a green light if an active pedestrian crossing phase is underway without issuing an explicit visual/audio warning first.
- ALWAYS maintain a minimal safety buffer (yellow-to-red transition) for cross-traffic to avoid T-bone collisions.
- Output MUST be strictly valid, unescaped JSON. Do not include conversational preambles or wrap the raw output in text explanations.

JSON Output Schema:
{
  "priority_level": "CRITICAL" | "MODULAR" | "INFO",
  "category": "SIGNAL_CONTROL" | "DRIVER_ALERT" | "TRAFFIC_REBALANCE",
  "intersection_id": string,
  "action": {
    "target_lane": string,
    "signal_state": "GREEN_OVERRIDE" | "RED_HOLD" | "STANDARD_CYCLE",
    "duration_seconds": integer
  },
  "broadcast_alert": string,
  "emergency_vehicle_detected": boolean
}
`.trim();

// Fallback generator ensuring 100% compliance if Gemini key is unset or error occurs
function generateDeterministicFallback(reqBody: AnalysisRequest) {
  const intersectionId = reqBody.intersection_id || 'INT-104';
  const isPostPassage = Boolean(reqBody.post_passage_cleared);
  const pedActive = Boolean(reqBody.active_pedestrian_crossing);
  const hasEmergency = Boolean(
    reqBody.telemetry?.vehicle_type && reqBody.telemetry.vehicle_type !== 'NONE'
  ) || Boolean(reqBody.telemetry?.flashing_lights_detected) || Boolean(reqBody.telemetry?.siren_active);

  const lane = reqBody.telemetry?.approach_lane || 'NORTHBOUND_MAIN';
  const dist = reqBody.telemetry?.distance_meters ?? 280;
  const vehicle = reqBody.telemetry?.vehicle_type || 'Ambulance';

  if (isPostPassage) {
    return {
      priority_level: 'INFO',
      category: 'TRAFFIC_REBALANCE',
      intersection_id: intersectionId,
      action: {
        target_lane: 'EASTBOUND_CROSS',
        signal_state: 'STANDARD_CYCLE',
        duration_seconds: 35,
      },
      broadcast_alert: 'Emergency unit cleared intersection. Normal signal cycles restoring with flush extension for cross-traffic.',
      emergency_vehicle_detected: false,
    };
  }

  if (hasEmergency) {
    if (pedActive) {
      return {
        priority_level: 'CRITICAL',
        category: 'SIGNAL_CONTROL',
        intersection_id: intersectionId,
        action: {
          target_lane: lane,
          signal_state: 'RED_HOLD',
          duration_seconds: 6,
        },
        broadcast_alert: `SAFETY HOLD: Pedestrian clearing crosswalk. ${vehicle} inbound ${dist}m. Safety buffer initiated before green corridor flush.`,
        emergency_vehicle_detected: true,
      };
    }

    return {
      priority_level: 'CRITICAL',
      category: 'SIGNAL_CONTROL',
      intersection_id: intersectionId,
      action: {
        target_lane: lane,
        signal_state: 'GREEN_OVERRIDE',
        duration_seconds: Math.max(15, Math.min(45, Math.round(dist / 10))),
      },
      broadcast_alert: `${vehicle} approaching ${dist}m behind in ${lane}. Shift right safely to clear path.`,
      emergency_vehicle_detected: true,
    };
  }

  return {
    priority_level: 'MODULAR',
    category: 'DRIVER_ALERT',
    intersection_id: intersectionId,
    action: {
      target_lane: lane,
      signal_state: 'STANDARD_CYCLE',
      duration_seconds: 30,
    },
    broadcast_alert: 'All lanes standard flow. Maintain safe following distance. Monitoring corridor.',
    emergency_vehicle_detected: false,
  };
}

// API Route: Analyze corridor and generate strict JSON output
app.post('/api/analyze-corridor', async (req, res) => {
  const reqBody: AnalysisRequest = req.body || {};
  const intersectionId = reqBody.intersection_id || 'INT-104';

  try {
    const promptText = `
Analyze the following live traffic telemetry and sensor feeds:
Intersection: ${intersectionId}
Emergency Vehicle Telemetry:
- Type: ${reqBody.telemetry?.vehicle_type || 'UNKNOWN'}
- Distance: ${reqBody.telemetry?.distance_meters ?? 'UNKNOWN'} meters
- Speed: ${reqBody.telemetry?.speed_mph ?? 'UNKNOWN'} mph
- Approach Lane: ${reqBody.telemetry?.approach_lane || 'NORTHBOUND_MAIN'}
- Siren Detected: ${reqBody.telemetry?.siren_active ? 'YES' : 'NO'}
- Flashing Emergency Lights Detected: ${reqBody.telemetry?.flashing_lights_detected ? 'YES' : 'NO'}
- Calculated ETA: ${reqBody.telemetry?.eta_seconds ?? 'UNKNOWN'} seconds

Safety & Cross-Traffic Conditions:
- Active Pedestrian Crossing: ${reqBody.active_pedestrian_crossing ? `YES (${reqBody.pedestrian_count || 1} pedestrian(s) in crosswalk)` : 'NO'}
- Cross Traffic Status: ${reqBody.cross_traffic_congestion || 'MODERATE'}
- Post-Passage Clearance Status: ${reqBody.post_passage_cleared ? 'CLEARED' : 'APPROACHING'}
- Visual Camera Feed Notes: ${reqBody.visual_cue || 'Optical strobe and vehicle outline telemetry active.'}
${reqBody.manual_override_prompt ? `Operator Directive: ${reqBody.manual_override_prompt}` : ''}

CRITICAL RULES:
1. If emergency vehicle detected and approaching: Priority must be CRITICAL, category SIGNAL_CONTROL, action signal_state GREEN_OVERRIDE (or RED_HOLD if active pedestrian crossing requires explicit safety hold first).
2. If pedestrian crossing is active: NEVER immediately grant green without warning and safety buffer.
3. If post-passage cleared: Priority must be INFO, category TRAFFIC_REBALANCE, action signal_state STANDARD_CYCLE.
4. If modular alert: Priority MODULAR, category DRIVER_ALERT.
5. Provide strict valid JSON output matching schema.
`.trim();

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
    const fallbackDecision = generateDeterministicFallback(reqBody);
    return res.json({
      success: true,
      source: 'greencorridor-deterministic-engine',
      decision: fallbackDecision,
      raw_output: JSON.stringify(fallbackDecision, null, 2),
    });
  } catch (error: any) {
    console.error('Error analyzing corridor with Gemini:', error);
    const fallbackDecision = generateDeterministicFallback(reqBody);
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
