import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  formatBitrate,
  formatDuration,
  getLatencyClassification,
  evaluateRouteRule,
  parseConfigUri,
  cidrContains,
  normalizeHostTarget,
  domainMatches,
} from './network-core.ts';
import { RouteRule } from '../types/index.ts';
import { INITIAL_RULES } from '../data/mock-nodes.ts';

test('formatBytes formats zero, small, and multi-megabyte sizes correctly', () => {
  assert.equal(formatBytes(0), '0.00 B');
  assert.equal(formatBytes(500), '500 B');
  assert.equal(formatBytes(1024), '1.00 KB');
  assert.equal(formatBytes(1024 * 1024 * 4.5), '4.50 MB');
  assert.equal(formatBytes(1024 * 1024 * 1024 * 2.25), '2.25 GB');
});

test('formatBitrate converts bytes/sec to readable network speeds', () => {
  assert.equal(formatBitrate(0), '0.0 KB/s');
  assert.equal(formatBitrate(512), '512 B/s');
  assert.equal(formatBitrate(1024 * 250), '250.0 KB/s');
  assert.equal(formatBitrate(1024 * 1024 * 12.4), '12.40 MB/s');
});

test('formatDuration formats seconds to MM:SS and HH:MM:SS', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(75), '01:15');
  assert.equal(formatDuration(3665), '01:01:05');
});

test('getLatencyClassification labels millisecond bands according to design spec', () => {
  const opt = getLatencyClassification(42);
  assert.equal(opt.label, 'OPTIMAL');
  assert.equal(opt.color, '#10b981');

  const exc = getLatencyClassification(110);
  assert.equal(exc.label, 'EXCELLENT');
  assert.equal(exc.color, '#00f2fe');

  const mod = getLatencyClassification(220);
  assert.equal(mod.label, 'MODERATE');
  assert.equal(mod.color, '#f59e0b');

  const high = getLatencyClassification(350);
  assert.equal(high.label, 'HIGH');
  assert.equal(high.color, '#ef4444');

  const timeout = getLatencyClassification(-1);
  assert.equal(timeout.label, 'TIMEOUT');
});

test('evaluateRouteRule matches wildcards, exact domains, and fallback outbounds', () => {
  const sampleRules: RouteRule[] = [
    {
      id: 'r1',
      name: 'Bypass LAN',
      pattern: '192.168.',
      type: 'ip',
      outbound: 'direct',
      enabled: true,
      hits: 0,
    },
    {
      id: 'r2',
      name: 'Ad Block',
      pattern: '*.doubleclick.net',
      type: 'domain',
      outbound: 'block',
      enabled: true,
      hits: 0,
    },
    {
      id: 'r3',
      name: 'Telegram Direct',
      pattern: 't.me',
      type: 'domain',
      outbound: 'direct',
      enabled: false, // disabled
      hits: 0,
    },
  ];

  // Test wildcard block match
  const adCheck = evaluateRouteRule('ad.doubleclick.net', sampleRules);
  assert.equal(adCheck.outbound, 'block');
  assert.equal(adCheck.matchedPattern, '*.doubleclick.net');

  // Test local IP prefix match
  const lanCheck = evaluateRouteRule('192.168.1.100', sampleRules);
  assert.equal(lanCheck.outbound, 'direct');

  // Test disabled rule falls back to default proxy
  const disabledCheck = evaluateRouteRule('t.me', sampleRules);
  assert.equal(disabledCheck.outbound, 'proxy');

  // Test unmatched domain falls back to default proxy
  const normalCheck = evaluateRouteRule('github.com', sampleRules);
  assert.equal(normalCheck.outbound, 'proxy');
});

test('parseConfigUri parses vless and hysteria2 URLs', () => {
  const vlessUri = 'vless://uuid-test-1234@fra.liquidcore.net:443?security=reality#Frankfurt-Reality-01';
  const parsed = parseConfigUri(vlessUri);

  assert.ok(parsed);
  assert.equal(parsed?.protocol, 'VLESS');
  assert.equal(parsed?.host, 'fra.liquidcore.net');
  assert.equal(parsed?.port, 443);
  assert.equal(parsed?.name, 'Frankfurt-Reality-01');

  // Invalid uri returns null
  assert.equal(parseConfigUri('random-invalid-string'), null);
});

test('cidrContains handles masks, host addresses and malformed input', () => {
  assert.equal(cidrContains('10.0.0.0/8', '10.20.30.40'), true);
  assert.equal(cidrContains('172.16.0.0/12', '172.31.255.1'), true);
  assert.equal(cidrContains('172.16.0.0/12', '172.32.0.1'), false);
  assert.equal(cidrContains('192.168.1.0/24', '192.168.1.0'), true);
  assert.equal(cidrContains('0.0.0.0/0', '8.8.8.8'), true);
  assert.equal(cidrContains('10.0.0.0/33', '10.0.0.1'), false);
  assert.equal(cidrContains('not-a-cidr/8', '10.0.0.1'), false);
});

