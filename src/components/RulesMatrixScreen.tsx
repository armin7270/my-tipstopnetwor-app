import React, { useState } from 'react';
import {
  Shield,
  GitBranch,
  ArrowRight,
  ToggleLeft,
  ToggleRight,
  Lock,
  Smartphone,
  Globe,
  Ban,
  Send,
  MessageSquare,
  Terminal,
  Music,
  Gamepad2,
  ShieldAlert,
} from 'lucide-react';
import { RouteRule, AppSplitRoute, CoreSettings } from '../types/index.ts';
import { evaluateRouteRule, TRANSLATIONS } from '../utils/network-core.ts';

/** Maps the `icon` name stored on each split-tunnel entry to a lucide component. */
const APP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Send,
  Globe,
  MessageSquare,
  Terminal,
  Music,
  Gamepad2,
  ShieldAlert,
};

interface RulesMatrixScreenProps {
  rules: RouteRule[];
  setRules: React.Dispatch<React.SetStateAction<RouteRule[]>>;
  appRoutes: AppSplitRoute[];
  setAppRoutes: React.Dispatch<React.SetStateAction<AppSplitRoute[]>>;
  settings: CoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<CoreSettings>>;
  language: 'en' | 'fa';
}

export const RulesMatrixScreen: React.FC<RulesMatrixScreenProps> = ({
  rules,
  setRules,
  appRoutes,
  setAppRoutes,
  settings,
  setSettings,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const [testInput, setTestInput] = useState('api.telegram.org');

  // Interactive live evaluation
  const evaluationResult = evaluateRouteRule(testInput, rules);

  const toggleRule = (ruleId: string) => {
    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const updateRuleOutbound = (ruleId: string, outbound: 'proxy' | 'direct' | 'block') => {
    setRules(prev =>
      prev.map(r => (r.id === ruleId ? { ...r, outbound } : r))
    );
  };

  const updateAppOutbound = (appId: string, outbound: 'proxy' | 'direct' | 'block') => {
    setAppRoutes(prev =>
      prev.map(a => (a.id === appId ? { ...a, outbound } : a))
    );
  };

  const getOutboundBadge = (outbound: 'proxy' | 'direct' | 'block') => {
    switch (outbound) {
      case 'proxy':
        return {
          bg: 'bg-[#00f2fe]/10 border-[#00f2fe]/30 text-[#00f2fe]',
          label: 'PROXY (TUN2SOCKS)',
          icon: <Lock className="w-3 h-3 text-[#00f2fe]" />,
        };
      case 'direct':
        return {
          bg: 'bg-[#10b981]/10 border-[#10b981]/30 text-[#4edea3]',
          label: 'DIRECT (BYPASS)',
          icon: <ArrowRight className="w-3 h-3 text-[#10b981]" />,
        };
      case 'block':
        return {
          bg: 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ffb4ab]',
          label: 'BLOCK (REJECT)',
          icon: <Ban className="w-3 h-3 text-[#ef4444]" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white font-['Space_Grotesk']">
          {t.matrix}
        </h2>
        <p className="text-xs text-[#b9cacb] font-mono mt-0.5">
          Deterministic packet dispatch matrix, geosite pattern filters, and per-app split tunneling
        </p>
      </div>

      {/* Interactive Traffic Flow Evaluator */}
      <div className="liquid-glass rounded-2xl p-5 md:p-6 border-l-2 border-l-[#4facfe]">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-[#4facfe]" />
          <h3 className="text-sm md:text-base font-bold text-white font-['Space_Grotesk']">
            {t.ruleTesterTitle}
          </h3>
        </div>
        <p className="text-xs text-[#b9cacb] mb-4">
          Test any hostname or IP to simulate kernel routing decisions in real time:
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={testInput}
            onChange={e => setTestInput(e.target.value)}
            placeholder={t.ruleTesterPlaceholder}
            aria-label={t.ruleTesterPlaceholder}
            dir="ltr"
            spellCheck={false}
            className="flex-1 bg-[#0a0e18] border border-white/15 rounded-xl px-4 py-2.5 text-xs md:text-sm font-mono text-white placeholder-[#849495] focus:outline-none focus:border-[#4facfe]"
          />

          {/* Quick preset tests */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {['api.telegram.org', '192.168.1.1', 'bank.ir', 'ad.doubleclick.net', 'google.com'].map(preset => (
              <button
                key={preset}
                onClick={() => setTestInput(preset)}
                className="px-2 py-1 text-[11px] font-mono rounded bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 whitespace-nowrap cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Live Evaluated Output */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#0a0e18]/80 border border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#849495]">Input Target:</span>
            <span className="text-xs md:text-sm font-mono font-bold text-white" dir="ltr">{testInput || '(empty)'}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#849495]">Resolved Route:</span>
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-bold ${
                getOutboundBadge(evaluationResult.outbound).bg
              }`}
            >
              {getOutboundBadge(evaluationResult.outbound).icon}
              <span>{getOutboundBadge(evaluationResult.outbound).label}</span>
            </span>
          </div>

          <div className="w-full text-[11px] font-mono text-[#849495] flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
            <span>Matched Rule Pattern:</span>
            <span className="text-white/80 font-bold" dir="ltr">{evaluationResult.matchedPattern}</span>
            {evaluationResult.rule && (
              <>
                <span aria-hidden="true">·</span>
                <span>Rule: {evaluationResult.rule.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Routing Rules and Per-App Split Tunneling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Dispatch Rules (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00f2fe]" />
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Global Dispatch Rules ({rules.length})
              </h3>
            </div>
            <span className="text-xs font-mono text-[#849495]">Priority-Ordered</span>
          </div>

          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <div
                key={rule.id}
                className={`liquid-glass rounded-xl p-4 transition-all duration-200 border ${
                  rule.enabled ? 'border-white/10' : 'border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-[#849495] w-5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white font-['Space_Grotesk'] flex items-center gap-2">
                        {rule.name}
                        {!rule.enabled && (
                          <span className="text-[10px] font-mono text-slate-500 uppercase">Disabled</span>
                        )}
                      </h4>
                      <p className="text-xs font-mono text-[#849495] mt-0.5" dir="ltr">{rule.pattern}</p>
                    </div>
                  </div>

                  {/* Enable / Disable toggle */}
                  <button
                    onClick={() => toggleRule(rule.id)}
                    aria-label={`Toggle ${rule.name}`}
                    className="cursor-pointer text-slate-400 hover:text-white"
                  >
                    {rule.enabled ? (
                      <ToggleRight className="w-6 h-6 text-[#00f2fe]" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Bottom Outbound Selectors and Hit Stats */}
                <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {(['proxy', 'direct', 'block'] as const).map(out => (
                      <button
                        key={out}
                        onClick={() => updateRuleOutbound(rule.id, out)}
                        className={`px-2.5 py-1 text-[11px] font-mono uppercase rounded-lg border transition-all cursor-pointer ${
                          rule.outbound === out
                            ? getOutboundBadge(out).bg
                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {out}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] font-mono text-[#849495] tabular-nums">
                    {rule.hits.toLocaleString()} hits
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Per-App Split Tunneling & DNS over HTTPS */}
        <div className="space-y-6">
          {/* Per-App Split Tunneling */}
          <div className="liquid-glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#10b981]" />
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                App Split Tunneling
              </h3>
            </div>
            <p className="text-xs text-[#b9cacb]">
              Route individual system packages through tun2socks or bypass directly:
            </p>

            <div className="space-y-2.5">
              {appRoutes.map(app => (
                <div
                  key={app.id}
                  className="bg-[#0f131d]/70 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-[#00f2fe]" aria-hidden="true">
                      {React.createElement(APP_ICONS[app.icon] ?? Globe, { className: 'w-4 h-4' })}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{app.name}</div>
                      <div className="text-[10px] font-mono text-[#849495] truncate max-w-[140px]" dir="ltr">
                        {app.packageName}
                      </div>
                    </div>
                  </div>

                  {/* Outbound toggle button */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateAppOutbound(app.id, app.outbound === 'proxy' ? 'direct' : 'proxy')}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border font-semibold transition-colors cursor-pointer ${
                        app.outbound === 'proxy'
                          ? 'bg-[#00f2fe]/10 border-[#00f2fe]/30 text-[#00f2fe]'
                          : 'bg-[#10b981]/10 border-[#10b981]/30 text-[#4edea3]'
                      }`}
                    >
                      {app.outbound.toUpperCase()}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DNS over HTTPS (DoH) Engine */}
          <div className="liquid-glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#f59e0b]" />
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                DNS-over-HTTPS (DoH)
              </h3>
            </div>
            <p className="text-xs text-[#b9cacb]">
              Encrypted upstream DNS resolution prevents ISP query sniffing:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'cloudflare', name: 'Cloudflare', url: 'https://1.1.1.1/dns-query' },
                { id: 'quad9', name: 'Quad9 Sec', url: 'https://dns.quad9.net/dns-query' },
                { id: 'google', name: 'Google DNS', url: 'https://dns.google/dns-query' },
                { id: 'adguard', name: 'AdGuard DoH', url: 'https://dns.adguard.com/dns-query' },
              ].map(provider => (
                <button
                  key={provider.id}
                  onClick={() =>
                    setSettings(s => ({
                      ...s,
                      dnsProvider: provider.id as any,
                      dohUrl: provider.url,
                    }))
                  }
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    settings.dnsProvider === provider.id
                      ? 'bg-[#00f2fe]/10 border-[#00f2fe]/40 text-white'
                      : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-bold font-['Space_Grotesk']">{provider.name}</div>
                  <div className="text-[10px] font-mono text-[#849495] truncate">{provider.url}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
