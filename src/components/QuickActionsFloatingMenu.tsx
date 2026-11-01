import React, { useState } from 'react';
import {
  ShieldAlert,
  Wifi,
  Lock,
  ChevronUp,
  ChevronDown,
  Download,
  Check,
  Zap,
  Sparkles,
} from 'lucide-react';
import { CoreSettings, CoreLogEntry } from '../types/index.ts';
import { TRANSLATIONS } from '../utils/network-core.ts';

interface QuickActionsFloatingMenuProps {
  settings: CoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<CoreSettings>>;
  setLogs: React.Dispatch<React.SetStateAction<CoreLogEntry[]>>;
  language: 'en' | 'fa';
  onOpenApkHub: () => void;
}

export const QuickActionsFloatingMenu: React.FC<QuickActionsFloatingMenuProps> = ({
  settings,
  setSettings,
  setLogs,
  language,
  onOpenApkHub,
}) => {
  const t = TRANSLATIONS[language];
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const addLog = (message: string, level: 'info' | 'warn' = 'info') => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setLogs(prev => [
      {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        level,
        module: 'QUICK-ACTION',
        message,
      },
      ...prev,
    ]);
  };

  const handleToggleKillswitch = () => {
    const nextVal = !settings.killSwitch;
    setSettings(prev => ({ ...prev, killSwitch: nextVal }));
    addLog(
      nextVal
        ? 'Emergency Kill Switch armed: All non-tun socket traffic will be hard-dropped.'
        : 'Emergency Kill Switch disarmed: Standard fallback routing allowed.',
      nextVal ? 'warn' : 'info'
    );
    setLastAction(`Killswitch: ${nextVal ? 'Armed' : 'Off'}`);
    setTimeout(() => setLastAction(null), 2000);
  };

  const handleToggleAutoConnect = () => {
    const nextVal = !settings.autoConnectOnWifi;
    setSettings(prev => ({ ...prev, autoConnectOnWifi: nextVal }));
    addLog(
      nextVal
        ? 'Auto-Connect enabled: Daemon will auto-engage tun2socks upon Wi-Fi or cellular network change.'
        : 'Auto-Connect disabled: Manual connection only.',
      'info'
    );
    setLastAction(`Auto-Connect: ${nextVal ? 'On' : 'Off'}`);
    setTimeout(() => setLastAction(null), 2000);
  };

  const handleToggleDoh = () => {
    const nextVal = !settings.enableDoh;
    setSettings(prev => ({ ...prev, enableDoh: nextVal }));
    addLog(
      nextVal
        ? `DNS-over-HTTPS (DoH) engaged: Upstream TLS resolution routed via ${settings.dohUrl}.`
        : 'DNS-over-HTTPS disengaged: Default local DNS socket resolution active.',
      'info'
    );
    setLastAction(`DoH: ${nextVal ? 'Active' : 'Bypass'}`);
    setTimeout(() => setLastAction(null), 2000);
  };

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-8 z-40 max-w-sm w-full sm:w-auto">
      {/* Toast feedback notice */}
      {lastAction && (
        <div className="mb-2 py-1 px-3 text-center text-xs font-mono font-bold text-[#00f2fe] bg-[#0a0e18]/90 border border-[#00f2fe]/40 rounded-xl shadow-lg backdrop-blur-md animate-fade-in">
          {lastAction}
        </div>
      )}

      {/* Floating Glass Container */}
      <div className="liquid-glass rounded-2xl border border-white/15 p-2.5 sm:p-3 shadow-2xl backdrop-blur-3xl transition-all duration-300">
        {/* Header bar / Collapse toggle */}
        <div className="flex items-center justify-between gap-3 px-1.5 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00f2fe] animate-pulse" />
            <span className="text-xs font-bold font-['Space_Grotesk'] text-white uppercase tracking-wider">
              {t.quickActions}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* APK Package Hub trigger */}
            <button
              onClick={onOpenApkHub}
              title={t.apkHub}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/30 text-[11px] font-mono cursor-pointer transition-colors"
            >
              <Download className="w-3 h-3" />
              <span className="font-bold">APK</span>
            </button>

            {/* Collapse toggle */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-white/10 text-[#849495] hover:text-white transition-colors cursor-pointer"
              aria-label={isExpanded ? 'Collapse Quick Actions' : 'Expand Quick Actions'}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsed state mini summary */}
        {!isExpanded && (
          <div className="pt-2 px-1 flex items-center justify-between gap-3 text-[11px] font-mono text-[#849495]">
            <span className={settings.killSwitch ? 'text-[#ffb4ab]' : ''}>
              KS: {settings.killSwitch ? 'ON' : 'OFF'}
            </span>
            <span>·</span>
            <span className={settings.autoConnectOnWifi ? 'text-[#00f2fe]' : ''}>
              Auto: {settings.autoConnectOnWifi ? 'ON' : 'OFF'}
            </span>
            <span>·</span>
            <span className={settings.enableDoh ? 'text-[#4edea3]' : ''}>
              DoH: {settings.enableDoh ? 'ON' : 'OFF'}
            </span>
          </div>
        )}

        {/* Expanded state interactive switches */}
        {isExpanded && (
          <div className="pt-2.5 space-y-2">
            {/* Toggle 1: Killswitch */}
            <button
              onClick={handleToggleKillswitch}
              className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                settings.killSwitch
                  ? 'bg-[#ef4444]/15 border-[#ef4444]/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : 'bg-white/5 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-lg ${
                    settings.killSwitch ? 'bg-[#ef4444]/25 text-[#ffb4ab]' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-['Space_Grotesk'] leading-tight">
                    {t.killSwitch}
                  </div>
                  <div className="text-[10px] text-[#849495] font-mono">
                    {settings.killSwitch ? 'Strict Leak Block' : 'Bypass Allowed'}
                  </div>
                </div>
              </div>

              {/* Status pill */}
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                  settings.killSwitch
                    ? 'bg-[#ef4444]/30 text-[#ffb4ab] border border-[#ef4444]/60'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {settings.killSwitch ? 'ARMED' : 'OFF'}
              </div>
            </button>

            {/* Toggle 2: Auto-Connect */}
            <button
              onClick={handleToggleAutoConnect}
              className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                settings.autoConnectOnWifi
                  ? 'bg-[#00f2fe]/15 border-[#00f2fe]/50 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                  : 'bg-white/5 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-lg ${
                    settings.autoConnectOnWifi ? 'bg-[#00f2fe]/25 text-[#00f2fe]' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-['Space_Grotesk'] leading-tight">
                    {t.autoConnect}
                  </div>
                  <div className="text-[10px] text-[#849495] font-mono">
                    {settings.autoConnectOnWifi ? 'Wi-Fi & Cellular' : 'Manual Trigger'}
                  </div>
                </div>
              </div>

              {/* Status pill */}
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                  settings.autoConnectOnWifi
                    ? 'bg-[#00f2fe]/30 text-[#e0fdff] border border-[#00f2fe]/60'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {settings.autoConnectOnWifi ? 'ACTIVE' : 'OFF'}
              </div>
            </button>

            {/* Toggle 3: DNS Over HTTPS */}
            <button
              onClick={handleToggleDoh}
              className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                settings.enableDoh
                  ? 'bg-[#10b981]/15 border-[#10b981]/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-white/5 border-white/5 hover:border-white/15'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-lg ${
                    settings.enableDoh ? 'bg-[#10b981]/25 text-[#4edea3]' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-['Space_Grotesk'] leading-tight">
                    {t.dohShort}
                  </div>
                  <div className="text-[10px] text-[#849495] font-mono">
                    {settings.enableDoh ? 'Encrypted 1.1.1.1' : 'Direct ISP DNS'}
                  </div>
                </div>
              </div>

              {/* Status pill */}
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                  settings.enableDoh
                    ? 'bg-[#10b981]/30 text-[#4edea3] border border-[#10b981]/60'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {settings.enableDoh ? 'ENABLED' : 'OFF'}
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
