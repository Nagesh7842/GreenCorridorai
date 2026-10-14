import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GreenCorridorOutput,
  IntersectionData,
  TelemetryData,
  DecisionLogEntry,
  PriorityLevel,
} from './types';
import { Header } from './components/Header';
import { IntersectionVisualizer } from './components/IntersectionVisualizer';
import { CorridorMap } from './components/CorridorMap';
import { CameraFeedView } from './components/CameraFeedView';
import { V2XAlertBroadcast } from './components/V2XAlertBroadcast';
import { SafetyGuardrailsPanel } from './components/SafetyGuardrailsPanel';
import { JsonOutputConsole } from './components/JsonOutputConsole';
import { ScenarioController } from './components/ScenarioController';
import {
  isAudioEnabled,
  toggleAudio,
  playV2XChime,
  playPedestrianWarning,
} from './utils/audio';

const INITIAL_TELEMETRY: TelemetryData = {
  vehicle_type: 'AMBULANCE',
  vehicle_id: 'MEDIC-07',
  distance_meters: 320,
  speed_mph: 48,
  approach_lane: 'NORTHBOUND_MAIN',
  siren_active: true,
  flashing_lights_detected: true,
  eta_seconds: 15,
};

const INITIAL_INTERSECTION: IntersectionData = {
  id: 'INT-104',
  name: 'Central Plaza Junction',
  cross_street: 'Grand Avenue',
  main_street: 'North Metro Boulevard',
  signals: {
    northbound: 'GREEN_OVERRIDE',
    southbound: 'GREEN',
    eastbound: 'RED',
    westbound: 'RED',
  },
  pedestrian_active: false,
  pedestrian_countdown: 0,
  safety_buffer_active: false,
  safety_buffer_seconds: 0,
  queue_depth: {
    north: 2,
    south: 3,
    east: 7,
    west: 6,
  },
  camera_strobe_hz: 2.4,
};

const INITIAL_DECISION: GreenCorridorOutput = {
  priority_level: 'CRITICAL',
  category: 'SIGNAL_CONTROL',
  intersection_id: 'INT-104',
  action: {
    target_lane: 'NORTHBOUND_MAIN',
    signal_state: 'GREEN_OVERRIDE',
    duration_seconds: 25,
  },
  broadcast_alert: 'Ambulance approaching 320m behind in Northbound Main. Shift right safely.',
  emergency_vehicle_detected: true,
};

