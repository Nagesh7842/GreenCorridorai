import { GreenCorridorOutput, PriorityLevel, Category, SignalState } from '../types';

export interface AnalysisRequest {
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

export const VALID_PRIORITY_LEVELS: PriorityLevel[] = ['CRITICAL', 'MODULAR', 'INFO'];
export const VALID_CATEGORIES: Category[] = ['SIGNAL_CONTROL', 'DRIVER_ALERT', 'TRAFFIC_REBALANCE'];
export const VALID_SIGNAL_STATES: SignalState[] = ['GREEN_OVERRIDE', 'RED_HOLD', 'STANDARD_CYCLE'];

export const MIN_SAFETY_BUFFER_SECONDS = 4; // Yellow-to-red buffer to prevent T-bone collisions

export const GREEN_CORRIDOR_SYSTEM_INSTRUCTION = `
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

/**
 * Validates that an output strictly conforms to the required JSON schema.
 */
export function validateCorridorSchema(data: any): { valid: boolean; errors: string[] } {
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Output must be a non-null object'] };
  }

  const errors: string[] = [];

  // 1. priority_level validation
  if (!VALID_PRIORITY_LEVELS.includes(data.priority_level)) {
    errors.push(
      `priority_level must be one of: ${VALID_PRIORITY_LEVELS.join(', ')}. Received: ${data.priority_level}`
    );
  }

  // 2. category validation
  if (!VALID_CATEGORIES.includes(data.category)) {
    errors.push(
      `category must be one of: ${VALID_CATEGORIES.join(', ')}. Received: ${data.category}`
    );
  }

  // 3. intersection_id validation
  if (typeof data.intersection_id !== 'string' || data.intersection_id.trim() === '') {
    errors.push('intersection_id must be a non-empty string');
  }

  // 4. action object validation
  if (!data.action || typeof data.action !== 'object') {
    errors.push('action must be an object');
  } else {
    if (typeof data.action.target_lane !== 'string' || data.action.target_lane.trim() === '') {
      errors.push('action.target_lane must be a non-empty string');
    }
    if (!VALID_SIGNAL_STATES.includes(data.action.signal_state)) {
      errors.push(
        `action.signal_state must be one of: ${VALID_SIGNAL_STATES.join(', ')}. Received: ${data.action.signal_state}`
      );
    }
    if (typeof data.action.duration_seconds !== 'number' || !Number.isInteger(data.action.duration_seconds) || data.action.duration_seconds <= 0) {
      errors.push('action.duration_seconds must be a positive integer');
    }
  }

  // 5. broadcast_alert validation
  if (typeof data.broadcast_alert !== 'string' || data.broadcast_alert.trim() === '') {
    errors.push('broadcast_alert must be a non-empty string');
  }

  // 6. emergency_vehicle_detected validation
  if (typeof data.emergency_vehicle_detected !== 'boolean') {
    errors.push('emergency_vehicle_detected must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculates safety transition buffer time to avoid T-bone collisions with cross-traffic.
 */
export function calculateSafetyBuffer(speedMph?: number): number {
  if (!speedMph || speedMph < 25) {
    return MIN_SAFETY_BUFFER_SECONDS;
  }
  // For higher cross-traffic speed, increase buffer proportionally
  return Math.min(8, Math.max(MIN_SAFETY_BUFFER_SECONDS, Math.round(speedMph * 0.1)));
}

/**
 * Evaluates telemetry, sensor inputs, and safety constraints to produce
 * a deterministic prioritized GreenCorridor decision.
 */
export function generateCorridorDecision(req: AnalysisRequest): GreenCorridorOutput {
  const intersectionId = req.intersection_id && req.intersection_id.trim() !== ''
    ? req.intersection_id
    : 'INT-104';

  const isPostPassage = Boolean(req.post_passage_cleared);
  const pedActive = Boolean(req.active_pedestrian_crossing);

  const vehicleType = req.telemetry?.vehicle_type?.toUpperCase();
  const hasEmergencyType = Boolean(
    vehicleType && vehicleType !== 'NONE' && vehicleType !== 'CIVILIAN'
  );
  const hasOpticalCue = Boolean(req.telemetry?.flashing_lights_detected);
  const hasAcousticSiren = Boolean(req.telemetry?.siren_active);

  const emergencyDetected = hasEmergencyType || hasOpticalCue || hasAcousticSiren;

  const lane = req.telemetry?.approach_lane || 'NORTHBOUND_MAIN';
  const dist = req.telemetry?.distance_meters ?? 280;
  const displayVehicle = req.telemetry?.vehicle_type && req.telemetry.vehicle_type !== 'NONE'
    ? req.telemetry.vehicle_type
    : 'Emergency Vehicle';

  // Behavior Rule 3: Post-Passage Traffic Stabilization (INFO Priority)
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

  // Behavior Rule 1: Emergency Priority Override (CRITICAL Priority)
  if (emergencyDetected) {
    // Guardrail Directive: NEVER grant a green light if an active pedestrian crossing phase
    // is underway without issuing an explicit visual/audio warning first.
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
        broadcast_alert: `SAFETY HOLD: Pedestrian clearing crosswalk. ${displayVehicle} inbound ${dist}m. Safety buffer initiated before green corridor flush.`,
        emergency_vehicle_detected: true,
      };
    }

    // Emergency detected and crosswalk clear -> Trigger Green Corridor Phase
    const duration = Math.max(15, Math.min(45, Math.round(dist / 10)));
    return {
      priority_level: 'CRITICAL',
      category: 'SIGNAL_CONTROL',
      intersection_id: intersectionId,
      action: {
        target_lane: lane,
        signal_state: 'GREEN_OVERRIDE',
        duration_seconds: duration,
      },
      broadcast_alert: `${displayVehicle} approaching ${dist}m behind in ${lane}. Shift right safely to clear path.`,
      emergency_vehicle_detected: true,
    };
  }

  // Behavior Rule 2: Driver & V2X Alert Generation / Normal Conditions (MODULAR Priority)
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

/**
 * Builds standard system prompt for Gemini analysis.
 */
export function buildGeminiPrompt(reqBody: AnalysisRequest): string {
  const intersectionId = reqBody.intersection_id || 'INT-104';
  return `
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
}
