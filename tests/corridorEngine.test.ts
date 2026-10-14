import { describe, test, expect } from '@jest/globals';
import {
  generateCorridorDecision,
  validateCorridorSchema,
  calculateSafetyBuffer,
  buildGeminiPrompt,
  AnalysisRequest,
  VALID_PRIORITY_LEVELS,
  VALID_CATEGORIES,
  VALID_SIGNAL_STATES,
  MIN_SAFETY_BUFFER_SECONDS,
} from '../src/engine/corridorEngine';

describe('GreenCorridor AI - Comprehensive Test Suite', () => {
  // =========================================================================
  // 1. Emergency Vehicle Detection & CRITICAL Priority Override
  // =========================================================================
  describe('1. Emergency Vehicle Detection & Priority Override', () => {
    test('detecting approaching AMBULANCE triggers CRITICAL priority and GREEN_OVERRIDE', () => {
      const request: AnalysisRequest = {
        intersection_id: 'INT-104',
        telemetry: {
          vehicle_type: 'AMBULANCE',
          distance_meters: 320,
          speed_mph: 45,
          approach_lane: 'NORTHBOUND_MAIN',
          siren_active: true,
          flashing_lights_detected: true,
          eta_seconds: 15,
        },
        active_pedestrian_crossing: false,
      };

      const decision = generateCorridorDecision(request);

      expect(decision.priority_level).toBe('CRITICAL');
      expect(decision.category).toBe('SIGNAL_CONTROL');
      expect(decision.action.signal_state).toBe('GREEN_OVERRIDE');
      expect(decision.action.target_lane).toBe('NORTHBOUND_MAIN');
      expect(decision.emergency_vehicle_detected).toBe(true);
      expect(decision.broadcast_alert).toContain('AMBULANCE');
      expect(decision.broadcast_alert).toContain('Shift right safely');
      expect(decision.action.duration_seconds).toBeGreaterThanOrEqual(15);
      expect(decision.action.duration_seconds).toBeLessThanOrEqual(45);
    });

    test('detecting FIRE_ENGINE triggers CRITICAL priority on specified approach lane', () => {
      const request: AnalysisRequest = {
        intersection_id: 'INT-103',
        telemetry: {
          vehicle_type: 'FIRE_ENGINE',
          distance_meters: 220,
          speed_mph: 40,
          approach_lane: 'EASTBOUND_CROSS',
          siren_active: true,
          flashing_lights_detected: true,
        },
        active_pedestrian_crossing: false,
      };

      const decision = generateCorridorDecision(request);

      expect(decision.priority_level).toBe('CRITICAL');
      expect(decision.category).toBe('SIGNAL_CONTROL');
      expect(decision.action.signal_state).toBe('GREEN_OVERRIDE');
      expect(decision.action.target_lane).toBe('EASTBOUND_CROSS');
      expect(decision.emergency_vehicle_detected).toBe(true);
      expect(decision.broadcast_alert).toContain('FIRE_ENGINE');
    });

    test('triggers CRITICAL priority when optical flashing strobe is detected even if vehicle_type is unspecified', () => {
      const request: AnalysisRequest = {
        intersection_id: 'INT-102',
        telemetry: {
          flashing_lights_detected: true,
          distance_meters: 250,
          approach_lane: 'SOUTHBOUND_MAIN',
        },
      };

      const decision = generateCorridorDecision(request);

      expect(decision.priority_level).toBe('CRITICAL');
      expect(decision.category).toBe('SIGNAL_CONTROL');
      expect(decision.action.signal_state).toBe('GREEN_OVERRIDE');
      expect(decision.emergency_vehicle_detected).toBe(true);
    });

    test('triggers CRITICAL priority when acoustic siren is detected without visual tag', () => {
      const request: AnalysisRequest = {
        intersection_id: 'INT-101',
        telemetry: {
          siren_active: true,
          distance_meters: 180,
          approach_lane: 'WESTBOUND_CROSS',
        },
      };

      const decision = generateCorridorDecision(request);

      expect(decision.priority_level).toBe('CRITICAL');
      expect(decision.action.signal_state).toBe('GREEN_OVERRIDE');
      expect(decision.action.target_lane).toBe('WESTBOUND_CROSS');
      expect(decision.emergency_vehicle_detected).toBe(true);
    });

    test('calculates duration proportionally within bounds (15s to 45s)', () => {
      // Very close: 50m -> should clamp to minimum 15s
      const shortDistRequest: AnalysisRequest = {
        telemetry: {
          vehicle_type: 'AMBULANCE',
          distance_meters: 50,
        },
      };
      const shortDecision = generateCorridorDecision(shortDistRequest);
      expect(shortDecision.action.duration_seconds).toBe(15);

      // Very far: 600m -> should clamp to maximum 45s
      const longDistRequest: AnalysisRequest = {
        telemetry: {
          vehicle_type: 'AMBULANCE',
          distance_meters: 600,
        },
      };
      const longDecision = generateCorridorDecision(longDistRequest);
      expect(longDecision.action.duration_seconds).toBe(45);
    });
  });

  // =========================================================================
  // 2. Normal Traffic Conditions & Standard Signal Cycles
  // =========================================================================
  describe('2. Normal Traffic Conditions & Standard Cycles', () => {
    test('maintains standard signal cycles when no emergency vehicle is detected', () => {
      const request: AnalysisRequest = {
        intersection_id: 'INT-104',
        telemetry: {
          vehicle_type: 'NONE',
          distance_meters: 0,
          speed_mph: 25,
          siren_active: false,
          flashing_lights_detected: false,
        },
      };

      const decision = generateCorridorDecision(request);

      expect(decision.priority_level).toBe('MODULAR');
      expect(decision.category).toBe('DRIVER_ALERT');
      expect(decision.action.signal_state).toBe('STANDARD_CYCLE');
      expect(decision.action.duration_seconds).toBe(30);
      expect(decision.emergency_vehicle_detected).toBe(false);
      expect(decision.broadcast_alert).toContain('All lanes standard flow');
    });

    test('treats CIVILIAN vehicle telemetry as standard traffic without preemption', () => {
      const request: AnalysisRequest = {
        intersection_id: 'INT-105',
        telemetry: {
          vehicle_type: 'CIVILIAN',
          speed_mph: 30,
          approach_lane: 'NORTHBOUND_MAIN',
        },
      };

      const decision = generateCorridorDecision(request);

      expect(decision.priority_level).toBe('MODULAR');
      expect(decision.category).toBe('DRIVER_ALERT');
      expect(decision.action.signal_state).toBe('STANDARD_CYCLE');
      expect(decision.emergency_vehicle_detected).toBe(false);
    });

    test('handles empty or missing telemetry gracefully with standard cycle default', () => {
      const request: AnalysisRequest = {};
      const decision = generateCorridorDecision(request);

      expect(decision.intersection_id).toBe('INT-104');
      expect(decision.priority_level).toBe('MODULAR');
      expect(decision.category).toBe('DRIVER_ALERT');
      expect(decision.action.signal_state).toBe('STANDARD_CYCLE');
      expect(decision.emergency_vehicle_detected).toBe(false);
    });
  });

  // =========================================================================
  // 3. Strict JSON Schema Validation
  // =========================================================================
  describe('3. Strict JSON Output Schema Validation', () => {
    test('validates that decision outputs strictly conform to the required JSON schema', () => {
      const testCases: AnalysisRequest[] = [
        {
          telemetry: {
            vehicle_type: 'AMBULANCE',
            distance_meters: 300,
            speed_mph: 45,
            approach_lane: 'NORTHBOUND_MAIN',
          },
        },
        {
          telemetry: {
            vehicle_type: 'FIRE_ENGINE',
            distance_meters: 200,
            approach_lane: 'EASTBOUND_CROSS',
          },
          active_pedestrian_crossing: true,
        },
        {
          post_passage_cleared: true,
        },
        {
          telemetry: {
            vehicle_type: 'NONE',
          },
        },
      ];

      for (const req of testCases) {
        const decision = generateCorridorDecision(req);
        const validation = validateCorridorSchema(decision);

        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);

        // Required top-level keys
        expect(decision).toHaveProperty('priority_level');
        expect(decision).toHaveProperty('category');
        expect(decision).toHaveProperty('intersection_id');
        expect(decision).toHaveProperty('action');
        expect(decision).toHaveProperty('broadcast_alert');
        expect(decision).toHaveProperty('emergency_vehicle_detected');

        // Required enum constraints
        expect(VALID_PRIORITY_LEVELS).toContain(decision.priority_level);
        expect(VALID_CATEGORIES).toContain(decision.category);
        expect(VALID_SIGNAL_STATES).toContain(decision.action.signal_state);

        // Required action sub-keys & types
        expect(typeof decision.action.target_lane).toBe('string');
        expect(typeof decision.action.duration_seconds).toBe('number');
        expect(Number.isInteger(decision.action.duration_seconds)).toBe(true);
        expect(decision.action.duration_seconds).toBeGreaterThan(0);

        // Type validations
        expect(typeof decision.broadcast_alert).toBe('string');
        expect(decision.broadcast_alert.length).toBeGreaterThan(0);
        expect(typeof decision.emergency_vehicle_detected).toBe('boolean');
      }
    });

    test('schema validator rejects non-object or null payloads', () => {
      expect(validateCorridorSchema(null).valid).toBe(false);
      expect(validateCorridorSchema(undefined).valid).toBe(false);
      expect(validateCorridorSchema('not-an-object').valid).toBe(false);
    });

    test('schema validator rejects invalid priority_level', () => {
      const invalid = {
        priority_level: 'URGENT', // Invalid, must be CRITICAL, MODULAR, or INFO
        category: 'SIGNAL_CONTROL',
        intersection_id: 'INT-104',
        action: {
          target_lane: 'NORTHBOUND_MAIN',
          signal_state: 'GREEN_OVERRIDE',
          duration_seconds: 25,
        },
        broadcast_alert: 'Alert message',
        emergency_vehicle_detected: true,
      };

      const result = validateCorridorSchema(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('priority_level'))).toBe(true);
    });

    test('schema validator rejects invalid category', () => {
      const invalid = {
        priority_level: 'CRITICAL',
        category: 'UNKNOWN_CATEGORY',
        intersection_id: 'INT-104',
        action: {
          target_lane: 'NORTHBOUND_MAIN',
          signal_state: 'GREEN_OVERRIDE',
          duration_seconds: 25,
        },
        broadcast_alert: 'Alert message',
        emergency_vehicle_detected: true,
      };

      const result = validateCorridorSchema(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('category'))).toBe(true);
    });

    test('schema validator rejects invalid signal_state or negative duration', () => {
      const invalidSignal = {
        priority_level: 'CRITICAL',
        category: 'SIGNAL_CONTROL',
        intersection_id: 'INT-104',
        action: {
          target_lane: 'NORTHBOUND_MAIN',
          signal_state: 'YELLOW_BLINK', // Invalid
          duration_seconds: -10, // Invalid
        },
        broadcast_alert: 'Alert message',
        emergency_vehicle_detected: true,
      };

      const result = validateCorridorSchema(invalidSignal);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('action.signal_state'))).toBe(true);
      expect(result.errors.some((e) => e.includes('action.duration_seconds'))).toBe(true);
    });

    test('schema validator rejects empty intersection_id or non-string', () => {
      const emptyId = {
        priority_level: 'CRITICAL',
        category: 'SIGNAL_CONTROL',
        intersection_id: '   ',
        action: {
          target_lane: 'NORTHBOUND_MAIN',
          signal_state: 'GREEN_OVERRIDE',
          duration_seconds: 25,
        },
        broadcast_alert: 'Alert',
        emergency_vehicle_detected: true,
      };
      expect(validateCorridorSchema(emptyId).valid).toBe(false);

      const numericId = { ...emptyId, intersection_id: 123 as any };
      expect(validateCorridorSchema(numericId).valid).toBe(false);
    });

    test('schema validator rejects null action or non-object action', () => {
      const nullAction = {
        priority_level: 'CRITICAL',
        category: 'SIGNAL_CONTROL',
        intersection_id: 'INT-104',
        action: null,
        broadcast_alert: 'Alert',
        emergency_vehicle_detected: true,
      };
      expect(validateCorridorSchema(nullAction).valid).toBe(false);

      const stringAction = { ...nullAction, action: 'invalid' as any };
      expect(validateCorridorSchema(stringAction).valid).toBe(false);
    });

    test('schema validator rejects empty or non-string target_lane', () => {
      const emptyLane = {
        priority_level: 'CRITICAL',
        category: 'SIGNAL_CONTROL',
        intersection_id: 'INT-104',
        action: {
          target_lane: '   ',
          signal_state: 'GREEN_OVERRIDE',
          duration_seconds: 25,
        },
        broadcast_alert: 'Alert',
        emergency_vehicle_detected: true,
      };
      expect(validateCorridorSchema(emptyLane).valid).toBe(false);

      const numericLane = {
        ...emptyLane,
        action: { ...emptyLane.action, target_lane: 99 as any },
      };
      expect(validateCorridorSchema(numericLane).valid).toBe(false);
    });

    test('schema validator rejects empty broadcast_alert or non-boolean emergency flag', () => {
      const emptyAlert = {
        priority_level: 'INFO',
        category: 'TRAFFIC_REBALANCE',
        intersection_id: 'INT-104',
        action: {
          target_lane: 'EASTBOUND_CROSS',
          signal_state: 'STANDARD_CYCLE',
          duration_seconds: 30,
        },
        broadcast_alert: '   ',
        emergency_vehicle_detected: true,
      };
      expect(validateCorridorSchema(emptyAlert).valid).toBe(false);

      const nonBoolEmergency = {
        ...emptyAlert,
        broadcast_alert: 'Valid alert',
        emergency_vehicle_detected: 'yes' as any,
      };
      expect(validateCorridorSchema(nonBoolEmergency).valid).toBe(false);
    });

    test('handles fallback intersection ID when provided with blank string', () => {
      const decision = generateCorridorDecision({ intersection_id: '   ' });
      expect(decision.intersection_id).toBe('INT-104');
    });

    test('handles approaching emergency vehicle with missing vehicle_type label', () => {
      const decision = generateCorridorDecision({
        telemetry: {
          siren_active: true,
          vehicle_type: undefined,
        },
      });
      expect(decision.priority_level).toBe('CRITICAL');
      expect(decision.broadcast_alert).toContain('Emergency Vehicle');
    });
  });

  // =========================================================================
  // 4. Safety Guardrails & Directive Interlocks
  // =========================================================================
  describe('4. Autonomous Safety Guardrails & Interlocks', () => {
    test('enforces PEDESTRIAN CROSSING INTERLOCK: never grants green during active pedestrian phase', () => {
      const requestWithPedestrian: AnalysisRequest = {
        intersection_id: 'INT-104',
        telemetry: {
          vehicle_type: 'AMBULANCE',
          distance_meters: 180,
          speed_mph: 45,
          approach_lane: 'NORTHBOUND_MAIN',
          siren_active: true,
        },
        active_pedestrian_crossing: true,
        pedestrian_count: 2,
      };

      const decision = generateCorridorDecision(requestWithPedestrian);

      // Must trigger CRITICAL priority and explicit RED_HOLD, NOT GREEN_OVERRIDE
      expect(decision.priority_level).toBe('CRITICAL');
      expect(decision.category).toBe('SIGNAL_CONTROL');
      expect(decision.action.signal_state).toBe('RED_HOLD');
      expect(decision.action.duration_seconds).toBe(6);
      expect(decision.broadcast_alert).toContain('SAFETY HOLD');
      expect(decision.broadcast_alert).toContain('Pedestrian clearing crosswalk');
      expect(decision.emergency_vehicle_detected).toBe(true);
    });

    test('calculates anti-T-bone safety buffer transition time (minimum 4 seconds)', () => {
      expect(calculateSafetyBuffer()).toBe(MIN_SAFETY_BUFFER_SECONDS);
      expect(calculateSafetyBuffer(20)).toBe(MIN_SAFETY_BUFFER_SECONDS);
      expect(calculateSafetyBuffer(45)).toBe(5);
      expect(calculateSafetyBuffer(65)).toBe(7);
      expect(calculateSafetyBuffer(100)).toBe(8); // Clamped at 8s max
    });
  });

  // =========================================================================
  // 5. Post-Passage Traffic Stabilization (INFO Priority)
  // =========================================================================
  describe('5. Post-Passage Traffic Stabilization', () => {
    test('detects when emergency vehicle has cleared and triggers INFO priority rebalance', () => {
      const postPassageRequest: AnalysisRequest = {
        intersection_id: 'INT-104',
        post_passage_cleared: true,
        cross_traffic_congestion: 'HEAVY',
      };

      const decision = generateCorridorDecision(postPassageRequest);

      expect(decision.priority_level).toBe('INFO');
      expect(decision.category).toBe('TRAFFIC_REBALANCE');
      expect(decision.action.signal_state).toBe('STANDARD_CYCLE');
      expect(decision.action.duration_seconds).toBe(35);
      expect(decision.emergency_vehicle_detected).toBe(false);
      expect(decision.broadcast_alert).toContain('cleared intersection');
      expect(decision.broadcast_alert).toContain('flush extension');
    });
  });

  // =========================================================================
  // 6. Gemini Prompt Formatter & Telemetry Synthesis
  // =========================================================================
  describe('6. Gemini Prompt Builder', () => {
    test('builds comprehensive prompt string containing all telemetry metrics', () => {
      const req: AnalysisRequest = {
        intersection_id: 'INT-104',
        telemetry: {
          vehicle_type: 'AMBULANCE',
          distance_meters: 280,
          speed_mph: 50,
          approach_lane: 'NORTHBOUND_MAIN',
          siren_active: true,
          flashing_lights_detected: true,
          eta_seconds: 13,
        },
        active_pedestrian_crossing: true,
        pedestrian_count: 1,
        cross_traffic_congestion: 'HEAVY',
        manual_override_prompt: 'Operator manual flush request',
      };

      const prompt = buildGeminiPrompt(req);

      expect(prompt).toContain('INT-104');
      expect(prompt).toContain('AMBULANCE');
      expect(prompt).toContain('280 meters');
      expect(prompt).toContain('50 mph');
      expect(prompt).toContain('NORTHBOUND_MAIN');
      expect(prompt).toContain('YES');
      expect(prompt).toContain('Operator manual flush request');
      expect(prompt).toContain('CRITICAL RULES');
    });
  });
});
