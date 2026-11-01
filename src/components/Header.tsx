import React from 'react';
import { Shield, Globe2, Zap, AlertTriangle } from 'lucide-react';
import { ConnectionStatus } from '../types/index.ts';
import { TRANSLATIONS } from '../utils/network-core.ts';

interface HeaderProps {
  activeTab: 'hud' | 'nodes' | 'matrix' | 'diagnostics' | 'settings';
  setActiveTab: (tab: 'hud' | 'nodes' | 'matrix' | 'diagnostics' | 'settings') => void;
  status: ConnectionStatus;
  killSwitch: boolean;
  setKillSwitch: (val: boolean) => void;
  language: 'en' | 'fa';
  setLanguage: (lang: 'en' | 'fa') => void;
  isMobilePreview: boolean;
  setIsMobilePreview: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  status,
  killSwitch,
  setKillSwitch,
  language,
  setLanguage,
  isMobilePreview,
  setIsMobilePreview,
}) => {
  const t = TRANSLATIONS[language];
  const isConnected = status === 'connected';

  return (
    <header className="liquid-glass border-b border-white/10 sticky top-0 z-50 px-4 md:px-8 py-3 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand wordmark (single line, single element) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/15">
            <Shield className={`w-4 h-4 transition-colors ${isConnected ? 'text-[#10b981]' : 'text-[#00f2fe]'}`} />
            {isConnected && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            )}
          </div>
          <button
            onClick={() => setActiveTab('hud')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="text-base md:text-lg font-bold tracking-tight text-white font-['Space_Grotesk'] whitespace-nowrap block">
              {t.appTitle}
            </span>
          </button>
        </div>

        {/* Zone 2: 5 single-line navigation tabs */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('hud')}
            className={`whitespace-nowrap transition-colors py-1 relative ${
              activeTab === 'hud'
                ? 'text-[#00f2fe] font-semibold'
                : 'text-[#b9cacb] hover:text-white'
            }`}
          >
            {t.dashboard}
            {activeTab === 'hud' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f2fe] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('nodes')}
            className={`whitespace-nowrap transition-colors py-1 relative ${
              activeTab === 'nodes'
                ? 'text-[#00f2fe] font-semibold'
                : 'text-[#b9cacb] hover:text-white'
            }`}
          >
            {t.nodes}
            {activeTab === 'nodes' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f2fe] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`whitespace-nowrap transition-colors py-1 relative ${
              activeTab === 'matrix'
                ? 'text-[#00f2fe] font-semibold'
                : 'text-[#b9cacb] hover:text-white'
            }`}
          >
            {t.matrix}
            {activeTab === 'matrix' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f2fe] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`whitespace-nowrap transition-colors py-1 relative ${
              activeTab === 'diagnostics'
                ? 'text-[#00f2fe] font-semibold'
                : 'text-[#b9cacb] hover:text-white'
            }`}
          >
            {t.diagnostics}
            {activeTab === 'diagnostics' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f2fe] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`whitespace-nowrap transition-colors py-1 relative ${
              activeTab === 'settings'
                ? 'text-[#00f2fe] font-semibold'
                : 'text-[#b9cacb] hover:text-white'
            }`}
          >
            {t.settings}
            {activeTab === 'settings' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00f2fe] rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Action & Quick Utilities */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Mobile vs Desktop frame toggle (for testing & responsive fidelity) */}
          <button
            onClick={() => setIsMobilePreview(!isMobilePreview)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#dfe2f1] transition-colors"
            title="Toggle Desktop / Mobile Layout Preview"
          >
            <Zap className="w-3.5 h-3.5 text-[#00f2fe]" />
            <span className="whitespace-nowrap">{isMobilePreview ? t.desktopLayout : t.mobileLayout}</span>
          </button>

          {/* Persian / English language toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[#dfe2f1] transition-colors"
            title="Switch Language (English / فارسی)"
          >
            <Globe2 className="w-3.5 h-3.5 text-[#4facfe]" />
            <span className="whitespace-nowrap">{t.languageToggle}</span>
          </button>

          {/* Kill Switch Toggle Button */}
          <button
            onClick={() => setKillSwitch(!killSwitch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-all ${
              killSwitch
                ? 'bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ffb4ab] hover:bg-[#ef4444]/30 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${killSwitch ? 'text-[#ef4444]' : 'text-slate-400'}`} />
            <span className="whitespace-nowrap">KILL SWITCH: {killSwitch ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
