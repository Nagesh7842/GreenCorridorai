import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserX,
  Clock,
  Shuffle,
  CheckCircle,
  AlertOctagon,
} from 'lucide-react';

interface SafetyGuardrailsPanelProps {
  pedestrianActive: boolean;
  safetyBufferActive: boolean;
  safetyBufferSeconds: number;
  postPassageCleared: boolean;
  signalState: string;
}

export const SafetyGuardrailsPanel: React.FC<SafetyGuardrailsPanelProps> = ({
  pedestrianActive,
  safetyBufferActive,
  safetyBufferSeconds,
  postPassageCleared,
  signalState,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Autonomous Safety Interlock &amp; Directives</h3>
        </div>
        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
          ISO 26262 ASIL-D Compliant
        </span>
      </div>

      <div className="space-y-3">
        {/* Guardrail 1: Pedestrian Protection */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            pedestrianActive
              ? 'bg-amber-950/40 border-amber-600/80 text-amber-200'
              : 'bg-slate-950/70 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div
                className={`p-1.5 rounded ${
                  pedestrianActive
                    ? 'bg-amber-900/60 text-amber-300'
                    : 'bg-slate-800 text-emerald-400'
                }`}
              >
                {pedestrianActive ? (
                  <AlertOctagon className="w-4 h-4" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Pedestrian Crossing Interlock Directive</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      pedestrianActive
                        ? 'bg-amber-900 text-amber-200 border border-amber-700'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {pedestrianActive ? 'INTERLOCK ENGAGED' : 'STANDBY'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  NEVER grant green override during active pedestrian phase without explicit visual &amp; audio warning first.
                </p>
              </div>
            </div>
          </div>
          {pedestrianActive && (
            <div className="mt-2 text-[11px] font-mono bg-amber-900/40 p-1.5 rounded border border-amber-800/60 text-amber-300 flex items-center justify-between">
              <span>Holding approach lane at RED_HOLD until crosswalk clearance</span>
              <span className="font-bold">AUDIO WARNING ACTIVE</span>
            </div>
          )}
        </div>

        {/* Guardrail 2: Minimal Safety Buffer (Yellow-to-Red transition) */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            safetyBufferActive
              ? 'bg-amber-950/40 border-amber-600/80 text-amber-200'
              : 'bg-slate-950/70 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div
                className={`p-1.5 rounded ${
                  safetyBufferActive
                    ? 'bg-amber-900/60 text-amber-300'
                    : 'bg-slate-800 text-emerald-400'
                }`}
              >
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Anti-T-Bone Collision Safety Buffer</span>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded font-mono text-slate-300">
                    4.0s Mandatory
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Enforces minimal yellow-to-red cross-traffic transition before green corridor activation to prevent high-speed broadside collisions.
                </p>
              </div>
            </div>
          </div>
          {safetyBufferActive && (
            <div className="mt-2 text-[11px] font-mono bg-amber-950/70 p-1.5 rounded border border-amber-800 text-amber-300 flex items-center justify-between">
              <span>Transition buffer in progress: cross-traffic flushing yellow</span>
              <span className="font-bold">{safetyBufferSeconds}s remaining</span>
            </div>
          )}
        </div>

        {/* Guardrail 3: Post-Passage Traffic Stabilization */}
        <div
          className={`p-3 rounded-lg border transition-all ${
            postPassageCleared
              ? 'bg-blue-950/40 border-blue-600/80 text-blue-200'
              : 'bg-slate-950/70 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded bg-slate-800 text-blue-400">
                <Shuffle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Post-Passage Congestion Rebalance</span>
                  <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.2 rounded font-mono">
                    INFO PRIORITY
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Upon intersection clearance, dynamically rebalances signal cycles to flush cross-traffic queue depth accumulated during emergency hold.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
