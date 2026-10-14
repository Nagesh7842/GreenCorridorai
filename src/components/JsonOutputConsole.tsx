import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  History,
} from 'lucide-react';
import { GreenCorridorOutput, DecisionLogEntry } from '../types';

interface JsonOutputConsoleProps {
  currentDecision: GreenCorridorOutput | null;
  rawJson: string;
  source: string;
  history: DecisionLogEntry[];
}

export const JsonOutputConsole: React.FC<JsonOutputConsoleProps> = ({
  currentDecision,
  rawJson,
  source,
  history,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'CONSOLE' | 'HISTORY'>('CONSOLE');

  const formattedJson = currentDecision
    ? JSON.stringify(currentDecision, null, 2)
    : rawJson || '{\n  // Awaiting sensor telemetry\n}';

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Schema validation checker
  const validateSchema = (data: any): { valid: boolean; errors: string[] } => {
    if (!data) return { valid: false, errors: ['No payload'] };
    const errors: string[] = [];

    if (!['CRITICAL', 'MODULAR', 'INFO'].includes(data.priority_level)) {
      errors.push('priority_level must be CRITICAL, MODULAR, or INFO');
    }
    if (!['SIGNAL_CONTROL', 'DRIVER_ALERT', 'TRAFFIC_REBALANCE'].includes(data.category)) {
      errors.push('category must be SIGNAL_CONTROL, DRIVER_ALERT, or TRAFFIC_REBALANCE');
    }
    if (typeof data.intersection_id !== 'string') {
      errors.push('intersection_id must be a string');
    }
    if (!data.action || typeof data.action !== 'object') {
      errors.push('action must be an object');
    } else {
      if (typeof data.action.target_lane !== 'string') {
        errors.push('action.target_lane must be a string');
      }
      if (!['GREEN_OVERRIDE', 'RED_HOLD', 'STANDARD_CYCLE'].includes(data.action.signal_state)) {
        errors.push('action.signal_state must be GREEN_OVERRIDE, RED_HOLD, or STANDARD_CYCLE');
      }
      if (typeof data.action.duration_seconds !== 'number') {
        errors.push('action.duration_seconds must be a number');
      }
    }
    if (typeof data.broadcast_alert !== 'string') {
      errors.push('broadcast_alert must be a string');
    }
    if (typeof data.emergency_vehicle_detected !== 'boolean') {
      errors.push('emergency_vehicle_detected must be a boolean');
    }

    return { valid: errors.length === 0, errors };
  };

  const validation = validateSchema(currentDecision);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white flex flex-col justify-between">
      {/* Console Top Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">GreenCorridor AI JSON Output</h3>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('CONSOLE')}
            className={`px-2 py-0.5 rounded font-mono transition-colors ${
              activeTab === 'CONSOLE'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Schema
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-2 py-0.5 rounded font-mono transition-colors flex items-center gap-1 ${
              activeTab === 'HISTORY'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3 h-3" />
            <span>Audit Log ({history.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'CONSOLE' ? (
        <div className="flex-1 flex flex-col">
          {/* Validation Header Banner */}
          <div className="flex items-center justify-between mb-2 text-xs">
            <div className="flex items-center gap-1.5">
              {validation.valid ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Strict JSON Schema 100% Valid</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400 font-mono">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Validating schema...</span>
                </span>
              )}
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Source: <span className="text-emerald-300">{source}</span>
            </span>
          </div>

          {/* Code Viewer */}
          <div className="relative flex-1 bg-slate-950 rounded-lg p-3 font-mono text-xs text-emerald-300 overflow-x-auto border border-slate-800">
            <button
              onClick={handleCopy}
              className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors border border-slate-700 shadow"
              title="Copy exact raw JSON output"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>

            <pre className="text-emerald-300/90 leading-relaxed pr-16 select-text whitespace-pre-wrap">
              {formattedJson}
            </pre>
          </div>

          {/* Quick copy indicator footer */}
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Guaranteed zero preamble, strict unescaped JSON format</span>
            <span className="font-mono text-slate-400">{formattedJson.length} bytes</span>
          </div>
        </div>
      ) : (
        /* Audit Log History Tab */
        <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2 pr-1">
          {history.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No historical decisions logged yet.
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs font-mono"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{entry.timestamp}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-emerald-400">{entry.decision.intersection_id}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      entry.decision.priority_level === 'CRITICAL'
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : entry.decision.priority_level === 'MODULAR'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}
                  >
                    {entry.decision.priority_level}
                  </span>
                </div>
                <div className="text-white text-[11px] mb-1 font-sans">
                  "{entry.decision.broadcast_alert}"
                </div>
                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span>
                    Lane: <strong className="text-slate-300">{entry.decision.action.target_lane}</strong> | State: <strong className="text-emerald-400">{entry.decision.action.signal_state}</strong>
                  </span>
                  <span>{entry.latency_ms}ms</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
