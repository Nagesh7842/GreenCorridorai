import React from 'react';
import {
  Siren,
  Volume2,
  VolumeX,
  ShieldCheck,
  Activity,
  Radio,
  Zap,
} from 'lucide-react';
import { PriorityLevel } from '../types';

interface HeaderProps {
  currentPriority: PriorityLevel;
  emergencyActive: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  latencyMs: number;
  corridorsCleared: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentPriority,
  emergencyActive,
  soundEnabled,
  onToggleSound,
  latencyMs,
  corridorsCleared,
}) => {
  return (
    <header className="bg-slate-950 border-b border-slate-800 text-white px-4 py-3 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Persona Title */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md transition-all ${
                emergencyActive
                  ? 'bg-red-600 text-white animate-pulse shadow-red-500/50'
                  : 'bg-emerald-600 text-white shadow-emerald-500/30'
              }`}
            >
              <Siren className="w-6 h-6" />
            </div>
            {emergencyActive && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                GreenCorridor <span className="text-emerald-400 font-mono">AI</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                v2.4 Urban Core
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Intelligent Urban Traffic &amp; Emergency Preemption Engine
            </p>
          </div>
        </div>

        {/* Real-time Status Badges */}
        <div className="flex items-center flex-wrap gap-2 md:gap-3 text-xs">
          {/* Priority State */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-slate-900 border-slate-700">
            <Radio
              className={`w-3.5 h-3.5 ${
                currentPriority === 'CRITICAL'
                  ? 'text-red-400 animate-spin'
                  : currentPriority === 'MODULAR'
                  ? 'text-amber-400'
                  : 'text-blue-400'
              }`}
            />
            <span className="text-slate-400 font-mono">PRIORITY:</span>
            <span
              className={`font-mono font-bold ${
                currentPriority === 'CRITICAL'
                  ? 'text-red-400'
                  : currentPriority === 'MODULAR'
                  ? 'text-amber-300'
                  : 'text-blue-300'
              }`}
            >
              {currentPriority}
            </span>
          </div>

          {/* AI Core Latency */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Gemini Core:</span>
            <span className="font-mono text-emerald-300">{latencyMs}ms</span>
          </div>

          {/* Safety Buffer Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Interlock:</span>
            <span className="font-mono text-emerald-400">ZERO T-BONE BUFFER</span>
          </div>

          {/* Corridors Cleared */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Waves Cleared:</span>
            <span className="font-mono font-semibold text-white">{corridorsCleared}</span>
          </div>

          {/* Audio V2X Chime Button */}
          <button
            onClick={onToggleSound}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 hover:bg-emerald-900/60'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={soundEnabled ? 'Disable audio alerts' : 'Enable audio alerts'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">Audio Active</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Audio Muted</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
