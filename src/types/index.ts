export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'disconnecting' | 'error';

export type ProtocolType = 'VLESS' | 'Shadowsocks' | 'WireGuard' | 'Hysteria2' | 'Trojan' | 'TUIC' | 'VMess';

export interface ServerNode {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  host: string;
  port: number;
  protocol: ProtocolType;
  cipher: string;
  pingMs: number;
  jitterMs: number;
  loadPercent: number;
  isFavorite: boolean;
  tags: string[];
  features: {
    udp: boolean;
    reality: boolean;
    multiplex: boolean;
  };
}

export interface TelemetryState {
  downloadSpeed: number; // bytes per sec
  uploadSpeed: number; // bytes per sec
  totalDownloaded: number; // bytes
  totalUploaded: number; // bytes
  packetLossPercent: number;
  currentPingMs: number;
  jitterMs: number;
  uptimeSeconds: number;
  activeSockets: number;
}

export interface RouteRule {
  id: string;
  name: string;
  pattern: string;
  type: 'domain' | 'ip' | 'geosite' | 'geoip';
  outbound: 'proxy' | 'direct' | 'block';
  enabled: boolean;
  hits: number;
}

export interface AppSplitRoute {
  id: string;
  name: string;
  packageName: string;
  category: 'social' | 'browser' | 'gaming' | 'system' | 'media';
  outbound: 'proxy' | 'direct' | 'block';
  icon: string;
  enabled: boolean;
}

export interface ActiveConnection {
  id: string;
  clientIp: string;
  destination: string;
  port: number;
  protocol: 'TCP' | 'UDP' | 'QUIC';
  process: string;
  uploadBytes: number;
  downloadBytes: number;
  durationSeconds: number;
  status: 'active' | 'closing' | 'handshake';
}

export interface CoreLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'trace';
  module: string;
  message: string;
}

export interface CoreSettings {
  kernel: 'xray' | 'singbox' | 'tun2socks' | 'mihomo';
  tunStack: 'gvisor' | 'system' | 'mixed';
  mtu: number;
  dnsProvider: 'cloudflare' | 'quad9' | 'google' | 'adguard';
  dohUrl: string;
  enableIpv6: boolean;
  strictRoute: boolean;
  killSwitch: boolean;
  autoConnectOnWifi: boolean;
  glassBlurQuality: 'high' | 'medium' | 'performance';
  language: 'en' | 'fa';
}
