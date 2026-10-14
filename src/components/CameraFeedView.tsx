import React, { useState } from 'react';
import {
  Camera,
  Eye,
  Radio,
  Sparkles,
  Layers,
  Upload,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { TelemetryData } from '../types';

interface CameraFeedViewProps {
  telemetry: TelemetryData;
  pedestrianActive: boolean;
  onAnalyzeFeed: (customImageBase64?: string) => void;
  isAnalyzing: boolean;
}

export const CameraFeedView: React.FC<CameraFeedViewProps> = ({
  telemetry,
  pedestrianActive,
  onAnalyzeFeed,
  isAnalyzing,
}) => {
  const [activeCam, setActiveCam] = useState<'CAM-01' | 'CAM-02' | 'CAM-03'>('CAM-01');
  const [thermalMode, setThermalMode] = useState<boolean>(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const isEmergency = telemetry.vehicle_type !== 'NONE';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setUploadedImage(base64);
      onAnalyzeFeed(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-white">
      {/* CCTV Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2">
          <Camera className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Optical AI Vision &amp; Camera Feed</h3>
        </div>

        <div className="flex items-center space-x-1.5 text-xs">
          {(['CAM-01', 'CAM-02', 'CAM-03'] as const).map((camId) => (
            <button
              key={camId}
              onClick={() => setActiveCam(camId)}
              className={`px-2 py-0.5 rounded font-mono transition-colors ${
                activeCam === camId
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {camId}
            </button>
          ))}

          <button
            onClick={() => setThermalMode(!thermalMode)}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
              thermalMode
                ? 'bg-amber-950 border-amber-600 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Thermal/Infrared Sensor Filter"
          >
            {thermalMode ? 'IR: ON' : 'IR: OFF'}
          </button>
        </div>
      </div>

      {/* Camera Video Feed Simulation Window */}
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center group">
        {/* If user uploaded custom image, render it; else simulated graphic */}
        {uploadedImage ? (
          <img
            src={uploadedImage}
            alt="Uploaded Traffic Camera Frame"
            className={`w-full h-full object-cover ${thermalMode ? 'invert hue-rotate-180 contrast-125' : ''}`}
          />
        ) : (
          <div
            className={`w-full h-full relative flex items-center justify-center transition-all ${
              thermalMode
                ? 'bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950'
                : 'bg-gradient-to-b from-slate-950 via-slate-900 to-black'
            }`}
          >
            {/* Perspective Road Surface */}
            <svg viewBox="0 0 400 225" className="w-full h-full">
              {/* Vanishing point road */}
              <polygon points="170,80 230,80 340,225 60,225" fill="#1e293b" opacity="0.9" />
              {/* Lane dashes */}
              <line x1="200" y1="80" x2="200" y2="225" stroke="#eab308" strokeWidth="2" strokeDasharray="6 6" />

              {/* Crosswalk at bottom */}
              {[90, 115, 140, 165, 190, 215, 240, 265, 290, 315].map((x) => (
                <rect
                  key={`feed-cross-${x}`}
                  x={x}
                  y="200"
                  width="14"
                  height="16"
                  fill={pedestrianActive ? '#ef4444' : '#cbd5e1'}
                  opacity={pedestrianActive ? 0.9 : 0.4}
                />
              ))}

              {/* Distant skyline buildings */}
              <rect x="20" y="40" width="30" height="50" fill="#0f172a" />
              <rect x="60" y="30" width="45" height="60" fill="#0f172a" />
              <rect x="300" y="45" width="40" height="45" fill="#0f172a" />
              <rect x="350" y="25" width="30" height="65" fill="#0f172a" />

              {/* Distant civilian cars */}
              <rect x="180" y="105" width="16" height="12" rx="2" fill="#334155" />
              <rect x="210" y="125" width="22" height="16" rx="3" fill="#475569" />

              {/* Approaching Emergency Vehicle Graphic in Feed */}
              {isEmergency && (
                <g>
                  {/* Vehicle Body in perspective */}
                  <rect
                    x="175"
                    y="135"
                    width="50"
                    height="42"
                    rx="4"
                    fill={telemetry.vehicle_type === 'FIRE_ENGINE' ? '#dc2626' : '#f8fafc'}
                    stroke={telemetry.vehicle_type === 'FIRE_ENGINE' ? '#991b1b' : '#38bdf8'}
                    strokeWidth="2"
                  />
                  {/* Windshield */}
                  <rect x="182" y="142" width="36" height="14" rx="2" fill="#0f172a" />
                  {/* Grill and headlights */}
                  <rect x="182" y="162" width="10" height="6" fill="#fef08a" />
                  <rect x="208" y="162" width="10" height="6" fill="#fef08a" />

                  {/* Flashing Lightbar on roof */}
                  <circle cx="185" cy="132" r="5" fill="#ef4444" className="animate-ping" />
                  <circle cx="215" cy="132" r="5" fill="#3b82f6" className="animate-ping" style={{ animationDelay: '0.12s' }} />
                </g>
              )}
            </svg>
          </div>
        )}

        {/* Optical AI Detection Overlay: Bounding Boxes */}
        {isEmergency && (
          <div className="absolute top-[38%] left-[40%] w-[32%] h-[35%] border-2 border-red-500 rounded pointer-events-none animate-pulse">
            <div className="absolute -top-5 left-0 bg-red-600 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 shadow">
              <Radio className="w-2.5 h-2.5 animate-spin" />
              <span>
                {telemetry.vehicle_type} (CONF 98.6%)
              </span>
            </div>
            <div className="absolute -bottom-4 right-0 text-[9px] font-mono text-red-400 bg-black/70 px-1 rounded">
              OPTICAL STROBE: 2.4 Hz
            </div>
          </div>
        )}

        {/* Pedestrian Crossing Detection Bounding Box */}
        {pedestrianActive && (
          <div className="absolute bottom-[8%] left-[28%] w-[22%] h-[20%] border-2 border-amber-400 rounded pointer-events-none">
            <div className="absolute -top-5 left-0 bg-amber-500 text-slate-950 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold shadow">
              [!] PEDESTRIAN IN CROSSWALK
            </div>
          </div>
        )}

        {/* CCTV Telemetry HUD Overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none text-[10px] font-mono text-emerald-400 drop-shadow">
          <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded backdrop-blur">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>LIVE REC {activeCam}</span>
            <span className="text-slate-400">| 1080p 60FPS</span>
          </div>

          <div className="bg-black/60 px-2 py-0.5 rounded backdrop-blur text-slate-300">
            {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Optical Sensor Analysis Pill */}
        <div className="absolute bottom-2 left-2 bg-black/75 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-slate-300 border border-slate-700/60 pointer-events-none">
          <span className="text-slate-500">OPTICAL CUES: </span>
          <span className={isEmergency ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
            {isEmergency ? 'EMERGENCY STROBE DETECTED' : 'STANDARD TRAFFIC PATTERN'}
          </span>
        </div>
      </div>

      {/* Camera Action Buttons & Gemini Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          {/* Custom image upload input */}
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors">
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Upload Traffic Image</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>

          {uploadedImage && (
            <button
              onClick={() => {
                setUploadedImage(null);
                onAnalyzeFeed();
              }}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Reset to Live Sim
            </button>
          )}
        </div>

        {/* Analyze with GreenCorridor AI button */}
        <button
          onClick={() => onAnalyzeFeed(uploadedImage || undefined)}
          disabled={isAnalyzing}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
            isAnalyzing
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-95'
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Frame...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>Analyze Frame with GreenCorridor AI</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
