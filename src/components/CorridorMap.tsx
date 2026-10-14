import React from 'react';
import { Hospital, MapPin, Zap, CheckCircle2 } from 'lucide-react';

interface CorridorMapProps {
  currentIntersectionId: string;
  onSelectIntersection: (id: string) => void;
  isEmergencyActive: boolean;
  distanceMeters: number;
}

interface CorridorNode {
  id: string;
  name: string;
  crossStreet: string;
  distanceFromStart: number; // in meters along corridor
  status: 'PREEMPTED' | 'ACTIVE_HOLD' | 'SYNCHRONIZED' | 'CLEARED';
}

export const CorridorMap: React.FC<CorridorMapProps> = ({
  currentIntersectionId,
  onSelectIntersection,
  isEmergencyActive,
  distanceMeters,
}) => {
  const nodes: CorridorNode[] = [
    {
      id: 'INT-101',
      name: 'St. Jude Way',
      crossStreet: 'Fire Station 12 Spur',
      distanceFromStart: 1200,
      status: 'CLEARED',
    },
    {
      id: 'INT-102',
      name: 'Market Boulevard',
      crossStreet: 'Commercial Artery',
      distanceFromStart: 850,
      status: 'CLEARED',
    },
    {
      id: 'INT-103',
      name: 'Metro Center',
      crossStreet: 'Transit Hub',
      distanceFromStart: 500,
      status: isEmergencyActive && distanceMeters < 600 ? 'CLEARED' : 'SYNCHRONIZED',
    },
    {
      id: 'INT-104',
      name: 'Central Plaza',
      crossStreet: 'Grand Avenue',
      distanceFromStart: 250,
      status: isEmergencyActive ? 'ACTIVE_HOLD' : 'SYNCHRONIZED',
    },
    {
      id: 'INT-105',
      name: 'Hospital Trauma Gate',
      crossStreet: 'Emergency ER Bay',
      distanceFromStart: 0,
      status: isEmergencyActive ? 'PREEMPTED' : 'SYNCHRONIZED',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Metropolitan Green Wave Corridor</h3>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
          Trauma Route 7A (4.2 km)
        </span>
      </div>

      {/* Corridor Diagram Line */}
      <div className="relative py-2">
        <div className="flex items-center justify-between relative z-10">
          {nodes.map((node, index) => {
            const isCurrent = node.id === currentIntersectionId;
            const isPreempted = node.status === 'PREEMPTED' || node.status === 'ACTIVE_HOLD';

            return (
              <button
                key={node.id}
                onClick={() => onSelectIntersection(node.id)}
                className={`flex flex-col items-center group text-left focus:outline-none transition-all ${
                  isCurrent ? 'scale-105' : 'opacity-85 hover:opacity-100'
                }`}
              >
                {/* Node icon circle */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold border-2 transition-all shadow-md ${
                    isCurrent
                      ? 'bg-emerald-500 border-white text-slate-950 shadow-emerald-500/50 ring-4 ring-emerald-500/30'
                      : isPreempted
                      ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                      : node.status === 'CLEARED'
                      ? 'bg-slate-800 border-slate-600 text-slate-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {index === nodes.length - 1 ? (
                    <Hospital className="w-4 h-4" />
                  ) : node.status === 'CLEARED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <span>{node.id.split('-')[1]}</span>
                  )}
                </div>

                {/* Node label */}
                <span
                  className={`mt-1.5 text-[11px] font-medium text-center line-clamp-1 max-w-[85px] ${
                    isCurrent ? 'text-emerald-300 font-bold' : 'text-slate-400'
                  }`}
                >
                  {node.name}
                </span>

                <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                  {node.id}
                </span>
              </button>
            );
          })}
        </div>

        {/* Connecting Line behind the nodes */}
        <div className="absolute top-[26px] left-6 right-6 h-1 bg-slate-800 z-0">
          <div
            className={`h-full transition-all duration-500 ${
              isEmergencyActive
                ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                : 'bg-slate-700'
            }`}
            style={{ width: isEmergencyActive ? '100%' : '20%' }}
          />
        </div>
      </div>

      {/* Corridor Stats Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          <span>Active Preemption Node:</span>
          <span className="font-mono text-white font-semibold">{currentIntersectionId}</span>
        </div>
        <div className="font-mono text-[11px] text-emerald-400">
          {isEmergencyActive
            ? '⚡ CASCADE GREEN WAVE ACTIVE'
            : '● ADAPTIVE URBAN CYCLE'}
        </div>
      </div>
    </div>
  );
};
