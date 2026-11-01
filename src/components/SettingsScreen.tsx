import React from 'react';
import { Sliders, Cpu, ShieldCheck, Layers, Globe2, RotateCcw, Check } from 'lucide-react';
import { CoreSettings } from '../types/index.ts';
import { DEFAULT_SETTINGS } from '../data/mock-nodes.ts';
import { TRANSLATIONS } from '../utils/network-core.ts';

interface SettingsScreenProps {
  settings: CoreSettings;
  setSettings: React.Dispatch<React.SetStateAction<CoreSettings>>;
  language: 'en' | 'fa';
  setLanguage: (lang: 'en' | 'fa') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  setSettings,
  language,
  setLanguage,
}) => {
  const t = TRANSLATIONS[language];

  const handleResetDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    setLanguage(DEFAULT_SETTINGS.language);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white font-['Space_Grotesk']">
            {t.settings}
          </h2>
          <p className="text-xs text-[#b9cacb] font-mono mt-0.5">
            Configure low-level tun2socks encapsulation parameters, kernel selection, and security rules
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-mono rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors self-start cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.resetDefaults}</span>
        </button>
      </div>

      {/* Group 1: Routing Kernel Engine */}
      <div className="liquid-glass rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#00f2fe]" />
          <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
            Underlying Core Kernel Engine
          </h3>
        </div>
        <p className="text-xs text-[#b9cacb]">
          Select the packet routing engine driving encapsulation and TLS handshakes:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              id: 'xray',
              name: 'Xray-core v1.8.8',
              desc: 'Premier VLESS Reality, XTLS Vision, and anti-GFW obfuscation',
              badge: 'Recommended',
            },
            {
              id: 'singbox',
              name: 'Sing-box v1.8.5',
              desc: 'High-performance universal proxy platform with native TUN stack',
              badge: 'Ultra Fast',
            },
            {
              id: 'tun2socks',
              name: 'tun2socks v2.5.2',
              desc: 'Pure gVisor virtual network stack with low RAM footprint',
              badge: 'Lightweight',
            },
            {
              id: 'mihomo',
              name: 'Mihomo Meta-core',
              desc: 'Enhanced Clash Meta fork supporting complex dispatch matrices',
              badge: 'Advanced Rules',
            },
          ].map(kernel => (
            <button
              key={kernel.id}
              onClick={() => setSettings(s => ({ ...s, kernel: kernel.id as any }))}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                settings.kernel === kernel.id
                  ? 'bg-[#00f2fe]/10 border-[#00f2fe]/50 shadow-[0_0_20px_rgba(0,242,254,0.12)]'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white font-['Space_Grotesk']">
                  {kernel.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-[#00f2fe]">
                  {kernel.badge}
                </span>
              </div>
              <p className="text-xs text-[#b9cacb] mt-1">{kernel.desc}</p>

              {settings.kernel === kernel.id && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-mono text-[#00f2fe] font-semibold">
                  <Check className="w-3.5 h-3.5" />
                  <span>ACTIVE KERNEL</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Group 2: TUN Virtual Network Stack & MTU */}
      <div className="liquid-glass rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#4facfe]" />
          <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
            TUN Virtual Network Stack
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'gvisor', name: 'gVisor Userspace', desc: 'Zero kernel panics, isolated TCP buffer' },
            { id: 'system', name: 'System Native', desc: 'Direct OS packet ring for 10Gbps line rate' },
            { id: 'mixed', name: 'Mixed Dual-Stack', desc: 'gVisor for TCP, Native for UDP packets' },
          ].map(stack => (
            <button
              key={stack.id}
              onClick={() => setSettings(s => ({ ...s, tunStack: stack.id as any }))}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                settings.tunStack === stack.id
                  ? 'bg-[#4facfe]/10 border-[#4facfe]/50 text-white'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <div className="text-xs font-bold text-white font-['Space_Grotesk']">{stack.name}</div>
              <p className="text-[11px] text-[#b9cacb] mt-1">{stack.desc}</p>
            </button>
          ))}
        </div>

        {/* MTU Slider */}
        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#849495]">Maximum Transmission Unit (MTU)</span>
            <span className="text-[#00f2fe] font-bold tabular-nums">{settings.mtu} Bytes</span>
          </div>
          <input
            type="range"
            min={1280}
            max={9000}
            step={20}
            value={settings.mtu}
            onChange={e => setSettings(s => ({ ...s, mtu: parseInt(e.target.value, 10) }))}
            className="w-full accent-[#00f2fe] cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] font-mono text-[#849495]">
            <button
              onClick={() => setSettings(s => ({ ...s, mtu: 1280 }))}
              className="hover:text-white cursor-pointer"
            >
              1280 (IPv6 Minimum)
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, mtu: 1420 }))}
              className="hover:text-white cursor-pointer"
            >
              1420 (WireGuard Standard)
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, mtu: 1500 }))}
              className="hover:text-white cursor-pointer font-bold text-white"
            >
              1500 (Ethernet Default)
            </button>
            <button
              onClick={() => setSettings(s => ({ ...s, mtu: 9000 }))}
              className="hover:text-white cursor-pointer"
            >
              9000 (Jumbo Frame)
            </button>
          </div>
        </div>
      </div>

      {/* Group 3: Security Hardening & Kill Switch */}
      <div className="liquid-glass rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#10b981]" />
          <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
            Security Hardening & Leak Protection
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
            <div>
              <div className="text-xs md:text-sm font-bold text-white">{t.killSwitch}</div>
              <div className="text-xs text-[#b9cacb] mt-0.5">{t.killSwitchDesc}</div>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, killSwitch: !s.killSwitch }))}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                settings.killSwitch
                  ? 'bg-[#ef4444]/20 border-[#ef4444]/50 text-[#ffb4ab]'
                  : 'bg-white/10 border-white/10 text-slate-400'
              }`}
            >
              {settings.killSwitch ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
            <div>
              <div className="text-xs md:text-sm font-bold text-white">Strict Route Enclosure</div>
              <div className="text-xs text-[#b9cacb] mt-0.5">Enforce all socket binding to tun0 adapter</div>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, strictRoute: !s.strictRoute }))}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                settings.strictRoute
                  ? 'bg-[#10b981]/20 border-[#10b981]/50 text-[#4edea3]'
                  : 'bg-white/10 border-white/10 text-slate-400'
              }`}
            >
              {settings.strictRoute ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
            <div>
              <div className="text-xs md:text-sm font-bold text-white">IPv6 Routing Tunneling</div>
              <div className="text-xs text-[#b9cacb] mt-0.5">Route IPv6 or drop IPv6 to prevent bypass leaks</div>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, enableIpv6: !s.enableIpv6 }))}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                settings.enableIpv6
                  ? 'bg-[#00f2fe]/20 border-[#00f2fe]/50 text-[#00f2fe]'
                  : 'bg-white/10 border-white/10 text-slate-400'
              }`}
            >
              {settings.enableIpv6 ? 'ROUTE IPV6' : 'BLOCK IPV6'}
            </button>
          </div>
        </div>
      </div>

      {/* Group 4: Localization & Glass Optics */}
      <div className="liquid-glass rounded-2xl p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-[#f59e0b]" />
          <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
            Localization & Visual Materials
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Language Switcher */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <span className="text-xs font-mono text-[#849495]">Application Locale</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setLanguage('en');
                  setSettings(s => ({ ...s, language: 'en' }));
                }}
                className={`flex-1 py-2 text-xs font-mono rounded-lg border transition-colors cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#00f2fe]/20 border-[#00f2fe]/50 text-white font-bold'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                English (EN)
              </button>
              <button
                onClick={() => {
                  setLanguage('fa');
                  setSettings(s => ({ ...s, language: 'fa' }));
                }}
                className={`flex-1 py-2 text-xs font-bold font-['Vazirmatn'] rounded-lg border transition-colors cursor-pointer ${
                  language === 'fa'
                    ? 'bg-[#00f2fe]/20 border-[#00f2fe]/50 text-white font-bold'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                فارسی (Persian)
              </button>
            </div>
          </div>

          {/* Glass Optical Blur Quality */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <span className="text-xs font-mono text-[#849495]">Liquid Glass Specular Blur</span>
            <div className="flex items-center gap-2">
              {[
                { id: 'high', label: 'Ultra (28px)' },
                { id: 'medium', label: 'Balanced' },
                { id: 'performance', label: 'Lite' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSettings(s => ({ ...s, glassBlurQuality: opt.id as any }))}
                  className={`flex-1 py-2 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer ${
                    settings.glassBlurQuality === opt.id
                      ? 'bg-white/15 border-white/30 text-white font-bold'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
