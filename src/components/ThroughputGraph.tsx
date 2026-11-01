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

  // Always render at least one sample so the chart never divides by zero.
  const samples = speedHistory.length > 0 ? speedHistory : [{ dl: 0, ul: 0 }];
  const maxVal = Math.max(peakSpeed, 1024 * 512, ...samples.map(s => Math.max(s.dl, s.ul)));
  const denom = Math.max(samples.length - 1, 1);
  // Keep the curve clear of the legend strip at the bottom of the panel.
  const plotTop = 20;
  const plotBottom = height - 26;
  const toY = (value: number) => plotBottom - (value / maxVal) * (plotBottom - plotTop);

  const buildLine = (pick: (point: { dl: number; ul: number }) => number) => {
    if (samples.length < 2) {
      const y = toY(pick(samples[0]));
      return `M 0,${y.toFixed(1)} L ${width},${y.toFixed(1)}`;
    }
    return `M ${samples
      .map((point, index) => `${((index / denom) * width).toFixed(1)},${toY(pick(point)).toFixed(1)}`)
      .join(' L ')}`;
  };

  const pathDl = buildLine(point => point.dl);
  const pathUl = buildLine(point => point.ul);

  // Area paths for gradient fills
  const areaDl = `${pathDl} L ${width},${height} L 0,${height} Z`;
  const areaUl = `${pathUl} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="liquid-glass rounded-2xl p-5 md:p-6 transition-all duration-300">
      {/* Header and Telemetry Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00f2fe]" aria-hidden="true" />
          <h3 className="text-sm font-semibold tracking-wide text-white uppercase font-['Space_Grotesk']">
            {isConnected ? t.throughputTitle : t.throughputIdle}
          </h3>
        </div>

        {/* Tabular summary badges */}
        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-mono">
          <div className="flex items-center gap-1 text-[#b9cacb] whitespace-nowrap">
            <span className="text-white/60">{t.peakThroughput}:</span>
            <span className="text-[#00f2fe] font-semibold tabular-nums" dir="ltr">
              {formatBitrate(peakSpeed)}
            </span>
          </div>

          <span className="text-white/20">|</span>

          <div className="flex items-center gap-1 text-[#b9cacb] whitespace-nowrap">
            <span className="text-white/60">{t.totalTransfer}:</span>
            <span className="text-white font-semibold tabular-nums" dir="ltr">
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
              <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.download}</span>
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono tabular-nums text-white mt-1 whitespace-nowrap" dir="ltr">
              {isConnected ? formatBitrate(telemetry.downloadSpeed) : '0.0 KB/s'}
            </div>
          </div>
          <div className="hidden sm:block text-right text-[11px] font-mono text-[#849495]">
            <div>{t.totalDownload}</div>
            <div className="text-white/80 tabular-nums" dir="ltr">{formatBytes(telemetry.totalDownloaded)}</div>
          </div>
        </div>

        {/* Upload Speed Card */}
        <div className="bg-[#0f131d]/60 border border-white/5 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#4edea3] uppercase tracking-wider">
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.upload}</span>
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono tabular-nums text-white mt-1 whitespace-nowrap" dir="ltr">
              {isConnected ? formatBitrate(telemetry.uploadSpeed) : '0.0 KB/s'}
            </div>
          </div>
          <div className="hidden sm:block text-right text-[11px] font-mono text-[#849495]">
            <div>{t.totalUpload}</div>
            <div className="text-white/80 tabular-nums" dir="ltr">{formatBytes(telemetry.totalUploaded)}</div>
          </div>
        </div>
      </div>

      {/* SVG Waveform Visualizer */}
      <div className="relative h-32 md:h-36 w-full bg-[#0a0e18]/80 rounded-xl overflow-hidden border border-white/5 p-2">
        {/* Subtle grid lines */}
        <div className="absolute inset-0 grid grid-rows-3 pointer-events-none" aria-hidden="true">
          <div className="border-b border-white/[0.04]" />
          <div className="border-b border-white/[0.04]" />
          <div className="border-b border-white/[0.04]" />
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`${t.download} ${formatBitrate(telemetry.downloadSpeed)}, ${t.upload} ${formatBitrate(
            telemetry.uploadSpeed
          )}`}
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

          {/* Area under curves — only while the tunnel is actually carrying traffic */}
          {isConnected && (
            <>
              <path d={areaDl} fill="url(#dlGradient)" className="transition-all duration-300" />
              <path d={areaUl} fill="url(#ulGradient)" className="transition-all duration-300" />

              {/* Download Waveform Stroke */}
              <path
                d={pathDl}
                fill="none"
                stroke="#00f2fe"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />

              {/* Upload Waveform Stroke */}
              <path
                d={pathUl}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 2"
                className="transition-all duration-300"
              />
            </>
          )}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 start-3 flex items-center gap-4 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-[#00f2fe]">
            <span className="w-2.5 h-0.5 bg-[#00f2fe] rounded-full inline-block" />
            <span>{t.rxDownload}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#10b981]">
            <span className="w-2.5 h-0.5 bg-[#10b981] rounded-full inline-block" />
            <span>{t.txUpload}</span>
          </div>
        </div>

        {/* Live status beacon */}
        <div className="absolute top-2 end-3 text-[10px] font-mono text-[#849495] flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#10b981] animate-pulse' : 'bg-slate-600'}`}
            aria-hidden="true"
          />
          <span>{isConnected ? t.liveStream : t.suspended}</span>
          {isConnected && <span dir="ltr">· 1 Hz</span>}
        </div>
      </div>
    </div>
  );
};
