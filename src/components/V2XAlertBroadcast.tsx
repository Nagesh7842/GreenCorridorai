import React from 'react';
import {
  Radio,
  ArrowRight,
  ShieldAlert,
  Car,
  BellRing,
  Navigation,
} from 'lucide-react';
import { PriorityLevel } from '../types';

interface V2XAlertBroadcastProps {
  broadcastAlert: string;
  priorityLevel: PriorityLevel;
  emergencyDetected: boolean;
  targetLane: string;
  distanceMeters: number;
  etaSeconds: number;
}

export const V2XAlertBroadcast: React.FC<V2XAlertBroadcastProps> = ({
  broadcastAlert,
  priorityLevel,
  emergencyDetected,
  targetLane,
  distanceMeters,
  etaSeconds,
}) => {
  const isCritical = priorityLevel === 'CRITICAL';
  const isModular = priorityLevel === 'MODULAR';

  return (
    <div
      className={`border rounded-xl p-4 shadow-xl transition-all ${
        isCritical
          ? 'bg-slate-900 border-red-600/70 shadow-red-950/40'
          : isModular
          ? 'bg-slate-900 border-amber-600/60 shadow-amber-950/30'
          : 'bg-slate-900 border-slate-800'
      }`}
    >
      {/* V2X Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2">
          <Radio
            className={`w-4 h-4 ${
              isCritical ? 'text-red-400 animate-pulse' : 'text-emerald-400'
            }`}
          />
          <h3 className="font-semibold text-sm text-white flex items-center gap-1.5">
            <span>V2X Vehicle-to-Everything Broadcast HUD</span>
          </h3>
        </div>

        <span
          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
            isCritical
              ? 'bg-red-950 text-red-300 border-red-800'
              : isModular
              ? 'bg-amber-950 text-amber-300 border-amber-800'
              : 'bg-blue-950 text-blue-300 border-blue-800'
          }`}
        >
          {isCritical ? 'CRITICAL EV WARNING' : 'ADVISORY BROADCAST'}
        </span>
      </div>

      {/* Simulated In-Car Cockpit HUD Display */}
      <div className="bg-black/90 rounded-lg p-3.5 border border-slate-800 flex flex-col justify-between relative overflow-hidden">
        {/* Glow corner accent */}
        <div
          className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20 ${
            isCritical ? 'bg-red-500' : 'bg-emerald-500'
          }`}
        />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg ${
                isCritical
                  ? 'bg-red-900/60 text-red-300 border border-red-700/60'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Driver Navigation &amp; HUD Advisory
              </span>
              <p className="text-sm font-semibold text-white mt-0.5 leading-snug">
                {broadcastAlert ||
                  'All clear. GreenCorridor AI monitoring urban sector telemetry.'}
              </p>
            </div>
          </div>
        </div>

        {/* Directional Action Visualizer */}
        {emergencyDetected && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Directional Directive:</span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/70">
                <ArrowRight className="w-3.5 h-3.5" />
                CLEAR {targetLane.replace('_', ' ')} → YIELD RIGHT
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span>
                DIST: <strong className="text-white">{distanceMeters}m</strong>
              </span>
              <span>
                ETA: <strong className="text-emerald-400">{etaSeconds}s</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Disruption Minimization Note */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
        <span>Target Subscribed Devices: 42 Connected HUDs / Google Maps / Apple CarPlay</span>
        <span className="text-emerald-400 font-mono">0 Panic Maneuvers Reported</span>
      </div>
    </div>
  );
};
