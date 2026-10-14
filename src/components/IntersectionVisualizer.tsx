import React from 'react';
import {
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  Car,
  Navigation,
} from 'lucide-react';
import { GreenCorridorOutput, IntersectionData, TelemetryData } from '../types';

interface IntersectionVisualizerProps {
  intersection: IntersectionData;
  telemetry: TelemetryData;
  lastDecision: GreenCorridorOutput | null;
  onTogglePedestrian: () => void;
}

export const IntersectionVisualizer: React.FC<IntersectionVisualizerProps> = ({
  intersection,
  telemetry,
  lastDecision,
  onTogglePedestrian,
}) => {
  const isEmergency = telemetry.vehicle_type !== 'NONE';
  const isNorthboundTarget = lastDecision?.action?.target_lane.includes('NORTH') ?? true;
  const isGreenOverride = lastDecision?.action?.signal_state === 'GREEN_OVERRIDE';
  const isRedHold = lastDecision?.action?.signal_state === 'RED_HOLD';

  // Distance ratio for vehicle position (0m = intersection center, 500m = edge)
  const clampedDist = Math.max(0, Math.min(500, telemetry.distance_meters));
  const vehicleProgress = 1 - clampedDist / 500; // 0 = start at bottom edge, 1 = center

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
      {/* Visualizer Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h2 className="font-semibold text-white text-sm flex items-center gap-1.5">
            <span>{intersection.id}</span>
            <span className="text-slate-400 font-normal">| {intersection.name}</span>
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          {intersection.safety_buffer_active && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              Safety Buffer: {intersection.safety_buffer_seconds}s
            </span>
          )}
          {intersection.pedestrian_active ? (
            <button
              onClick={onTogglePedestrian}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 hover:bg-red-900 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Pedestrian Active ({intersection.pedestrian_countdown}s)
            </button>
          ) : (
            <button
              onClick={onTogglePedestrian}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Crosswalk Clear (Click to simulate)
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas Map of 4-Way Intersection */}
      <div className="relative w-full aspect-square max-h-[460px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800/90 flex items-center justify-center">
        {/* Subtle asphalt grid texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        <svg viewBox="0 0 500 500" className="w-full h-full select-none">
          <defs>
            {/* Green Corridor Wave Glow */}
            <linearGradient id="corridorGlow" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.0" />
            </linearGradient>

            {/* Pulsing light filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Road Surfaces */}
          {/* North-South Road */}
          <rect x="180" y="0" width="140" height="500" fill="#1e293b" />
          {/* East-West Road */}
          <rect x="0" y="180" width="500" height="140" fill="#1e293b" />

          {/* Active Green Corridor Overlay on Northbound Main */}
          {isGreenOverride && isNorthboundTarget && (
            <rect
              x="250"
              y="180"
              width="70"
              height="320"
              fill="url(#corridorGlow)"
              className="animate-pulse"
            />
          )}

          {/* Lane Divider Lines */}
          {/* North Road center yellow line */}
          <line x1="250" y1="0" x2="250" y2="170" stroke="#eab308" strokeWidth="3" strokeDasharray="10 8" />
          {/* South Road center yellow line */}
          <line x1="250" y1="330" x2="250" y2="500" stroke="#eab308" strokeWidth="3" strokeDasharray="10 8" />
          {/* West Road center yellow line */}
          <line x1="0" y1="250" x2="170" y2="250" stroke="#eab308" strokeWidth="3" strokeDasharray="10 8" />
          {/* East Road center yellow line */}
          <line x1="330" y1="250" x2="500" y2="250" stroke="#eab308" strokeWidth="3" strokeDasharray="10 8" />

          {/* Lane dividers (white dashed lines) */}
          <line x1="215" y1="0" x2="215" y2="170" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 6" />
          <line x1="285" y1="330" x2="285" y2="500" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 6" />
          <line x1="0" y1="215" x2="170" y2="215" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 6" />
          <line x1="330" y1="285" x2="500" y2="285" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6 6" />

          {/* Pedestrian Zebra Crosswalks */}
          {/* South Crosswalk (Main conflict zone for Northbound approach) */}
          <g>
            {[185, 205, 225, 245, 265, 285, 305].map((xPos) => (
              <rect
                key={`south-cross-${xPos}`}
                x={xPos}
                y="335"
                width="14"
                height="18"
                fill={intersection.pedestrian_active ? '#ef4444' : '#e2e8f0'}
                opacity={intersection.pedestrian_active ? 0.9 : 0.6}
              />
            ))}
          </g>

          {/* East Crosswalk */}
          <g>
            {[185, 205, 225, 245, 265, 285, 305].map((yPos) => (
              <rect
                key={`east-cross-${yPos}`}
                x="335"
                y={yPos}
                width="18"
                height="14"
                fill="#cbd5e1"
                opacity="0.5"
              />
            ))}
          </g>

          {/* North Crosswalk */}
          <g>
            {[185, 205, 225, 245, 265, 285, 305].map((xPos) => (
              <rect
                key={`north-cross-${xPos}`}
                x={xPos}
                y="147"
                width="14"
                height="18"
                fill="#cbd5e1"
                opacity="0.5"
              />
            ))}
          </g>

          {/* West Crosswalk */}
          <g>
            {[185, 205, 225, 245, 265, 285, 305].map((yPos) => (
              <rect
                key={`west-cross-${yPos}`}
                x="147"
                y={yPos}
                width="18"
                height="14"
                fill="#cbd5e1"
                opacity="0.5"
              />
            ))}
          </g>

          {/* Pedestrian Active Crossing Figure */}
          {intersection.pedestrian_active && (
            <g className="animate-bounce" style={{ transformOrigin: '240px 344px' }}>
              <circle cx="240" cy="344" r="7" fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />
              <rect x="236" y="348" width="8" height="12" rx="3" fill="#fbbf24" />
              <text x="252" y="348" fill="#f87171" fontSize="10" fontWeight="bold" fontFamily="monospace">
                PEDESTRIAN IN CROSSWALK
              </text>
            </g>
          )}

          {/* Traffic Signal Heads */}
          {/* Northbound Traffic Light (Affects Northbound Lane coming from south) */}
          <g transform="translate(325, 320)">
            <rect x="0" y="0" width="34" height="16" rx="4" fill="#0f172a" stroke="#334155" />
            <circle
              cx="8"
              cy="8"
              r="4.5"
              fill={
                isRedHold || intersection.signals.northbound === 'RED'
                  ? '#ef4444'
                  : '#450a0a'
              }
              filter={isRedHold || intersection.signals.northbound === 'RED' ? 'url(#glow)' : undefined}
            />
            <circle
              cx="17"
              cy="8"
              r="4.5"
              fill={
                intersection.safety_buffer_active || intersection.signals.northbound === 'YELLOW'
                  ? '#f59e0b'
                  : '#451a03'
              }
            />
            <circle
              cx="26"
              cy="8"
              r="4.5"
              fill={
                isGreenOverride || intersection.signals.northbound === 'GREEN' || intersection.signals.northbound === 'GREEN_OVERRIDE'
                  ? '#10b981'
                  : '#022c22'
              }
              filter={isGreenOverride ? 'url(#glow)' : undefined}
            />
          </g>

          {/* Eastbound Traffic Light (Cross traffic - held at RED during green corridor) */}
          <g transform="translate(145, 325)">
            <rect x="0" y="0" width="16" height="34" rx="4" fill="#0f172a" stroke="#334155" />
            <circle
              cx="8"
              cy="8"
              r="4.5"
              fill={
                isGreenOverride || intersection.signals.eastbound === 'RED'
                  ? '#ef4444'
                  : '#450a0a'
              }
              filter={isGreenOverride ? 'url(#glow)' : undefined}
            />
            <circle
              cx="8"
              cy="17"
              r="4.5"
              fill={
                intersection.safety_buffer_active || intersection.signals.eastbound === 'YELLOW'
                  ? '#f59e0b'
                  : '#451a03'
              }
            />
            <circle
              cx="8"
              cy="26"
              r="4.5"
              fill={
                !isGreenOverride && (intersection.signals.eastbound === 'GREEN' || intersection.signals.eastbound === 'GREEN_OVERRIDE')
                  ? '#10b981'
                  : '#022c22'
              }
            />
          </g>

          {/* Westbound Traffic Light */}
          <g transform="translate(340, 145)">
            <rect x="0" y="0" width="16" height="34" rx="4" fill="#0f172a" stroke="#334155" />
            <circle
              cx="8"
              cy="8"
              r="4.5"
              fill={
                isGreenOverride || intersection.signals.westbound === 'RED'
                  ? '#ef4444'
                  : '#450a0a'
              }
              filter={isGreenOverride ? 'url(#glow)' : undefined}
            />
            <circle cx="8" cy="17" r="4.5" fill="#451a03" />
            <circle
              cx="8"
              cy="26"
              r="4.5"
              fill={
                !isGreenOverride && intersection.signals.westbound === 'GREEN'
                  ? '#10b981'
                  : '#022c22'
              }
            />
          </g>

          {/* Queued Civilian Cars */}
          {/* Eastbound cross-traffic queue (held at red light) */}
          <g>
            <rect x="110" y="260" width="30" height="16" rx="3" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
            <rect x="70" y="260" width="30" height="16" rx="3" fill="#334155" stroke="#64748b" strokeWidth="1" />
            <rect x="30" y="260" width="30" height="16" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
          </g>

          {/* Southbound oncoming lane civilian cars */}
          <g>
            <rect x="195" y="100" width="16" height="28" rx="3" fill="#475569" stroke="#94a3b8" strokeWidth="1" />
            <rect x="195" y="50" width="16" height="28" rx="3" fill="#334155" stroke="#64748b" strokeWidth="1" />
          </g>

          {/* Civilian Car in Northbound lane pulling over right to clear way */}
          <g transform={`translate(${isGreenOverride ? 300 : 265}, ${Math.max(200, 480 - vehicleProgress * 300 - 80)})`}>
            <rect x="0" y="0" width="16" height="26" rx="3" fill="#64748b" stroke="#cbd5e1" strokeWidth="1" />
            {isGreenOverride && (
              <text x="18" y="14" fill="#38bdf8" fontSize="8" fontWeight="bold">
                YIELD RIGHT
              </text>
            )}
          </g>

          {/* Approaching Emergency Vehicle (Ambulance or Fire Truck) */}
          {isEmergency && (
            <g
              transform={`translate(260, ${480 - vehicleProgress * 280})`}
              className="transition-all duration-300"
            >
              {/* Vehicle Body */}
              <rect
                x="0"
                y="0"
                width={telemetry.vehicle_type === 'FIRE_ENGINE' ? '24' : '20'}
                height={telemetry.vehicle_type === 'FIRE_ENGINE' ? '46' : '36'}
                rx="4"
                fill={telemetry.vehicle_type === 'FIRE_ENGINE' ? '#dc2626' : '#ffffff'}
                stroke={telemetry.vehicle_type === 'FIRE_ENGINE' ? '#991b1b' : '#0284c7'}
                strokeWidth="2"
                filter="url(#glow)"
              />

              {/* Windshield */}
              <rect
                x="2"
                y="6"
                width={telemetry.vehicle_type === 'FIRE_ENGINE' ? '20' : '16'}
                height="8"
                rx="1"
                fill="#0f172a"
              />

              {/* Flashing Emergency Lightbars (Alternating Red/Blue Strobe) */}
              <circle cx="5" cy="18" r="3" fill="#ef4444" className="animate-ping" />
              <circle cx="15" cy="18" r="3" fill="#3b82f6" className="animate-ping" style={{ animationDelay: '0.15s' }} />

              {/* Roof Cross or Badge */}
              <text
                x={telemetry.vehicle_type === 'FIRE_ENGINE' ? '12' : '10'}
                y="30"
                fill={telemetry.vehicle_type === 'FIRE_ENGINE' ? '#fef08a' : '#ef4444'}
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                {telemetry.vehicle_type === 'FIRE_ENGINE' ? 'F' : '+'}
              </text>

              {/* Distance label floating next to vehicle */}
              <text
                x="28"
                y="20"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
                className="drop-shadow"
              >
                {telemetry.distance_meters}m
              </text>
            </g>
          )}

          {/* Distance markers along Northbound approach lane */}
          {[100, 200, 300, 400].map((dist) => {
            const y = 340 + (dist / 500) * 150;
            return (
              <g key={`dist-marker-${dist}`}>
                <line x1="250" y1={y} x2="320" y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="2 4" />
                <text x="324" y={y + 3} fill="#64748b" fontSize="8" fontFamily="monospace">
                  {dist}m
                </text>
              </g>
            );
          })}

          {/* Compass Rose */}
          <g transform="translate(30, 40)">
            <circle cx="16" cy="16" r="14" fill="#0f172a" stroke="#334155" />
            <text x="16" y="10" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">
              N
            </text>
            <text x="16" y="26" fill="#94a3b8" fontSize="8" textAnchor="middle">
              S
            </text>
            <text x="24" y="19" fill="#94a3b8" fontSize="8" textAnchor="middle">
              E
            </text>
            <text x="8" y="19" fill="#94a3b8" fontSize="8" textAnchor="middle">
              W
            </text>
          </g>
        </svg>

        {/* Status Callout Banner inside canvas */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300">
            <span className="text-slate-500">LANE: </span>
            <span className="text-emerald-400 font-semibold">
              {lastDecision?.action?.target_lane || 'NORTHBOUND_MAIN'}
            </span>
            <span className="text-slate-500 ml-2">STATE: </span>
            <span
              className={`font-semibold ${
                isGreenOverride
                  ? 'text-emerald-400'
                  : isRedHold
                  ? 'text-red-400'
                  : 'text-blue-400'
              }`}
            >
              {lastDecision?.action?.signal_state || 'STANDARD_CYCLE'}
            </span>
          </div>

          <div className="bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300">
            <span className="text-slate-500">ETA: </span>
            <span className="text-amber-400 font-semibold">{telemetry.eta_seconds}s</span>
          </div>
        </div>
      </div>

      {/* Visualizer Footer Key */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-slate-400">
        <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Green Corridor Wave</span>
        </div>
        <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Cross Red Hold</span>
        </div>
        <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Yellow Safety Buffer</span>
        </div>
      </div>
    </div>
  );
};
