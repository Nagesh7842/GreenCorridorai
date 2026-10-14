import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Sliders,
  Send,
  Flame,
  Ambulance,
  UserCheck,
  AlertOctagon,
  Shuffle,
  ShieldAlert,
} from 'lucide-react';
import { TelemetryData } from '../types';

interface ScenarioControllerProps {
  telemetry: TelemetryData;
  onChangeTelemetry: (updated: Partial<TelemetryData>) => void;
  pedestrianActive: boolean;
  onTogglePedestrian: () => void;
  onTriggerScenario: (type: 'AMBULANCE' | 'FIRE_ENGINE' | 'PEDESTRIAN_INCURSION' | 'POST_PASSAGE' | 'NORMAL') => void;
  onManualPromptSubmit: (prompt: string) => void;
  isAnalyzing: boolean;
}

export const ScenarioController: React.FC<ScenarioControllerProps> = ({
  telemetry,
  onChangeTelemetry,
  pedestrianActive,
  onTogglePedestrian,
  onTriggerScenario,
  onManualPromptSubmit,
  isAnalyzing,
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [showManualTuning, setShowManualTuning] = useState(false);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    onManualPromptSubmit(customPrompt);
    setCustomPrompt('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2">
          <Play className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Emergency Dispatch &amp; Scenario Simulator</h3>
        </div>

        <button
          onClick={() => setShowManualTuning(!showManualTuning)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
            showManualTuning
              ? 'bg-slate-700 border-slate-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{showManualTuning ? 'Hide Sliders' : 'Manual Tuning'}</span>
        </button>
      </div>

      {/* Quick Scenario Preset Launchers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
        {/* Scenario 1: Code 3 Ambulance */}
        <button
          onClick={() => onTriggerScenario('AMBULANCE')}
          disabled={isAnalyzing}
          className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-red-900/60 hover:border-red-500 transition-all text-left flex flex-col justify-between group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <Ambulance className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono text-red-400 font-bold bg-red-950 px-1 rounded">
              CRITICAL
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold text-white block">Code 3 Ambulance</span>
            <span className="text-[10px] text-slate-400">Northbound Main, 320m</span>
          </div>
        </button>

        {/* Scenario 2: 3-Alarm Fire Engine */}
        <button
          onClick={() => onTriggerScenario('FIRE_ENGINE')}
          disabled={isAnalyzing}
          className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-amber-900/60 hover:border-amber-500 transition-all text-left flex flex-col justify-between group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <Flame className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950 px-1 rounded">
              CRITICAL
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold text-white block">Ladder 12 Fire Truck</span>
            <span className="text-[10px] text-slate-400">Heavy Cross-Traffic</span>
          </div>
        </button>

        {/* Scenario 3: Active Pedestrian Crossing */}
        <button
          onClick={() => onTriggerScenario('PEDESTRIAN_INCURSION')}
          disabled={isAnalyzing}
          className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-yellow-900/60 hover:border-yellow-500 transition-all text-left flex flex-col justify-between group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <AlertOctagon className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono text-yellow-400 font-bold bg-yellow-950 px-1 rounded">
              GUARDRAIL
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold text-white block">Pedestrian Interlock</span>
            <span className="text-[10px] text-slate-400">Crosswalk Safety Hold</span>
          </div>
        </button>

        {/* Scenario 4: Post-Passage Clearance */}
        <button
          onClick={() => onTriggerScenario('POST_PASSAGE')}
          disabled={isAnalyzing}
          className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-blue-900/60 hover:border-blue-500 transition-all text-left flex flex-col justify-between group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <Shuffle className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-950 px-1 rounded">
              INFO
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold text-white block">Post-Passage Stabilize</span>
            <span className="text-[10px] text-slate-400">Rebalance Hold Queues</span>
          </div>
        </button>

        {/* Scenario 5: Normal Flow */}
        <button
          onClick={() => onTriggerScenario('NORMAL')}
          disabled={isAnalyzing}
          className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 transition-all text-left flex flex-col justify-between group disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <RotateCcw className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-900 px-1 rounded">
              RESET
            </span>
          </div>
          <div className="mt-2">
            <span className="text-xs font-bold text-slate-300 block">Standard Traffic</span>
            <span className="text-[10px] text-slate-500">Autonomous Cycle</span>
          </div>
        </button>
      </div>

      {/* Manual Fine-Tuning Sliders & Toggles */}
      {showManualTuning && (
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 mb-3 space-y-3 text-xs animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Distance Slider */}
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Distance to Intersection:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {telemetry.distance_meters} m
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="10"
                value={telemetry.distance_meters}
                onChange={(e) =>
                  onChangeTelemetry({
                    distance_meters: parseInt(e.target.value),
                    eta_seconds: Math.round(
                      (parseInt(e.target.value) / Math.max(1, telemetry.speed_mph * 0.447)) || 0
                    ),
                  })
                }
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Speed Slider */}
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span>Emergency Vehicle Speed:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {telemetry.speed_mph} mph
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="75"
                step="5"
                value={telemetry.speed_mph}
                onChange={(e) =>
                  onChangeTelemetry({
                    speed_mph: parseInt(e.target.value),
                    eta_seconds: Math.round(
                      (telemetry.distance_meters / Math.max(1, parseInt(e.target.value) * 0.447)) || 0
                    ),
                  })
                }
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Approach Lane Select */}
            <div>
              <label className="text-slate-400 block mb-1">Approach Lane:</label>
              <select
                value={telemetry.approach_lane}
                onChange={(e) => onChangeTelemetry({ approach_lane: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="NORTHBOUND_MAIN">NORTHBOUND_MAIN</option>
                <option value="SOUTHBOUND_MAIN">SOUTHBOUND_MAIN</option>
                <option value="EASTBOUND_CROSS">EASTBOUND_CROSS</option>
                <option value="WESTBOUND_CROSS">WESTBOUND_CROSS</option>
              </select>
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-850">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={telemetry.siren_active}
                onChange={(e) => onChangeTelemetry({ siren_active: e.target.checked })}
                className="accent-emerald-500 rounded"
              />
              <span>Acoustic Siren Detected</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={telemetry.flashing_lights_detected}
                onChange={(e) =>
                  onChangeTelemetry({ flashing_lights_detected: e.target.checked })
                }
                className="accent-emerald-500 rounded"
              />
              <span>Optical Flashing Strobe Detected</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-amber-300">
              <input
                type="checkbox"
                checked={pedestrianActive}
                onChange={onTogglePedestrian}
                className="accent-amber-500 rounded"
              />
              <span>Active Pedestrian Crossing In Crosswalk</span>
            </label>
          </div>
        </div>
      )}

      {/* Manual Dispatcher Instruction Prompt */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Dispatch custom directive, e.g. 'Flush eastbound lane for second police escort'..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!customPrompt.trim() || isAnalyzing}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Dispatch Directive</span>
        </button>
      </form>
    </div>
  );
};
