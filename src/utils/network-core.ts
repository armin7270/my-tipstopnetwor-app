import { RouteRule, ServerNode, ProtocolType } from '../types/index.ts';

/**
 * Format bytes into human-readable string with binary units
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0 || !Number.isFinite(bytes)) return '0.00 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${(bytes / Math.pow(k, idx)).toFixed(idx === 0 ? 0 : 2)} ${sizes[idx]}`;
}

/**
 * Format bits per second into speed string
 */
export function formatBitrate(bytesPerSec: number): string {
  if (bytesPerSec <= 0 || !Number.isFinite(bytesPerSec)) return '0.0 KB/s';
  const k = 1024;
  if (bytesPerSec < k) {
    return `${bytesPerSec.toFixed(0)} B/s`;
  }
  if (bytesPerSec < k * k) {
    return `${(bytesPerSec / k).toFixed(1)} KB/s`;
  }
  if (bytesPerSec < k * k * k) {
    return `${(bytesPerSec / (k * k)).toFixed(2)} MB/s`;
  }
  return `${(bytesPerSec / (k * k * k)).toFixed(2)} GB/s`;
}

/**
 * Format duration in seconds into HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0 || !Number.isFinite(seconds)) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Classify latency health based on ping ms
 */
export function getLatencyClassification(pingMs: number): {
  color: string;
  label: string;
  bgClass: string;
  textClass: string;
} {
  if (pingMs <= 0 || !Number.isFinite(pingMs)) {
    return { color: '#ef4444', label: 'TIMEOUT', bgClass: 'bg-red-500/10', textClass: 'text-red-400' };
  }
  if (pingMs < 80) {
    return { color: '#10b981', label: 'OPTIMAL', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400' };
  }
  if (pingMs < 160) {
    return { color: '#00f2fe', label: 'EXCELLENT', bgClass: 'bg-cyan-500/10', textClass: 'text-cyan-400' };
  }
  if (pingMs < 280) {
    return { color: '#f59e0b', label: 'MODERATE', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400' };
  }
  return { color: '#ef4444', label: 'HIGH', bgClass: 'bg-red-500/10', textClass: 'text-red-400' };
}

/**
 * Matches a destination host (e.g. 'discord.com' or '192.168.1.1') against routing rules
 */
export function evaluateRouteRule(
  destination: string,
  rules: RouteRule[]
): { rule: RouteRule | null; outbound: 'proxy' | 'direct' | 'block'; matchedPattern: string } {
  const cleanDest = destination.trim().toLowerCase();

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const pattern = rule.pattern.toLowerCase();

    // Check geosite or domain match
    if (rule.type === 'domain' || rule.type === 'geosite') {
      if (pattern.startsWith('*.')) {
        const rootDomain = pattern.slice(2);
        if (cleanDest === rootDomain || cleanDest.endsWith('.' + rootDomain)) {
          return { rule, outbound: rule.outbound, matchedPattern: rule.pattern };
        }
      } else if (cleanDest === pattern || cleanDest.endsWith('.' + pattern)) {
        return { rule, outbound: rule.outbound, matchedPattern: rule.pattern };
      }
    } else if (rule.type === 'ip' || rule.type === 'geoip') {
      // Simple prefix / exact IP match
      if (cleanDest === pattern || cleanDest.startsWith(pattern.replace(/\/\d+$/, ''))) {
        return { rule, outbound: rule.outbound, matchedPattern: rule.pattern };
      }
    }
  }

  // Default outbound is proxy
  return { rule: null, outbound: 'proxy', matchedPattern: 'default-proxy' };
}

/**
 * Parses node configuration URIs (vless://, vmess://, hysteria2://, trojan://, ss://)
 */
export function parseConfigUri(uri: string): Partial<ServerNode> | null {
  try {
    const trimmed = uri.trim();
    if (!trimmed.includes('://')) return null;

    const [protocolPart, rest] = trimmed.split('://');
    const protocolLower = protocolPart.toLowerCase();

    let protocol: ProtocolType = 'VLESS';
    if (protocolLower === 'vless') protocol = 'VLESS';
    else if (protocolLower === 'vmess') protocol = 'VMess';
    else if (protocolLower === 'hysteria2' || protocolLower === 'hy2') protocol = 'Hysteria2';
    else if (protocolLower === 'trojan') protocol = 'Trojan';
    else if (protocolLower === 'ss') protocol = 'Shadowsocks';
    else if (protocolLower === 'wireguard' || protocolLower === 'wg') protocol = 'WireGuard';

    // Handle standard userinfo@host:port#name
    const hashIndex = rest.indexOf('#');
    let name = 'Custom Node';
    let body = rest;

    if (hashIndex !== -1) {
      name = decodeURIComponent(rest.slice(hashIndex + 1));
      body = rest.slice(0, hashIndex);
    }

    let host = '127.0.0.1';
    let port = 443;

    if (body.includes('@')) {
      const atSplit = body.split('@');
      const hostPort = atSplit[1].split('?')[0];
      const hpSplit = hostPort.split(':');
      if (hpSplit[0]) host = hpSplit[0];
      if (hpSplit[1]) port = parseInt(hpSplit[1], 10) || 443;
    } else if (body.includes(':')) {
      const parts = body.split('?')[0].split(':');
      if (parts[0]) host = parts[0];
      if (parts[1]) port = parseInt(parts[1], 10) || 443;
    }

    return {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name || `${protocol} Node`,
      country: 'Global',
      countryCode: 'UN',
      flag: '🌐',
      host,
      port,
      protocol,
      cipher: protocol === 'VLESS' ? 'none (REALITY TLS)' : 'ChaCha20-Poly1305',
      pingMs: 0,
      jitterMs: 0,
      loadPercent: 15,
      isFavorite: false,
      tags: ['Imported', protocol],
      features: {
        udp: true,
        reality: protocol === 'VLESS',
        multiplex: true,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Persian Translations Dictionary for Cross-Lingual Parity
 */
export const TRANSLATIONS = {
  en: {
    appTitle: 'LIQUID OBSIDIAN CORE',
    tagline: 'High-Throughput tun2socks Privacy Engine',
    dashboard: 'HUD / Core',
    nodes: 'Routing Nodes',
    matrix: 'Traffic Matrix',
    diagnostics: 'Diagnostics',
    settings: 'Engine Config',
    connected: 'TUN ENCAPSULATED',
    disconnected: 'DORMANT / IDLE',
    connecting: 'CRYPTOGRAPHIC HANDSHAKE',
    disconnecting: 'TERMINATING TUNNEL',
    error: 'ROUTING PANIC',
    connectPrompt: 'TAP TO ENGAGE TUNNEL',
    disconnectPrompt: 'TAP TO DISCONNECT',
    download: 'DOWNLOAD BITRATE',
    upload: 'UPLOAD BITRATE',
    peakThroughput: 'PEAK THROUGHPUT',
    totalTransfer: 'TOTAL TRANSFERRED',
    latency: 'LATENCY',
    jitter: 'JITTER',
    packetLoss: 'PACKET LOSS',
    activeSockets: 'ACTIVE STREAMS',
    cipherSuite: 'CIPHER SUITE',
    tunnelStack: 'TUNNEL STACK',
    killSwitch: 'KILL SWITCH',
    killSwitchDesc: 'Block non-tun socket leaks if connection drops',
    batchPing: 'TEST ALL NODES',
    importConfig: 'IMPORT CONFIG / URL',
    activeNode: 'ACTIVE ROUTING NODE',
    filterAll: 'ALL NODES',
    searchNodes: 'Search node or country...',
    ruleTesterTitle: 'Traffic Flow Evaluator',
    ruleTesterPlaceholder: 'Enter domain (e.g. telegram.org) or IP...',
    ruleTesterResult: 'Evaluated Outbound',
    liveConnections: 'Active Network Streams',
    ipLeakTest: 'DNS & IP Leak Verification',
    runLeakCheck: 'RUN SECURITY AUDIT',
    coreLogs: 'Kernel Telemetry Stream',
    languageToggle: 'فارسی',
    viewMode: 'View Mode',
    desktopLayout: 'Desktop View',
    mobileLayout: 'Mobile Frame',
    quickActions: 'Quick Actions',
    quickActionsDesc: 'One-click tactile security & routing toggles',
    autoConnect: 'AUTO-CONNECT',
    autoConnectDesc: 'Auto-engage on untrusted networks',
    dohShort: 'DNS OVER HTTPS',
    dohDesc: 'Encrypted upstream DNS resolution',
    apkHub: 'Android APK Hub',
    apkHubDesc: 'Native pre-built APK packages for all CPU architectures',
    apkDownload: 'Download APK',
    allCpuArchs: 'All CPU Architectures',
  },
  fa: {
    appTitle: 'هسته آبسیدین روان',
    tagline: 'موتور حریم خصوصی و مسیریابی تونل پرسرعت',
    dashboard: 'داشبورد مرکزی',
    nodes: 'سرورها و گره‌ها',
    matrix: 'ماتریس قوانین',
    diagnostics: 'عیب‌یابی شبکه',
    settings: 'تنظیمات هسته',
    connected: 'تونل رمزنگاری فعال',
    disconnected: 'غیرفعال / آماده به کار',
    connecting: 'در حال تبادل کلید و احراز هویت',
    disconnecting: 'در حال بستن تونل',
    error: 'خطای اتصال به سرور',
    connectPrompt: 'برای اتصال لمس کنید',
    disconnectPrompt: 'برای قطع اتصال لمس کنید',
    download: 'نرخ دانلود',
    upload: 'نرخ آپلود',
    peakThroughput: 'حداکثر پهنای باند',
    totalTransfer: 'کل حجم مصرفی',
    latency: 'تاخیر پینگ',
    jitter: 'نوسان تاخیر',
    packetLoss: 'افت بسته',
    activeSockets: 'کانکشن‌های فعال',
    cipherSuite: 'الگوریتم رمزنگاری',
    tunnelStack: 'پشته شبکه TUN',
    killSwitch: 'کیل‌سوئیچ امنیتی',
    killSwitchDesc: 'مسدودسازی نشت ترافیک در صورت قطع ارتباط',
    batchPing: 'تست پینگ همه سرورها',
    importConfig: 'ورود پیکربندی / لینک',
    activeNode: 'گره خروجی فعلی',
    filterAll: 'همه گره‌ها',
    searchNodes: 'جستجوی نام یا کشور...',
    ruleTesterTitle: 'ارزیاب مسیر ترافیک',
    ruleTesterPlaceholder: 'دامنه یا آدرس IP را وارد کنید...',
    ruleTesterResult: 'مسیر خروجی محاسبه‌شده',
    liveConnections: 'جریان‌های فعال شبکه',
    ipLeakTest: 'بررسی عدم نشت DNS و IP',
    runLeakCheck: 'اجرای تست امنیتی',
    coreLogs: 'گزارش‌های تله‌متری کرنل',
    languageToggle: 'English',
    viewMode: 'حالت نمایش',
    desktopLayout: 'نمای دسکتاپ',
    mobileLayout: 'قاب موبایل',
    quickActions: 'عملیات سریع',
    quickActionsDesc: 'سوئیچ‌های سریع امنیتی با یک کلیک',
    autoConnect: 'اتصال خودکار',
    autoConnectDesc: 'اتصال خودکار در شبکه‌های ناشناس',
    dohShort: 'رمزنگاری DNS',
    dohDesc: 'رمزگذاری درخواست‌های دی‌ان‌اس',
    apkHub: 'دریافت نسخه آماده APK',
    apkHubDesc: 'بسته‌های نصبی آماده APK برای تمام معماری‌های پردازنده',
    apkDownload: 'دانلود فایل APK',
    allCpuArchs: 'تمامی معماری‌های پردازنده',
  },
};
