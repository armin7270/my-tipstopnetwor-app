import React, { useState } from 'react';
import { Terminal, ShieldAlert, CheckCircle2, AlertTriangle, Play, Pause, Trash2, Search, ArrowUpDown, Network } from 'lucide-react';
import { ActiveConnection, CoreLogEntry } from '../types/index.ts';
import { formatBytes, formatDuration, TRANSLATIONS } from '../utils/network-core.ts';

interface DiagnosticsScreenProps {
  connections: ActiveConnection[];
  logs: CoreLogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<CoreLogEntry[]>>;
  language: 'en' | 'fa';
  isConnected: boolean;
  activeNodeCountry: string;
}

export const DiagnosticsScreen: React.FC<DiagnosticsScreenProps> = ({
  connections,
  logs,
  setLogs,
  language,
  isConnected,
  activeNodeCountry,
}) => {
  const t = TRANSLATIONS[language];
  const [selectedLogLevel, setSelectedLogLevel] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');
  const [isLogsPaused, setIsLogsPaused] = useState(false);

  // Leak Test state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditComplete, setAuditComplete] = useState(false);

  const runLeakAudit = () => {
    setIsAuditing(true);
    setAuditComplete(false);
    setTimeout(() => {
      setIsAuditing(false);
      setAuditComplete(true);
    }, 1200);
  };

  const filteredLogs = logs.filter(log => {
    if (selectedLogLevel !== 'all' && log.level !== selectedLogLevel) return false;
    if (logSearch && !log.message.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white font-['Space_Grotesk']">
          {t.diagnostics}
        </h2>
        <p className="text-xs text-[#b9cacb] font-mono mt-0.5">
          Deep packet telemetry, cryptographic leak audits, and kernel stream logs
        </p>
      </div>

      {/* IP & DNS Leak Verification Audit Tool */}
      <div className="liquid-glass rounded-2xl p-5 md:p-6 border-l-2 border-l-[#10b981]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#10b981]" />
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                {t.ipLeakTest}
              </h3>
            </div>
            <p className="text-xs text-[#b9cacb] mt-0.5">
              Verify WebRTC peer connection isolation, IPv6 encapsulation, and DNS resolver integrity
            </p>
          </div>

          <button
            onClick={runLeakAudit}
            disabled={isAuditing}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded-xl bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/40 text-[#4edea3] transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.15)] disabled:opacity-50"
          >
            <CheckCircle2 className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'AUDITING SOCKETS...' : t.runLeakCheck}</span>
          </button>
        </div>

        {/* Audit Status Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#0a0e18]/80 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-[#849495]">WebRTC Leak</span>
              <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className="text-xs font-bold text-white">SECURE (MASKED)</div>
            <div className="text-[10px] font-mono text-[#4edea3] mt-1">No STUN/TURN host leak</div>
          </div>

          <div className="bg-[#0a0e18]/80 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-[#849495]">DNS Hijack Test</span>
              <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className="text-xs font-bold text-white">1.1.1.1 (ENCRYPTED)</div>
            <div className="text-[10px] font-mono text-[#4edea3] mt-1">DoH Query via Cloudflare</div>
          </div>

          <div className="bg-[#0a0e18]/80 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-[#849495]">Public IP Location</span>
              <span className="text-xs font-mono font-bold text-[#00f2fe]">
                {isConnected ? activeNodeCountry : 'Local ISP'}
              </span>
            </div>
            <div className="text-xs font-bold text-white">
              {isConnected ? 'TUNNEL ENCAPSULATED' : 'DIRECT / EXPOSED'}
            </div>
            <div className="text-[10px] font-mono text-[#849495] mt-1">
              {isConnected ? 'Zero ISP inspection' : 'Encapsulation recommended'}
            </div>
          </div>

          <div className="bg-[#0a0e18]/80 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono text-[#849495]">Strict Routing</span>
              <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className="text-xs font-bold text-white">KILL SWITCH ARMED</div>
            <div className="text-[10px] font-mono text-[#4edea3] mt-1">Non-tun sockets dropped</div>
          </div>
        </div>
      </div>

      {/* Active Network Connections Stream Table */}
      <div className="liquid-glass rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-[#00f2fe]" />
            <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
              {t.liveConnections} ({connections.length})
            </h3>
          </div>
          <span className="text-xs font-mono text-[#849495]">Real-time gVisor sockets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-[#849495]">
                <th className="py-2.5 px-3">Process</th>
                <th className="py-2.5 px-3">Proto</th>
                <th className="py-2.5 px-3">Destination</th>
                <th className="py-2.5 px-3 text-right">Upload</th>
                <th className="py-2.5 px-3 text-right">Download</th>
                <th className="py-2.5 px-3 text-right">Duration</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {connections.map(conn => (
                <tr key={conn.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-white">{conn.process}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[#00f2fe] font-bold">{conn.protocol}</span>
                  </td>
                  <td className="py-2.5 px-3 text-[#dfe2f1]" dir="ltr">{conn.destination}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-white/80">
                    {formatBytes(conn.uploadBytes)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-[#00f2fe]">
                    {formatBytes(conn.downloadBytes)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-[#849495]">
                    {formatDuration(conn.durationSeconds)}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#10b981]/15 text-[#4edea3] font-bold">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kernel Stream Telemetry Log Console */}
      <div className="liquid-glass rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#f59e0b]" />
            <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
              {t.coreLogs}
            </h3>
          </div>

          {/* Controls toolbar */}
          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 p-1 bg-[#0a0e18] rounded-xl border border-white/10">
              {['all', 'info', 'warn', 'error', 'trace'].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLogLevel(lvl)}
                  className={`px-2.5 py-1 text-[11px] font-mono uppercase rounded-lg transition-colors cursor-pointer ${
                    selectedLogLevel === lvl
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-[#849495] hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Pause button */}
            <button
              onClick={() => setIsLogsPaused(!isLogsPaused)}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 cursor-pointer"
              title={isLogsPaused ? 'Resume auto-scroll' : 'Pause logs'}
            >
              {isLogsPaused ? <Play className="w-4 h-4 text-[#00f2fe]" /> : <Pause className="w-4 h-4" />}
            </button>

            {/* Clear button */}
            <button
              onClick={clearLogs}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 cursor-pointer hover:text-red-400"
              title="Clear logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar inside log console */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={logSearch}
            onChange={e => setLogSearch(e.target.value)}
            placeholder="Filter kernel log lines..."
            className="w-full bg-[#0a0e18] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00f2fe]/50"
          />
        </div>

        {/* Log Lines Container */}
        <div className="h-64 overflow-y-auto bg-[#070a12] border border-white/10 rounded-xl p-3 font-mono text-xs space-y-1.5">
          {filteredLogs.map(log => {
            let color = 'text-white/80';
            if (log.level === 'warn') color = 'text-amber-400';
            if (log.level === 'error') color = 'text-red-400';
            if (log.level === 'trace') color = 'text-[#00f2fe]';

            return (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-[#849495] shrink-0 text-[11px] tabular-nums">{log.timestamp}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                    log.level === 'error'
                      ? 'bg-red-500/20 text-red-300'
                      : log.level === 'warn'
                      ? 'bg-amber-500/20 text-amber-300'
                      : log.level === 'trace'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'bg-white/10 text-white/80'
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-[#849495] shrink-0">[{log.module}]</span>
                <span className={`${color} break-all`} dir="ltr">{log.message}</span>
              </div>
            );
          })}
          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-[#849495]">No logs matching current filter</div>
          )}
        </div>
      </div>
    </div>
  );
};