export default function App() {
  const [telemetry, setTelemetry] = useState<TelemetryData>(INITIAL_TELEMETRY);
  const [intersection, setIntersection] = useState<IntersectionData>(INITIAL_INTERSECTION);
  const [currentDecision, setCurrentDecision] = useState<GreenCorridorOutput>(INITIAL_DECISION);
  const [rawJson, setRawJson] = useState<string>(JSON.stringify(INITIAL_DECISION, null, 2));
  const [source, setSource] = useState<string>('gemini-3.8-flash');
  const [history, setHistory] = useState<DecisionLogEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(142);
  const [corridorsCleared, setCorridorsCleared] = useState<number>(3);
  const [soundActive, setSoundActive] = useState<boolean>(false);
  const [postPassageCleared, setPostPassageCleared] = useState<boolean>(false);

  // Sound toggle handler
  const handleToggleSound = () => {
    const nextState = toggleAudio();
    setSoundActive(nextState);
  };

  // Call server to analyze corridor with Gemini
  const triggerCorridorAnalysis = useCallback(
    async (
      overrideParams?: {
        customTelemetry?: Partial<TelemetryData>;
        isPedestrian?: boolean;
        isPostPassage?: boolean;
        manualPrompt?: string;
        imageBase64?: string;
      }
    ) => {
      setIsAnalyzing(true);
      const startTime = performance.now();

      const targetTelemetry = {
        ...telemetry,
        ...(overrideParams?.customTelemetry || {}),
      };

      const pedState =
        overrideParams?.isPedestrian !== undefined
          ? overrideParams.isPedestrian
          : intersection.pedestrian_active;

      const postCleared =
        overrideParams?.isPostPassage !== undefined
          ? overrideParams.isPostPassage
          : postPassageCleared;

      try {
        const response = await fetch('/api/analyze-corridor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intersection_id: intersection.id,
            telemetry: {
              vehicle_type: targetTelemetry.vehicle_type,
              distance_meters: targetTelemetry.distance_meters,
              speed_mph: targetTelemetry.speed_mph,
              approach_lane: targetTelemetry.approach_lane,
              siren_active: targetTelemetry.siren_active,
              flashing_lights_detected: targetTelemetry.flashing_lights_detected,
              eta_seconds: targetTelemetry.eta_seconds,
            },
            visual_cue: `Optical strobe detected: ${targetTelemetry.flashing_lights_detected}, Strobe frequency: ${intersection.camera_strobe_hz}Hz.`,
            image_base64: overrideParams?.imageBase64,
            active_pedestrian_crossing: pedState,
            pedestrian_count: pedState ? 1 : 0,
            cross_traffic_congestion: 'MODERATE_HEAVY',
            post_passage_cleared: postCleared,
            manual_override_prompt: overrideParams?.manualPrompt,
          }),
        });

        const data = await response.json();
        const duration = Math.round(performance.now() - startTime);
        setLatencyMs(duration);

        if (data.decision) {
          const decision: GreenCorridorOutput = data.decision;
          setCurrentDecision(decision);
          setRawJson(data.raw_output || JSON.stringify(decision, null, 2));
          setSource(data.source || 'gemini-3.8-flash');

          // Trigger V2X audio chime
          if (decision.priority_level) {
            playV2XChime(decision.priority_level);
          }

          // Add to audit log
          const newEntry: DecisionLogEntry = {
            id: `DEC-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            source: data.source || 'gemini-3.8-flash',
            decision,
            raw_output: data.raw_output || JSON.stringify(decision, null, 2),
            latency_ms: duration,
          };
          setHistory((prev) => [newEntry, ...prev.slice(0, 24)]);

          // Update intersection signals according to AI action
          if (decision.action.signal_state === 'GREEN_OVERRIDE') {
            setIntersection((prev) => ({
              ...prev,
              signals: {
                northbound: decision.action.target_lane.includes('NORTH') ? 'GREEN_OVERRIDE' : 'RED',
                southbound: decision.action.target_lane.includes('SOUTH') ? 'GREEN_OVERRIDE' : 'RED',
                eastbound: decision.action.target_lane.includes('EAST') ? 'GREEN_OVERRIDE' : 'RED',
                westbound: decision.action.target_lane.includes('WEST') ? 'GREEN_OVERRIDE' : 'RED',
              },
            }));
          } else if (decision.action.signal_state === 'RED_HOLD') {
            setIntersection((prev) => ({
              ...prev,
              signals: {
                northbound: 'RED',
                southbound: 'RED',
                eastbound: 'RED',
                westbound: 'RED',
              },
            }));
          } else {
            // Standard cycle
            setIntersection((prev) => ({
              ...prev,
              signals: {
                northbound: 'GREEN',
                southbound: 'GREEN',
                eastbound: 'RED',
                westbound: 'RED',
              },
            }));
          }
        }
      } catch (err) {
        console.error('Failed to analyze corridor:', err);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [telemetry, intersection, postPassageCleared]
  );

  // Scenario Launcher
  const handleTriggerScenario = (
    type: 'AMBULANCE' | 'FIRE_ENGINE' | 'PEDESTRIAN_INCURSION' | 'POST_PASSAGE' | 'NORMAL'
  ) => {
    if (type === 'AMBULANCE') {
      const newTelem: TelemetryData = {
        vehicle_type: 'AMBULANCE',
        vehicle_id: 'MEDIC-07',
        distance_meters: 340,
        speed_mph: 48,
        approach_lane: 'NORTHBOUND_MAIN',
        siren_active: true,
        flashing_lights_detected: true,
        eta_seconds: 16,
      };
      setTelemetry(newTelem);
      setPostPassageCleared(false);
      setIntersection((prev) => ({ ...prev, pedestrian_active: false }));
      triggerCorridorAnalysis({
        customTelemetry: newTelem,
        isPedestrian: false,
        isPostPassage: false,
      });
    } else if (type === 'FIRE_ENGINE') {
      const newTelem: TelemetryData = {
        vehicle_type: 'FIRE_ENGINE',
        vehicle_id: 'LADDER-12',
        distance_meters: 280,
        speed_mph: 42,
        approach_lane: 'EASTBOUND_CROSS',
        siren_active: true,
        flashing_lights_detected: true,
        eta_seconds: 15,
      };
      setTelemetry(newTelem);
      setPostPassageCleared(false);
      setIntersection((prev) => ({ ...prev, pedestrian_active: false }));
      triggerCorridorAnalysis({
        customTelemetry: newTelem,
        isPedestrian: false,
        isPostPassage: false,
      });
    } else if (type === 'PEDESTRIAN_INCURSION') {
      playPedestrianWarning();
      setIntersection((prev) => ({
        ...prev,
        pedestrian_active: true,
        pedestrian_countdown: 8,
      }));
      setPostPassageCleared(false);
      triggerCorridorAnalysis({
        isPedestrian: true,
        isPostPassage: false,
      });
    } else if (type === 'POST_PASSAGE') {
      setPostPassageCleared(true);
      const clearedTelem: TelemetryData = {
        ...telemetry,
        vehicle_type: 'NONE',
        distance_meters: 0,
        eta_seconds: 0,
      };
      setTelemetry(clearedTelem);
      setCorridorsCleared((prev) => prev + 1);
      triggerCorridorAnalysis({
        customTelemetry: clearedTelem,
        isPostPassage: true,
      });
    } else {
      // Normal flow
      const resetTelem: TelemetryData = {
        vehicle_type: 'NONE',
        vehicle_id: '',
        distance_meters: 0,
        speed_mph: 25,
        approach_lane: 'NORTHBOUND_MAIN',
        siren_active: false,
        flashing_lights_detected: false,
        eta_seconds: 0,
      };
      setTelemetry(resetTelem);
      setPostPassageCleared(false);
      setIntersection((prev) => ({
        ...prev,
        pedestrian_active: false,
        safety_buffer_active: false,
      }));
      triggerCorridorAnalysis({
        customTelemetry: resetTelem,
        isPedestrian: false,
        isPostPassage: false,
      });
    }
  };

  // Toggle pedestrian crossing
  const handleTogglePedestrian = () => {
    const nextVal = !intersection.pedestrian_active;
    if (nextVal) {
      playPedestrianWarning();
    }
    setIntersection((prev) => ({
      ...prev,
      pedestrian_active: nextVal,
      pedestrian_countdown: nextVal ? 10 : 0,
    }));
    triggerCorridorAnalysis({ isPedestrian: nextVal });
  };

  // Update telemetry manual tuning
  const handleChangeTelemetry = (updated: Partial<TelemetryData>) => {
    const nextTelem = { ...telemetry, ...updated };
    setTelemetry(nextTelem);
    triggerCorridorAnalysis({ customTelemetry: nextTelem });
  };

  // Dispatch custom manual prompt
  const handleManualPromptSubmit = (prompt: string) => {
    triggerCorridorAnalysis({ manualPrompt: prompt });
  };

  // Periodic vehicle approach progression simulation
  useEffect(() => {
    if (telemetry.vehicle_type === 'NONE') return;

    const interval = setInterval(() => {
      setTelemetry((prev) => {
        if (prev.vehicle_type === 'NONE' || prev.distance_meters <= 0) {
          return prev;
        }

        // Speed in m/s: mph * 0.447
        const metersPerSec = Math.max(1, prev.speed_mph * 0.447);
        const step = Math.round(metersPerSec * 0.8); // 800ms tick
        const nextDist = Math.max(0, prev.distance_meters - step);
        const nextEta = Math.round(nextDist / metersPerSec);

        // If vehicle reaches 0, trigger post-passage clearance
        if (nextDist === 0 && prev.distance_meters > 0) {
          setTimeout(() => {
            handleTriggerScenario('POST_PASSAGE');
          }, 300);
        }

        return {
          ...prev,
          distance_meters: nextDist,
          eta_seconds: nextEta,
        };
      });

      // Pedestrian countdown
      setIntersection((prev) => {
        if (!prev.pedestrian_active || prev.pedestrian_countdown <= 0) return prev;
        const nextCount = prev.pedestrian_countdown - 1;
        return {
          ...prev,
          pedestrian_countdown: nextCount,
          pedestrian_active: nextCount > 0,
        };
      });
    }, 800);

    return () => clearInterval(interval);
  }, [telemetry.vehicle_type]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <Header
        currentPriority={currentDecision.priority_level}
        emergencyActive={currentDecision.emergency_vehicle_detected}
        soundEnabled={soundActive}
        onToggleSound={handleToggleSound}
        latencyMs={latencyMs}
        corridorsCleared={corridorsCleared}
      />

      {/* Main Command & Coordination Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-6 space-y-4">
        {/* Row 1: Scenario Controller Banner */}
        <ScenarioController
          telemetry={telemetry}
          onChangeTelemetry={handleChangeTelemetry}
          pedestrianActive={intersection.pedestrian_active}
          onTogglePedestrian={handleTogglePedestrian}
          onTriggerScenario={handleTriggerScenario}
          onManualPromptSubmit={handleManualPromptSubmit}
          isAnalyzing={isAnalyzing}
        />

        {/* Row 2: V2X Broadcast Banner */}
        <V2XAlertBroadcast
          broadcastAlert={currentDecision.broadcast_alert}
          priorityLevel={currentDecision.priority_level}
          emergencyDetected={currentDecision.emergency_vehicle_detected}
          targetLane={currentDecision.action.target_lane}
          distanceMeters={telemetry.distance_meters}
          etaSeconds={telemetry.eta_seconds}
        />

        {/* Row 3: Central Operations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column (7 cols): Intersection Visualizer & Corridor Map */}
          <div className="lg:col-span-7 space-y-4">
            <IntersectionVisualizer
              intersection={intersection}
              telemetry={telemetry}
              lastDecision={currentDecision}
              onTogglePedestrian={handleTogglePedestrian}
            />

            <CorridorMap
              currentIntersectionId={intersection.id}
              onSelectIntersection={(id) => {
                setIntersection((prev) => ({ ...prev, id }));
                triggerCorridorAnalysis();
              }}
              isEmergencyActive={currentDecision.emergency_vehicle_detected}
              distanceMeters={telemetry.distance_meters}
            />
          </div>

          {/* Right Column (5 cols): Camera Feed, Safety Guardrails & Strict JSON Output */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            <CameraFeedView
              telemetry={telemetry}
              pedestrianActive={intersection.pedestrian_active}
              onAnalyzeFeed={(customImg) =>
                triggerCorridorAnalysis({ imageBase64: customImg })
              }
              isAnalyzing={isAnalyzing}
            />

            <SafetyGuardrailsPanel
              pedestrianActive={intersection.pedestrian_active}
              safetyBufferActive={intersection.safety_buffer_active}
              safetyBufferSeconds={intersection.safety_buffer_seconds}
              postPassageCleared={postPassageCleared}
              signalState={currentDecision.action.signal_state}
            />

            <div className="flex-1 min-h-[300px]">
              <JsonOutputConsole
                currentDecision={currentDecision}
                rawJson={rawJson}
                source={source}
                history={history}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
