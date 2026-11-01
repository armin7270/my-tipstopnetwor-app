import React from 'react';
import { ArrowDown, ArrowUp, Activity } from 'lucide-react';
import { TelemetryState } from '../types/index.ts';
import { formatBitrate, formatBytes, TRANSLATIONS } from '../utils/network-core.ts';

interface ThroughputGraphProps {
  telemetry: TelemetryState;
  speedHistory: { dl: number; ul: number }[];
  peakSpeed: number;
  language: 'en' | 'fa';
  isConnected: boolean;
}

export const ThroughputGraph: React.FC<ThroughputGraphProps> = ({
  telemetry,
  speedHistory,
  peakSpeed,
  language,
  isConnected,
}) => {
  const t = TRANSLATIONS[language];

  // SVG dimensions
  const width = 600;
  const height = 140;
  const maxVal = Math.max(peakSpeed, 1024 * 512, ...speedHistory.map(h => Math.max(h.dl, h.ul)));

  // Generate SVG path points
  const pointsDl = speedHistory.map((pt, i) => {
    const x = (i / (speedHistory.length - 1 || 1)) * width;
    const y = height - (pt.dl / maxVal) * (height - 15) - 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pointsUl = speedHistory.map((pt, i) => {
    const x = (i / (speedHistory.length - 1 || 1)) * width;
    const y = height - (pt.ul / maxVal) * (height - 15) - 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathDlL = pointsDl.length > 0 ? `M ${pointsDl.join(' L ')}` : `M 0,${height} L ${width},${height}`;
  const pathUlL = pointsUl.length > 0 ? `M ${pointsUl.join(' L ')}` : `M 0,${height} L ${width},${height}`;

  // Area paths for gradient fills
  const areaDl = `${pathDlL} L ${width},${height} L 0,${height} Z`;
  const areaUl = `${pathUlL} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="liquid-glass rounded-2xl p-5 md:p-6 transition-all duration-300">
      {/* Header and Telemetry Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00f2fe]" />
          <h3 className="text-sm font-semibold tracking-wide text-white uppercase font-['Space_Grotesk']">
            {isConnected ? 'High-Frequency Throughput Telemetry' : 'Throughput Monitor (Idle)'}
          </h3>
        </div>

        {/* Tabular summary badges */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#b9cacb]">
            <span className="text-white/60">{t.peakThroughput}:</span>
            <span className="text-[#00f2fe] font-semibold tabular-nums">{formatBitrate(peakSpeed)}</span>
          </div>

          <span className="text-white/20">|</span>

          <div className="flex items-center gap-1.5 text-[#b9cacb]">
            <span className="text-white/60">{t.totalTransfer}:</span>
            <span className="text-white font-semibold tabular-nums">
              {formatBytes(telemetry.totalDownloaded + telemetry.totalUploaded)}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Bitrate Readout Strip */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Download Speed Card */}
        <div className="bg-[#0f131d]/60 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#00f2fe] uppercase tracking-wider">
              <ArrowDown className="w-3.5 h-3.5" />
              <span>{t.download}</span>
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono tabular-nums text-white mt-1">
              {isConnected ? formatBitrate(telemetry.downloadSpeed) : '0.0 KB/s'}
            </div>
          </div>
          <div className="text-right text-[11px] font-mono text-[#849495]">
            <div>Total DL</div>
            <div className="text-white/80 tabular-nums">{formatBytes(telemetry.totalDownloaded)}</div>
          </div>
        </div>

        {/* Upload Speed Card */}
        <div className="bg-[#0f131d]/60 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#4edea3] uppercase tracking-wider">
              <ArrowUp className="w-3.5 h-3.5" />
              <span>{t.upload}</span>
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono tabular-nums text-white mt-1">
              {isConnected ? formatBitrate(telemetry.uploadSpeed) : '0.0 KB/s'}
            </div>
          </div>
          <div className="text-right text-[11px] font-mono text-[#849495]">
            <div>Total UL</div>
            <div className="text-white/80 tabular-nums">{formatBytes(telemetry.totalUploaded)}</div>
          </div>
        </div>
      </div>

      {/* SVG Waveform Visualizer */}
      <div className="relative h-32 md:h-36 w-full bg-[#0a0e18]/80 rounded-xl overflow-hidden border border-white/5 p-2">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 grid grid-rows-3 grid-cols-4 pointer-events-none">
          <div className="border-b border-white/[0.04]" />
          <div className="border-b border-white/[0.04]" />
          <div className="border-b border-white/[0.04]" />
          <div className="border-b border-white/[0.04]" />
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="dlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="ulGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area under curves */}
          <path d={areaDl} fill="url(#dlGradient)" />
          <path d={areaUl} fill="url(#ulGradient)" />

          {/* Download Waveform Stroke */}
          <path
            d={pathDlL}
            fill="none"
            stroke="#00f2fe"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Upload Waveform Stroke */}
          <path
            d={pathUlL}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 2"
            className="transition-all duration-300"
          />
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 left-3 flex items-center gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-[#00f2fe]">
            <span className="w-2.5 h-0.5 bg-[#00f2fe] rounded-full inline-block" />
            <span>RX Download</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#10b981]">
            <span className="w-2.5 h-0.5 bg-[#10b981] rounded-full inline-block" />
            <span>TX Upload</span>
          </div>
        </div>

        {/* Live status beacon */}
        <div className="absolute top-2 right-3 text-[10px] font-mono text-[#849495] flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#10b981] animate-pulse' : 'bg-slate-600'}`} />
          <span>{isConnected ? '60Hz Telemetry Stream' : 'Pipeline Suspended'}</span>
        </div>
      </div>
    </div>
  );
};
