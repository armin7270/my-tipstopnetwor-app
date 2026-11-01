import React, { useRef, useState } from 'react';
import {
  ShieldCheck,
  ShieldOff,
  Upload,
  Trash2,
  KeyRound,
  Radio,
  AlertTriangle,
  FileKey2,
  Play,
  Square,
  Loader2,
} from 'lucide-react';
import { WgConfig, WgStatus, ImportResult } from '../native/wireguard.ts';
import { formatBytes } from '../utils/network-core.ts';

interface WireGuardCardProps {
  language: 'en' | 'fa';
  available: boolean;
  configs: WgConfig[];
  status: WgStatus | null;
  onImport: (name: string, text: string) => ImportResult;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  onConnect: (id: string) => void;
  onDisconnect: () => void;
}

const STATE_LABEL: Record<string, { label: string; className: string }> = {
  up: { label: 'CONNECTED', className: 'bg-emerald-500/15 text-[#4edea3] border-emerald-500/40' },
  connecting: { label: 'CONNECTING', className: 'bg-cyan-500/15 text-[#00f2fe] border-cyan-500/40' },
  down: { label: 'DISCONNECTED', className: 'bg-white/5 text-slate-400 border-white/10' },
  error: { label: 'ERROR', className: 'bg-red-500/15 text-red-300 border-red-500/40' },
};

