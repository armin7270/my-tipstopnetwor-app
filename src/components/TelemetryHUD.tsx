import React from 'react';
import { Radio, Lock, Cpu, Server, Clock, ChevronRight, Zap } from 'lucide-react';
import { ServerNode, TelemetryState } from '../types/index.ts';
import { formatDuration, getLatencyClassification, TRANSLATIONS } from '../utils/network-core.ts';

interface TelemetryHUDProps {
  telemetry: TelemetryState;
  activeNode: ServerNode;
  onOpenNodes: () => void;
  language: 'en' | 'fa';
  isConnected: boolean;
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  telemetry,
  activeNode,
  onOpenNodes,
  language,
  isConnected,
}) => {
  const t = TRANSLATIONS[language];
  const latencyInfo = getLatencyClassification(isConnected ? telemetry.currentPingMs : 0);

  return (
    <div className="space-y-4">
      {/* Active Node Quick Card */}
      <div className="liquid-glass rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 border-l-2 border-l-[#00f2fe]/60">
        <div className="flex items-center gap-3.5">
          <div className="text-2xl md:text-3xl p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
            {activeNode.flag}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#00f2fe] uppercase tracking-wider">{t.activeNode}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80">
                {activeNode.protocol}
              </span>
            </div>
            <h3 className="text-base md:text-lg font-bold text-white font-['Space_Grotesk'] mt-0.5">
              {activeNode.name}
            </h3>
            <p className="text-xs text-[#b9cacb] font-mono">
              {activeNode.country} · {activeNode.host}:{activeNode.port}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-mono text-[#849495]">{t.latency}</div>
            <div
              className={`text-sm md:text-base font-bold font-mono tabular-nums ${
                isConnected ? latencyInfo.textClass : 'text-slate-400'
              }`}
            >
              {isConnected ? `${telemetry.currentPingMs} ms` : 'Standby'}
            </div>
          </div>

          <button
            onClick={onOpenNodes}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-white transition-colors cursor-pointer"
          >
            <span>Change</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#00f2fe]" />
          </button>
        </div>
      </div>

      {/* 4-Card Telemetry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Metric 1: Latency & Jitter */}
        <div className="liquid-glass rounded-xl p-3.5 md:p-4">
          <div className="flex items-center justify-between text-[#849495] mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">{t.latency}</span>
            <Radio className="w-3.5 h-3.5 text-[#00f2fe]" />
          </div>
          <div className="text-lg md:text-xl font-bold font-mono tabular-nums text-white">
            {isConnected ? `${telemetry.currentPingMs} ms` : '--'}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#849495]">Jitter</span>
            <span className="text-[#00f2fe] tabular-nums">{isConnected ? `${telemetry.jitterMs} ms` : '--'}</span>
          </div>
        </div>

        {/* Metric 2: Encryption & Handshake */}
        <div className="liquid-glass rounded-xl p-3.5 md:p-4">
          <div className="flex items-center justify-between text-[#849495] mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">{t.cipherSuite}</span>
            <Lock className="w-3.5 h-3.5 text-[#10b981]" />
          </div>
          <div className="text-xs md:text-sm font-semibold font-mono text-white truncate" title={activeNode.cipher}>
            {activeNode.cipher}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#849495]">TLS Fingerprint</span>
            <span className="text-[#4edea3]">chrome_120</span>
          </div>
        </div>

        {/* Metric 3: Tun2Socks Stack & Loss */}
        <div className="liquid-glass rounded-xl p-3.5 md:p-4">
          <div className="flex items-center justify-between text-[#849495] mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">{t.tunnelStack}</span>
            <Cpu className="w-3.5 h-3.5 text-[#4facfe]" />
          </div>
          <div className="text-lg md:text-xl font-bold font-mono text-white">gVisor v3</div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#849495]">Packet Loss</span>
            <span className="text-[#10b981] tabular-nums">{isConnected ? `${telemetry.packetLossPercent}%` : '--'}</span>
          </div>
        </div>

        {/* Metric 4: Streams & Session Uptime */}
        <div className="liquid-glass rounded-xl p-3.5 md:p-4">
          <div className="flex items-center justify-between text-[#849495] mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider">UPTIME</span>
            <Clock className="w-3.5 h-3.5 text-[#f59e0b]" />
          </div>
          <div className="text-lg md:text-xl font-bold font-mono tabular-nums text-white">
            {isConnected ? formatDuration(telemetry.uptimeSeconds) : '00:00'}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
            <span className="text-[#849495]">Streams</span>
            <span className="text-white tabular-nums">{isConnected ? telemetry.activeSockets : 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
