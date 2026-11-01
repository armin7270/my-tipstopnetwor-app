import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/Header.tsx';
import { ConnectionOrb } from './components/ConnectionOrb.tsx';
import { ThroughputGraph } from './components/ThroughputGraph.tsx';
import { TelemetryHUD } from './components/TelemetryHUD.tsx';
import { NodesScreen } from './components/NodesScreen.tsx';
import { RulesMatrixScreen } from './components/RulesMatrixScreen.tsx';
import { DiagnosticsScreen } from './components/DiagnosticsScreen.tsx';
import { SettingsScreen } from './components/SettingsScreen.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { QuickActionsFloatingMenu } from './components/QuickActionsFloatingMenu.tsx';
import { ApkExportModal } from './components/ApkExportModal.tsx';
import {
  INITIAL_NODES,
  INITIAL_RULES,
  INITIAL_APP_ROUTES,
  INITIAL_CONNECTIONS,
  INITIAL_LOGS,
  DEFAULT_SETTINGS,
} from './data/mock-nodes.ts';
import {
  ConnectionStatus,
  ServerNode,
  TelemetryState,
  RouteRule,
  AppSplitRoute,
  ActiveConnection,
  CoreLogEntry,
  CoreSettings,
} from './types/index.ts';

type TabId = 'hud' | 'nodes' | 'matrix' | 'diagnostics' | 'settings';

const TAB_IDS: TabId[] = ['hud', 'nodes', 'matrix', 'diagnostics', 'settings'];
const STORAGE_KEY = 'liquid-obsidian:state:v1';
const MAX_LOG_ENTRIES = 200;
const MAX_HISTORY_SAMPLES = 30;

interface PersistedState {
  settings: CoreSettings;
  nodes: ServerNode[];
  activeNodeId: string;
}

function isTabId(value: string | null): value is TabId {
  return value !== null && (TAB_IDS as string[]).includes(value);
}

function isServerNode(value: unknown): value is ServerNode {
  if (!value || typeof value !== 'object') return false;
  const node = value as ServerNode;
  return (
    typeof node.id === 'string' &&
    typeof node.name === 'string' &&
    typeof node.host === 'string' &&
    typeof node.port === 'number' &&
    typeof node.pingMs === 'number'
  );
}

/** Restore the last session so favorites, imported nodes and toggles survive a refresh. */
function readPersistedState(): Partial<PersistedState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const nodes = Array.isArray(parsed.nodes) ? parsed.nodes.filter(isServerNode) : [];
    const settings =
      parsed.settings && typeof parsed.settings === 'object'
        ? { ...DEFAULT_SETTINGS, ...parsed.settings }
        : undefined;
    return { settings, nodes, activeNodeId: parsed.activeNodeId };
  } catch {
    return {};
  }
}