export const WireGuardCard: React.FC<WireGuardCardProps> = ({
  language,
  available,
  configs,
  status,
  onImport,
  onRemove,
  onSelect,
  onConnect,
  onDisconnect,
}) => {
  const fa = language === 'fa';
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const state = status?.state ?? 'down';
  const selectedId = status?.selected ?? configs[0]?.id ?? null;
  const selected = configs.find(config => config.id === selectedId) ?? null;
  const badge = STATE_LABEL[state] ?? STATE_LABEL.down;

  const handleSubmit = () => {
    if (!text.trim()) {
      setFeedback({ ok: false, message: fa ? 'متن کانفیگ خالی است' : 'Paste a WireGuard config first' });
      return;
    }
    if (!text.includes('[Interface]') || !text.includes('[Peer]')) {
      setFeedback({
        ok: false,
        message: fa
          ? 'کانفیگ باید شامل بخش‌های [Interface] و [Peer] باشد'
          : 'The config must contain both [Interface] and [Peer] sections',
      });
      return;
    }
    const result = onImport(name.trim(), text.trim());
    if (result.ok) {
      setFeedback({
        ok: true,
        message: fa ? 'کانفیگ ذخیره شد' : `Saved${result.endpoint ? ` · ${result.endpoint}` : ''}`,
      });
      setName('');
      setText('');
    } else {
      setFeedback({ ok: false, message: result.error ?? 'Import failed' });
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const content = await file.text();
    setText(content);
    if (!name.trim()) setName(file.name.replace(/\.conf$/i, ''));
  };

  return (
    <div className="liquid-glass rounded-2xl p-5 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#10b981]" aria-hidden="true" />
          <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
            {fa ? 'تونل واقعی WireGuard' : 'Real WireGuard tunnel'}
          </h3>
        </div>
        <span
          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <p className="text-xs text-[#b9cacb] leading-relaxed">
        {fa
          ? 'این بخش از هسته رسمی WireGuard (libwg-go) روی VpnService اندروید استفاده می‌کند و ترافیک دستگاه را واقعاً تونل می‌کند. کافی است فایل .conf سرویس‌دهنده خود را وارد کنید.'
          : 'This panel drives the official WireGuard userspace engine (libwg-go) through Android VpnService and tunnels real device traffic. Import any standard .conf from your provider.'}
      </p>

      {!available && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#00f2fe]/5 border border-[#00f2fe]/25 text-[#b9cacb]">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-[#00f2fe] shrink-0" aria-hidden="true" />
          <p className="text-[11px] font-mono leading-relaxed">
            {fa
              ? 'موتور بومی فقط داخل اپ اندروید فعال است. در مرورگر، دکمه اتصال همچنان شبیه‌سازی است.'
              : 'The native engine is only present inside the Android app. In the browser the connect button stays a simulation.'}
          </p>
        </div>
      )}

      {available && (
        <>
          {/* Import */}
          <div className="p-3.5 rounded-xl bg-[#0a0e18]/70 border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-[#849495] uppercase tracking-wider">
                {fa ? 'افزودن کانفیگ' : 'Import configuration'}
              </span>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex items-center gap-1.5 text-[11px] font-mono text-[#00f2fe] hover:text-[#e0fdff]"
              >
                <FileKey2 className="w-3.5 h-3.5" aria-hidden="true" />
                {fa ? 'انتخاب فایل .conf' : 'Choose .conf file'}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".conf,.txt,text/plain"
                className="hidden"
                onChange={event => {
                  void handleFile(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
              />
            </div>

            <input
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder={fa ? 'نام نمایشی (اختیاری)' : 'Display name (optional)'}
              className="w-full bg-[#171b26]/80 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-[#849495] focus:outline-none focus:border-[#00f2fe]/50"
            />

            <textarea
              value={text}
              onChange={event => setText(event.target.value)}
              rows={5}
              dir="ltr"
              spellCheck={false}
              placeholder={'[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/32\nDNS = 1.1.1.1\n\n[Peer]\nPublicKey = ...\nEndpoint = vpn.example.com:51820\nAllowedIPs = 0.0.0.0/0, ::/0'}
              className="w-full bg-[#0a0e18] border border-white/15 rounded-lg p-3 text-[11px] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#00f2fe]/60"
            />

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono text-[#849495]">
                {fa ? 'کلید خصوصی فقط روی همین دستگاه ذخیره می‌شود' : 'The private key never leaves this device'}
              </span>
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00f2fe] text-slate-950 text-[11px] font-mono font-bold hover:bg-[#00f2fe]/90"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                {fa ? 'ذخیره' : 'Save'}
              </button>
            </div>

            {feedback && (
              <p
                className={`text-[11px] font-mono ${feedback.ok ? 'text-[#4edea3]' : 'text-red-400'}`}
                role="status"
              >
                {feedback.message}
              </p>
            )}
          </div>

          {/* Saved configs */}
          <div className="space-y-2">
            {configs.length === 0 && (
              <p className="text-xs font-mono text-[#849495] text-center py-3">
                {fa ? 'هنوز کانفیگی وارد نشده است.' : 'No WireGuard configuration imported yet.'}
              </p>
            )}

            {configs.map(config => {
              const isSelected = config.id === selectedId;
              return (
                <div
                  key={config.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                    isSelected
                      ? 'bg-[#10b981]/10 border-[#10b981]/40'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(config.id)}
                    className="flex items-center gap-2.5 min-w-0 text-start"
                    aria-pressed={isSelected}
                  >
                    <KeyRound
                      className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#4edea3]' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-white truncate">{config.name}</span>
                      <span className="block text-[10px] font-mono text-[#849495] truncate" dir="ltr">
                        {config.endpoint || 'endpoint hidden'}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSelected && state !== 'up' && (
                      <button
                        type="button"
                        onClick={() => onConnect(config.id)}
                        disabled={state === 'connecting'}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#10b981]/20 border border-[#10b981]/40 text-[#4edea3] text-[10px] font-mono font-bold disabled:opacity-50"
                      >
                        {state === 'connecting' ? (
                          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <Play className="w-3 h-3" aria-hidden="true" />
                        )}
                        {fa ? 'اتصال' : 'Connect'}
                      </button>
                    )}
                    {isSelected && state === 'up' && (
                      <button
                        type="button"
                        onClick={onDisconnect}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ffb4ab] text-[10px] font-mono font-bold"
                      >
                        <Square className="w-3 h-3" aria-hidden="true" />
                        {fa ? 'قطع' : 'Stop'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(config.id)}
                      aria-label={fa ? 'حذف کانفیگ' : 'Delete configuration'}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live status */}
          {status && (
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-[#849495] uppercase">RX</div>
                <div className="text-xs font-bold text-[#00f2fe] tabular-nums">{formatBytes(status.rx)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-[#849495] uppercase">TX</div>
                <div className="text-xs font-bold text-[#4edea3] tabular-nums">{formatBytes(status.tx)}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-[#849495] uppercase">ENGINE</div>
                <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
                  <Radio className="w-3 h-3 text-[#10b981]" aria-hidden="true" />
                  libwg-go
                </div>
              </div>
            </div>
          )}

          {status?.error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <ShieldOff className="w-4 h-4 mt-0.5 text-red-400 shrink-0" aria-hidden="true" />
              <p className="text-[11px] font-mono text-red-300 break-words">{status.error}</p>
            </div>
          )}

          {selected && state === 'up' && (
            <p className="text-[11px] font-mono text-[#4edea3] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              {fa
                ? `ترافیک دستگاه از ${selected.name} عبور می‌کند`
                : `All device traffic is routed through ${selected.name}`}
            </p>
          )}
        </>
      )}
    </div>
  );
};
