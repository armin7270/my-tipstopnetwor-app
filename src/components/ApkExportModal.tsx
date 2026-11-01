import React, { useState } from 'react';
import {
  Download,
  X,
  Cpu,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Info,
} from 'lucide-react';
import { TRANSLATIONS } from '../utils/network-core.ts';
import { useDialog } from '../utils/use-dialog.ts';

const REPO_URL = 'https://github.com/armin7270/my-tipstopnetwor-app';
const BUILD_DOCS_URL = `${REPO_URL}/blob/main/docs/BUILD-ANDROID.md`;

/** Signed universal build published by the Android CI workflow on every v* tag. */
const APK_FILE = `LiquidObsidian-${__APP_VERSION__}-universal.apk`;
const APK_URL = `${REPO_URL}/releases/download/v${__APP_VERSION__}/${APK_FILE}`;
const CHECKSUMS_URL = `${REPO_URL}/releases/tag/v${__APP_VERSION__}`;

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'fa';
}

interface BuildTarget {
  id: string;
  arch: string;
  abi: string;
  output: string;
  minSdk: number;
  notesEn: string;
  notesFa: string;
  recommended?: boolean;
}

const TARGETS: BuildTarget[] = [
  {
    id: 'universal',
    arch: 'Universal (All ABIs)',
    abi: 'universal',
    output: 'LiquidObsidian-1.0.0-universal.apk',
    minSdk: 24,
    notesEn: 'The published file. One APK for every CPU architecture: arm64-v8a, armeabi-v7a, x86 and x86_64.',
    notesFa: 'فایل منتشرشده. یک APK برای همه معماری‌ها: arm64-v8a، armeabi-v7a، x86 و x86_64.',
    recommended: true,
  },
  {
    id: 'arm64',
    arch: 'ARM64-v8a',
    abi: 'arm64-v8a',
    output: 'app-arm64-v8a-release.apk',
    minSdk: 24,
    notesEn: 'Covers 95%+ of modern Android phones and tablets (Snapdragon, Tensor, Dimensity, Exynos).',
    notesFa: 'پوشش بیش از ۹۵٪ گوشی‌ها و تبلت‌های مدرن (اسنپ‌دراگون، تنسور، دایمنسیتی، اگزینوس).',
  },
  {
    id: 'arm32',
    arch: 'armeabi-v7a',
    abi: 'armeabi-v7a',
    output: 'app-armeabi-v7a-release.apk',
    minSdk: 24,
    notesEn: 'Legacy 32-bit phones, Android TV boxes and budget smart devices.',
    notesFa: 'گوشی‌های قدیمی ۳۲ بیتی، باکس‌های اندروید تی‌وی و دستگاه‌های اقتصادی.',
  },
  {
    id: 'x86_64',
    arch: 'x86_64',
    abi: 'x86_64',
    output: 'app-x86_64-release.apk',
    minSdk: 24,
    notesEn: 'PC emulators (BlueStacks, LDPlayer, Windows Subsystem for Android) and Chromebooks.',
    notesFa: 'شبیه‌سازهای اندروید روی کامپیوتر (بلواستکس، LDPlayer، WSA) و کروم‌بوک‌ها.',
  },
];

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ isOpen, onClose, language }) => {
  const t = TRANSLATIONS[language];
  const dialogRef = useDialog(isOpen, onClose);
  const [selectedTarget, setSelectedTarget] = useState<BuildTarget>(TARGETS[0]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const buildManifest = (target: BuildTarget) => `# Liquid Obsidian Core — Android build manifest
# Generated: ${new Date().toISOString()}
# Repository: ${REPO_URL}

APPLICATION
  Application ID : com.obsidian.core
  Version        : ${__APP_VERSION__}
  Target ABI     : ${target.abi}
  Output file    : ${target.output}
  Min SDK        : ${target.minSdk} (Android 7.0)
  Target SDK     : 35 (Android 15)

WEB ASSET BUILD (run from the repository root)
  npm ci
  npm run build            # emits ./dist

NATIVE WRAPPER (Capacitor, recommended)
  npm i -D @capacitor/cli && npm i @capacitor/android
  npx cap init "Liquid Obsidian Core" com.obsidian.core
  npx cap add android
  npx cap sync android
  cd android && ./gradlew assembleRelease

REQUIRED ANDROID PIECES (not included in this web build)
  - A VpnService subclass that owns the tun file descriptor
  - tun2socks / sing-box native libraries for the selected ABI
  - android.permission.BIND_VPN_SERVICE + INTERNET in AndroidManifest.xml
  - A release keystore; never distribute a debug-signed APK

VERIFY BEFORE PUBLISHING
  apksigner verify --print-certs ${target.output}
  sha256sum ${target.output}   # publish this hash next to the download

NOTE
  This repository currently ships the interface only. No signed APK is
  published here; this manifest documents how to produce one yourself.
`;

  const handleDownloadManifest = (target: BuildTarget) => {
    const blob = new Blob([buildManifest(target)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `liquid-obsidian-build-${target.abi}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyManifest = async (target: BuildTarget) => {
    try {
      await navigator.clipboard?.writeText(buildManifest(target));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apk-hub-title"
        className="liquid-glass rounded-2xl max-w-2xl w-full p-6 border border-white/20 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-[#00f2fe]">
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="apk-hub-title" className="text-lg font-bold text-white font-['Space_Grotesk']">
                {t.apkHub}
              </h3>
              <p className="text-xs text-[#b9cacb] font-mono">{t.apkHubDesc}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Honest status banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#ffd7a1]">
          <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed font-mono">
            {language === 'fa'
              ? 'نسخه universal امضاشده در GitHub Releases منتشر می‌شود و شامل هسته واقعی WireGuard است؛ با این حال برای برقراری تونل باید فایل .conf سرویس‌دهنده خودتان را در بخش تنظیمات وارد کنید.'
              : 'The signed universal build is published in GitHub Releases and ships the real WireGuard engine. You still need to import your own provider .conf under Settings to establish a tunnel.'}{' '}
            <a
              href={BUILD_DOCS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[#00f2fe] underline hover:text-[#e0fdff]"
            >
              {language === 'fa' ? 'مستندات ساخت' : 'Build docs'}
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </p>
        </div>

        {/* Architectures Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#849495]">
            <span>{language === 'fa' ? 'انتخاب معماری پردازنده (CPU ABI):' : 'Select target CPU architecture:'}</span>
            <span>v{__APP_VERSION__}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t.allCpuArchs}>
            {TARGETS.map(target => {
              const isSelected = selectedTarget.id === target.id;

              return (
                <button
                  type="button"
                  key={target.id}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedTarget(target)}
                  className={`p-3.5 rounded-xl border text-start cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#00f2fe]/10 border-[#00f2fe]/60 shadow-[0_0_15px_rgba(0,242,254,0.15)]'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className={`w-4 h-4 ${isSelected ? 'text-[#00f2fe]' : 'text-slate-400'}`} aria-hidden="true" />
                      <span className="text-sm font-bold text-white font-['Space_Grotesk']">{target.arch}</span>
                    </div>

                    {target.recommended && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10b981]/20 text-[#4edea3] border border-[#10b981]/30">
                        {language === 'fa' ? 'پیشنهادی' : 'Recommended'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#b9cacb] mt-1.5 leading-relaxed">
                    {language === 'fa' ? target.notesFa : target.notesEn}
                  </p>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[#849495]">
                    <span>minSdk {target.minSdk}</span>
                    <span className="text-[#00f2fe] font-semibold">{target.abi}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected target details */}
        <div className="p-4 rounded-xl bg-[#0a0e18]/80 border border-white/10 space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[#849495]">{language === 'fa' ? 'فایل منتشرشده:' : 'Published file:'}</span>
              <div className="text-white font-bold text-sm mt-0.5 truncate" title={APK_FILE} dir="ltr">
                {APK_FILE}
              </div>
              <div className="text-[10px] font-mono text-[#849495] mt-0.5">
                {language === 'fa'
                  ? 'همین یک فایل روی همه معماری‌های بالا نصب می‌شود.'
                  : 'This single file installs on every ABI listed above.'}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={APK_URL}
                download={APK_FILE}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono font-bold rounded-xl bg-[#00f2fe] hover:bg-[#00f2fe]/90 text-slate-950 transition-all cursor-pointer shadow-lg shadow-[#00f2fe]/20"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>{t.apkDownload}</span>
                <span className="text-[10px] font-normal opacity-70">v{__APP_VERSION__}</span>
              </a>

              <button
                type="button"
                onClick={() => handleDownloadManifest(selectedTarget)}
                title={language === 'fa' ? 'دریافت دستورهای ساخت' : 'Download build instructions'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{language === 'fa' ? 'دستور ساخت' : 'Build steps'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-[11px]">
            <a
              href={CHECKSUMS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="truncate text-[#849495] hover:text-[#00f2fe] underline"
            >
              SHA-256: {`v${__APP_VERSION__}`} release assets
            </a>
            <button
              type="button"
              onClick={() => handleCopyManifest(selectedTarget)}
              className="text-[#00f2fe] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-[#10b981]" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}
              <span>{copied ? (language === 'fa' ? 'کپی شد' : 'Copied') : language === 'fa' ? 'کپی' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Distribution checklist */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-[#b9cacb] space-y-2">
          <div className="font-bold text-white flex items-center gap-1.5 font-['Space_Grotesk']">
            <ShieldCheck className="w-4 h-4 text-[#10b981]" aria-hidden="true" />
            <span>{language === 'fa' ? 'چک‌لیست انتشار بسته:' : 'Android release checklist:'}</span>
          </div>

          <ol className="list-decimal list-inside space-y-1 font-mono text-[11px] leading-relaxed">
            {language === 'fa' ? (
              <>
                <li>کلید امضا (keystore) تولید و در جای امن نگهداری کنید؛ APK دیباگ را منتشر نکنید.</li>
                <li>هر چهار معماری را بسازید و با <code>apksigner verify</code> امضا را بررسی کنید.</li>
                <li>هش SHA-256 هر فایل را کنار لینک دانلود منتشر کنید.</li>
                <li>مجوز VpnService را در دستگاه واقعی آزمایش کنید و حالت باتری را Unrestricted بگذارید.</li>
              </>
            ) : (
              <>
                <li>Generate a release keystore and keep it offline; never publish a debug-signed APK.</li>
                <li>Build every ABI you support and verify signatures with <code>apksigner verify</code>.</li>
                <li>Publish the SHA-256 of each artifact next to its download link.</li>
                <li>Test the VpnService consent flow on a physical device with unrestricted battery mode.</li>
              </>
            )}
          </ol>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
