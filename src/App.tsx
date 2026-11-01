import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { ConnectionOrb } from './components/ConnectionOrb.tsx';
import { ThroughputGraph } from './components/ThroughputGraph.tsx';
import { TelemetryHUD } from './components/TelemetryHUD.tsx';
import { NodesScreen } from './components/NodesScreen.tsx';
import { RulesMatrixScreen } from './components/RulesMatrixScreen.tsx';
import { DiagnosticsScreen } from './components/DiagnosticsScreen.tsx';
import { SettingsScreen } from './components/SettingsScreen.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
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

export default function App() {
  // Check autostart query param
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const autoStart = urlParams?.get('autostart') === '1';

  // Navigation and Layout state
  const [activeTab, setActiveTab] = useState<'hud' | 'nodes' | 'matrix' | 'diagnostics' | 'settings'>('hud');
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [language, setLanguage] = useState<'en' | 'fa'>('en');

  // Network Core state
  const [status, setStatus] = useState<ConnectionStatus>(autoStart ? 'connected' : 'disconnected');
  const [nodes, setNodes] = useState<ServerNode[]>(INITIAL_NODES);
  const [activeNode, setActiveNode] = useState<ServerNode>(INITIAL_NODES[0]);
  const [rules, setRules] = useState<RouteRule[]>(INITIAL_RULES);
  const [appRoutes, setAppRoutes] = useState<AppSplitRoute[]>(INITIAL_APP_ROUTES);
  const [connections, setConnections] = useState<ActiveConnection[]>(INITIAL_CONNECTIONS);
  const [logs, setLogs] = useState<CoreLogEntry[]>(INITIAL_LOGS);
  const [settings, setSettings] = useState<CoreSettings>(DEFAULT_SETTINGS);
  const [isPingingAll, setIsPingingAll] = useState(false);

  // High-frequency telemetry state
  const [telemetry, setTelemetry] = useState<TelemetryState>({
    downloadSpeed: autoStart ? 14820000 : 0,
    uploadSpeed: autoStart ? 2450000 : 0,
    totalDownloaded: autoStart ? 1024 * 1024 * 84 : 1024 * 1024 * 42,
    totalUploaded: autoStart ? 1024 * 1024 * 18 : 1024 * 1024 * 8,
    packetLossPercent: 0,
    currentPingMs: activeNode.pingMs,
    jitterMs: activeNode.jitterMs,
    uptimeSeconds: autoStart ? 240 : 0,
    activeSockets: 14,
  });

  const [speedHistory, setSpeedHistory] = useState<{ dl: number; ul: number }[]>([
    { dl: 0, ul: 0 },
    { dl: 1200000, ul: 200000 },
    { dl: 4500000, ul: 800000 },
    { dl: 11200000, ul: 1800000 },
    { dl: 14820000, ul: 2450000 },
  ]);

  const [peakSpeed, setPeakSpeed] = useState<number>(1024 * 1024 * 24.5);
  const isConnected = status === 'connected';

  // Toggle Connection Handler
  const handleToggleConnect = () => {
    if (status === 'connected') {
      setStatus('disconnecting');
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds();

      setLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          level: 'warn',
          module: 'TUN2SOCKS',
          message: 'Initiated graceful tunnel shutdown. Releasing gVisor virtual adapter...',
        },
        ...prev,
      ]);

      setTimeout(() => {
        setStatus('disconnected');
        setTelemetry(t => ({
          ...t,
          downloadSpeed: 0,
          uploadSpeed: 0,
          currentPingMs: 0,
          jitterMs: 0,
        }));
      }, 700);
    } else if (status === 'disconnected') {
      setStatus('connecting');
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + now.getMilliseconds();

      setLogs(prev => [
        {
          id: `log-${Date.now()}`,
          timestamp: timeStr,
          level: 'info',
          module: 'HANDSHAKE',
          message: `Negotiating cryptographic handshake with ${activeNode.name} (${activeNode.host}:${activeNode.port})`,
        },
        ...prev,
      ]);

      setTimeout(() => {
        setStatus('connected');
        const connectTime = new Date();
        const cTimeStr = connectTime.toTimeString().split(' ')[0] + '.' + connectTime.getMilliseconds();

        setLogs(prev => [
          {
            id: `log-${Date.now() + 1}`,
            timestamp: cTimeStr,
            level: 'info',
            module: 'TUN2SOCKS',
            message: `Tunnel encapsulated via ${activeNode.protocol} (${activeNode.cipher}). Zero packet drop verified.`,
          },
          ...prev,
        ]);

        setTelemetry(t => ({
          ...t,
          currentPingMs: activeNode.pingMs,
          jitterMs: activeNode.jitterMs,
        }));
      }, 1200);
    }
  };

  // High-Frequency telemetry ticker
  useEffect(() => {
    if (status !== 'connected') return;

    const interval = setInterval(() => {
      // Simulate realistic fluctuation in download and upload
      const baseDl = 1024 * 1024 * 12; // ~12MB/s
      const jitterDl = (Math.random() - 0.45) * 1024 * 1024 * 8;
      const currentDl = Math.max(1024 * 200, Math.floor(baseDl + jitterDl));

      const baseUl = 1024 * 1024 * 2; // ~2MB/s
      const jitterUl = (Math.random() - 0.45) * 1024 * 1024 * 1.5;
      const currentUl = Math.max(1024 * 50, Math.floor(baseUl + jitterUl));

      setTelemetry(prev => {
        const newDlTotal = prev.totalDownloaded + currentDl;
        const newUlTotal = prev.totalUploaded + currentUl;
        const pingFluctuation = Math.floor((Math.random() - 0.5) * 4);
        const newPing = Math.max(18, activeNode.pingMs + pingFluctuation);

        return {
          ...prev,
          downloadSpeed: currentDl,
          uploadSpeed: currentUl,
          totalDownloaded: newDlTotal,
          totalUploaded: newUlTotal,
          uptimeSeconds: prev.uptimeSeconds + 1,
          currentPingMs: newPing,
          jitterMs: Number((Math.random() * 1.8 + 0.6).toFixed(1)),
        };
      });

      setPeakSpeed(prev => Math.max(prev, currentDl));

      setSpeedHistory(prev => {
        const next = [...prev, { dl: currentDl, ul: currentUl }];
        if (next.length > 25) next.shift();
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, activeNode]);

  // Batch Ping All Nodes Handler
  const handleTestPingAll = () => {
    setIsPingingAll(true);
    let index = 0;

    const pingStep = () => {
      if (index >= nodes.length) {
        setIsPingingAll(false);
        return;
      }

      setNodes(prev =>
        prev.map((n, i) => {
          if (i === index) {
            const simulatedPing = Math.max(22, Math.floor(n.pingMs + (Math.random() - 0.5) * 12));
            const simulatedJitter = Number((Math.random() * 2 + 0.8).toFixed(1));
            return {
              ...n,
              pingMs: simulatedPing,
              jitterMs: simulatedJitter,
            };
          }
          return n;
        })
      );

      index++;
      setTimeout(pingStep, 150);
    };

    pingStep();
  };

  const handleSelectNode = (node: ServerNode) => {
    setActiveNode(node);
    setTelemetry(t => ({
      ...t,
      currentPingMs: node.pingMs,
      jitterMs: node.jitterMs,
    }));
  };

  return (
    <div
      dir={language === 'fa' ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#0a0e18] text-[#dfe2f1] flex flex-col font-['Inter'] ${
        language === 'fa' ? "font-['Vazirmatn']" : ''
      }`}
    >
      {/* Top Bar adhering to Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        killSwitch={settings.killSwitch}
        setKillSwitch={val => setSettings(s => ({ ...s, killSwitch: val }))}
        language={language}
        setLanguage={setLanguage}
        isMobilePreview={isMobilePreview}
        setIsMobilePreview={setIsMobilePreview}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-24 lg:pb-12 pt-6 px-4 md:px-8">
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
                <MobileBottomNav
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  language={language}
                />
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

      {/* Persistent Mobile Bottom Bar on phones / small screens */}
      {!isMobilePreview && (
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          language={language}
        />
      )}
    </div>
  );
}