/** `?tab=nodes` and `#nodes` produce shareable deep links into the shell. */
function readInitialTab(): TabId {
  if (typeof window === 'undefined') return 'hud';
  const fromQuery = new URLSearchParams(window.location.search).get('tab');
  if (isTabId(fromQuery)) return fromQuery;
  const fromHash = window.location.hash.replace(/^#\/?/, '');
  if (isTabId(fromHash)) return fromHash;
  return 'hud';
}

const AUTO_START =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1';

export default function App() {
  // Single source of truth for locale lives inside settings.
  const persisted = useMemo(readPersistedState, []);
  const [settings, setSettings] = useState<CoreSettings>(() => persisted.settings ?? DEFAULT_SETTINGS);
  const language = settings.language;

  const setLanguage = useCallback((next: 'en' | 'fa') => {
    setSettings(current => ({ ...current, language: next }));
  }, []);

  // Navigation and Layout state
  const [activeTab, setActiveTab] = useState<TabId>(readInitialTab);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  // Network Core state
  const [status, setStatus] = useState<ConnectionStatus>(AUTO_START ? 'connected' : 'disconnected');
  const [nodes, setNodes] = useState<ServerNode[]>(() =>
    persisted.nodes && persisted.nodes.length > 0 ? persisted.nodes : INITIAL_NODES
  );
  const [activeNodeId, setActiveNodeId] = useState<string>(
    () => persisted.activeNodeId ?? INITIAL_NODES[0].id
  );

  // Derive the active node from the list instead of keeping a stale copy.
  const activeNode = useMemo(
    () => nodes.find(node => node.id === activeNodeId) ?? nodes[0] ?? INITIAL_NODES[0],
    [nodes, activeNodeId]
  );

  const [rules, setRules] = useState<RouteRule[]>(INITIAL_RULES);
  const [appRoutes, setAppRoutes] = useState<AppSplitRoute[]>(INITIAL_APP_ROUTES);
  const [connections] = useState<ActiveConnection[]>(INITIAL_CONNECTIONS);
  const [logs, setLogs] = useState<CoreLogEntry[]>(INITIAL_LOGS);
  const [isPingingAll, setIsPingingAll] = useState(false);

  // High-frequency telemetry state
  const [telemetry, setTelemetry] = useState<TelemetryState>(() => ({
    downloadSpeed: 0,
    uploadSpeed: 0,
    totalDownloaded: AUTO_START ? 1024 * 1024 * 84 : 0,
    totalUploaded: AUTO_START ? 1024 * 1024 * 18 : 0,
    packetLossPercent: 0,
    currentPingMs: AUTO_START ? activeNode.pingMs : 0,
    jitterMs: AUTO_START ? activeNode.jitterMs : 0,
    uptimeSeconds: 0,
    activeSockets: AUTO_START ? 14 : 0,
  }));

  // Empty until the tunnel is up: no fabricated traffic while disconnected.
  const [speedHistory, setSpeedHistory] = useState<{ dl: number; ul: number }[]>(() =>
    AUTO_START ? [{ dl: 0, ul: 0 }] : []
  );
  const [peakSpeed, setPeakSpeed] = useState<number>(0);
  const isConnected = status === 'connected';

  const connectTimer = useRef<number | null>(null);
  const pingTimer = useRef<number | null>(null);

  // Every timer is torn down on unmount so hot-reload / tab switches cannot leak.
  useEffect(
    () => () => {
      if (connectTimer.current !== null) window.clearTimeout(connectTimer.current);
      if (pingTimer.current !== null) window.clearTimeout(pingTimer.current);
    },
    []
  );

  const pushLog = useCallback(
    (level: CoreLogEntry['level'], module: string, message: string) => {
      const now = new Date();
      const timestamp = `${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, '0')}`;
      setLogs(prev =>
        [
          {
            id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp,
            level,
            module,
            message,
          },
          ...prev,
        ].slice(0, MAX_LOG_ENTRIES)
      );
    },
    []
  );

  // Persist the session (debounced) — quota/privacy-mode failures stay silent.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, nodes, activeNodeId }));
      } catch {
        /* storage unavailable — keep the session in memory only */
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [settings, nodes, activeNodeId]);

  // Keep <html lang/dir> in sync so RTL actually applies to the whole document.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  }, [language]);

  // Reflect the active tab in the URL hash without polluting history.
  useEffect(() => {
    const nextHash = `#${activeTab}`;
    if (window.location.hash === nextHash) return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (isTabId(hash)) setActiveTab(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Toggle Connection Handler
  const handleToggleConnect = useCallback(() => {
    if (status === 'connecting' || status === 'disconnecting') return;
    if (connectTimer.current !== null) {
      window.clearTimeout(connectTimer.current);
      connectTimer.current = null;
    }

    if (status === 'connected') {
      setStatus('disconnecting');
      pushLog('warn', 'TUN2SOCKS', 'Initiated graceful tunnel shutdown. Releasing gVisor virtual adapter...');

      connectTimer.current = window.setTimeout(() => {
        setStatus('disconnected');
        setTelemetry(current => ({
          ...current,
          downloadSpeed: 0,
          uploadSpeed: 0,
          currentPingMs: 0,
          jitterMs: 0,
          uptimeSeconds: 0,
          activeSockets: 0,
        }));
        setSpeedHistory([]);
        connectTimer.current = null;
      }, 700);
      return;
    }

    setStatus('connecting');
    pushLog(
      'info',
      'HANDSHAKE',
      `Negotiating cryptographic handshake with ${activeNode.name} (${activeNode.host}:${activeNode.port})`
    );

    connectTimer.current = window.setTimeout(() => {
      setStatus('connected');
      setSpeedHistory([{ dl: 0, ul: 0 }]);
      setPeakSpeed(0);
      setTelemetry(current => ({
        ...current,
        currentPingMs: activeNode.pingMs,
        jitterMs: activeNode.jitterMs,
        uptimeSeconds: 0,
        activeSockets: 12,
      }));
      pushLog(
        'info',
        'TUN2SOCKS',
        `Tunnel encapsulated via ${activeNode.protocol} (${activeNode.cipher}).`
      );
      connectTimer.current = null;
    }, 1200);
  }, [status, activeNode, pushLog]);

  // High-Frequency telemetry ticker
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = window.setInterval(() => {
      // Simulate realistic fluctuation in download and upload
      const sampleDl = Math.max(1024 * 200, Math.floor(1024 * 1024 * 12 + (Math.random() - 0.45) * 1024 * 1024 * 8));
      const sampleUl = Math.max(1024 * 50, Math.floor(1024 * 1024 * 2 + (Math.random() - 0.45) * 1024 * 1024 * 1.5));

      setTelemetry(current => ({
        ...current,
        downloadSpeed: sampleDl,
        uploadSpeed: sampleUl,
        totalDownloaded: current.totalDownloaded + sampleDl,
        totalUploaded: current.totalUploaded + sampleUl,
        uptimeSeconds: current.uptimeSeconds + 1,
        currentPingMs: Math.max(18, activeNode.pingMs + Math.floor((Math.random() - 0.5) * 4)),
        jitterMs: Number((Math.random() * 1.8 + 0.6).toFixed(1)),
        packetLossPercent: Math.random() < 0.05 ? 0.1 : 0,
        activeSockets: Math.max(4, Math.round(current.activeSockets + (Math.random() - 0.5) * 2)),
      }));

      setPeakSpeed(prev => Math.max(prev, sampleDl));
      setSpeedHistory(prev => [...prev, { dl: sampleDl, ul: sampleUl }].slice(-MAX_HISTORY_SAMPLES));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [status, activeNode]);

  // Batch Ping All Nodes Handler
  const handleTestPingAll = useCallback(() => {
    if (isPingingAll || nodes.length === 0) return;
    setIsPingingAll(true);
    let index = 0;

    const pingStep = () => {
      const target = nodes[index];
      if (!target) {
        setIsPingingAll(false);
        pingTimer.current = null;
        return;
      }

      setNodes(prev =>
        prev.map(node =>
          node.id === target.id
            ? {
                ...node,
                pingMs: Math.max(22, Math.floor(node.pingMs + (Math.random() - 0.5) * 12)),
                jitterMs: Number((Math.random() * 2 + 0.8).toFixed(1)),
              }
            : node
        )
      );

      index += 1;
      pingTimer.current = window.setTimeout(pingStep, 150);
    };

    pingStep();
  }, [isPingingAll, nodes]);

  const handleSelectNode = useCallback((node: ServerNode) => {
    setActiveNodeId(node.id);
    setTelemetry(current => ({
      ...current,
      currentPingMs: node.pingMs,
      jitterMs: node.jitterMs,
    }));
  }, []);

  const glassBlur =
    settings.glassBlurQuality === 'high' ? '28px' : settings.glassBlurQuality === 'medium' ? '18px' : '0px';

  return (
    <div
      dir={language === 'fa' ? 'rtl' : 'ltr'}
      style={{ '--glass-blur': glassBlur } as React.CSSProperties}
      className={`min-h-screen bg-[#0a0e18] text-[#dfe2f1] flex flex-col ${
        language === 'fa' ? "font-['Vazirmatn']" : "font-['Inter']"
      }`}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:start-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#00f2fe] focus:text-slate-950 focus:text-sm focus:font-bold"
      >
        Skip to main content
      </a>

      {/* Top Bar adhering to Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        killSwitch={settings.killSwitch}
        setKillSwitch={val => setSettings(current => ({ ...current, killSwitch: val }))}
        language={language}
        setLanguage={setLanguage}
        isMobilePreview={isMobilePreview}
        setIsMobilePreview={setIsMobilePreview}
        onOpenApkHub={() => setIsApkModalOpen(true)}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 pb-24 lg:pb-12 pt-6 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* If Mobile Preview Mode is active on desktop, frame it inside a high-end mobile chassis */}
          {isMobilePreview ? (
            <div className="flex justify-center py-4">
              <div className="w-[390px] h-[844px] bg-[#0c101c] rounded-[48px] border-4 border-white/15 shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative">
                {/* Dynamic Island / Speaker notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-50 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ml-auto mr-3" />
                </div>

                {/* Mobile Viewport Header */}
                <div className="pt-8 px-4 pb-2 border-b border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <div className="w-5 h-2.5 border border-white/40 rounded-sm p-0.5 flex">
                      <div className="bg-[#10b981] w-3/4 h-full rounded-xs" />
                    </div>
                  </div>
                </div>

                {/* Mobile Scrollable View */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeTab === 'hud' && (
                    <>
                      <ConnectionOrb
                        status={status}
                        activeNode={activeNode}
                        onToggleConnect={handleToggleConnect}
                        language={language}
                        currentPingMs={telemetry.currentPingMs}
                      />
                      <ThroughputGraph
                        telemetry={telemetry}
                        speedHistory={speedHistory}
                        peakSpeed={peakSpeed}
                        language={language}
                        isConnected={isConnected}
                      />
                      <TelemetryHUD
                        telemetry={telemetry}
                        activeNode={activeNode}
                        onOpenNodes={() => setActiveTab('nodes')}
                        language={language}
                        isConnected={isConnected}
                      />
                    </>
                  )}

                  {activeTab === 'nodes' && (
                    <NodesScreen
                      nodes={nodes}
                      setNodes={setNodes}
                      activeNode={activeNode}
                      onSelectNode={handleSelectNode}
                      language={language}
                      onTestPingAll={handleTestPingAll}
                      isPingingAll={isPingingAll}
                    />
                  )}

                  {activeTab === 'matrix' && (
                    <RulesMatrixScreen
                      rules={rules}
                      setRules={setRules}
                      appRoutes={appRoutes}
                      setAppRoutes={setAppRoutes}
                      settings={settings}
                      setSettings={setSettings}
                      language={language}
                    />
                  )}

                  {activeTab === 'diagnostics' && (
                    <DiagnosticsScreen
                      connections={connections}
                      logs={logs}
                      setLogs={setLogs}
                      language={language}
                      isConnected={isConnected}
                      activeNodeCountry={activeNode.country}
                    />
                  )}

                  {activeTab === 'settings' && (
                    <SettingsScreen
                      settings={settings}
                      setSettings={setSettings}
                      language={language}
                      setLanguage={setLanguage}
                    />
                  )}
                </div>

                {/* Mobile Bottom Navigation */}
                <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} language={language} />
              </div>
            </div>
          ) : (
            /* Standard Expansive Responsive Layout */
            <div>
              {activeTab === 'hud' && (
                <div className="space-y-6">
                  {/* Top section: Focal Tactile Liquid Orb */}
                  <ConnectionOrb
                    status={status}
                    activeNode={activeNode}
                    onToggleConnect={handleToggleConnect}
                    language={language}
                    currentPingMs={telemetry.currentPingMs}
                  />

                  {/* 2-Column Responsive Split: Throughput Waveform & Telemetry HUD */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <ThroughputGraph
                      telemetry={telemetry}
                      speedHistory={speedHistory}
                      peakSpeed={peakSpeed}
                      language={language}
                      isConnected={isConnected}
                    />
                    <TelemetryHUD
                      telemetry={telemetry}
                      activeNode={activeNode}
                      onOpenNodes={() => setActiveTab('nodes')}
                      language={language}
                      isConnected={isConnected}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'nodes' && (
                <NodesScreen
                  nodes={nodes}
                  setNodes={setNodes}
                  activeNode={activeNode}
                  onSelectNode={handleSelectNode}
                  language={language}
                  onTestPingAll={handleTestPingAll}
                  isPingingAll={isPingingAll}
                />
              )}

              {activeTab === 'matrix' && (
                <RulesMatrixScreen
                  rules={rules}
                  setRules={setRules}
                  appRoutes={appRoutes}
                  setAppRoutes={setAppRoutes}
                  settings={settings}
                  setSettings={setSettings}
                  language={language}
                />
              )}

              {activeTab === 'diagnostics' && (
                <DiagnosticsScreen
                  connections={connections}
                  logs={logs}
                  setLogs={setLogs}
                  language={language}
                  isConnected={isConnected}
                  activeNodeCountry={activeNode.country}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsScreen
                  settings={settings}
                  setSettings={setSettings}
                  language={language}
                  setLanguage={setLanguage}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Quick Actions Floating Menu in the HUD */}
      {activeTab === 'hud' && (
        <QuickActionsFloatingMenu
          settings={settings}
          setSettings={setSettings}
          setLogs={setLogs}
          language={language}
          onOpenApkHub={() => setIsApkModalOpen(true)}
        />
      )}

      {/* Persistent Mobile Bottom Bar on phones / small screens */}
      {!isMobilePreview && (
        <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} language={language} />
      )}

      {/* Android build / distribution hub */}
      <ApkExportModal isOpen={isApkModalOpen} onClose={() => setIsApkModalOpen(false)} language={language} />
    </div>
  );
}
