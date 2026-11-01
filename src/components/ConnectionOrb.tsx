import React from 'react';
import { Shield, ShieldCheck, RefreshCw, Power } from 'lucide-react';
import { ConnectionStatus, ServerNode } from '../types/index.ts';
import { TRANSLATIONS } from '../utils/network-core.ts';

interface ConnectionOrbProps {
  status: ConnectionStatus;
  activeNode: ServerNode;
  onToggleConnect: () => void;
  language: 'en' | 'fa';
  currentPingMs: number;
}

export const ConnectionOrb: React.FC<ConnectionOrbProps> = ({
  status,
  activeNode,
  onToggleConnect,
  language,
  currentPingMs,
}) => {
  const t = TRANSLATIONS[language];
  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';
  const isDisconnecting = status === 'disconnecting';
  const isTransitioning = isConnecting || isDisconnecting;
  const primaryLabel = isConnected
    ? t.connectedShort
    : isConnecting
    ? t.connectingShort
    : isDisconnecting
    ? t.disconnecting
    : t.disconnectedShort;

  return (
    <div className="flex flex-col items-center justify-center py-6 md:py-10 select-none">
      {/* Outer ambient glow field */}
      <div className="relative flex items-center justify-center">
        {/* Living atmospheric background aura */}
        <div
          className={`absolute w-72 h-72 md:w-96 md:h-96 rounded-full blur-3xl transition-all duration-1000 pointer-events-none ${
            isConnected
              ? 'bg-[#10b981]/20 scale-105'
              : isConnecting
              ? 'bg-[#4facfe]/25 scale-110 animate-pulse'
              : 'bg-[#00f2fe]/12 scale-95'
          }`}
        />

        {/* Specular optical ring */}
        <div
          className={`relative p-3 md:p-4 rounded-full transition-all duration-700 ${
            isConnected
              ? 'liquid-glass-connected animate-liquid-emerald'
              : isConnecting
              ? 'liquid-glass-active animate-spin [animation-duration:8s]'
              : 'liquid-glass hover:border-[#00f2fe]/40'
          }`}
        >
          {/* Main Tactile Button Orb */}
          <button
            onClick={onToggleConnect}
            disabled={isTransitioning}
            aria-label={isConnected ? t.disconnectPrompt : t.connectPrompt}
            aria-busy={isTransitioning}
            className={`group relative w-44 h-44 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00f2fe]/50 disabled:cursor-wait ${
              isConnected
                ? 'bg-gradient-to-b from-[#172e27] via-[#10241f] to-[#0d1c18] border-2 border-[#10b981]/60 shadow-[0_0_50px_rgba(16,185,129,0.35)]'
                : isTransitioning
                ? 'bg-gradient-to-b from-[#14253a] via-[#111e30] to-[#0e1826] border-2 border-[#00f2fe]/60 shadow-[0_0_50px_rgba(0,242,254,0.35)]'
                : 'bg-gradient-to-b from-[#1c2230] via-[#151a26] to-[#0f141f] border-2 border-white/15 hover:border-[#00f2fe]/50 shadow-[0_0_35px_rgba(0,0,0,0.6)]'
            }`}
          >
            {/* Liquid specular surface shine reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.07] to-white/[0.15] pointer-events-none rounded-full" />

            {/* Inner dynamic radial glow */}
            <div
              className={`absolute inset-4 rounded-full transition-opacity duration-700 pointer-events-none ${
                isConnected
                  ? 'bg-radial from-[#10b981]/25 via-transparent to-transparent'
                  : 'bg-radial from-[#00f2fe]/20 via-transparent to-transparent'
              }`}
            />

            {/* Central Icon */}
            <div className="relative z-10 transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
              {isTransitioning ? (
                <RefreshCw className="w-12 h-12 md:w-16 md:h-16 text-[#00f2fe] animate-spin" />
              ) : isConnected ? (
                <ShieldCheck className="w-12 h-12 md:w-16 md:h-16 text-[#10b981] drop-shadow-[0_0_15px_rgba(16,185,129,0.7)]" />
              ) : (
                <Power className="w-12 h-12 md:w-16 md:h-16 text-[#00f2fe] opacity-80 group-hover:opacity-100 group-hover:drop-shadow-[0_0_15px_rgba(0,242,254,0.6)] transition-all" />
              )}
            </div>

            {/* Primary Action Label */}
            <span
              className={`relative z-10 mt-3 text-xs md:text-sm font-bold tracking-wider font-['Space_Grotesk'] uppercase transition-colors ${
                isConnected
                  ? 'text-[#4edea3]'
                  : isTransitioning
                  ? 'text-[#00f2fe]'
                  : 'text-white/80 group-hover:text-white'
              }`}
            >
              {primaryLabel}
            </span>

            {/* Protocol & Ping pill */}
            <div className="relative z-10 mt-1 flex items-center gap-1.5 text-[11px] font-mono text-[#b9cacb]" dir="ltr">
              <span>{activeNode.protocol}</span>
              <span>·</span>
              <span className={isConnected ? 'text-[#4edea3] font-semibold' : 'text-[#849495]'}>
                {isConnected ? `${currentPingMs} ms` : t.standby}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Connection State Prose & Telemetry Subtext */}
      <div className="mt-5 text-center max-w-sm px-4">
        <h2 className="text-base md:text-lg font-bold text-white tracking-tight font-['Space_Grotesk'] flex items-center justify-center gap-2">
          {isConnected ? (
            <span className="text-[#4edea3] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              {t.connected}
            </span>
          ) : isConnecting ? (
            <span className="text-[#00f2fe]">{t.connecting}</span>
          ) : isDisconnecting ? (
            <span className="text-[#f59e0b]">{t.disconnecting}</span>
          ) : (
            <span className="text-[#dfe2f1]">{t.disconnected}</span>
          )}
        </h2>

        <p className="mt-1 text-xs text-[#b9cacb] font-mono" aria-live="polite" dir="ltr">
          {isConnected
            ? `${activeNode.name} (${activeNode.country}) · tun0 tunnel active`
            : isConnecting
            ? `Negotiating REALITY TLS handshake with ${activeNode.host}...`
            : isDisconnecting
            ? `Releasing gVisor virtual adapter on ${activeNode.host}...`
            : t.connectPrompt}
        </p>
      </div>
    </div>
  );
};