test('normalizeHostTarget strips scheme, port, path and brackets', () => {
  assert.equal(normalizeHostTarget('https://API.Telegram.org:443/foo?x=1'), 'api.telegram.org');
  assert.equal(normalizeHostTarget('[2001:db8::1]:8443'), '2001:db8::1');
  assert.equal(normalizeHostTarget('example.com.'), 'example.com');
  assert.equal(normalizeHostTarget('   '), '');
});

test('domainMatches only matches at a real label boundary', () => {
  assert.equal(domainMatches('t.me', 't.me'), true);
  assert.equal(domainMatches('cdn.t.me', 't.me'), true);
  assert.equal(domainMatches('evil-t.me', 't.me'), false);
  assert.equal(domainMatches('a.b.example.com', '*.example.com'), true);
  assert.equal(domainMatches('example.com', '*.example.com'), true);
  assert.equal(domainMatches('bank.ir', '*.ir'), true);
});

test('the seeded routing matrix resolves its documented presets', () => {
  // Regression: the seed patterns are comma separated lists ("192.168.0.0/16, 10.0.0.0/8")
  // and used to never match because the engine compared the whole string.
  const lan = evaluateRouteRule('192.168.1.50', INITIAL_RULES);
  assert.equal(lan.outbound, 'direct');
  assert.equal(lan.matchedPattern, '192.168.0.0/16');

  const ads = evaluateRouteRule('ad.doubleclick.net', INITIAL_RULES);
  assert.equal(ads.outbound, 'block');

  const iran = evaluateRouteRule('bank.ir', INITIAL_RULES);
  assert.equal(iran.outbound, 'direct');

  const telegram = evaluateRouteRule('api.telegram.org', INITIAL_RULES);
  assert.equal(telegram.outbound, 'proxy');
  assert.equal(telegram.matchedPattern, 'geosite:telegram');

  const ai = evaluateRouteRule('chatgpt.com', INITIAL_RULES);
  assert.equal(ai.outbound, 'proxy');
  assert.equal(ai.matchedPattern, 'geosite:openai');

  // Everything unmatched lands on the FINAL rule.
  const rest = evaluateRouteRule('example.com', INITIAL_RULES);
  assert.equal(rest.outbound, 'proxy');
  assert.equal(rest.matchedPattern, 'FINAL (Default Outbound)');
});

test('parseConfigUri decodes vmess base64 payloads and SIP002 shadowsocks links', () => {
  const vmessPayload = Buffer.from(
    JSON.stringify({ v: '2', ps: 'Tokyo VMess', add: 'jp.example.com', port: '8443', id: 'uuid-1' })
  ).toString('base64');
  const vmess = parseConfigUri(`vmess://${vmessPayload}`);
  assert.ok(vmess);
  assert.equal(vmess?.protocol, 'VMess');
  assert.equal(vmess?.host, 'jp.example.com');
  assert.equal(vmess?.port, 8443);
  assert.equal(vmess?.name, 'Tokyo VMess');

  const ssUserInfo = Buffer.from('chacha20-ietf-poly1305:secret').toString('base64');
  const ss = parseConfigUri(`ss://${ssUserInfo}@1.2.3.4:8388#My-SS`);
  assert.ok(ss);
  assert.equal(ss?.protocol, 'Shadowsocks');
  assert.equal(ss?.host, '1.2.3.4');
  assert.equal(ss?.port, 8388);
  assert.equal(ss?.cipher, 'chacha20-ietf-poly1305');
});

test('parseConfigUri rejects unsupported schemes and malformed payloads', () => {
  assert.equal(parseConfigUri('https://example.com'), null);
  assert.equal(parseConfigUri('ftp://files.example.com'), null);
  assert.equal(parseConfigUri(''), null);
  assert.equal(parseConfigUri('vmess://not-base64!!'), null);
  assert.equal(parseConfigUri('vless://uuid@'), null);
});

test('parseConfigUri handles bracketed IPv6 authorities and query ciphers', () => {
  const parsed = parseConfigUri('trojan://pass@[2001:db8::1]:443?security=tls#v6-node');
  assert.ok(parsed);
  assert.equal(parsed?.host, '2001:db8::1');
  assert.equal(parsed?.port, 443);
  assert.equal(parsed?.cipher, 'TLS 1.3');
});
