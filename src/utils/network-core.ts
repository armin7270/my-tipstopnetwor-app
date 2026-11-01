import { RouteRule, ServerNode, ProtocolType } from '../types/index.ts';

/**
 * Format bytes into human-readable string with binary units
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0.00 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(Math.max(i, 0), sizes.length - 1);
  return `${(bytes / Math.pow(k, idx)).toFixed(idx === 0 ? 0 : 2)} ${sizes[idx]}`;
}

/**
 * Format a byte-per-second rate into a speed string
 */
export function formatBitrate(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '0.0 KB/s';
  const k = 1024;
  if (bytesPerSec < k) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < k * k) return `${(bytesPerSec / k).toFixed(1)} KB/s`;
  if (bytesPerSec < k * k * k) return `${(bytesPerSec / (k * k)).toFixed(2)} MB/s`;
  return `${(bytesPerSec / (k * k * k)).toFixed(2)} GB/s`;
}

/**
 * Format duration in seconds into HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
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

/* -------------------------------------------------------------------------- */
/* Host / IP / CIDR primitives                                                */
/* -------------------------------------------------------------------------- */

/** Parse a dotted-quad IPv4 string into an unsigned 32-bit integer. */
export function parseIPv4(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

/** Check whether an IPv4 address falls inside a CIDR block (e.g. `10.0.0.0/8`). */
export function cidrContains(cidr: string, ip: string): boolean {
  const [base, rawBits] = cidr.split('/');
  const baseInt = parseIPv4(base);
  const ipInt = parseIPv4(ip);
  if (baseInt === null || ipInt === null) return false;

  const bits = rawBits === undefined ? 32 : Number(rawBits);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;

  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (baseInt & mask) === (ipInt & mask);
}

/**
 * Normalise a destination (URL, host:port, bracketed IPv6, FQDN with a trailing dot)
 * down to the bare lowercase host that the rule engine compares against.
 */
export function normalizeHostTarget(destination: string): string {
  let target = (destination ?? '').trim().toLowerCase();
  if (!target) return '';
  target = target.replace(/^[a-z0-9+.-]+:\/\//, ''); // strip scheme
  target = target.replace(/[/?#].*$/, ''); // strip path / query / fragment
  target = target.replace(/\.$/, ''); // strip DNS root dot

  // Bracketed IPv6: [2001:db8::1]:443
  const v6 = /^\[([^\]]+)\](?::\d+)?$/.exec(target);
  if (v6) return v6[1];

  // Only strip :port when there is exactly one colon (bare IPv6 has several)
  const colons = (target.match(/:/g) ?? []).length;
  if (colons === 1) target = target.replace(/:\d+$/, '');

  return target;
}

/** Match a hostname against a domain pattern, supporting `*.example.com` and bare suffixes. */
export function domainMatches(host: string, pattern: string): boolean {
  const clean = pattern.trim().toLowerCase().replace(/^\./, '').replace(/\.$/, '');
  if (!clean || !host) return false;
  if (clean.startsWith('*.')) {
    const root = clean.slice(2);
    return host === root || host.endsWith(`.${root}`);
  }
  return host === clean || host.endsWith(`.${clean}`);
}

/* -------------------------------------------------------------------------- */
/* Rule engine                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Minimal offline stand-in for the `geosite.dat` categories that this demo seeds.
 * Real clients resolve these from the geosite database; here they are explicit
 * suffix lists so the routing matrix can be evaluated deterministically.
 */
export const GEOSITE_DOMAINS: Record<string, string[]> = {
  'category-ads-all': [
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
    'adservice.google.com',
    '2mdn.net',
    'adnxs.com',
    'criteo.com',
    'taboola.com',
    'outbrain.com',
    'scorecardresearch.com',
    'moatads.com',
    'zedo.com',
    'ads-twitter.com',
    'analytics.google.com',
  ],
  ir: ['ir'],
  cn: [
    'cn',
    'baidu.com',
    'qq.com',
    'taobao.com',
    'tmall.com',
    'aliyun.com',
    'weibo.com',
    'bilibili.com',
    '163.com',
    'jd.com',
    'sina.com.cn',
    'sohu.com',
    'youku.com',
    'alipay.com',
  ],
  telegram: ['t.me', 'telegram.org', 'telegram.me', 'telegram.com', 'telesco.pe', 'telegra.ph', 'tdesktop.com', 'graph.org'],
  openai: ['openai.com', 'chatgpt.com', 'chat.com', 'oaistatic.com', 'oaiusercontent.com', 'sora.com'],
  'google-deepmind': ['deepmind.com', 'deepmind.google'],
};

/** Minimal offline stand-in for the `geoip.dat` categories used by the seed rules. */
export const GEOIP_CIDRS: Record<string, string[]> = {
  cn: [
    '1.0.1.0/24',
    '1.0.2.0/23',
    '14.0.0.0/8',
    '27.0.0.0/8',
    '36.0.0.0/8',
    '39.0.0.0/8',
    '42.0.0.0/8',
    '58.0.0.0/7',
    '60.0.0.0/7',
    '101.0.0.0/8',
    '106.0.0.0/8',
    '110.0.0.0/7',
    '112.0.0.0/5',
    '116.0.0.0/6',
    '118.0.0.0/7',
    '120.0.0.0/6',
    '122.0.0.0/7',
    '124.0.0.0/7',
    '126.0.0.0/8',
    '175.0.0.0/8',
    '180.0.0.0/7',
    '182.0.0.0/6',
    '202.0.0.0/7',
    '210.0.0.0/7',
    '211.0.0.0/8',
    '218.0.0.0/7',
    '220.0.0.0/6',
    '222.0.0.0/8',
    '223.0.0.0/8',
  ],
  telegram: ['91.108.0.0/16', '91.105.192.0/23', '149.154.160.0/20'],
};

function matchGeosite(host: string, category: string): boolean {
  const suffixes = GEOSITE_DOMAINS[category.toLowerCase()];
  if (!suffixes) return false;
  return suffixes.some(suffix => domainMatches(host, suffix));
}

function matchGeoip(host: string, category: string): boolean {
  const cidrs = GEOIP_CIDRS[category.toLowerCase()];
  if (!cidrs) return false;
  return cidrs.some(cidr => cidrContains(cidr, host));
}

/**
 * Evaluate a destination host against the ordered routing matrix.
 *
 * Supports the pattern syntax actually used by the seed data:
 *   - `192.168.0.0/16` CIDR blocks, bare IPs and IP prefixes (`192.168.`)
 *   - `*.example.com` wildcards and bare domain suffixes (`example.com`, `*.ir`)
 *   - `geosite:<category>` / `geoip:<category>` tags
 *   - `FINAL` as the terminal catch-all
 *   - comma-separated lists of any of the above in a single rule
 */
export function evaluateRouteRule(
  destination: string,
  rules: RouteRule[]
): { rule: RouteRule | null; outbound: 'proxy' | 'direct' | 'block'; matchedPattern: string } {
  const host = normalizeHostTarget(destination);
  const isIp = parseIPv4(host) !== null;
  let finalRule: RouteRule | null = null;

  if (host) {
    for (const rule of rules) {
      if (!rule.enabled) continue;

      const tokens = rule.pattern
        .split(',')
        .map(token => token.trim())
        .filter(Boolean);

      for (const token of tokens) {
        const lower = token.toLowerCase();

        // Terminal catch-all: remember it, keep scanning explicit rules.
        if (lower === 'final' || lower.startsWith('final ')) {
          if (!finalRule) finalRule = rule;
          continue;
        }

        if (lower.startsWith('geosite:')) {
          if (matchGeosite(host, lower.slice('geosite:'.length))) {
            return { rule, outbound: rule.outbound, matchedPattern: token };
          }
          continue;
        }

        if (lower.startsWith('geoip:')) {
          if (isIp && matchGeoip(host, lower.slice('geoip:'.length))) {
            return { rule, outbound: rule.outbound, matchedPattern: token };
          }
          continue;
        }

        if (lower.includes('/') && isIp && cidrContains(lower, host)) {
          return { rule, outbound: rule.outbound, matchedPattern: token };
        }

        if (isIp && parseIPv4(lower) !== null) {
          if (host === lower) return { rule, outbound: rule.outbound, matchedPattern: token };
          continue;
        }

        // IPv4 prefix such as `192.168.`
        if (isIp && /^\d{1,3}(\.\d{1,3}){0,3}\.?$/.test(lower) && host.startsWith(lower)) {
          return { rule, outbound: rule.outbound, matchedPattern: token };
        }

        if (!isIp && domainMatches(host, lower)) {
          return { rule, outbound: rule.outbound, matchedPattern: token };
        }
      }
    }
  }

  if (finalRule) {
    return { rule: finalRule, outbound: finalRule.outbound, matchedPattern: finalRule.pattern };
  }

  return { rule: null, outbound: 'proxy', matchedPattern: 'default-proxy' };
}

/* -------------------------------------------------------------------------- */
/* Share-link parsing                                                         */
/* -------------------------------------------------------------------------- */

const SUPPORTED_SCHEMES = new Set([
  'vless',
  'vmess',
  'trojan',
  'ss',
  'shadowsocks',
  'hysteria2',
  'hy2',
  'wireguard',
  'wg',
]);

const DEFAULT_CIPHERS: Record<string, string> = {
  VLESS: 'none (REALITY TLS)',
  VMess: 'auto (AEAD)',
  Trojan: 'TLS 1.3',
  Shadowsocks: 'AEAD 2022',
  Hysteria2: 'Salamander (QUIC UDP)',
  WireGuard: 'ChaCha20-Poly1305',
  TUIC: 'QUIC v5',
};

function decodeBase64Text(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '');
    if (!normalized) return null;
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function splitOnce(value: string, separator: string): [string, string] {
  const index = value.indexOf(separator);
  if (index === -1) return [value, ''];
  return [value.slice(0, index), value.slice(index + separator.length)];
}

function parseHostPort(authority: string, fallbackPort: number): { host: string; port: number } {
  const clean = authority.trim();
  const v6 = /^\[([^\]]+)\](?::(\d+))?$/.exec(clean);
  if (v6) {
    return { host: v6[1], port: v6[2] ? Number(v6[2]) : fallbackPort };
  }
  const lastColon = clean.lastIndexOf(':');
  if (lastColon > -1 && !clean.slice(lastColon + 1).includes(':')) {
    const host = clean.slice(0, lastColon);
    const port = Number(clean.slice(lastColon + 1));
    return { host: host || clean, port: Number.isInteger(port) ? port : fallbackPort };
  }
  return { host: clean, port: fallbackPort };
}

function schemeToProtocol(scheme: string): ProtocolType {
  switch (scheme) {
    case 'vless':
      return 'VLESS';
    case 'vmess':
      return 'VMess';
    case 'hysteria2':
    case 'hy2':
      return 'Hysteria2';
    case 'trojan':
      return 'Trojan';
    case 'ss':
    case 'shadowsocks':
      return 'Shadowsocks';
    case 'wireguard':
    case 'wg':
      return 'WireGuard';
    default:
      return 'VLESS';
  }
}

/**
 * Parse a subscription / share URI into a partial node.
 *
 * Handles `vless://`, `trojan://`, `hysteria2://`, `wireguard://` userinfo links,
 * SIP002 `ss://` links (plain and base64), legacy base64 `vmess://` JSON payloads,
 * bracketed IPv6 authorities and query flags such as `security=reality`.
 * Unknown schemes return `null` instead of silently becoming a VLESS node.
 */
export function parseConfigUri(uri: string): Partial<ServerNode> | null {
  try {
    const trimmed = uri.trim();
    const match = /^([a-z0-9+.-]+):\/\//i.exec(trimmed);
    if (!match) return null;

    const scheme = match[1].toLowerCase();
    if (!SUPPORTED_SCHEMES.has(scheme)) return null;

    const rest = trimmed.slice(match[0].length);
    let protocol = schemeToProtocol(scheme);
    let host = '';
    let port = 443;
    let name = '';
    let cipher = DEFAULT_CIPHERS[protocol] ?? 'AEAD';

    if (scheme === 'vmess') {
      const payload = splitOnce(rest, '#')[0].split('?')[0];
      const decoded = decodeBase64Text(payload);
      if (!decoded) return null;
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(decoded) as Record<string, unknown>;
      } catch {
        return null;
      }
      host = String(json.add ?? json.host ?? '');
      port = Number(json.port) || 443;
      name = String(json.ps ?? json.remarks ?? '');
      cipher = String(json.scy ?? DEFAULT_CIPHERS.VMess);
    } else if (scheme === 'ss' || scheme === 'shadowsocks') {
      const [beforeHash, hash] = splitOnce(rest, '#');
      name = safeDecode(hash);
      let body = beforeHash.split('?')[0];

      if (body.includes('@')) {
        const at = body.lastIndexOf('@');
        let userinfo = body.slice(0, at);
        body = body.slice(at + 1);
        if (!userinfo.includes(':')) {
          userinfo = decodeBase64Text(userinfo) ?? userinfo;
        }
        const [method] = userinfo.split(':');
        cipher = method || DEFAULT_CIPHERS.Shadowsocks;
      } else {
        const decoded = decodeBase64Text(body);
        if (!decoded) return null;
        const at = decoded.lastIndexOf('@');
        if (at < 0) return null;
        const [method] = decoded.slice(0, at).split(':');
        cipher = method || DEFAULT_CIPHERS.Shadowsocks;
        body = decoded.slice(at + 1);
      }

      const parsed = parseHostPort(body, port);
      host = parsed.host;
      port = parsed.port;
    } else {
      const [beforeHash, hash] = splitOnce(rest, '#');
      name = safeDecode(hash);
      const [body, query] = splitOnce(beforeHash, '?');
      const authority = body.slice(body.lastIndexOf('@') + 1);
      const parsed = parseHostPort(authority, port);
      host = parsed.host;
      port = parsed.port;

      const params = new URLSearchParams(query);
      const security = (params.get('security') ?? '').toLowerCase();
      if (security === 'reality') {
        cipher = 'REALITY TLS (uTLS)';
      } else if (security === 'tls' || security === 'xtls') {
        cipher = 'TLS 1.3';
      }
      const method = params.get('method');
      if (method) cipher = method;
    }

    if (!host) return null;
    if (!Number.isInteger(port) || port < 1 || port > 65535) port = 443;

    // `wireguard://` authorities are sometimes written as `host:port` only.
    const cleanHost = host.replace(/^\[|\]$/g, '').toLowerCase();

    return {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: (name || '').trim() || `${protocol} Node`,
      country: 'Global',
      countryCode: 'UN',
      flag: '🌐',
      host: cleanHost,
      port,
      protocol,
      cipher,
      pingMs: 0,
      jitterMs: 0,
      loadPercent: 15,
      isFavorite: false,
      tags: ['Imported', protocol],
      features: {
        udp: true,
        reality: protocol === 'VLESS' || cipher.toLowerCase().includes('reality'),
        multiplex: true,
      },
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Translations                                                               */
/* -------------------------------------------------------------------------- */

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
    connectedShort: 'CONNECTED',
    disconnectedShort: 'DISCONNECTED',
    connectingShort: 'CONNECTING...',
    standby: 'Standby',
    download: 'DOWNLOAD BITRATE',
    upload: 'UPLOAD BITRATE',
    peakThroughput: 'PEAK THROUGHPUT',
    totalTransfer: 'TOTAL TRANSFERRED',
    totalDownload: 'Total DL',
    totalUpload: 'Total UL',
    latency: 'LATENCY',
    jitter: 'JITTER',
    packetLoss: 'PACKET LOSS',
    activeSockets: 'ACTIVE STREAMS',
    cipherSuite: 'CIPHER SUITE',
    tunnelStack: 'TUNNEL STACK',
    killSwitch: 'KILL SWITCH',
    killSwitchDesc: 'Block non-tun socket leaks if connection drops',
    batchPing: 'TEST ALL NODES',
    importing: 'PROBING NODES...',
    importConfig: 'IMPORT CONFIG / URL',
    activeNode: 'ACTIVE ROUTING NODE',
    change: 'Change',
    filterAll: 'ALL NODES',
    searchNodes: 'Search node or country...',
    noNodesFound: 'No nodes found',
    noNodesHint: 'Try adjusting your search criteria or import a new configuration node.',
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
    apkHub: 'Android Build Hub',
    apkHubDesc: 'Native build targets for every Android CPU architecture',
    apkDownload: 'Download APK',
    allCpuArchs: 'All CPU Architectures',
    resetDefaults: 'RESET DEFAULTS',
    close: 'Close',
    cancel: 'Cancel',
    throughputTitle: 'High-Frequency Throughput Telemetry',
    throughputIdle: 'Throughput Monitor (Idle)',
    rxDownload: 'RX Download',
    txUpload: 'TX Upload',
    liveStream: 'Telemetry Stream',
    suspended: 'Pipeline Suspended',
    uptime: 'UPTIME',
    select: 'SELECT',
    activeLabel: 'ACTIVE',
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
    connectedShort: 'متصل',
    disconnectedShort: 'قطع',
    connectingShort: 'در حال اتصال...',
    standby: 'آماده',
    download: 'نرخ دانلود',
    upload: 'نرخ آپلود',
    peakThroughput: 'حداکثر پهنای باند',
    totalTransfer: 'کل حجم مصرفی',
    totalDownload: 'کل دانلود',
    totalUpload: 'کل آپلود',
    latency: 'تاخیر پینگ',
    jitter: 'نوسان تاخیر',
    packetLoss: 'افت بسته',
    activeSockets: 'کانکشن‌های فعال',
    cipherSuite: 'الگوریتم رمزنگاری',
    tunnelStack: 'پشته شبکه TUN',
    killSwitch: 'کیل‌سوئیچ امنیتی',
    killSwitchDesc: 'مسدودسازی نشت ترافیک در صورت قطع ارتباط',
    batchPing: 'تست پینگ همه سرورها',
    importing: 'در حال تست گره‌ها...',
    importConfig: 'ورود پیکربندی / لینک',
    activeNode: 'گره خروجی فعلی',
    change: 'تغییر',
    filterAll: 'همه گره‌ها',
    searchNodes: 'جستجوی نام یا کشور...',
    noNodesFound: 'گره‌ای پیدا نشد',
    noNodesHint: 'معیارهای جستجو را تغییر دهید یا یک پیکربندی جدید وارد کنید.',
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
    apkHub: 'ساخت نسخه اندروید',
    apkHubDesc: 'اهداف ساخت بومی برای تمام معماری‌های پردازنده اندروید',
    apkDownload: 'دانلود APK',
    allCpuArchs: 'تمامی معماری‌های پردازنده',
    resetDefaults: 'بازگشت به پیش‌فرض',
    close: 'بستن',
    cancel: 'انصراف',
    throughputTitle: 'تله‌متری پرسرعت پهنای باند',
    throughputIdle: 'پایش پهنای باند (بی‌کار)',
    rxDownload: 'دریافت (RX)',
    txUpload: 'ارسال (TX)',
    liveStream: 'جریان تله‌متری',
    suspended: 'جریان متوقف است',
    uptime: 'مدت اتصال',
    select: 'انتخاب',
    activeLabel: 'فعال',
  },
};
