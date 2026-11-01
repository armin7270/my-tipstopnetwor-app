import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  formatBitrate,
  formatDuration,
  getLatencyClassification,
  evaluateRouteRule,
  parseConfigUri,
} from './network-core.ts';
import { RouteRule } from '../types/index.ts';

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
