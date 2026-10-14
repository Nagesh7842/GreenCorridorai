export type PriorityLevel = 'CRITICAL' | 'MODULAR' | 'INFO';
export type Category = 'SIGNAL_CONTROL' | 'DRIVER_ALERT' | 'TRAFFIC_REBALANCE';
export type SignalState = 'GREEN_OVERRIDE' | 'RED_HOLD' | 'STANDARD_CYCLE';

export interface ActionPayload {
  target_lane: string;
  signal_state: SignalState;
  duration_seconds: number;
}

// Strict schema required by prompt
export interface GreenCorridorOutput {
  priority_level: PriorityLevel;
  category: Category;
  intersection_id: string;
  action: ActionPayload;
  broadcast_alert: string;
  emergency_vehicle_detected: boolean;
}

export interface TelemetryData {
  vehicle_type: 'AMBULANCE' | 'FIRE_ENGINE' | 'POLICE' | 'NONE';
  vehicle_id: string;
  distance_meters: number;
  speed_mph: number;
  approach_lane: string;
  siren_active: boolean;
  flashing_lights_detected: boolean;
  eta_seconds: number;
}

export interface IntersectionData {
  id: string;
  name: string;
  cross_street: string;
  main_street: string;
  signals: {
    northbound: 'RED' | 'YELLOW' | 'GREEN' | 'GREEN_OVERRIDE';
    southbound: 'RED' | 'YELLOW' | 'GREEN' | 'GREEN_OVERRIDE';
    eastbound: 'RED' | 'YELLOW' | 'GREEN' | 'GREEN_OVERRIDE';
    westbound: 'RED' | 'YELLOW' | 'GREEN' | 'GREEN_OVERRIDE';
  };
  pedestrian_active: boolean;
  pedestrian_countdown: number;
  safety_buffer_active: boolean;
  safety_buffer_seconds: number;
  queue_depth: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  camera_strobe_hz: number;
}

export interface DecisionLogEntry {
  id: string;
  timestamp: string;
  source: string;
  decision: GreenCorridorOutput;
  raw_output: string;
  latency_ms: number;
}
